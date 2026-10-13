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

import * as d3 from 'd3';

import { rangeOf, strainVariants } from './variants.js';

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
  const accent = custom && d3.color(custom) ? custom : defaults.accent;
  const c = d3.color(accent);
  return {
    accent,
    light: c.copy({ opacity: 0.16 }).formatRgb(),
    deep: c.darker(0.9).formatHex(),
  };
}

const fmtPos = d3.format(',');
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
export function speciesWindow(list, other) {
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
export function draw({
  svg: svgNode, popup, container, panel, focusPanel, orientation, table, caption, data, state, links, redraw,
}) {
  const svg = d3.select(svgNode);
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
    d3.scaleLinear()
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
    .on('click', () => select(null));

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
        select({ kind: 'cre', cre: p.d.cre_id });
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
        select({ kind: 'cre', cre: d.cre_id });
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
  const weight = d3.scaleSqrt().domain([1, d3.max(pairs, (d) => d.and) || 1]).range([1.5, 9]);

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
      d3.select(e.currentTarget).classed('is-hover', true);
    })
    .on('mouseout', (e, d) => {
      hidePopup();
      hoverCres([d.human_cre, d.mouse_cre], false);
      d3.select(e.currentTarget).classed('is-hover', false);
    })
    .on('click', (e, d) => {
      e.stopPropagation();
      select({ kind: 'pair', pair: d.index });
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
  function select(next) {
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
   * for that allele instead of on a variant report.
   */
  const togovarVariantHref = (v) => {
    if (v.tgv_id) return togovarHref(v.tgv_link || '/variant/' + v.tgv_id);
    return /^[\w.]+:\d+-\S+$/.test(v.id || '') ? (links.togovar || '') + '/variant/' + v.id : null;
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
      if (state.selection && ['strain', 'variant', 'mvariant'].includes(state.selection.kind)) select(null);
      else applyState();
      return;
    }
    if (action === 'clear') select(null);
    else if (action === 'clear-tf') highlightTf(null);
    else if (action === 'toggle-rows') {
      state.allRows = !state.allRows;
      renderFocusPanel();
    } else if (pair !== undefined) select({ kind: 'pair', pair: +pair });
    else if (cre !== undefined) select({ kind: 'cre', cre });
    else if (strain !== undefined)
      select(
        state.selection && state.selection.kind === 'strain' && state.selection.strain === strain
          ? null
          : { kind: 'strain', strain }
      );
    else if (variant !== undefined)
      select(
        state.selection && state.selection.kind === 'variant' && state.selection.variant === variant
          ? null
          : { kind: 'variant', variant }
      );
    else if (mvariant !== undefined)
      select(
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
      links.sparqlist + '/api/gene_cre_mogp?mogplus_ver=' + links.mogplusVersion +
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
  const blockGroups = d3.selectAll([...topBlocks.nodes(), ...bottomBlocks.nodes()]);
  const humanCards = drawCards(human);
  const mouseCards = drawCards(mouse);
  const cardGroups = d3.selectAll([...humanCards.nodes(), ...mouseCards.nodes()]);

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
