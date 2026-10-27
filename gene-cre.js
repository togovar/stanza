import { S as Stanza, d as defineStanzaElement } from './stanza-a61f9e15.js';
import { S as Selection, r as root, a as array, c as constant, i as interpolateNumber, b as color, d as interpolateRgb, e as interpolateString, f as exponent, g as bisectRight, h as formatSpecifier, j as formatPrefix, k as format } from './transform-64d6d8bf.js';
import { s as select } from './select-66661cfd.js';

const e10 = Math.sqrt(50),
    e5 = Math.sqrt(10),
    e2 = Math.sqrt(2);

function tickSpec(start, stop, count) {
  const step = (stop - start) / Math.max(0, count),
      power = Math.floor(Math.log10(step)),
      error = step / Math.pow(10, power),
      factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
  let i1, i2, inc;
  if (power < 0) {
    inc = Math.pow(10, -power) / factor;
    i1 = Math.round(start * inc);
    i2 = Math.round(stop * inc);
    if (i1 / inc < start) ++i1;
    if (i2 / inc > stop) --i2;
    inc = -inc;
  } else {
    inc = Math.pow(10, power) * factor;
    i1 = Math.round(start / inc);
    i2 = Math.round(stop / inc);
    if (i1 * inc < start) ++i1;
    if (i2 * inc > stop) --i2;
  }
  if (i2 < i1 && 0.5 <= count && count < 2) return tickSpec(start, stop, count * 2);
  return [i1, i2, inc];
}

function ticks(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  if (!(count > 0)) return [];
  if (start === stop) return [start];
  const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
  if (!(i2 >= i1)) return [];
  const n = i2 - i1 + 1, ticks = new Array(n);
  if (reverse) {
    if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) / -inc;
    else for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) * inc;
  } else {
    if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) / -inc;
    else for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) * inc;
  }
  return ticks;
}

function tickIncrement(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  return tickSpec(start, stop, count)[2];
}

function tickStep(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
  return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
}

function max(values, valueof) {
  let max;
  if (valueof === undefined) {
    for (const value of values) {
      if (value != null
          && (max < value || (max === undefined && value >= value))) {
        max = value;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null
          && (max < value || (max === undefined && value >= value))) {
        max = value;
      }
    }
  }
  return max;
}

function selectAll(selector) {
  return typeof selector === "string"
      ? new Selection([document.querySelectorAll(selector)], [document.documentElement])
      : new Selection([array(selector)], root);
}

function numberArray(a, b) {
  if (!b) b = [];
  var n = a ? Math.min(b.length, a.length) : 0,
      c = b.slice(),
      i;
  return function(t) {
    for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
    return c;
  };
}

function isNumberArray(x) {
  return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

function genericArray(a, b) {
  var nb = b ? b.length : 0,
      na = a ? Math.min(nb, a.length) : 0,
      x = new Array(na),
      c = new Array(nb),
      i;

  for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
  for (; i < nb; ++i) c[i] = b[i];

  return function(t) {
    for (i = 0; i < na; ++i) c[i] = x[i](t);
    return c;
  };
}

function date(a, b) {
  var d = new Date;
  return a = +a, b = +b, function(t) {
    return d.setTime(a * (1 - t) + b * t), d;
  };
}

function object(a, b) {
  var i = {},
      c = {},
      k;

  if (a === null || typeof a !== "object") a = {};
  if (b === null || typeof b !== "object") b = {};

  for (k in b) {
    if (k in a) {
      i[k] = interpolate(a[k], b[k]);
    } else {
      c[k] = b[k];
    }
  }

  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
}

function interpolate(a, b) {
  var t = typeof b, c;
  return b == null || t === "boolean" ? constant(b)
      : (t === "number" ? interpolateNumber
      : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
      : b instanceof color ? interpolateRgb
      : b instanceof Date ? date
      : isNumberArray(b) ? numberArray
      : Array.isArray(b) ? genericArray
      : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
      : interpolateNumber)(a, b);
}

function interpolateRound(a, b) {
  return a = +a, b = +b, function(t) {
    return Math.round(a * (1 - t) + b * t);
  };
}

function precisionFixed(step) {
  return Math.max(0, -exponent(Math.abs(step)));
}

function precisionPrefix(step, value) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
}

function precisionRound(step, max) {
  step = Math.abs(step), max = Math.abs(max) - step;
  return Math.max(0, exponent(max) - exponent(step)) + 1;
}

function initRange(domain, range) {
  switch (arguments.length) {
    case 0: break;
    case 1: this.range(domain); break;
    default: this.range(range).domain(domain); break;
  }
  return this;
}

function constants(x) {
  return function() {
    return x;
  };
}

function number(x) {
  return +x;
}

var unit = [0, 1];

function identity(x) {
  return x;
}

function normalize(a, b) {
  return (b -= (a = +a))
      ? function(x) { return (x - a) / b; }
      : constants(isNaN(b) ? NaN : 0.5);
}

function clamper(a, b) {
  var t;
  if (a > b) t = a, a = b, b = t;
  return function(x) { return Math.max(a, Math.min(b, x)); };
}

// normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
// interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
function bimap(domain, range, interpolate) {
  var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
  if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
  else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
  return function(x) { return r0(d0(x)); };
}

function polymap(domain, range, interpolate) {
  var j = Math.min(domain.length, range.length) - 1,
      d = new Array(j),
      r = new Array(j),
      i = -1;

  // Reverse descending domains.
  if (domain[j] < domain[0]) {
    domain = domain.slice().reverse();
    range = range.slice().reverse();
  }

  while (++i < j) {
    d[i] = normalize(domain[i], domain[i + 1]);
    r[i] = interpolate(range[i], range[i + 1]);
  }

  return function(x) {
    var i = bisectRight(domain, x, 1, j) - 1;
    return r[i](d[i](x));
  };
}

function copy(source, target) {
  return target
      .domain(source.domain())
      .range(source.range())
      .interpolate(source.interpolate())
      .clamp(source.clamp())
      .unknown(source.unknown());
}

function transformer() {
  var domain = unit,
      range = unit,
      interpolate$1 = interpolate,
      transform,
      untransform,
      unknown,
      clamp = identity,
      piecewise,
      output,
      input;

  function rescale() {
    var n = Math.min(domain.length, range.length);
    if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
    piecewise = n > 2 ? polymap : bimap;
    output = input = null;
    return scale;
  }

  function scale(x) {
    return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
  }

  scale.invert = function(y) {
    return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
  };

  scale.domain = function(_) {
    return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
  };

  scale.range = function(_) {
    return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
  };

  scale.rangeRound = function(_) {
    return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
  };

  scale.clamp = function(_) {
    return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
  };

  scale.interpolate = function(_) {
    return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
  };

  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };

  return function(t, u) {
    transform = t, untransform = u;
    return rescale();
  };
}

function continuous() {
  return transformer()(identity, identity);
}

function tickFormat(start, stop, count, specifier) {
  var step = tickStep(start, stop, count),
      precision;
  specifier = formatSpecifier(specifier == null ? ",f" : specifier);
  switch (specifier.type) {
    case "s": {
      var value = Math.max(Math.abs(start), Math.abs(stop));
      if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
      return formatPrefix(specifier, value);
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
      break;
    }
    case "f":
    case "%": {
      if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
      break;
    }
  }
  return format(specifier);
}

function linearish(scale) {
  var domain = scale.domain;

  scale.ticks = function(count) {
    var d = domain();
    return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
  };

  scale.tickFormat = function(count, specifier) {
    var d = domain();
    return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
  };

  scale.nice = function(count) {
    if (count == null) count = 10;

    var d = domain();
    var i0 = 0;
    var i1 = d.length - 1;
    var start = d[i0];
    var stop = d[i1];
    var prestep;
    var step;
    var maxIter = 10;

    if (stop < start) {
      step = start, start = stop, stop = step;
      step = i0, i0 = i1, i1 = step;
    }
    
    while (maxIter-- > 0) {
      step = tickIncrement(start, stop, count);
      if (step === prestep) {
        d[i0] = start;
        d[i1] = stop;
        return domain(d);
      } else if (step > 0) {
        start = Math.floor(start / step) * step;
        stop = Math.ceil(stop / step) * step;
      } else if (step < 0) {
        start = Math.ceil(start * step) / step;
        stop = Math.floor(stop * step) / step;
      } else {
        break;
      }
      prestep = step;
    }

    return scale;
  };

  return scale;
}

function linear() {
  var scale = continuous();

  scale.copy = function() {
    return copy(scale, linear());
  };

  initRange.apply(scale, arguments);

  return linearish(scale);
}

function transformPow(exponent) {
  return function(x) {
    return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
  };
}

function transformSqrt(x) {
  return x < 0 ? -Math.sqrt(-x) : Math.sqrt(x);
}

function transformSquare(x) {
  return x < 0 ? -x * x : x * x;
}

function powish(transform) {
  var scale = transform(identity, identity),
      exponent = 1;

  function rescale() {
    return exponent === 1 ? transform(identity, identity)
        : exponent === 0.5 ? transform(transformSqrt, transformSquare)
        : transform(transformPow(exponent), transformPow(1 / exponent));
  }

  scale.exponent = function(_) {
    return arguments.length ? (exponent = +_, rescale()) : exponent;
  };

  return linearish(scale);
}

function pow() {
  var scale = powish(transformer());

  scale.copy = function() {
    return copy(scale, pow()).exponent(scale.exponent());
  };

  initRange.apply(scale, arguments);

  return scale;
}

function sqrt() {
  return pow.apply(null, arguments).exponent(0.5);
}

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
 * carries `in_range`, the requested ranges it belongs to. A failed request or
 * an unexpected answer throws, so it is not mistaken for "no variants".
 */
async function fetchRanges(sparqlist, mogplusVersion, human, mouse) {
  if (!human.length && !mouse.length) return [];
  const url =
    sparqlist + '/api/gene_cre_mogp?mogplus_ver=' + encodeURIComponent(mogplusVersion) +
    (human.length ? '&ranges=' + encodeURIComponent(human.join(',')) : '') +
    (mouse.length ? '&mmu_ranges=' + encodeURIComponent(mouse.join(',')) : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gene_cre_mogp returned status ${res.status}`);
  const text = await res.text();
  // The API answers with plain text, not JSON, when there is nothing to show.
  if (!text || NOT_FOUND.test(text)) return [];
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('gene_cre_mogp returned an invalid response');
  return parsed;
}

/**
 * Which range a CRE's variants are looked up in.
 *
 * A human CRE is asked for by its own GRCh38 position. A mouse CRE is asked for
 * by its **GRCm39** position, which gene_cre derived straight from GRCm38:
 * routing a mouse CRE through the human genome dropped the ones with no human
 * counterpart and truncated the rest to the part that aligns to human.
 */
function rangeOf(cre, speciesLabel) {
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
function parseStrains(cell) {
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
function aggregate(entries) {
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
          // As for the human variants above, the first row that carries an ID
          // keeps it with its link; a later row without one does not erase it.
          const prev = mv.human.get(id);
          const tgv = prev?.tgv_id ? prev : row;
          const rs = prev?.rs ? prev : row;
          mv.human.set(id, { id, tgv_id: tgv.tgv_id || '', tgv_link: tgv.tgv_link || '', rs: rs.rs || '',
            rs_link: rs.rs_link || '', match: row.alt_match === 'Yes' || (prev && prev.match) || false });
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
  // Mouse alleles without an exact human match carry strains too, so both maps
  // are read; otherwise a JAX name seen only there would never be merged.
  const versioned = new Set();
  for (const collection of [variants, mouseVariants])
    for (const variant of collection.values())
      for (const name of variant.strains.keys()) {
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
function strainVariants(agg, strainName) {
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
async function collect(sparqlist, mogplusVersion, creEntries) {
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

  // A failed batch rejects the whole collection, so index.js shows the variants
  // as unavailable instead of drawing a partial result as if it were complete.
  await Promise.all(
    batches.map(async ([h, m]) => {
      const rows = await fetchRanges(sparqlist, mogplusVersion, h, m);
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

  return aggregate(targets.map(({ seen: _seen, ...t }) => t));
}

/**
 * Drawing of the human / mouse CRE comparison.
 *
 * Top to bottom: the human genome track (ruler, CRE blocks drawn to scale and
 * the baseline), the CRE correspondence panel (one card per CRE, joined by
 * links whose weight is the number of shared orthologous TFs) and the mouse
 * genome track, mirrored. Both genome tracks share one bp-per-pixel scale, so
 * the liftOver ribbon shown on hover connects comparable distances.
 *
 * Interaction: hovering previews, clicking pins. What is pinned — a CRE, a
 * pair of CREs, or a single transcription factor — is shown in the details
 * panel under the drawing and dims everything it does not concern.
 */

const L = {
  marginLeft: 112,
  marginRight: 28,
  marginTop: 8,
  marginBottom: 4,
  rulerHeight: 22,
  geneRow: 18,
  baselineGap: 9,
  blockHeight: 13,
  blockRow: 17,
  trackGap: 30,
  cardHeight: 34,
  cardNameHeight: 18,
  cardGap: 18,
  cardMinWidth: 104,
  cardMaxWidth: 184,
  linkHeight: 140,
  emptyLinkHeight: 64,
  minPlotWidth: 520,
};

const SPECIES = {
  human: { property: '--togostanza-cre-human-color', accent: '#249eb3' },
  mouse: { property: '--togostanza-cre-mouse-color', accent: '#ca678d' },
};

/** Accent colour of a species, overridable through the stanza style parameters. */
function palette(node, key) {
  const defaults = SPECIES[key];
  const custom = getComputedStyle(node).getPropertyValue(defaults.property).trim();
  const accent = custom && color(custom) ? custom : defaults.accent;
  const c = color(accent);
  return {
    accent,
    light: c.copy({ opacity: 0.16 }).formatRgb(),
    deep: c.darker(0.9).formatHex(),
  };
}

const fmtPos = format(',');
const key = (s) => String(s || '').toUpperCase();

const escapeHtml = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const dlRow = (label, value) => '<dt>' + escapeHtml(label) + '</dt><dd>' + value + '</dd>';

const truncate = (text, max) => {
  const s = String(text || '');
  return s.length > max ? s.slice(0, Math.max(max - 1, 1)) + '…' : s;
};

/**
 * The genomic window a species' track covers: its own CREs plus wherever the
 * other species' CREs lift over to, so both tracks share one bp-per-pixel scale.
 */
function speciesWindow(list, other) {
  const positions = list.flatMap((d) => [d.cre_start, d.cre_end]).concat(
    other.flatMap((d) => [d.lift_start, d.lift_end]).filter((p) => p != null)
  );
  return positions.length ? [Math.min(...positions), Math.max(...positions)] : [0, 1];
}

/** Greedy packing of the CRE blocks into as few rows as possible. */
function packRows(items, xOf, wOf, pad = 5) {
  const ends = [];
  const placed = items
    .slice()
    .sort((a, b) => xOf(a) - xOf(b))
    .map((d) => {
      const x = xOf(d);
      const w = Math.max(wOf(d), 4);
      let r = ends.findIndex((end) => end + pad < x);
      if (r < 0) r = ends.length;
      ends[r] = x + w;
      return { d, x, w, row: r };
    });
  return { placed, rows: Math.max(ends.length, 1) };
}

/**
 * Cross-references the TF lists so that every view can answer "is this TF
 * shared, and with what?". Shared TFs are reported by the API in human symbol
 * case, and mouse symbols differ from them only in case, so the match is made
 * on the upper-cased symbol.
 */
function buildIndex(data) {
  const creById = new Map();
  const pairsByCre = new Map();
  const pairsByTf = new Map();
  const sharedByCre = new Map();
  const symbolByKey = new Map();

  for (const sp of ['human', 'mouse']) {
    for (const cre of data[sp].cre) {
      creById.set(cre.cre_id, { cre, species: sp });
      pairsByCre.set(cre.cre_id, []);
      sharedByCre.set(cre.cre_id, new Set());
      for (const t of cre.tf || []) symbolByKey.set(key(t.symbol) + '|' + sp, t.symbol);
    }
  }

  (data.pairs || []).forEach((pair, index) => {
    pair.index = index;
    pair.tfKeys = new Set((pair.and_tf || []).map(key));
    for (const id of [pair.human_cre, pair.mouse_cre]) {
      if (pairsByCre.has(id)) pairsByCre.get(id).push(pair);
      const shared = sharedByCre.get(id);
      if (shared) pair.tfKeys.forEach((k) => shared.add(k));
    }
    pair.tfKeys.forEach((k) => {
      if (!pairsByTf.has(k)) pairsByTf.set(k, []);
      pairsByTf.get(k).push(pair);
    });
  });

  return { creById, pairsByCre, pairsByTf, sharedByCre, symbolByKey };
}

/**
 * @param {object} o
 * @param {SVGElement} o.svg        the <svg> to draw into
 * @param {HTMLElement} o.popup     floating preview box
 * @param {HTMLElement} o.container element the popup is positioned against
 * @param {HTMLElement} o.panel     details panel under the drawing
 * @param {HTMLElement} o.focusPanel  gene-level ranking, mouse strains or human variants
 * @param {HTMLElement} [o.orientation] the axis-orientation switch above the drawing
 * @param {function} [o.redraw]      re-runs draw(), for changes that alter the geometry
 * @param {HTMLElement} [o.table]   togostanza-pagination-table for variants
 * @param {HTMLElement} [o.caption] heading above that table
 * @param {object} o.data           {human, mouse, pairs}
 * @param {object} o.state          {selection, activeTf}, kept across redraws
 * @param {object} o.links          {sparqlist, mogplusVersion}
 */
function draw({
  svg: svgNode, popup, container, panel, focusPanel, orientation, table, caption, data, state, links, redraw,
}) {
  const svg = select(svgNode);
  svg.selectAll('*').remove();

  const human = { ...palette(svgNode, 'human'), ...data.human };
  const mouse = { ...palette(svgNode, 'mouse'), ...data.mouse };
  const pairs = data.pairs || [];
  const species = { human, mouse };
  const index = buildIndex({ human, mouse, pairs });

  //// ---------------------------------------------------------------- scales
  const available = Math.max(container.clientWidth || 0, L.minPlotWidth + L.marginLeft + L.marginRight);
  // Only CREs that carry a ChIP-Atlas antigen get a card: the row is the TF
  // comparison, and a CRE with no TF can never join a link. The rest stay on
  // the genome tracks, where they are still clickable for their variants.
  const carded = {
    human: human.cre.filter((d) => (d.tf || []).length),
    mouse: mouse.cre.filter((d) => (d.tf || []).length),
  };
  const cardCount = Math.max(carded.human.length, carded.mouse.length, 1);
  const cardsNeed = cardCount * L.cardMinWidth + (cardCount - 1) * L.cardGap;
  const plotWidth = Math.max(available - L.marginLeft - L.marginRight, cardsNeed, L.minPlotWidth);

  const [humanMin, humanMax] = speciesWindow(human.cre, mouse.cre);
  const [mouseMin, mouseMax] = speciesWindow(mouse.cre, human.cre);
  // One shared bp-per-pixel scale, so both tracks are directly comparable.
  const bpSpan = Math.max(humanMax - humanMin + 1, mouseMax - mouseMin + 1);
  // In "gene" orientation a minus-strand gene has its axis reversed, so both
  // tracks run 5' to 3' left to right and the liftOver ribbons stop crossing.
  const reversed = (key) =>
    state.orientation === 'gene' && !!species[key].gene && species[key].gene.strand === '-';
  const axis = (key, min) =>
    linear()
      .domain([min, min + bpSpan])
      .range(reversed(key) ? [plotWidth, 0] : [0, plotWidth]);

  const xOf = { human: axis('human', humanMin), mouse: axis('mouse', mouseMin) };

  // A reversed axis makes end < start in pixels, so blocks are placed from
  // whichever edge comes first on screen.
  const left = (key) => (d) => Math.min(xOf[key](d.cre_start), xOf[key](d.cre_end));
  const wide = (key) => (d) => Math.abs(xOf[key](d.cre_end) - xOf[key](d.cre_start));

  const packOf = {
    human: packRows(human.cre, left('human'), wide('human')),
    mouse: packRows(mouse.cre, left('mouse'), wide('mouse')),
  };

  // The species the page was opened from leads: it takes the upper track, and
  // the ranking under the drawing starts on its own side.
  const topKey = data.primary === 'mouse' ? 'mouse' : 'human';
  const bottomKey = topKey === 'human' ? 'mouse' : 'human';

  //// ------------------------------------------------------------ vertical y
  // Each genome track is a baseline with the CRE blocks on the side facing
  // away from the cards and the ruler on the side facing them, so the two
  // tracks mirror each other around the correspondence panel.
  const topBlocksH = packOf[topKey].rows * L.blockRow;
  const bottomBlocksH = packOf[bottomKey].rows * L.blockRow;
  const cardBlockH = L.cardHeight + L.cardNameHeight;
  const linkHeight = pairs.length ? L.linkHeight : L.emptyLinkHeight;

  const geneRow = human.gene || mouse.gene ? L.geneRow : 0;
  const trackBelow = L.rulerHeight + geneRow;

  // The CRE name goes on the side of the pill the links do not leave from:
  // above for the upper row, below for the lower one.
  const yTopBase = L.marginTop + topBlocksH + L.baselineGap;
  const yTopCards = yTopBase + trackBelow + L.trackGap + L.cardNameHeight;
  const yLinkTop = yTopCards + L.cardHeight;
  const yBottomCards = yLinkTop + linkHeight;
  const yBottomBase = yBottomCards + cardBlockH + L.trackGap + trackBelow;
  const height = yBottomBase + L.baselineGap + bottomBlocksH + L.marginBottom;
  const yCards = { [topKey]: yTopCards, [bottomKey]: yBottomCards };

  const totalWidth = plotWidth + L.marginLeft + L.marginRight;
  svgNode.setAttribute('width', totalWidth);
  svgNode.setAttribute('height', height);
  svgNode.setAttribute('viewBox', `0 0 ${totalWidth} ${height}`);

  const defs = svg.append('defs');
  const gradient = defs
    .append('linearGradient')
    .attr('id', 'cre-link-gradient')
    .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
  gradient.append('stop').attr('offset', '0%').attr('stop-color', species[topKey].accent);
  gradient.append('stop').attr('offset', '100%').attr('stop-color', species[bottomKey].accent);

  // Clicking anywhere that is not a CRE or a link clears the selection.
  svg
    .append('rect')
    .attr('class', 'backdrop')
    .attr('width', totalWidth)
    .attr('height', height)
    .on('click', () => select$1(null));

  const plot = svg.append('g').attr('transform', `translate(${L.marginLeft}, 0)`);
  // Drawn first so the liftOver ribbons stay behind everything else.
  const liftLayer = plot.append('g').attr('class', 'lift_layer');
  const trackLayer = plot.append('g').attr('class', 'track_layer');
  const linkLayer = plot.append('g').attr('class', 'link_layer');
  const cardLayer = plot.append('g').attr('class', 'card_layer');

  //// ----------------------------------------------------------- the preview
  let pointer = { x: 0, y: 0 };
  // Assigned rather than added, so a redraw does not stack up listeners.
  svgNode.onmousemove = (e) => {
    const box = container.getBoundingClientRect();
    pointer = { x: e.clientX - box.left, y: e.clientY - box.top };
    if (!popup.classList.contains('hidden')) place();
  };
  const place = () => {
    const left = Math.min(pointer.x + 18, container.clientWidth - popup.offsetWidth - 8);
    const top = Math.min(pointer.y + 14, container.clientHeight - popup.offsetHeight - 8);
    popup.style.left = Math.max(left, 4) + 'px';
    popup.style.top = Math.max(top, 4) + 'px';
  };
  const showPopup = (e, html) => {
    // The pointer is taken from the event as well, because mouseover can reach
    // us before the first mousemove on the svg.
    if (e) {
      const box = container.getBoundingClientRect();
      pointer = { x: e.clientX - box.left, y: e.clientY - box.top };
    }
    popup.innerHTML = html;
    popup.classList.remove('hidden');
    place();
  };
  const hidePopup = () => popup.classList.add('hidden');

  /** Hovering anything about a CRE lights up its other representation. */
  const hoverCres = (ids, on) =>
    ids.forEach((id) => plot.selectAll('.box_' + id).classed('is-hover', on));

  //// ------------------------------------------------------ the gene itself
  /**
   * The gene drawn on the baseline: a thick segment over its extent, chevrons
   * pointing the way it is read, and a flagged tick at the transcription start.
   * When the gene runs off the window the flag is pinned to the edge instead.
   */
  const drawGene = (g, sp, x, yBase, direction) => {
    const gene = sp.gene;
    if (!gene) return;
    const gg = g.append('g').attr('class', 'gene_g');
    const clamp = (v) => Math.max(0, Math.min(plotWidth, v));
    const a = clamp(x(gene.low));
    const b = clamp(x(gene.high));
    const [x0, x1] = [Math.min(a, b), Math.max(a, b)];
    const xTss = x(gene.tss);
    const onScreen = xTss >= -0.5 && xTss <= plotWidth + 0.5;
    // Which way the gene reads on screen, after any axis reversal.
    const forward = x(gene.end) >= xTss;

    if (x1 - x0 > 0.5) {
      gg.append('line')
        .attr('class', 'gene_body')
        .attr('x1', x0).attr('x2', x1)
        .attr('y1', yBase).attr('y2', yBase)
        .attr('stroke', sp.accent);

      // chevrons, sparse enough not to read as a dashed line
      const step = 46;
      for (let px = x0 + step / 2; px < x1; px += step) {
        const tip = forward ? 4 : -4;
        gg.append('path')
          .attr('class', 'gene_chevron')
          .attr('stroke', sp.accent)
          .attr('d', `M ${px - tip} ${yBase - 3} L ${px + tip} ${yBase} L ${px - tip} ${yBase + 3}`);
      }
    }

    // The flag stays inside the gene row, clear of the ruler beyond it.
    const [d0, d1] = x.domain();
    const gap = gene.tss < d0 ? d0 - gene.tss : gene.tss > d1 ? gene.tss - d1 : 0;
    const tickEnd = yBase + direction * 12;
    // Off-window, the flag is pinned to the edge and points at where it went.
    const toward = onScreen ? forward : xTss < 0;
    const tick = gg.append('g').attr('class', 'tss_g').attr('transform', `translate(${clamp(xTss)}, 0)`);
    tick.append('line')
      .attr('class', 'tss_tick')
      .attr('stroke', sp.accent)
      .attr('y1', yBase).attr('y2', tickEnd);
    tick.append('path')
      .attr('class', 'tss_head')
      .attr('fill', sp.accent)
      .attr('d', `M ${toward ? 8 : -8} ${tickEnd} L 0 ${tickEnd - 4} L 0 ${tickEnd + 4} Z`);
    tick.append('text')
      .attr('class', 'tss_label')
      .attr('x', toward ? 12 : -12)
      .attr('text-anchor', toward ? 'start' : 'end')
      .attr('y', tickEnd)
      .attr('dominant-baseline', 'middle')
      .attr('fill', sp.deep)
      .text(gene.symbol + ' TSS' + (gap ? ' ' + fmtPos(gap) + ' bp off' : ''));

    tick
      .append('title')
      .text(
        gene.symbol + ' transcription start ' + fmtPos(gene.tss) +
        ', ' + (gene.strand === '+' ? 'plus' : 'minus') + ' strand, gene spans ' +
        fmtPos(gene.high - gene.low + 1) + ' bp' +
        (gap ? ' (' + fmtPos(gap) + ' bp outside this window)' : '')
      );
  };

  //// ------------------------------------------------------------ the tracks
  const drawTrack = (sp, other, x, pack, yBase, direction) => {
    const g = trackLayer.append('g').attr('class', sp.label + '_track');

    const label = g
      .append('g')
      .attr('transform', `translate(${-L.marginLeft + 8}, ${yBase + (direction > 0 ? -6 : 18)})`)
      .attr('class', 'track_label');
    label.append('text').attr('class', 'track_label_species').text(sp.title);
    label
      .append('text')
      .attr('class', 'track_label_locus')
      .attr('y', 13)
      .text((sp.cre[0] && sp.cre[0].cre_chrom ? sp.cre[0].cre_chrom + ' · ' : '') + sp.assemblyLabel);

    g.append('line')
      .attr('class', 'sequence')
      .attr('x1', 0).attr('x2', plotWidth)
      .attr('y1', yBase).attr('y2', yBase);

    // the gene body on the baseline, then the ruler beyond it
    drawGene(g, sp, x, yBase, direction);

    const ruler = g
      .append('g')
      .attr('class', 'ruler')
      .attr('transform', `translate(0, ${yBase + direction * geneRow})`);
    const ticks = x.ticks(Math.max(3, Math.round(plotWidth / 170)));
    const tick = ruler.selectAll('g').data(ticks).enter().append('g')
      .attr('transform', (d) => `translate(${x(d)}, 0)`);
    tick.append('line').attr('y1', 0).attr('y2', direction > 0 ? 5 : -5);
    tick.append('text').attr('y', direction > 0 ? 16 : -9).text((d) => fmtPos(d));

    const yOfRow = (r) => (direction > 0
      ? yBase - L.baselineGap - (r + 1) * L.blockRow + (L.blockRow - L.blockHeight)
      : yBase + L.baselineGap + r * L.blockRow);

    const block = g
      .selectAll('.cre_block_g')
      .data(pack.placed)
      .enter()
      .append('g')
      .attr('class', 'cre_block_g')
      .attr('transform', (p) => `translate(${p.x}, ${yOfRow(p.row)})`)  // p.x is already the on-screen left
      .on('mouseover', (e, p) => {
        showPopup(e, positionPreview(p.d, sp, other));
        hoverCres([p.d.cre_id], true);
        plot.select('#liftover_' + p.d.cre_id).classed('hidden', false);
      })
      .on('mouseout', (e, p) => {
        hidePopup();
        hoverCres([p.d.cre_id], false);
        plot.selectAll('.liftover_poly').classed('hidden', true);
      })
      .on('click', (e, p) => {
        e.stopPropagation();
        select$1({ kind: 'cre', cre: p.d.cre_id });
      });

    block
      .append('rect')
      .attr('class', (p) =>
        'cre_block box_' + p.d.cre_id + (p.d.lift_start == null ? ' no_lift' : '') +
        ((p.d.tf || []).length ? '' : ' no_tf'))
      .attr('width', (p) => p.w)
      .attr('height', L.blockHeight)
      .attr('fill', sp.light)
      .attr('stroke', sp.accent);

    return block;
  };

  //// ------------------------------------------------------- liftOver ribbons
  const drawLift = (list, x, xOther, yFrom, yTo) => {
    liftLayer
      .selectAll(null)
      .data(list.filter((d) => d.lift_start != null))
      .enter()
      .append('polygon')
      .attr('class', 'liftover_poly hidden')
      .attr('id', (d) => 'liftover_' + d.cre_id)
      .attr('points', (d) =>
        [
          [x(d.match_start), yFrom],
          [xOther(d.lift_start), yTo],
          [xOther(d.lift_end), yTo],
          [x(d.match_end), yFrom],
        ]
          .map((p) => p.join(','))
          .join(' ')
      );
  };

  //// ------------------------------------------------------------- the cards
  const cardWidth = Math.min(
    L.cardMaxWidth,
    Math.max(L.cardMinWidth, (plotWidth - (cardCount - 1) * L.cardGap) / cardCount)
  );
  const cardX = (slot, n) => {
    const rowWidth = n * cardWidth + (n - 1) * L.cardGap;
    return (plotWidth - rowWidth) / 2 + slot * (cardWidth + L.cardGap);
  };

  /**
   * Cards are laid out in the order their CREs appear on their own track, so
   * the row follows the axis: reverse a track and its cards reverse with it.
   * The CRE list's own order is not relied on.
   */
  const slotOf = {};
  const cardRow = {};
  for (const key of ['human', 'mouse']) {
    const x = xOf[key];
    const order = species[key].cre
      .map((d, i) => ({ d, i, at: x(d.cre_start), end: x(d.cre_end) }))
      .filter((o) => (o.d.tf || []).length)
      .sort((a, b) => a.at - b.at || a.end - b.end || a.d.cre_id.localeCompare(b.d.cre_id));
    slotOf[key] = new Map(order.map((o, slot) => [o.i, slot]));
    cardRow[key] = order.map((o) => o.d);
  }
  const cardCenter = (key, i) =>
    cardX(slotOf[key].has(i) ? slotOf[key].get(i) : 0, Math.max(cardRow[key].length, 1)) + cardWidth / 2;

  const drawCards = (sp) => {
    const row = cardRow[sp.label];
    const g = cardLayer
      .selectAll(null)
      .data(row)
      .enter()
      .append('g')
      .attr('class', 'cre_card_g')
      // The row is already in slot order, so the bound index is the slot.
      .attr('transform', (d, slot) => `translate(${cardX(slot, row.length)}, ${yCards[sp.label]})`)
      .on('mouseover', (e, d) => {
        showPopup(e, crePreview(d, sp));
        hoverCres([d.cre_id], true);
      })
      .on('mouseout', (e, d) => {
        hidePopup();
        hoverCres([d.cre_id], false);
      })
      .on('click', (e, d) => {
        e.stopPropagation();
        select$1({ kind: 'cre', cre: d.cre_id });
      });

    g.append('rect')
      // A CRE with no ChIP-Atlas antigen can never join a link; saying so on
      // the card stops its empty row of connections reading as a bug.
      .attr('class', (d) => 'cre_card box_' + d.cre_id)
      .attr('width', cardWidth)
      .attr('height', L.cardHeight)
      .attr('rx', L.cardHeight / 2)
      .attr('fill', sp.light)
      .attr('stroke', sp.accent);

    // The id sets the smallest useful card, so the type shrinks with the card
    // rather than overflowing it once a gene has many CREs.
    const idSize = Math.max(10, Math.min(14, Math.floor((cardWidth - 18) / 6.4)));
    g.append('text')
      .attr('class', 'cre_card_id')
      .attr('x', cardWidth / 2)
      .attr('y', L.cardHeight / 2 + idSize * 0.36)
      .attr('font-size', idSize)
      .attr('fill', sp.deep)
      .text((d) => d.cre_id);

    g.append('text')
      .attr('class', 'cre_card_name')
      .attr('x', cardWidth / 2)
      .attr('y', sp.label === topKey ? -10 : L.cardHeight + 12)
      .text((d) => truncate(d.cre_name, Math.floor(cardWidth / 6)));

    // A ring marking the CREs that bind the highlighted TF.
    g.append('circle')
      .attr('class', 'tf_marker')
      .attr('cx', cardWidth - 13)
      .attr('cy', L.cardHeight / 2)
      .attr('r', 4.5);

    // How many variants here a mouse strain carries the same substitution for.
    // It sits on the top-left corner so it never runs into the centred ID.
    const badge = g.append('g').attr('class', 'match_badge');
    badge.append('rect')
      .attr('x', -1).attr('y', -7)
      .attr('width', 21).attr('height', 15).attr('rx', 7.5);
    badge.append('text').attr('x', 9.5).attr('y', 4);

    return g;
  };

  //// ------------------------------------------------------------- the links
  const weight = sqrt().domain([1, max(pairs, (d) => d.and) || 1]).range([1.5, 9]);

  /**
   * Where each link meets its card. Links that share a card are spread along
   * its edge, each taking room for its own stroke, so a bundle of parallel
   * links cannot merge into one fat band and be read as a single thick link.
   * The fan stays centred on the card and is compressed if it would overflow.
   */
  const anchorOf = new Map();
  {
    const gap = 3;
    const usable = Math.max(cardWidth - 12, 24);
    for (const key of [topKey, bottomKey]) {
      const otherKey = key === topKey ? bottomKey : topKey;
      const byCard = new Map();
      for (const pair of pairs) {
        const i = pair[key + '_cre_index'];
        if (!byCard.has(i)) byCard.set(i, []);
        byCard.get(i).push(pair);
      }
      for (const [i, list] of byCard) {
        // Ordered by where the other end sits, so the fan does not self-cross.
        list.sort(
          (a, b) =>
            cardCenter(otherKey, a[otherKey + '_cre_index']) -
              cardCenter(otherKey, b[otherKey + '_cre_index']) || a.index - b.index
        );
        const need = list.reduce((sum, p) => sum + weight(p.and) + gap, 0);
        const span = Math.min(need, usable);
        const scale = span / need;
        let at = cardCenter(key, i) - span / 2;
        for (const p of list) {
          const room = (weight(p.and) + gap) * scale;
          if (!anchorOf.has(p.index)) anchorOf.set(p.index, {});
          anchorOf.get(p.index)[key === topKey ? 'top' : 'bottom'] = at + room / 2;
          at += room;
        }
      }
    }
  }

  const yLinkBottom = yBottomCards;
  const bend = (yLinkBottom - yLinkTop) * 0.45;

  const linkPath = linkLayer
    .selectAll(null)
    .data(pairs.slice().sort((a, b) => a.and - b.and))
    .enter()
    .append('path')
    .attr('class', 'cre_pair_path')
    .attr('stroke-width', (d) => weight(d.and))
    .attr('d', (d) => {
      const a = anchorOf.get(d.index) || {};
      const x1 = a.top != null ? a.top : cardCenter(topKey, d[topKey + '_cre_index']);
      const x2 = a.bottom != null ? a.bottom : cardCenter(bottomKey, d[bottomKey + '_cre_index']);
      return `M ${x1} ${yLinkTop} C ${x1} ${yLinkTop + bend}, ${x2} ${yLinkBottom - bend}, ${x2} ${yLinkBottom}`;
    })
    .on('mouseover', (e, d) => {
      showPopup(e, pairPreview(d));
      hoverCres([d.human_cre, d.mouse_cre], true);
      select(e.currentTarget).classed('is-hover', true);
    })
    .on('mouseout', (e, d) => {
      hidePopup();
      hoverCres([d.human_cre, d.mouse_cre], false);
      select(e.currentTarget).classed('is-hover', false);
    })
    .on('click', (e, d) => {
      e.stopPropagation();
      select$1({ kind: 'pair', pair: d.index });
    });

  //// ---------------------------------------------------------- preview text
  function crePreview(d, sp) {
    const shared = index.sharedByCre.get(d.cre_id) || new Set();
    return (
      '<h4><span class="swatch" style="background:' + sp.accent + '"></span>' +
      escapeHtml(d.cre_id) + '</h4><dl>' +
      dlRow('Name', escapeHtml(d.cre_name)) +
      dlRow('Position', escapeHtml(d.cre_chrom + ':' + fmtPos(d.cre_start) + '-' + fmtPos(d.cre_end))) +
      dlRow(
        'Bound TFs',
        (d.tf || []).length
          ? (d.tf || []).length + (shared.size ? ', <b>' + shared.size + '</b> shared' : '')
          : '<span class="muted">none in ChIP-Atlas</span>'
      ) +
      (() => {
        const stat = creStat(d.cre_id);
        return stat && stat.matched.size
          ? dlRow('Variants', stat.variants.size + ', <b>' + stat.matched.size + '</b> matched by a strain')
          : '';
      })() +
      '</dl><p class="hint">Click for the full TF list</p>'
    );
  }

  function positionPreview(d, sp, other) {
    let html =
      '<h4><span class="swatch" style="background:' + sp.accent + '"></span>' +
      escapeHtml(d.cre_id) + '</h4><dl>' +
      dlRow(sp.assemblyLabel, escapeHtml(d.cre_chrom + ':' + fmtPos(d.cre_start) + '-' + fmtPos(d.cre_end)));
    if (d.lift_start != null) {
      const from = Math.min(d.lift_start, d.lift_end);
      const to = Math.max(d.lift_start, d.lift_end);
      const length = d.cre_end - d.cre_start + 1;
      const aligned = d.lift_aligned != null ? d.lift_aligned : d.match_end - d.match_start + 1;
      html +=
        dlRow(
          other.assemblyLabel,
          escapeHtml(d.lift_chr + ':' + fmtPos(from) + '-' + fmtPos(to)) +
            (d.lift_start > d.lift_end ? ' <span class="muted">(minus strand)</span>' : '')
        ) +
        dlRow('Aligned', Math.round((aligned / length) * 100) + '% of the CRE');
      const stat = creStat(d.cre_id);
      if (stat && stat.variants.size)
        html += dlRow(
          'Variants',
          stat.variants.size + ', <b>' + stat.matched.size + '</b> matched by a strain'
        );
    } else {
      html += dlRow(other.assemblyLabel, '<span class="muted">no orthologous position</span>');
    }
    return html + '</dl><p class="hint">Click for the full TF list</p>';
  }

  function pairPreview(d) {
    return (
      '<h4>' + escapeHtml(d.human_cre) + ' &harr; ' + escapeHtml(d.mouse_cre) + '</h4><dl>' +
      dlRow('Shared orthologous TFs', '<b>' + d.and_tf.length + '</b>') +
      dlRow('Jaccard index', d.jaccard) +
      '</dl><p class="hint">Click to compare the two TF sets</p>'
    );
  }

  //// ------------------------------------------------- the orientation switch
  function renderOrientation() {
    if (!orientation) return;
    const flippable = species.human.gene && species.mouse.gene &&
      species.human.gene.strand !== species.mouse.gene.strand;
    const tab = (value, label, title) =>
      '<button type="button" class="orient-tab' + (state.orientation === value ? ' is-selected' : '') +
      '" data-orient="' + value + '" title="' + escapeHtml(title) + '">' + label + '</button>';
    orientation.innerHTML =
      '<span class="orient-label">Axis</span>' +
      '<span class="orient-tabs">' +
      tab('genome', 'Genome +', 'Both axes run along the plus strand, as the coordinates are written') +
      tab('gene', 'Gene 5&prime;&rarr;3&prime;', 'Each axis follows its own gene, so both read left to right') +
      '</span>' +
      (flippable
        ? '<span class="orient-note">' + escapeHtml(species.human.symbol) + ' is on the ' +
          species.human.gene.strand + ' strand and ' + escapeHtml(species.mouse.symbol) + ' on the ' +
          species.mouse.gene.strand + ', so the two disagree.</span>'
        : '');
  }

  if (orientation)
    orientation.onclick = (e) => {
      const target = e.target.closest('[data-orient]');
      if (!target || state.orientation === target.dataset.orient) return;
      state.orientation = target.dataset.orient;
      redraw();
    };

  //// ------------------------------------------------------------ the state
  function select$1(next) {
    state.selection = next;
    // A TF highlight belongs to what it was picked from.
    if (!next) state.activeTf = null;
    hidePopup();
    applyState();
  }

  function highlightTf(tf) {
    state.activeTf = state.activeTf === tf ? null : tf;
    applyState();
  }

  const pairOf = (sel) => (sel && sel.kind === 'pair' ? pairs[sel.pair] : null);
  const creOf = (sel) => (sel && sel.kind === 'cre' ? index.creById.get(sel.cre) : null);
  const strainOf = (sel) =>
    sel && sel.kind === 'strain' && state.variants
      ? state.variants.strains.find((s) => s.name === sel.strain)
      : null;
  const variantOf = (sel) =>
    sel && sel.kind === 'variant' && state.variants ? state.variants.variants.get(sel.variant) : null;
  const mVariantOf = (sel) =>
    sel && sel.kind === 'mvariant' && state.variants ? state.variants.mouseVariants.get(sel.mvariant) : null;
  const creStat = (id) => (state.variants && state.variants.byCre[id]) || null;

  const creHasTf = (cre, tfKey) => (cre.tf || []).some((t) => key(t.symbol) === tfKey);

  // A highlighted TF adds to what is pinned instead of narrowing it: the
  // comparison stays open while every other pair sharing that TF lights up.
  function pairInFocus(pair) {
    const tfKey = state.activeTf && key(state.activeTf);
    if (tfKey && pair.tfKeys.has(tfKey)) return true;
    const sel = state.selection;
    if (!sel) return !tfKey;
    if (sel.kind === 'strain' || sel.kind === 'variant' || sel.kind === 'mvariant') {
      const cres = (strainOf(sel) || variantOf(sel) || mVariantOf(sel) || {}).cres;
      return !!cres && cres.has(pair.human_cre) && cres.has(pair.mouse_cre);
    }
    if (sel.kind === 'pair') return pair.index === sel.pair;
    return pair.human_cre === sel.cre || pair.mouse_cre === sel.cre;
  }

  function creInFocus(cre) {
    const tfKey = state.activeTf && key(state.activeTf);
    if (tfKey && creHasTf(cre, tfKey)) return true;
    const sel = state.selection;
    if (!sel) return !tfKey;
    if (sel.kind === 'strain' || sel.kind === 'variant' || sel.kind === 'mvariant') {
      const cres = (strainOf(sel) || variantOf(sel) || mVariantOf(sel) || {}).cres;
      return !!cres && cres.has(cre.cre_id);
    }
    if (sel.kind === 'cre') {
      if (cre.cre_id === sel.cre) return true;
      return (index.pairsByCre.get(sel.cre) || []).some(
        (p) => p.human_cre === cre.cre_id || p.mouse_cre === cre.cre_id
      );
    }
    const pair = pairs[sel.pair];
    return pair.human_cre === cre.cre_id || pair.mouse_cre === cre.cre_id;
  }

  function applyState() {
    const sel = state.selection;
    const tfKey = state.activeTf && key(state.activeTf);
    const focusing = !!sel || !!tfKey;
    svg.classed('is-focusing', focusing);

    linkPath
      .classed('is-dim', (d) => focusing && !pairInFocus(d))
      .classed('is-selected', (d) => !!sel && sel.kind === 'pair' && d.index === sel.pair)
      .classed('is-tf-hit', (d) => !!tfKey && d.tfKeys.has(tfKey));

    // A pinned pair marks both of its CREs, not just the link between them.
    const isPinnedCre = (cre) => {
      if (!sel) return false;
      if (sel.kind === 'cre') return cre.cre_id === sel.cre;
      if (sel.kind === 'strain' || sel.kind === 'variant' || sel.kind === 'mvariant') {
        const cres = (strainOf(sel) || variantOf(sel) || mVariantOf(sel) || {}).cres;
        return !!cres && cres.has(cre.cre_id);
      }
      const pair = pairs[sel.pair];
      return pair.human_cre === cre.cre_id || pair.mouse_cre === cre.cre_id;
    };

    cardGroups
      .classed('is-dim', (d) => focusing && !creInFocus(d))
      .classed('is-selected', isPinnedCre)
      .classed('is-tf-hit', (d) => !!tfKey && creHasTf(d, tfKey));

    blockGroups
      .classed('is-dim', (p) => focusing && !creInFocus(p.d))
      .classed('is-selected', (p) => isPinnedCre(p.d));

    // The badge only means something once the variants have been fetched. With
    // a strain pinned it counts that strain's matches, otherwise all of them.
    const pinnedStrain = strainOf(sel);
    const pinnedVariant = variantOf(sel) || mVariantOf(sel);
    const matchCount = (creId) => {
      const stat = creStat(creId);
      if (!stat) return 0;
      if (pinnedVariant) return pinnedVariant.cres.has(creId) ? 1 : 0;
      return pinnedStrain ? (stat.strains.get(pinnedStrain.name) || new Set()).size : stat.matched.size;
    };
    cardGroups
      .select('.match_badge')
      .attr('display', (d) => (matchCount(d.cre_id) ? null : 'none'))
      .classed('is-strain', !!pinnedStrain || !!pinnedVariant);
    cardGroups.select('.match_badge text').text((d) => matchCount(d.cre_id) || '');

    renderPanel();
    renderFocusPanel();
    updateVariantTable();
  }

  //// ------------------------------------------------------- details panel
  const chip = (symbol, cls, title) =>
    '<button type="button" class="tf-chip ' + cls + (key(symbol) === key(state.activeTf) ? ' is-active' : '') +
    '"' + (title ? ' title="' + escapeHtml(title) + '"' : '') +
    ' data-tf="' + escapeHtml(symbol) + '">' + escapeHtml(symbol) + '</button>';

  const chipRow = (symbols, cls, titleOf) =>
    '<div class="chip-row">' + symbols.map((s) => chip(s, cls, titleOf && titleOf(s))).join('') + '</div>';

  function tfBanner() {
    if (!state.activeTf) return '';
    const hits = index.pairsByTf.get(key(state.activeTf)) || [];
    return (
      '<p class="tf-banner"><b>' + escapeHtml(state.activeTf) + '</b> highlighted &mdash; ' +
      (hits.length
        ? hits.length + ' connection' + (hits.length > 1 ? 's' : '') + ' share' + (hits.length > 1 ? '' : 's') + ' it'
        : 'not shared by any pair here') +
      ' &middot; <span class="tf-dot"></span> marks the CREs that bind it' +
      ' <button type="button" class="link-button" data-action="clear-tf">clear</button></p>'
    );
  }

  function externalLinks(cre, sp) {
    return (
      '<a class="ext" href="https://fanta.bio/cre/' + escapeHtml(cre.cre_id) + '" target="fantabio">fanta.bio</a>' +
      '<a class="ext" href="' + escapeHtml(sp.mk_url(cre)) + '" target="' + sp.target + '">' +
      escapeHtml(sp.db) + '</a>'
    );
  }

  function panelCre(entry) {
    const { cre, species: spKey } = entry;
    const sp = species[spKey];
    const other = spKey === 'human' ? mouse : human;
    const shared = index.sharedByCre.get(cre.cre_id) || new Set();
    const partners = index.pairsByCre.get(cre.cre_id) || [];
    const symbols = (cre.tf || []).map((t) => t.symbol);
    const sharedSymbols = symbols.filter((s) => shared.has(key(s))).sort();
    const restSymbols = symbols.filter((s) => !shared.has(key(s))).sort();
    const length = cre.cre_end - cre.cre_start + 1;

    const partnerChips = partners.length
      ? '<div class="chip-row">' +
        partners
          .slice()
          .sort((a, b) => b.and - a.and)
          .map(
            (p) =>
              '<button type="button" class="partner-chip ' + other.label + '" data-pair="' + p.index + '">' +
              escapeHtml(spKey === 'human' ? p.mouse_cre : p.human_cre) +
              '<em>' + p.and + '</em></button>'
          )
          .join('') +
        '</div>'
      : '<p class="panel-none">No ' + other.label + ' CRE here shares an orthologous TF with it.</p>';

    return (
      panelHead(sp.title + ' CRE', spKey, cre.cre_id, cre.cre_name) +
      '<p class="panel-meta">' +
      '<span>' + escapeHtml(cre.cre_chrom + ':' + fmtPos(cre.cre_start) + '-' + fmtPos(cre.cre_end)) + '</span>' +
      '<span>' + fmtPos(length) + ' bp</span>' +
      (Number.isFinite(+cre.cre_tss_distance) ? '<span>TSS ' + fmtPos(+cre.cre_tss_distance) + ' bp</span>' : '') +
      externalLinks(cre, sp) +
      '</p>' +
      tfBanner() +
      '<section class="panel-section"><h4>Orthologous position' +
      '<span class="muted">TogoCoord liftOver &mdash; coordinates only</span></h4>' +
      correspondence(cre, other) + '</section>' +
      creVariantSection(cre) +
      '<section class="panel-section"><h4>Paired ' + other.label + ' CREs' +
      '<span class="muted">shared TF count</span></h4>' + partnerChips + '</section>' +
      '<section class="panel-section"><h4>' +
      (symbols.length ? symbols.length + ' bound TFs' : 'Bound TFs') +
      '<span class="muted">' +
      (symbols.length
        ? sharedSymbols.length + ' shared with a ' + other.label + ' CRE'
        : 'no ChIP-Atlas antigen on this CRE') +
      '</span></h4>' +
      (sharedSymbols.length ? chipRow(sharedSymbols, 'is-shared') : '') +
      (restSymbols.length ? chipRow(restSymbols, spKey) : '') +
      '</section>' +
      (sharedSymbols.length
        ? '<p class="panel-hint">Click a TF to see every connection that shares it.</p>'
        : '')
    );
  }

  function panelPair(pair) {
    const h = index.creById.get(pair.human_cre);
    const m = index.creById.get(pair.mouse_cre);
    const hSymbols = h ? (h.cre.tf || []).map((t) => t.symbol) : [];
    const mSymbols = m ? (m.cre.tf || []).map((t) => t.symbol) : [];
    const sharedKeys = pair.tfKeys;
    const hOnly = hSymbols.filter((s) => !sharedKeys.has(key(s))).sort();
    const mOnly = mSymbols.filter((s) => !sharedKeys.has(key(s))).sort();
    const sharedSymbols = (pair.and_tf || []).slice().sort();

    // Symbols bound on both sides that the API did not count as shared. They
    // are marked instead of being folded into the shared set, because the
    // shared set is what `jaccard` is computed from.
    const hKeys = new Set(hSymbols.map(key));
    const mKeys = new Set(mSymbols.map(key));
    const bothButUnlisted = [...hKeys].filter((k) => mKeys.has(k) && !sharedKeys.has(k));
    const bothSet = new Set(bothButUnlisted);
    const markBoth = (sym) =>
      bothSet.has(key(sym)) ? 'Bound by both CREs, but not in the shared set the API returned' : '';
    const both = (sym) => (bothSet.has(key(sym)) ? ' is-both' : '');

    const column = (title, count, symbols, cls) =>
      '<div class="tf-col ' + cls + '"><h4>' + title + '<em>' + count + '</em></h4>' +
      (symbols.length
        ? '<div class="chip-row">' +
          symbols.map((sym) => chip(sym, cls + both(sym), markBoth(sym))).join('') +
          '</div>'
        : '<p class="panel-none">none</p>') +
      '</div>';

    return (
      panelHead('CRE pair', 'pair', pair.human_cre + ' ↔ ' + pair.mouse_cre, '') +
      '<p class="panel-meta">' +
      '<span><b>' + pair.and + '</b> shared orthologous TFs</span>' +
      '<span>Jaccard ' + pair.jaccard +
      ' <span class="muted">= ' + pair.and + ' / ' + pair.or + ' TFs that have an ortholog</span></span>' +
      '<span class="muted">' + pair.human_tf_count + ' human / ' + pair.mouse_tf_count + ' mouse TFs bound</span>' +
      '</p>' +
      tfBanner() +
      '<div class="tf-compare">' +
      column('Human only', hOnly.length, hOnly, 'human') +
      column('Shared', sharedSymbols.length, sharedSymbols, 'is-shared') +
      column('Mouse only', mOnly.length, mOnly, 'mouse') +
      '</div>' +
      (bothButUnlisted.length
        ? '<p class="panel-warn"><b>' + bothButUnlisted.length + '</b> TF' +
          (bothButUnlisted.length > 1 ? 's are' : ' is') + ' bound by both CREs but not counted as shared: ' +
          escapeHtml(
            hSymbols.filter((sym) => bothSet.has(key(sym))).sort().join(', ')
          ) + '.</p>'
        : '') +
      '<p class="panel-hint">Click a TF to see every connection that shares it. ' +
      'The species-only columns also hold TFs that have no ortholog at all.</p>'
    );
  }

  //// ----------------------------------- gene-level ranking, either direction
  const RANK_PREVIEW = 8;

  function strainAliases(st) {
    return [...st.aliases.values()]
      .map((a) =>
        a.url
          ? '<a class="ext" href="' + escapeHtml(a.url) + '" target="mouse_strain">' +
            escapeHtml(a.name) + (a.source ? ' <span class="src">' + a.source + '</span>' : '') + '</a>'
          : '<span class="alias">' + escapeHtml(a.name) + '</span>'
      )
      .join('');
  }

  /**
   * The bars are a real fraction of a stated whole, not a share of the top row:
   * a full bar means "all of them", and the label prints both numbers.
   */
  const rankBar = (n, of, noun) =>
    '<span class="rank-bar" title="' + n + ' of ' + of + ' ' + noun + '">' +
    '<i style="width:' + (of > 0 ? Math.min(Math.round((n / of) * 100), 100) : 0) + '%"></i></span>';

  const showAllButton = (total, noun) =>
    total > RANK_PREVIEW
      ? '<button type="button" class="link-button" data-action="toggle-rows">' +
        (state.allRows ? 'show top ' + RANK_PREVIEW : 'show all ' + total + ' ' + noun) +
        '</button>'
      : '';

  const FOCUS = {
    human_variants: { label: 'Human variants', badge: 'human' },
    mouse_variants: { label: 'Mouse variants', badge: 'mouse' },
    mouse_strains: { label: 'Mouse strains', badge: 'strain' },
  };
  // Fixed order, so the tabs stay where they were; only the default moves.
  const FOCUS_ORDER = ['human_variants', 'mouse_variants', 'mouse_strains'];

  /** Which side of the comparison the ranking lands on. */
  function focusHeader(agg) {
    const t = agg.totals;
    const current = FOCUS[state.focus] || FOCUS.human_variants;
    const tab = (value) =>
      '<button type="button" class="focus-tab' + (state.focus === value ? ' is-selected' : '') +
      '" data-focus="' + value + '">' + FOCUS[value].label + '</button>';
    const counts =
      state.focus === 'mouse_variants'
        ? '<span>' + t.mouseVariants + ' mouse variants</span>' +
          '<span><b>' + t.mouseMatched + '</b> matching a human variant</span>'
        : '<span>' + t.variants + ' human variants at mouse-variable positions</span>' +
          '<span><b>' + t.matched + '</b> with a matching strain allele</span>' +
          '<span>' + t.togovar + ' with a TogoVar ID</span>';
    return (
      '<div class="panel-head">' +
      '<span class="panel-badge ' + current.badge + '">' + current.label + '</span>' +
      '<h3>' + escapeHtml(species[topKey].symbol) + ' / ' + escapeHtml(species[bottomKey].symbol) + '</h3>' +
      '<span class="focus-tabs">' + FOCUS_ORDER.map(tab).join('') + '</span>' +
      '</div>' +
      '<p class="panel-meta"><span>' + t.cres + ' CREs compared</span>' + counts + '</p>'
    );
  }

  /** Mouse alleles, the mirror image of the human variant ranking. */
  function mouseVariantRanking(agg) {
    const rows = [...agg.mouseVariants.values()].sort(
      (a, b) =>
        b.strainKeys.size - a.strainKeys.size ||
        (b.matched ? 1 : 0) - (a.matched ? 1 : 0) ||
        a.id.localeCompare(b.id)
    );
    if (!rows.length) return '<p class="panel-none">No mouse variant here is at a position that also varies in human.</p>';
    const of = agg.totals.strains;
    const shown = state.allRows ? rows : rows.slice(0, RANK_PREVIEW);
    const selected = state.selection && state.selection.kind === 'mvariant' ? state.selection.mvariant : null;
    return (
      '<ol class="rank-list">' +
      shown
        .map((mv) => {
          const n = mv.strainKeys.size;
          const human = [...mv.human.values()];
          const matchedHuman = human.find((h) => h.match);
          return (
            '<li><button type="button" class="rank-row' + (mv.id === selected ? ' is-selected' : '') +
            '" data-mvariant="' + escapeHtml(mv.id) + '">' +
            '<span class="rank-name"><code>' + escapeHtml(mv.id) + '</code></span>' +
            rankBar(n, of, 'strains') +
            '<span class="rank-count"><b>' + n + '</b> / ' + of + ' strain' + (of === 1 ? '' : 's') +
            (mv.matched ? ' <span class="tgv">human match</span>' : '') + '</span>' +
            '<span class="rank-extra" title="' + escapeHtml(human.map((h) => h.id).join(', ')) + '">' +
            escapeHtml((matchedHuman || human[0] || {}).id || '') +
            (human.length > 1 ? ' <span class="more">+' + (human.length - 1) + '</span>' : '') +
            '</span></button><span class="rank-links">' +
            (matchedHuman || human[0] ? togovarLink(matchedHuman || human[0]) : '') +
            (mv.mogplus_url
              ? '<a class="ext" href="' + escapeHtml(mv.mogplus_url) + '" target="mogplus">MoG+</a>'
              : '') +
            '</span></li>'
          );
        })
        .join('') +
      '</ol>' +
      showAllButton(rows.length, 'variants') +
      '<p class="panel-hint">Every mouse allele MoG+ reports in these CREs, ranked by how many strains carry ' +
      'it, out of the <b>' + of + '</b> strains that vary anywhere in these CREs. <b>human match</b> means a ' +
      'human variant at the same position has the same REF and ALT, so for those rows the carriers are exactly ' +
      'the strains that share the human substitution; the rest is mouse-only variation, which the CREs with no ' +
      'human counterpart consist entirely of. Click one to see which CREs hold it.</p>'
    );
  }

  function strainRanking(agg) {
    if (!agg.strains.length)
      return '<p class="panel-none">No mouse strain carries the same substitution as a variant here.</p>';
    const of = agg.totals.matched;
    const shown = state.allRows ? agg.strains : agg.strains.slice(0, RANK_PREVIEW);
    const selected = state.selection && state.selection.kind === 'strain' ? state.selection.strain : null;
    return (
      '<ol class="rank-list">' +
      shown
        .map((st) => {
          const n = st.variants.size;
          return (
            '<li><button type="button" class="rank-row' + (st.name === selected ? ' is-selected' : '') +
            '" data-strain="' + escapeHtml(st.name) + '">' +
            '<span class="rank-name">' + escapeHtml(st.name) + '</span>' +
            rankBar(n, of, 'matched variants') +
            '<span class="rank-count"><b>' + n + '</b> / ' + of + ' variant' + (of > 1 ? 's' : '') +
            (st.togovar.size ? ' <span class="tgv">' + st.togovar.size + ' TogoVar ID</span>' : '') + '</span>' +
            '<span class="rank-extra">' + st.cres.size + ' CRE' + (st.cres.size > 1 ? 's' : '') + '</span>' +
            '</button><span class="rank-links">' + strainAliases(st) + '</span></li>'
          );
        })
        .join('') +
      '</ol>' +
      showAllButton(agg.strains.length, 'strains') +
      '<p class="panel-hint">Ranked by how many human variants in these CREs the strain carries the ' +
      '<b>identical substitution</b> for (same REF and ALT across the liftOver strand). The bar is that count ' +
      'out of the <b>' + of + '</b> variants here that any strain matches. Click a strain to see where.</p>'
    );
  }

  function variantRanking(agg) {
    const rows = [...agg.variants.values()].sort(
      (a, b) =>
        b.strainKeys.size - a.strainKeys.size ||
        (b.tgv_id ? 1 : 0) - (a.tgv_id ? 1 : 0) ||
        a.id.localeCompare(b.id)
    );
    if (!rows.length) return '<p class="panel-none">No variant here is at a position that also varies in mouse.</p>';
    const of = agg.totals.strains;
    const shown = state.allRows ? rows : rows.slice(0, RANK_PREVIEW);
    const selected = state.selection && state.selection.kind === 'variant' ? state.selection.variant : null;
    return (
      '<ol class="rank-list">' +
      shown
        .map((v) => {
          const n = v.strainKeys.size;
          return (
            '<li><button type="button" class="rank-row' + (v.id === selected ? ' is-selected' : '') +
            '" data-variant="' + escapeHtml(v.id) + '">' +
            '<span class="rank-name"><code>' + escapeHtml(v.id) + '</code></span>' +
            rankBar(n, of, 'strains') +
            '<span class="rank-count"><b>' + n + '</b> / ' + of + ' strain' + (of === 1 ? '' : 's') +
            (v.tgv_id ? ' <span class="tgv">TogoVar ID</span>' : '') + '</span>' +
            '<span class="rank-extra" title="' + consequenceOf(v) + '">' +
            escapeHtml(consequences(v)[0] || '') +
            (consequences(v).length > 1 ? ' <span class="more">+' + (consequences(v).length - 1) + '</span>' : '') +
            '</span></button><span class="rank-links">' + variantLinks(v) + '</span></li>'
          );
        })
        .join('') +
      '</ol>' +
      showAllButton(rows.length, 'variants') +
      '<p class="panel-hint">Human variants at positions that also vary in mouse, ranked by how many mouse ' +
      'strains carry the <b>identical substitution</b> (same REF and ALT across the liftOver strand), out of ' +
      'the <b>' + of + '</b> strains that vary anywhere in these CREs. ' +
      'Click a variant to see which CREs hold it.</p>'
    );
  }

  /** The API lists one consequence per transcript; the first is the severest. */
  const consequences = (v) =>
    String(v.consequence || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
  const consequenceOf = (v) => escapeHtml(consequences(v).join(' · '));

  /** tgv_link comes back site-relative, so it is resolved against TogoVar. */
  const togovarHref = (path) =>
    /^https?:\/\//.test(path) ? path : (links.togovar || '') + path;

  /**
   * TogoVar takes an allele string on the same route as a TogoVar ID, so a
   * variant without an ID still gets a link — it lands on the search result
   * for that allele instead of on a variant report. The allele is written
   * `12-111767031-T-C` there, while the API gives it as `12:111767031-T-C`.
   */
  const togovarVariantHref = (v) => {
    if (v.tgv_id) return togovarHref(v.tgv_link || '/variant/' + v.tgv_id);
    // The `?-?` placeholder a mouse-only row carries is not an allele.
    if (!/^[\w.]+:\d+-[^?\s]+-[^?\s]+$/.test(v.id || '')) return null;
    return (links.togovar || '') + '/variant/' + v.id.replace(':', '-');
  };

  const togovarLink = (v, fallbackLabel) => {
    const href = togovarVariantHref(v);
    if (!href) return '';
    return (
      '<a class="ext" href="' + escapeHtml(href) + '" target="togovar"' +
      (v.tgv_id ? '' : ' title="No TogoVar ID; opens the search for this allele"') + '>' +
      escapeHtml(v.tgv_id || fallbackLabel || 'TogoVar') + '</a>'
    );
  };

  function variantLinks(v) {
    return (
      togovarLink(v) +
      (v.rs ? '<a class="ext" href="' + escapeHtml(v.rs_link) + '" target="dbsnp">' + escapeHtml(v.rs) + '</a>' : '') +
      (v.matches[0]
        ? '<a class="ext" href="' + escapeHtml(v.matches[0].mogplus_url) + '" target="mogplus">MoG+</a>'
        : '')
    );
  }

  function renderFocusPanel() {
    if (!focusPanel) return;
    const agg = state.variants;
    if (agg === null) {
      focusPanel.innerHTML = '<p class="panel-empty">Looking for variants and mouse strains&hellip;</p>';
      return;
    }
    if (agg === false) {
      focusPanel.innerHTML = '<p class="panel-empty">Variants could not be fetched.</p>';
      return;
    }
    const body =
      state.focus === 'mouse_variants'
        ? mouseVariantRanking(agg)
        : state.focus === 'mouse_strains'
          ? strainRanking(agg)
          : variantRanking(agg);
    focusPanel.innerHTML = focusHeader(agg) + body;
  }

  /** A pinned human variant: what it is, which strains match it, where it sits. */
  function panelVariant(v) {
    const strains = [...v.strains.entries()].reduce((map, [name, s]) => {
      const k = state.variants.mergeKeyOf(name);
      if (!map.has(k)) map.set(k, new Set());
      s.cres.forEach((c) => map.get(k).add(c));
      return map;
    }, new Map());

    return (
      panelHead('Human variant', 'human', v.id, '') +
      '<p class="panel-meta">' +
      (consequenceOf(v) ? '<span>' + consequenceOf(v) + '</span>' : '') +
      (v.matches[0]
        ? '<span>mouse <code>' + escapeHtml(v.matches[0].allele_grcm39) + '</code></span>'
        : '<span class="muted">no mouse strain carries this substitution</span>') +
      variantLinks(v) +
      '</p>' +
      (strains.size
        ? '<section class="panel-section"><h4>' + strains.size + ' strains with the same substitution' +
          '<span class="muted">click one to follow it</span></h4><div class="chip-row">' +
          [...strains.keys()]
            .sort()
            .map(
              (name) =>
                '<button type="button" class="partner-chip strain" data-strain="' + escapeHtml(name) + '">' +
                escapeHtml(name) + '</button>'
            )
            .join('') +
          '</div></section>'
        : '') +
      '<section class="panel-section"><h4>In these CREs</h4><div class="chip-row">' +
      [...v.cres]
        .map((creId) => {
          const entry = index.creById.get(creId);
          return (
            '<button type="button" class="partner-chip ' + (entry ? entry.species : '') +
            '" data-cre="' + escapeHtml(creId) + '">' + escapeHtml(creId) + '</button>'
          );
        })
        .join('') +
      '</div></section>'
    );
  }

  function panelStrain(st) {
    const groups = strainVariants(state.variants, st.name);
    const rows = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([creId, list]) => {
        const entry = index.creById.get(creId);
        const sp = entry ? species[entry.species] : null;
        return (
          '<li><button type="button" class="partner-chip ' + (entry ? entry.species : '') +
          '" data-cre="' + escapeHtml(creId) + '">' + escapeHtml(creId) +
          '<em>' + list.length + '</em></button>' +
          '<ul class="variant-list">' +
          list
            .map(
              (v) =>
                '<li><code>' + escapeHtml(v.id) + '</code>' +
                ' ' + togovarLink(v) +
                (v.rs
                  ? ' <a class="ext" href="' + escapeHtml(v.rs_link) + '" target="dbsnp">' + escapeHtml(v.rs) + '</a>'
                  : '') +
                (v.matches[0]
                  ? ' <span class="muted">&rarr; ' + escapeHtml(v.matches[0].allele_grcm39) + '</span>' +
                    ' <a class="ext" href="' + escapeHtml(v.matches[0].mogplus_url) + '" target="mogplus">MoG+</a>'
                  : '') +
                '</li>'
            )
            .join('') +
          '</ul></li>' +
          (sp ? '' : '')
        );
      })
      .join('');

    return (
      panelHead('Mouse strain', 'strain', st.name, '') +
      '<p class="panel-meta">' +
      '<span><b>' + st.variants.size + '</b> variants with the same substitution</span>' +
      '<span>' + st.togovar.size + ' with a TogoVar ID</span>' +
      '<span>across ' + st.cres.size + ' CREs</span>' +
      strainAliases(st) +
      '</p>' +
      '<ul class="strain-hits">' + rows + '</ul>'
    );
  }

  /** How far the liftOver of this CRE can be trusted, stated rather than implied. */
  function correspondence(cre, other) {
    if (cre.lift_start == null)
      return '<p class="panel-meta"><span class="muted">No orthologous position in ' + other.label + '.</span></p>';
    const length = cre.cre_end - cre.cre_start + 1;
    // The aligned bases, not the outer extent: a gapped chain leaves holes.
    const aligned = cre.lift_aligned != null ? cre.lift_aligned : cre.match_end - cre.match_start + 1;
    const share = Math.round((aligned / length) * 100);
    const from = Math.min(cre.lift_start, cre.lift_end);
    const to = Math.max(cre.lift_start, cre.lift_end);
    return (
      '<p class="panel-meta">' +
      '<span>' + escapeHtml(cre.lift_chr + ':' + fmtPos(from) + '-' + fmtPos(to)) + '</span>' +
      '<span' + (share < 60 ? ' class="warn"' : '') + '><b>' + share + '%</b> of the CRE aligns (' +
      fmtPos(aligned) + ' / ' + fmtPos(length) + ' bp' +
      (cre.lift_blocks > 1 ? ', ' + cre.lift_blocks + ' blocks' : '') + ')</span>' +
      (cre.lift_start > cre.lift_end ? '<span>minus strand</span>' : '') +
      (cre.lift_approximate ? '<span class="muted">approximate</span>' : '') +
      '</p>'
    );
  }

  function creVariantSection(cre) {
    const stat = creStat(cre.cre_id);
    if (state.variants === null)
      return '<section class="panel-section"><h4>Variants</h4><p class="panel-none">loading&hellip;</p></section>';
    if (!stat || (!stat.variants.size && !stat.mouseVariants.size))
      return '<section class="panel-section"><h4>Variants</h4>' +
        '<p class="panel-none">No variant reported in this CRE.</p></section>';
    const chips = [...stat.strains.entries()]
      .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
      .map(
        ([name, set]) =>
          '<button type="button" class="partner-chip strain" data-strain="' + escapeHtml(name) + '">' +
          escapeHtml(name) + '<em>' + set.size + '</em></button>'
      )
      .join('');
    return (
      '<section class="panel-section"><h4>Variants' +
      '<span class="muted">MoG+ &times; TogoVar</span></h4>' +
      '<p class="panel-meta">' +
      '<span>' + stat.mouseVariants.size + ' mouse variants</span>' +
      '<span>' + stat.variants.size + ' human variants at the same positions</span>' +
      '<span><b>' + stat.matched.size + '</b> with a matching strain allele</span>' +
      '<span>' + stat.togovar.size + ' with a TogoVar ID</span>' +
      '</p>' +
      (chips ? '<div class="chip-row">' + chips + '</div>' : '') +
      '</section>'
    );
  }

  function panelMouseVariant(mv) {
    const strains = new Map();
    for (const [name] of mv.strains) {
      const k = state.variants.mergeKeyOf(name);
      if (!strains.has(k)) strains.set(k, true);
    }
    const human = [...mv.human.values()];
    return (
      panelHead('Mouse variant', 'mouse', mv.id, '') +
      '<p class="panel-meta">' +
      '<span>GRCm39</span>' +
      (mv.strand ? '<span>' + escapeHtml(mv.strand) + ' strand vs human</span>' : '') +
      '<span>' + strains.size + ' strain' + (strains.size === 1 ? '' : 's') + '</span>' +
      (mv.mogplus_url
        ? '<a class="ext" href="' + escapeHtml(mv.mogplus_url) + '" target="mogplus">MoG+</a>'
        : '') +
      '</p>' +
      '<section class="panel-section"><h4>Human alleles at the corresponding position' +
      '<span class="muted">bold = same substitution</span></h4>' +
      '<ul class="variant-list">' +
      human
        .map(
          (h) =>
            '<li>' + (h.match ? '<b>' : '') + '<code>' + escapeHtml(h.id) + '</code>' + (h.match ? '</b>' : '') +
            ' ' + togovarLink(h) +
            (h.rs
              ? ' <a class="ext" href="' + escapeHtml(h.rs_link) + '" target="dbsnp">' + escapeHtml(h.rs) + '</a>'
              : '') +
            '</li>'
        )
        .join('') +
      '</ul></section>' +
      (strains.size
        ? '<section class="panel-section"><h4>Strains carrying it' +
          '<span class="muted">click one to follow it</span></h4><div class="chip-row">' +
          [...strains.keys()]
            .sort()
            .map(
              (name) =>
                '<button type="button" class="partner-chip strain" data-strain="' + escapeHtml(name) + '">' +
                escapeHtml(name) + '</button>'
            )
            .join('') +
          '</div></section>'
        : '') +
      '<section class="panel-section"><h4>In these CREs</h4><div class="chip-row">' +
      [...mv.cres]
        .map((creId) => {
          const e2 = index.creById.get(creId);
          return (
            '<button type="button" class="partner-chip ' + (e2 ? e2.species : '') +
            '" data-cre="' + escapeHtml(creId) + '">' + escapeHtml(creId) + '</button>'
          );
        })
        .join('') +
      '</div></section>'
    );
  }

  function panelHead(badge, badgeClass, title, sub) {
    return (
      '<div class="panel-head">' +
      '<span class="panel-badge ' + badgeClass + '">' + escapeHtml(badge) + '</span>' +
      '<h3>' + escapeHtml(title) + (sub ? ' <span class="panel-sub">' + escapeHtml(sub) + '</span>' : '') + '</h3>' +
      '<button type="button" class="panel-clear" data-action="clear">Clear</button>' +
      '</div>'
    );
  }

  function renderPanel() {
    const sel = state.selection;
    const entry = creOf(sel);
    const pair = pairOf(sel);
    const strain = strainOf(sel);
    const variant = variantOf(sel);
    const mVariant = mVariantOf(sel);
    if (entry) panel.innerHTML = panelCre(entry);
    else if (pair) panel.innerHTML = panelPair(pair);
    else if (strain) panel.innerHTML = panelStrain(strain);
    else if (variant) panel.innerHTML = panelVariant(variant);
    else if (mVariant) panel.innerHTML = panelMouseVariant(mVariant);
    else
      panel.innerHTML =
        '<p class="panel-empty">Click a <b>CRE</b> for its transcription factors, a <b>connection</b> ' +
        'to compare the two TF sets, or a <b>variant</b> / <b>mouse strain</b> to follow it across ' +
        'the two species.</p>';
    panel.classList.toggle('is-empty', !entry && !pair && !strain && !variant && !mVariant);
  }

  // One delegated handler per panel, reassigned rather than added on redraw.
  const onPanelClick = (e) => {
    if (e.target.closest('a')) return; // external links keep working
    const target = e.target.closest(
      '[data-tf], [data-pair], [data-cre], [data-strain], [data-variant], [data-mvariant], [data-focus], [data-action]'
    );
    if (!target) return;
    const { action, pair, cre, strain, variant, mvariant, focus, tf } = target.dataset;
    if (focus !== undefined) {
      if (state.focus === focus) return;
      state.focus = focus;
      state.allRows = false;
      // A pin made in one view would be unreadable in another.
      if (state.selection && ['strain', 'variant', 'mvariant'].includes(state.selection.kind)) select$1(null);
      else applyState();
      return;
    }
    if (action === 'clear') select$1(null);
    else if (action === 'clear-tf') highlightTf(null);
    else if (action === 'toggle-rows') {
      state.allRows = !state.allRows;
      renderFocusPanel();
    } else if (pair !== undefined) select$1({ kind: 'pair', pair: +pair });
    else if (cre !== undefined) select$1({ kind: 'cre', cre });
    else if (strain !== undefined)
      select$1(
        state.selection && state.selection.kind === 'strain' && state.selection.strain === strain
          ? null
          : { kind: 'strain', strain }
      );
    else if (variant !== undefined)
      select$1(
        state.selection && state.selection.kind === 'variant' && state.selection.variant === variant
          ? null
          : { kind: 'variant', variant }
      );
    else if (mvariant !== undefined)
      select$1(
        state.selection && state.selection.kind === 'mvariant' && state.selection.mvariant === mvariant
          ? null
          : { kind: 'mvariant', mvariant }
      );
    else if (tf !== undefined) highlightTf(tf);
  };
  panel.onclick = onPanelClick;
  if (focusPanel) focusPanel.onclick = onPanelClick;

  //// -------------------------------------------------------- variant table
  function updateVariantTable() {
    if (!table) return;
    const entry = creOf(state.selection);
    const cre = entry && entry.cre;
    // A human CRE is asked for by its own GRCh38 position, a mouse CRE by its
    // GRCm39 one, the same way the ranking above fetches them.
    const range = cre ? rangeOf(cre, entry.species) : null;
    if (!range) {
      table.classList.add('hidden');
      if (caption) caption.classList.add('hidden');
      return;
    }
    table.setAttribute(
      'data-url',
      links.sparqlist + '/api/gene_cre_mogp?mogplus_ver=' + encodeURIComponent(links.mogplusVersion) +
        '&' + range.param + '=' + encodeURIComponent(range.value)
    );
    table.classList.remove('hidden');
    if (caption) {
      caption.innerHTML =
        'Variants in <b>' + escapeHtml(cre.cre_id) + '</b> ' +
        '<span class="muted">' + escapeHtml(range.value) + ' · TogoVar × MoG+' +
        (range.param === 'mmu_range' ? ' · GRCm39' : '') + '</span>';
      caption.classList.remove('hidden');
    }
  }

  //// ---------------------------------------------------------------- render
  drawLift(species[topKey].cre, xOf[topKey], xOf[bottomKey], yTopBase, yBottomBase);
  drawLift(species[bottomKey].cre, xOf[bottomKey], xOf[topKey], yBottomBase, yTopBase);
  const topBlocks = drawTrack(species[topKey], species[bottomKey], xOf[topKey], packOf[topKey], yTopBase, +1);
  const bottomBlocks = drawTrack(
    species[bottomKey], species[topKey], xOf[bottomKey], packOf[bottomKey], yBottomBase, -1
  );
  const blockGroups = selectAll([...topBlocks.nodes(), ...bottomBlocks.nodes()]);
  const humanCards = drawCards(human);
  const mouseCards = drawCards(mouse);
  const cardGroups = selectAll([...humanCards.nodes(), ...mouseCards.nodes()]);

  if (!pairs.length) {
    cardLayer
      .append('text')
      .attr('class', 'empty_note')
      .attr('x', plotWidth / 2)
      .attr('y', yLinkTop + linkHeight / 2 + 4)
      .text('No CRE pair shares an orthologous TF');
  }

  // A selection made before a resize survives the redraw.
  if (state.selection && state.selection.kind === 'cre' && !index.creById.has(state.selection.cre)) {
    state.selection = null;
  }
  if (state.selection && state.selection.kind === 'pair' && !pairs[state.selection.pair]) {
    state.selection = null;
  }
  if (state.selection && state.selection.kind === 'strain' && !strainOf(state.selection)) {
    state.selection = null;
  }
  if (state.selection && state.selection.kind === 'variant' && !variantOf(state.selection)) {
    state.selection = null;
  }
  if (state.selection && state.selection.kind === 'mvariant' && !mVariantOf(state.selection)) {
    state.selection = null;
  }
  renderOrientation();
  applyState();

  return {
    width: totalWidth,
    height,
    /** Called once the variants have been fetched; no full redraw needed. */
    refreshVariants: applyState,
  };
}

const ASSEMBLY = { human: 'GRCh38/hg38', mouse: 'GRCm38/mm10' };

const MOGPLUS_STRAINS = [
  'refGenome', 'msmv4_sq', 'jf1v3', 'kjrv1', 'swnv1', 'chdv1', 'njlv1', 'blg2v1', 'hmiv1',
  'bfmv1', 'pgn2v1', '129P2_OlaHsd', '129S1_SvImJ', '129S5SvEvBrd', 'A_J', 'AKR_J', 'BALB_cJ',
  'BTBR_T+_Itpr3tf_J', 'BUB_BnJ', 'C3H_HeH', 'C3H_HeJ', 'C57BL_10J', 'C57BL_6NJ', 'C57BR_cdJ',
  'C57L_J', 'C58_J', 'CAST_EiJ', 'CBA_J', 'DBA_1J', 'DBA_2J', 'FVB_NJ', 'I_LnJ', 'KK_HiJ',
  'LEWES_EiJ', 'LP_J', 'MOLF_EiJ', 'NOD_ShiLtJ', 'NZB_B1NJ', 'NZO_HlLtJ', 'NZW_LacJ',
  'PWK_PhJ', 'RF_J', 'SEA_GnJ', 'SPRET_EiJ', 'ST_bJ', 'WSB_EiJ', 'ZALENDE_EiJ',
];

const togovarUrl = (base) => (d) =>
  base + '/?mode=simple&term=' +
  encodeURIComponent(d.cre_chrom.replace('chr', '') + ':' + d.cre_start + '-' + d.cre_end);

// MoG+ 2 is GRCm38, which is the assembly the fanta.bio mouse CREs are on.
const mogplusUrl = (d) =>
  'https://molossinus.brc.riken.jp/mogplus2/variantTable/?' +
  MOGPLUS_STRAINS.map((s) => 'strainNoSlct=' + encodeURIComponent(s)).join('&') +
  '&seqType=genome&geneNameSearchText=&index=submit&presentType=disp' +
  '&chrName=' + d.cre_chrom.replace('chr', '') +
  '&chrStart=' + d.cre_start +
  '&chrEnd=' + d.cre_end;

/** The gene as gene_cre returns it, in the shape the drawing wants. */
const geneOf = (g) =>
  g && {
    symbol: g.symbol,
    strand: g.strand,
    tss: g.tss,
    end: g.gene_end,
    low: g.gene_start_pos,
    high: g.gene_end_pos,
    biotype: g.biotype,
  };

class GeneCre extends Stanza {
  async render() {
    this.importWebFontCSS('https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,500,700');

    this.renderTemplate({ template: 'loading.html.hbs', parameters: {} });

    const sparqlist = (this.params.sparqlist || 'https://sparql-support.dbcls.jp/sparqlist').replace(/\/$/, '');
    const mogplusVersion = this.params.mogplus_version || 'mogplus21';
    const togovar = (this.params.togovar ?? 'https://stg-grch38.togovar.org').replace(/\/$/, '');

    // gene_cre takes any of the three identifiers, resolves the ortholog
    // through the NCBI Orthologs endpoint and returns both species' CREs with
    // their positions, liftOver, GRCm39 coordinates and gene models already
    // worked out, so nothing is looked up here.
    // gene_cre names its parameters without "_id" (hgnc, mgi, ncbigene) and
    // ignores unknown ones, falling back to its default hgnc=404 (ALDH2), so
    // the "_id" suffix of the stanza parameters has to be dropped here.
    const query = ['hgnc_id', 'mgi_id', 'ncbigene_id']
      .map((key) => [key.replace(/_id$/, ''), this.params[key]])
      .filter(([, value]) => value != null && String(value).trim() !== '')
      .map(([key, value]) => key + '=' + encodeURIComponent(String(value).trim()));

    if (!query.length) {
      this.renderTemplate({
        template: 'error.html.hbs',
        parameters: { message: 'Give one of hgnc_id, mgi_id or ncbigene_id' },
      });
      return;
    }

    let cre;
    try {
      const response = await fetch(sparqlist + '/api/gene_cre?' + query.join('&'));
      if (!response.ok) throw new Error(`gene_cre returned status ${response.status}`);
      cre = await response.json();
      if (typeof cre === 'string') throw new Error(cre);
      // Everything read below must be there, or the stanza would stay on its
      // loading view instead of showing the error.
      if (!cre?.entry?.species || !cre?.orth?.human || !cre?.orth?.mouse ||
          !Array.isArray(cre.human_cre) || !Array.isArray(cre.mouse_cre) ||
          !Array.isArray(cre.cre_comparison) || !cre?.gene) {
        throw new Error('gene_cre returned an invalid response');
      }
    } catch (e) {
      this.renderTemplate({ template: 'error.html.hbs', parameters: { message: String(e.message || e) } });
      return;
    }

    const primary = cre.entry.species;
    const secondary = primary === 'mouse' ? 'human' : 'mouse';
    const placed = [...cre.human_cre, ...cre.mouse_cre].filter((d) => d.cre_sequence).length;
    const total = cre.human_cre.length + cre.mouse_cre.length;

    this.renderTemplate({
      template: 'stanza.html.hbs',
      parameters: {
        orth: cre.orth,
        human_count: cre.human_cre.length,
        mouse_count: cre.mouse_cre.length,
        pair_count: cre.cre_comparison.length,
        // CREs absent from TogoCoord's fanta store keep the position the CRE
        // list gave them, and the count says how many.
        coordinate_source: placed === total ? 'TogoCoord' : 'TogoCoord, ' + (total - placed) + ' from fanta.bio',
        entry_species: primary,
        entry_symbol: cre.orth[primary].symbol,
        entry_id: cre.entry.id,
        primary_species: primary,
        primary_symbol: cre.orth[primary].symbol,
        secondary_species: secondary,
        secondary_symbol: cre.orth[secondary].symbol,
      },
    });

    const data = {
      primary,
      human: {
        label: 'human',
        title: 'Human',
        symbol: cre.orth.human.symbol,
        assemblyLabel: ASSEMBLY.human,
        target: 'togovar',
        db: 'TogoVar',
        mk_url: togovarUrl(togovar),
        gene: geneOf(cre.gene.human),
        cre: cre.human_cre,
      },
      mouse: {
        label: 'mouse',
        title: 'Mouse',
        symbol: cre.orth.mouse.symbol,
        assemblyLabel: ASSEMBLY.mouse,
        target: 'mogplus',
        db: 'MoG+',
        mk_url: mogplusUrl,
        gene: geneOf(cre.gene.mouse),
        cre: cre.mouse_cre,
      },
      pairs: cre.cre_comparison,
    };

    const container = this.root.querySelector('#draw_area');
    const state = {
      selection: null,
      activeTf: null,
      allRows: false,
      variants: null,
      focus: primary === 'mouse' ? 'mouse_variants' : 'human_variants',
      orientation: this.params.axis === 'gene' ? 'gene' : 'genome',
    };
    const render = () =>
      draw({
        svg: this.root.querySelector('#gene_cre_svg'),
        popup: this.root.querySelector('#popup_info'),
        panel: this.root.querySelector('#detail_panel'),
        focusPanel: this.root.querySelector('#focus_panel'),
        orientation: this.root.querySelector('#axis_switch'),
        table: this.root.querySelector('#togovar_mogplus_table'),
        caption: this.root.querySelector('#variant_caption'),
        container,
        data,
        state,
        links: { sparqlist, mogplusVersion, togovar },
        redraw: () => {
          view = render();
        },
      });

    let view = render();

    // The variants come in one request covering every CRE, started after the
    // first draw so the diagram is not held up for them.
    collect(sparqlist, mogplusVersion, [
      ...cre.human_cre.map((c) => ({ cre: c, species: 'human' })),
      ...cre.mouse_cre.map((c) => ({ cre: c, species: 'mouse' })),
    ])
      .then((agg) => {
        state.variants = agg;
        view.refreshVariants();
      })
      .catch((e) => {
        console.warn('gene-cre: variants could not be fetched', e);
        state.variants = false;
        view.refreshVariants();
      });

    // Redraw when the stanza is resized so the tracks keep filling the width.
    if (typeof ResizeObserver !== 'undefined') {
      let width = container.clientWidth;
      new ResizeObserver(() => {
        if (Math.abs(container.clientWidth - width) < 24) return;
        width = container.clientWidth;
        view = render();
      }).observe(container);
    }
  }
}

var stanzaModule = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': GeneCre
});

var metadata = {
	"@context": {
	stanza: "http://togostanza.org/resource/stanza#"
},
	"@id": "gene-cre",
	"stanza:label": "Gene / CREs",
	"stanza:definition": "Compare the CREs of a gene and its ortholog in the other species: their positions, the orthologous TFs they share, the mouse strains carrying the same variants and the human variants those strains model. Entered from a human or a mouse gene. (data integration of fanta.bio, ChIP-Atlas, NCBI Orthologs, TogoCoord, TogoID/HomoloGene, MoG+ and TogoVar)",
	"stanza:license": "MIT",
	"stanza:author": "moriya_dbcls",
	"stanza:contributor": [
],
	"stanza:created": "2025-09-18",
	"stanza:updated": "2026-09-20",
	"stanza:parameter": [
	{
		"stanza:key": "hgnc_id",
		"stanza:type": "string",
		"stanza:example": "404",
		"stanza:description": "HGNC ID of the human gene. Give one of hgnc_id, mgi_id or ncbigene_id. (e.g. 404)",
		"stanza:required": false
	},
	{
		"stanza:key": "mgi_id",
		"stanza:type": "string",
		"stanza:example": "",
		"stanza:description": "MGI ID of the mouse gene; carried to its human ortholog through TogoID (e.g. MGI:99600)",
		"stanza:required": false
	},
	{
		"stanza:key": "ncbigene_id",
		"stanza:type": "string",
		"stanza:example": "",
		"stanza:description": "NCBI Gene ID of a human or mouse gene; the species is decided by whether it has an HGNC ID (e.g. 11669)",
		"stanza:required": false
	},
	{
		"stanza:key": "sparqlist",
		"stanza:type": "string",
		"stanza:example": "https://stg-grch38.togovar.org/sparqlist",
		"stanza:description": "Base URL of the SPARQList that serves gene_cre and gene_cre_mogp",
		"stanza:required": false
	},
	{
		"stanza:key": "togovar",
		"stanza:type": "string",
		"stanza:example": "https://stg-grch38.togovar.org",
		"stanza:description": "TogoVar base URL; togovar_cre_mogplus returns site-relative variant links, which are resolved against it. Set it to an empty string to keep them relative.",
		"stanza:required": false
	},
	{
		"stanza:key": "mogplus_version",
		"stanza:type": "string",
		"stanza:example": "mogplus21",
		"stanza:description": "MoG+ version queried for the variant table (mogplus21, mogplus3)",
		"stanza:required": false
	},
	{
		"stanza:key": "axis",
		"stanza:type": "single-choice",
		"stanza:choice": [
			"genome",
			"gene"
		],
		"stanza:example": "genome",
		"stanza:description": "Which way the two genome tracks run. genome: both along the plus strand. gene: each follows its own gene 5' to 3', so a gene pair on opposite strands stops its liftOver ribbons crossing.",
		"stanza:required": false
	}
],
	"stanza:menu-placement": "bottom-right",
	"stanza:style": [
	{
		"stanza:key": "--togostanza-cre-human-color",
		"stanza:type": "color",
		"stanza:default": "#249eb3",
		"stanza:description": "accent color of the human track"
	},
	{
		"stanza:key": "--togostanza-cre-mouse-color",
		"stanza:type": "color",
		"stanza:default": "#ca678d",
		"stanza:description": "accent color of the mouse track"
	}
],
	"stanza:incomingEvent": [
],
	"stanza:outgoingEvent": [
]
};

var templates = [
  ["error.html.hbs", {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div id=\"draw_area\">\n  <p class=\"stanza-error\">"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"message") || (depth0 != null ? lookupProperty(depth0,"message") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"message","hash":{},"data":data,"loc":{"start":{"line":2,"column":26},"end":{"line":2,"column":37}}}) : helper)))
    + "</p>\n</div>\n";
},"useData":true}],
["loading.html.hbs", {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div id=\"loading\"><span id=\"togovar_loading_icon\"></span></div>\n";
},"useData":true}],
["stanza.html.hbs", {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div id=\"draw_area\">\n  <header class=\"stanza-header\">\n    <h2 class=\"stanza-title\">\n      CREs of "
    + alias4(((helper = (helper = lookupProperty(helpers,"primary_species") || (depth0 != null ? lookupProperty(depth0,"primary_species") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"primary_species","hash":{},"data":data,"loc":{"start":{"line":4,"column":14},"end":{"line":4,"column":33}}}) : helper)))
    + " <span class=\"gene\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"primary_symbol") || (depth0 != null ? lookupProperty(depth0,"primary_symbol") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"primary_symbol","hash":{},"data":data,"loc":{"start":{"line":4,"column":53},"end":{"line":4,"column":71}}}) : helper)))
    + "</span>\n      and "
    + alias4(((helper = (helper = lookupProperty(helpers,"secondary_species") || (depth0 != null ? lookupProperty(depth0,"secondary_species") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"secondary_species","hash":{},"data":data,"loc":{"start":{"line":5,"column":10},"end":{"line":5,"column":31}}}) : helper)))
    + " <span class=\"gene\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"secondary_symbol") || (depth0 != null ? lookupProperty(depth0,"secondary_symbol") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"secondary_symbol","hash":{},"data":data,"loc":{"start":{"line":5,"column":51},"end":{"line":5,"column":71}}}) : helper)))
    + "</span>\n    </h2>\n    <p class=\"stanza-summary\">\n      <span class=\"count entry\">from "
    + alias4(((helper = (helper = lookupProperty(helpers,"entry_species") || (depth0 != null ? lookupProperty(depth0,"entry_species") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"entry_species","hash":{},"data":data,"loc":{"start":{"line":8,"column":37},"end":{"line":8,"column":54}}}) : helper)))
    + " <b>"
    + alias4(((helper = (helper = lookupProperty(helpers,"entry_symbol") || (depth0 != null ? lookupProperty(depth0,"entry_symbol") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"entry_symbol","hash":{},"data":data,"loc":{"start":{"line":8,"column":58},"end":{"line":8,"column":74}}}) : helper)))
    + "</b> ("
    + alias4(((helper = (helper = lookupProperty(helpers,"entry_id") || (depth0 != null ? lookupProperty(depth0,"entry_id") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"entry_id","hash":{},"data":data,"loc":{"start":{"line":8,"column":80},"end":{"line":8,"column":92}}}) : helper)))
    + ")</span>\n      <span class=\"count human\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"human_count") || (depth0 != null ? lookupProperty(depth0,"human_count") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"human_count","hash":{},"data":data,"loc":{"start":{"line":9,"column":32},"end":{"line":9,"column":47}}}) : helper)))
    + " human CREs</span>\n      <span class=\"count mouse\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"mouse_count") || (depth0 != null ? lookupProperty(depth0,"mouse_count") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"mouse_count","hash":{},"data":data,"loc":{"start":{"line":10,"column":32},"end":{"line":10,"column":47}}}) : helper)))
    + " mouse CREs</span>\n      <span class=\"count pair\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"pair_count") || (depth0 != null ? lookupProperty(depth0,"pair_count") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"pair_count","hash":{},"data":data,"loc":{"start":{"line":11,"column":31},"end":{"line":11,"column":45}}}) : helper)))
    + " pairs sharing an orthologous TF</span>\n    </p>\n  </header>\n\n  <div class=\"stanza-legend\">\n    <span class=\"legend-item\"><span class=\"legend-swatch human\"></span>Human CRE</span>\n    <span class=\"legend-item\"><span class=\"legend-swatch mouse\"></span>Mouse CRE</span>\n    <span class=\"legend-item\"><span class=\"legend-line\"></span>Shared orthologous TFs (thicker&nbsp;=&nbsp;more)</span>\n    <span class=\"legend-item\"><span class=\"legend-ribbon\"></span>Orthologous position (on hover)</span>\n    <span class=\"legend-item\"><span class=\"legend-swatch no-tf\"></span>No ChIP-Atlas antigen (track only)</span>\n    <span class=\"legend-item\"><span class=\"legend-badge\">n</span>Variants a mouse strain matches</span>\n    <span class=\"legend-source\">Coordinates: "
    + alias4(((helper = (helper = lookupProperty(helpers,"coordinate_source") || (depth0 != null ? lookupProperty(depth0,"coordinate_source") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"coordinate_source","hash":{},"data":data,"loc":{"start":{"line":22,"column":45},"end":{"line":22,"column":66}}}) : helper)))
    + "</span>\n  </div>\n\n  <div class=\"stanza-controls\">\n    <p class=\"stanza-hint\">Hover to preview &middot; click a CRE, a connection or a variant to pin it below</p>\n    <div id=\"axis_switch\" class=\"axis-switch\"></div>\n  </div>\n\n  <div class=\"svg-scroll\">\n    <svg id=\"gene_cre_svg\" height=\"0\"></svg>\n  </div>\n\n  <div id=\"popup_info\" class=\"hidden\"></div>\n\n  <div id=\"focus_panel\" class=\"focus-panel\"></div>\n\n  <div id=\"detail_panel\" class=\"detail-panel is-empty\"></div>\n\n  <h3 id=\"variant_caption\" class=\"variant-caption hidden\"></h3>\n  <style>\n    togostanza-pagination-table {\n      --togostanza-canvas-height: ;\n      --togostanza-fonts-font_size_default: 13;\n    }\n  </style>\n  <togostanza-pagination-table class=\"hidden\" id=\"togovar_mogplus_table\" data-url=\"\" data-type=\"json\" custom-css-url=\"\" padding=\"0\" page-size-option=\"5,10,20,50,100\" page-slider=\"false\" data-unavailable_message=\"No data\" columns=\"[{&quot;id&quot;:&quot;allele_grcm39&quot;,&quot;label&quot;:&quot;Link to MoG+&quot;,&quot;link&quot;:&quot;mogplus_url&quot;},{&quot;id&quot;:&quot;mouse_strains&quot;,&quot;link&quot;:&quot;mogplus_table&quot;,&quot;label&quot;:&quot;Mouse strains&quot;,&quot;escape&quot;:false,&quot;line-clamp&quot;:1},{&quot;id&quot;:&quot;alt_match&quot;,&quot;label&quot;:&quot;ALT match&quot;},{&quot;id&quot;:&quot;tgv_id&quot;,&quot;link&quot;:&quot;tgv_link&quot;,&quot;label&quot;:&quot;TogoVar ID&quot;},{&quot;id&quot;:&quot;rs&quot;,&quot;link&quot;:&quot;rs_link&quot;,&quot;label&quot;:&quot;rs#&quot;},{&quot;id&quot;:&quot;allele_grch38&quot;,&quot;label&quot;:&quot;Chr-pos-ref-alt&quot;},{&quot;id&quot;:&quot;consequence&quot;,&quot;label&quot;:&quot;Consequence&quot;,&quot;line-clamp&quot;:1,&quot;escape&quot;:false}]\"></togostanza-pagination-table>\n</div>\n";
},"useData":true}],
["stanza.html.hbs~", {"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div id=\"draw_area\">\n  <svg id=\"gene_cre_svg\" height=\"0px\"></svg>\n  <div id=\"popup_info\"></div>\n</div>\n";
},"useData":true}]
];

const url = import.meta.url.replace(/\?.*$/, '');

defineStanzaElement({stanzaModule, metadata, templates, url});
//# sourceMappingURL=gene-cre.js.map
