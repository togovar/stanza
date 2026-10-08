import Stanza from 'togostanza/stanza';

import { draw } from './draw.js';
import { collect } from './variants.js';

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

export default class GeneCre extends Stanza {
  async render() {
    this.importWebFontCSS('https://fonts.googleapis.com/css?family=Roboto+Condensed:300,400,500,700');

    this.renderTemplate({ template: 'loading.html.hbs', parameters: {} });

    const sparqlist = (this.params.sparqlist || 'https://sparql-support.dbcls.jp/sparqlist').replace(/\/$/, '');
    const mogplusVersion = this.params.mogplus_version || 'mogplus21';
    const togovar = (this.params.togovar ?? 'https://grch38.togovar.org').replace(/\/$/, '');

    // gene_cre takes any of the three identifiers, resolves the ortholog
    // through the NCBI Orthologs endpoint and returns both species' CREs with
    // their positions, liftOver, GRCm39 coordinates and gene models already
    // worked out, so nothing is looked up here.
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
      cre = await fetch(sparqlist + '/api/gene_cre?' + query.join('&')).then((res) => res.json());
      if (typeof cre === 'string') throw new Error(cre);
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
