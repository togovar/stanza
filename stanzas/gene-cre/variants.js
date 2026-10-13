/**
 * Variants inside a CRE and the mouse strains that carry the same substitution.
 *
 * The SPARQList `gene_cre_mogp` takes every CRE range on the page at once
 * and returns one row per (human allele x mouse variant) combination found in
 * them, so the same human variant appears several times. Rows are therefore
 * folded back into variants first, and only then into a per-strain tally.
 *
 * Asking per CRE meant re-fetching the strain list and hitting MoG+ at RIKEN
 * once per CRE -- around 258 requests for a gene with 43 of them. In one call
 * the API merges neighbouring ranges and answers the same page in about a
 * dozen, and each row says which of the requested ranges it fell in.
 *
 * `alt_match: "Yes"` means the mouse strain's ALT corresponds, across the
 * liftOver strand, to the human ALT: that is the evidence for "this strain
 * could be a counterpart for this human variant".
 */

const NOT_FOUND = /^\s*(MoG\+ variant not found|Liftover position not found)/i;

/**
 * Rows for a batch of ranges; an empty array when there is nothing. Each row
 * carries `in_range`, the requested ranges it belongs to.
 */
export async function fetchRanges(sparqlist, mogplusVersion, human, mouse) {
  if (!human.length && !mouse.length) return [];
  const url =
    sparqlist + '/api/gene_cre_mogp?mogplus_ver=' + encodeURIComponent(mogplusVersion) +
    (human.length ? '&ranges=' + encodeURIComponent(human.join(',')) : '') +
    (mouse.length ? '&mmu_ranges=' + encodeURIComponent(mouse.join(',')) : '');
  const text = await fetch(url).then((res) => res.text());
  // The API answers with plain text, not JSON, when there is nothing to show.
  if (!text || NOT_FOUND.test(text)) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Which range a CRE's variants are looked up in.
 *
 * A human CRE is asked for by its own GRCh38 position. A mouse CRE is asked for
 * by its **GRCm39** position, which gene_cre derived straight from GRCm38:
 * routing a mouse CRE through the human genome dropped the ones with no human
 * counterpart and truncated the rest to the part that aligns to human.
 */
export function rangeOf(cre, speciesLabel) {
  if (speciesLabel === 'mouse') {
    if (cre.mm39_start == null) return null;
    return { param: 'mmu_range', value: cre.mm39_chrom + ':' + cre.mm39_start + '-' + cre.mm39_end };
  }
  // Only the part that lifts over can be compared with a mouse strain.
  if (cre.match_start == null) return null;
  return { param: 'range', value: cre.cre_chrom + ':' + cre.match_start + '-' + cre.match_end };
}

const SOURCES = [
  { test: /knowledge\.brc\.riken\.jp/, tag: 'BRC' },
  { test: /jax\.org/, tag: 'JAX' },
];

/** "<a href=URL>MSMv4</a><br/>CZECHII/EiJ" -> [{name, url, source}] */
export function parseStrains(cell) {
  const out = [];
  for (const part of String(cell || '').split(/<br\s*\/?>/i)) {
    const piece = part.trim();
    if (!piece) continue;
    // The href in this API is not quoted, so it is read up to the closing '>'.
    const link = /<a\s+href=([^>]+)>([\s\S]*?)<\/a>/i.exec(piece);
    const name = (link ? link[2] : piece.replace(/<[^>]+>/g, '')).trim();
    if (!name) continue;
    const url = link ? link[1].trim() : null;
    const source = url ? (SOURCES.find((s) => s.test.test(url)) || {}).tag || null : null;
    out.push({ name, url, source });
  }
  return out;
}

/**
 * The same strain reaches this table from two sources under two names: RIKEN
 * BRC writes a version suffix (`JF1v3`) and JAX a substrain (`JF1/MsJ`). Only
 * that exact shape is merged — substrain suffixes on their own are never
 * stripped, because `C57BL/6NJ` and `C57BL/10J` are different strains.
 */
function mergeKey(name, versioned) {
  const v = /^(.+?)v\d+$/.exec(name);
  if (v) return v[1];
  const base = name.split('/')[0];
  return versioned.has(base) ? base : name;
}

/**
 * @param {Array} entries [{cre, species, rows}]
 * @returns {{byCre: object, strains: Array, totals: object}}
 */
export function aggregate(entries) {
  const byCre = {};
  // A human variant is one substitution, however many rows mention it.
  const variants = new Map();
  // The same rows read from the other end: one entry per mouse allele.
  const mouseVariants = new Map();

  for (const { cre, rows } of entries) {
    const creStat = {
      variants: new Set(),
      matched: new Set(),
      togovar: new Set(),
      // The mouse side is counted separately: a CRE with no human counterpart
      // still has mouse variation, and it used to be reported as empty.
      mouseVariants: new Set(),
      mouseMatched: new Set(),
      rows: rows.length,
      strains: new Map(),
    };
    byCre[cre.cre_id] = creStat;

    for (const row of rows) {
      // Rows the API could not pair with a human variant carry no allele, or a
      // placeholder position; only real ones count as human variants.
      const id = row.allele_grch38 && !row.allele_grch38.includes('?') ? row.allele_grch38 : null;
      if (id) creStat.variants.add(id);
      if (id && row.tgv_id) creStat.togovar.add(id);

      if (id && !variants.has(id)) {
        variants.set(id, {
          id,
          tgv_id: row.tgv_id || '',
          tgv_link: row.tgv_link || '',
          rs: row.rs || '',
          rs_link: row.rs_link || '',
          consequence: row.consequence || '',
          cres: new Set(),
          matches: [],
          strains: new Map(),
        });
      }
      const v = id ? variants.get(id) : null;
      if (v) {
        v.cres.add(cre.cre_id);
        if (!v.tgv_id && row.tgv_id) {
          v.tgv_id = row.tgv_id;
          v.tgv_link = row.tgv_link || '';
        }
        if (!v.rs && row.rs) {
          v.rs = row.rs;
          v.rs_link = row.rs_link || '';
        }
      }
      // The mouse side of the row, which is what a mouse-first reading wants.
      if (row.allele_grcm39) {
        if (!mouseVariants.has(row.allele_grcm39)) {
          mouseVariants.set(row.allele_grcm39, {
            id: row.allele_grcm39,
            ref: row.ref_grcm39 || '',
            alt: row.alt_grcm39 || '',
            strand: row.mmu_strand || '',
            mogplus_url: row.mogplus_url || '',
            cres: new Set(),
            human: new Map(),
            strains: new Map(),
            matched: false,
          });
        }
        const mv = mouseVariants.get(row.allele_grcm39);
        mv.cres.add(cre.cre_id);
        creStat.mouseVariants.add(row.allele_grcm39);
        if (row.alt_match === 'Yes') creStat.mouseMatched.add(row.allele_grcm39);
        if (!mv.mogplus_url && row.mogplus_url) mv.mogplus_url = row.mogplus_url;
        // Every human allele this mouse allele was compared against, and
        // whether that comparison was an exact match.
        if (id) {
          const prev = mv.human.get(id);
          mv.human.set(id, { id, tgv_id: row.tgv_id || '', tgv_link: row.tgv_link || '', rs: row.rs || '',
            rs_link: row.rs_link || '', match: row.alt_match === 'Yes' || (prev && prev.match) || false });
        }
        if (row.alt_match === 'Yes') mv.matched = true;
        for (const st of parseStrains(row.mouse_strains))
          if (!mv.strains.has(st.name)) mv.strains.set(st.name, st);
      }

      if (row.alt_match !== 'Yes' || !id) continue;

      creStat.matched.add(id);
      v.matches.push({ allele_grcm39: row.allele_grcm39, mogplus_url: row.mogplus_url });
      for (const s of parseStrains(row.mouse_strains)) {
        if (!v.strains.has(s.name)) v.strains.set(s.name, { ...s, cres: new Set() });
        v.strains.get(s.name).cres.add(cre.cre_id);
      }
    }
  }

  // The names that carry a RIKEN version suffix, used to decide what may merge.
  const versioned = new Set();
  for (const v of variants.values())
    for (const name of v.strains.keys()) {
      const m = /^(.+?)v\d+$/.exec(name);
      if (m) versioned.add(m[1]);
    }

  const strains = new Map();
  for (const v of variants.values()) {
    for (const [name, s] of v.strains) {
      const k = mergeKey(name, versioned);
      if (!strains.has(k))
        strains.set(k, { name: k, aliases: new Map(), variants: new Set(), togovar: new Set(), cres: new Set() });
      const stat = strains.get(k);
      if (!stat.aliases.has(name)) stat.aliases.set(name, { name, url: s.url, source: s.source });
      stat.variants.add(v.id);
      if (v.tgv_id) stat.togovar.add(v.id);
      s.cres.forEach((c) => stat.cres.add(c));
    }
  }

  for (const mv of mouseVariants.values())
    mv.strainKeys = new Set([...mv.strains.keys()].map((n) => mergeKey(n, versioned)));

  // Each variant's strains under their merged names, for the human-facing view.
  for (const v of variants.values())
    v.strainKeys = new Set([...v.strains.keys()].map((n) => mergeKey(n, versioned)));

  // Per CRE, which merged strains matched there and on how many variants.
  for (const v of variants.values()) {
    for (const [name, s] of v.strains) {
      const k = mergeKey(name, versioned);
      for (const creId of s.cres) {
        const stat = byCre[creId];
        if (!stat) continue;
        if (!stat.strains.has(k)) stat.strains.set(k, new Set());
        stat.strains.get(k).add(v.id);
      }
    }
  }

  // Every merged strain seen anywhere in these rows, matching or not. This is
  // the denominator the variant bars are drawn against.
  const seenStrains = new Set();
  for (const v of variants.values()) v.strainKeys.forEach((k) => seenStrains.add(k));
  for (const mv of mouseVariants.values()) mv.strainKeys.forEach((k) => seenStrains.add(k));

  const matchedVariants = [...variants.values()].filter((v) => v.matches.length);
  return {
    byCre,
    variants,
    mouseVariants,
    mergeKeyOf: (name) => mergeKey(name, versioned),
    strains: [...strains.values()].sort(
      (a, b) =>
        b.variants.size - a.variants.size ||
        b.togovar.size - a.togovar.size ||
        a.name.localeCompare(b.name)
    ),
    totals: {
      cres: entries.length,
      variants: variants.size,
      matched: matchedVariants.length,
      togovar: [...variants.values()].filter((v) => v.tgv_id).length,
      mouseVariants: mouseVariants.size,
      mouseMatched: [...mouseVariants.values()].filter((v) => v.matched).length,
      strains: seenStrains.size,
    },
  };
}

/** The variants one strain matches, newest-registered first, grouped by CRE. */
export function strainVariants(agg, strainName) {
  const byCreId = new Map();
  for (const v of agg.variants.values()) {
    for (const [name, s] of v.strains) {
      const k = agg.mergeKeyOf(name);
      if (k !== strainName) continue;
      for (const creId of s.cres) {
        if (!byCreId.has(creId)) byCreId.set(creId, []);
        const list = byCreId.get(creId);
        if (!list.some((x) => x.id === v.id)) list.push(v);
      }
    }
  }
  for (const list of byCreId.values())
    list.sort((a, b) => (b.tgv_id ? 1 : 0) - (a.tgv_id ? 1 : 0) || a.id.localeCompare(b.id));
  return byCreId;
}

/**
 * How many ranges go in one request. A range is about 25 characters, so this
 * keeps the query string well inside what a GET is safely carried in; a gene
 * with more CREs than this simply takes a second request.
 */
const RANGES_PER_CALL = 120;

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const rowKey = (r) =>
  [r.allele_grcm39, r.allele_grch38, r.alt_match, r.tgv_id, r.mouse_strains].join('|');

/** Fetches every CRE's variants in one request and aggregates the result. */
export async function collect(sparqlist, mogplusVersion, creEntries) {
  const targets = creEntries
    .map((e) => ({ ...e, range: rangeOf(e.cre, e.species), rows: [], seen: new Set() }))
    .filter((e) => e.range);

  // Several CREs can resolve to the same range, so a range maps to a list.
  const byRange = new Map();
  for (const t of targets) {
    if (!byRange.has(t.range.value)) byRange.set(t.range.value, []);
    byRange.get(t.range.value).push(t);
  }
  const human = [...new Set(targets.filter((t) => t.range.param === 'range').map((t) => t.range.value))];
  const mouse = [...new Set(targets.filter((t) => t.range.param === 'mmu_range').map((t) => t.range.value))];

  // Normally one request. Only a gene with an unusual number of CREs is split,
  // and then the halves are merged independently, which costs a little
  // efficiency but changes no result.
  const batches = [];
  const humanChunks = chunk(human, RANGES_PER_CALL);
  const mouseChunks = chunk(mouse, RANGES_PER_CALL);
  for (let i = 0; i < Math.max(humanChunks.length, mouseChunks.length, 1); i++)
    batches.push([humanChunks[i] || [], mouseChunks[i] || []]);

  await Promise.all(
    batches.map(async ([h, m]) => {
      let rows = [];
      try {
        rows = await fetchRanges(sparqlist, mogplusVersion, h, m);
      } catch (e) {
        console.warn('gene-cre: variants could not be fetched', e);
        return;
      }
      for (const row of rows) {
        const key = rowKey(row);
        for (const value of row.in_range || []) {
          for (const t of byRange.get(value) || []) {
            // A row can be reported in both halves of a split request.
            if (t.seen.has(key)) continue;
            t.seen.add(key);
            t.rows.push(row);
          }
        }
      }
    })
  );

  return aggregate(targets.map(({ seen, ...t }) => t));
}
