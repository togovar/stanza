# Gene / CREs

Compares the cis-regulatory elements (CREs) of a human gene and its mouse
ortholog: where they sit on each genome, which orthologous transcription
factors they share, and where each one lifts over in the other species.

## Data

| What | Source |
|---|---|
| Everything about the genes and the CREs | SPARQList **`gene_cre`** |
| Variants in a CRE and the mouse strains carrying them | SPARQList **`gene_cre_mogp`** |

Those two are the only APIs the stanza calls. `gene_cre` resolves the entry
gene of either species through the NCBI Orthologs endpoint, reads the CREs from
the **fanta.bio RDF on RDF Portal** (`http://rdfportal.org/dataset/fantabio`,
v1.2.1), and asks [TogoCoord](https://github.com/moriya-dbcls/togocoord) for
every coordinate: the CRE positions, the human &harr; mouse correspondence, the
GRCm39 position MoG+ needs, and each gene's transcription start and strand. The
stanza used to do the ortholog lookup and all the TogoCoord calls itself; those
modules are gone.

Human results are on GRCh38/hg38 and mouse results on GRCm38/mm10, the assembly
the fanta.bio mouse CREs are annotated on. A CRE the TogoCoord fanta store does
not hold keeps the position the CRE list gave it, and the legend says how many.

## Entry point

Either species can be the entry. Give exactly one of:

| Key | Example | Meaning |
|---|---|---|
| `hgnc_id` | `404` | human gene |
| `mgi_id` | `MGI:99600` | mouse gene |
| `ncbigene_id` | `217` or `11669` | human or mouse gene |

`gene_cre` takes any of the three and resolves the pair with **one ortholog
source**, the NCBI Orthologs RDF endpoint, queried from whichever end was given:

```sparql
{ ncbigene:X orth:hasOrtholog+ ?mouse . BIND(ncbigene:X AS ?human) }
UNION
{ ?human orth:hasOrtholog+ ncbigene:X . BIND(ncbigene:X AS ?mouse) }
```

An earlier version of this stanza resolved a mouse entry itself through TogoID
and HomoloGene, which meant two ortholog sources in one page — HomoloGene has
been frozen since 2014 — and a mouse gene could in principle come back as a
different mouse gene. That is gone: the entry and the pair are now decided by
the same query.

**The species you came from leads.** It takes the upper track in the diagram,
its symbol comes first in the heading, and the ranking under the diagram opens
on its own variants:

| Entered with | Upper track | Ranking opens on |
|---|---|---|
| `hgnc_id` | human | Human variants |
| `mgi_id` / mouse `ncbigene_id` | mouse | Mouse variants |

The other views are always one click away.

## Parameters

| Key | Default | Description |
|---|---|---|
| `hgnc_id` | `404` | HGNC ID of the human gene |
| `mgi_id` | | MGI ID of the mouse gene |
| `ncbigene_id` | | NCBI Gene ID of either species |
| `sparqlist` | `https://sparql-support.dbcls.jp/sparqlist` | SPARQList base URL |
| `togovar` | `https://grch38.togovar.org` | TogoVar base URL, for the site-relative variant links |
| `mogplus_version` | `mogplus21` | MoG+ version queried for the variant table |
| `axis` | `genome` | `genome`, or `gene` to run each track 5' to 3' |

Give one of `hgnc_id`, `mgi_id` or `ncbigene_id`. TogoCoord is reached by the
SPARQLists, not the stanza, so its URL is set there (`togocoord`, now
`https://togocoord.dbcls.jp/`).

## Files

- `index.js` — fetches the data and wires the stanza together
- `variants.js` — `gene_cre_mogp` client: every CRE's ranges in one
  request, the rows handed back per CRE and folded into per-variant and
  per-strain tallies
- `draw.js` — the d3 drawing (genome tracks, CRE cards, TF links, liftOver ribbons)
- `style.scss` — styling, following the TogoVar palette and Roboto Condensed

## Interaction

**Hover previews, click pins.** Clicking never navigates away; external links
live in the details panel as labelled links.

- Hover anything for a short preview, and hover a block on a genome track to
  see the orthologous region in the other species as a ribbon.
- **Click a CRE** (card or genome-track block) to pin it. The panel lists its
  position, its partner CREs with the number of TFs each shares, and its bound
  TFs with the shared ones accented. The variant table below loads for that CRE.
- **Click a connection** to pin the pair. The panel compares the two TF sets in
  three columns: human only / shared / mouse only.
- **Click a TF chip** to highlight every connection that shares it; the CREs
  that bind it get a dot. Click it again, or "clear", to drop the highlight.
- Everything the pinned item does not concern is dimmed. Clicking the empty
  background, or "Clear", unpins.
- **Click a mouse strain** in the ranking to see every variant it matches,
  grouped by CRE, with links to TogoVar, dbSNP and MoG+.
- **Click a human variant** in the ranking to see its mouse allele, the strains
  carrying the same substitution, and the CREs it sits in. Clicking one of those
  strains follows it the other way, so you can walk variant → strain → variant.
- **Click a mouse variant** to see the human alleles at the corresponding
  position, which strains carry it, and the CREs it sits in.
- A dashed block on a genome track is a CRE with no orthologous position.

## Which side you land on

Three readings of the same joined rows, switched with the tabs in the panel
header. The tab order is fixed; only which one opens depends on the input.

| Tab | Rows | Ranked by | Answers |
|---|---|---|---|
| **Human variants** | human alleles (GRCh38) | strains carrying the same substitution | which of my gene's variants have a mouse model |
| **Mouse variants** | mouse alleles (GRCm39) | strains carrying them | what varies in mouse here, and does it match a human variant |
| **Mouse strains** | strains | variants they match | which animal to order |

The bar in each row is a real fraction of a stated whole, not a share of the
top row, so a full bar means "all of them" and the label prints both numbers:

| Tab | Bar | Whole |
|---|---|---|
| Human variants | strains carrying the **identical substitution** | strains that vary anywhere in these CREs |
| Mouse variants | strains **carrying the mouse allele**, match or not | the same |
| Mouse strains | variants the strain matches **identically** | variants here that any strain matches |

Two of the three count exact matches; the Mouse variants row counts carriers of
the mouse allele whatever the human side says, and the **human match** badge is
what tells you the two sides agree. Because the match is a property of the
allele pair rather than of a strain, the carriers of a badged mouse allele are
exactly the strains that share the human substitution.

`alt_match: Yes` was checked against 67 rows from four CREs: in all 22 matching
rows the mouse REF *and* ALT complement the human REF and ALT on the minus
strand, and in all 45 non-matching rows only the ALT differs. So the reference
base is shared at every position the API returns, and `alt_match` is the only
thing that separates "same substitution" from "both vary, differently".

The denominators come from the returned rows, not from the size of the MoG+
panel, which the API does not report: a strain only appears in a row when it
carries the ALT, so "strains that vary anywhere in these CREs" is the widest
whole the data supports.

A mouse variant carries every human allele it was compared against, with the
exact-substitution one in bold, so the `alt_match` judgement is visible rather
than assumed. Clicking a strain from a variant, or a variant from a strain,
walks the join in either direction.

## Mouse strains

Every CRE that lifts over is queried for variants once, in parallel, after the
drawing is up (about 60 ms for a gene; the drawing never waits for it). The rows
are folded back into distinct human variants — the API returns one row per
(human allele × mouse variant) pair — and then into a per-strain tally.

A strain is ranked by **how many human variants in these CREs it carries the
identical substitution for** (`alt_match: Yes` in MoG+, i.e. the strain's ALT
corresponds to the human ALT across the liftOver strand).

Every variant gets a TogoVar link, with or without a TogoVar ID: TogoVar takes
an allele string on the same route, so `/variant/12:111767031-T-C` resolves to
the search for that allele while `/variant/tgv47263876` opens a variant report.
Rows without an ID are labelled `TogoVar` rather than with an ID, and the
`TogoVar ID` badge in the ranking still marks the ones that have one.

Two things the counts do *not* mean. The API joins TogoVar against MoG+, so it
only returns human variants at positions where a mouse strain also varies —
TogoVar holds far more variants in the same CRE (462 in one 214 bp window where
the API returns 14 rows). And `tgv_id` is empty for most rows, which does not
mean the variant is unknown: it is in TogoVar's REST backend with gnomAD
frequencies, just not in the smaller annotated subset that carries TogoVar IDs.
The panels say "at mouse-variable positions" and "with a TogoVar ID" rather
than implying either.

Strain names arrive under two conventions: RIKEN BRC writes a version suffix
(`MSMv4`, `JF1v3`) and JAX a substrain (`PWK/PhJ`, `JF1/MsJ`). The version
suffix is stripped, and the two are merged only when one is the versioned form
of the other's base name — so `JF1v3` and `JF1/MsJ` become one row, while
`C57BL/6NJ` and `C57BL/10J` are never merged. Both original names stay visible
with their source and link.

## Axis orientation and the TSS

Each track carries its gene: a thick segment over the gene's extent with
chevrons pointing the way it is read, and a flagged tick at the transcription
start. When the gene runs past the drawn window the flag is pinned to the edge
and says how far off it is (`TP53 TSS 9,591 bp off`). The gene comes from
TogoCoord's annotations over the drawn window, matched on the `GeneID:` Dbxref
rather than on the symbol; for mouse the GRCm39 record's `lifted` location is
used, because the CREs are on GRCm38.

The **Axis** switch above the drawing chooses what the horizontal axis means:

| Mode | Axis | Use |
|---|---|---|
| `genome` | both tracks run along the plus strand | coordinates read as written |
| `gene` | each track follows its own gene 5'→3' | a gene pair on opposite strands stops crossing |

CRE coordinates are always written on the plus strand, so when the two genes
face opposite ways every liftOver ribbon crosses over itself. Measured on the
drawn polygons: **ALDH2 6 of 6 ribbons twisted in `genome`, 0 in `gene`; TP53 13
of 13 twisted, 0 in `gene`.** HRAS and CTNNB1 have both genes on the same strand,
so nothing crosses either way and `gene` merely reverses both axes together.

The cards in the correspondence panel follow the same order as the blocks on
their own track, so reversing a track reverses its card row with it. Each row is
sorted independently by where its CREs land on screen rather than by the order
the CRE list returned them, which keeps card and block aligned in both modes and
for each species separately — for TP53 (human minus, mouse plus) the human row
reverses in `gene` while the mouse row stays put.

The links between the cards are unaffected: they carry shared TFs, not position,
so the same pairs stay joined with the same weights and only their endpoints
move. They may cross more once a row is reversed, which is the honest picture —
TF sharing does not follow genomic order.

A CRE's name is written on the side of its pill that the links do not leave
from: above for the upper row, below for the lower one. Whichever species is on
top gets the labels above, so the entry species decides this too.

Links that meet at the same card are spread along its edge, each taking room for
its own stroke, and the fan stays centred on the card (compressed if it would
overflow). Without this, two thick links running nearly parallel merge into one
band at 45 % stroke opacity and read as a single much thicker link — and because
reordering a row changes which links run parallel, the same link appeared to
change weight when the axis was switched. It never did; only the overlap did.

The switch only changes the drawing. Reported strands stay biological: a liftOver
onto the minus strand still says `(minus strand)` whatever the axis is doing.
`axis` sets which mode the stanza opens in.

## How far the correspondence goes

There is no single "this human CRE equals that mouse CRE". Three independent
lines of evidence are shown, and they routinely disagree:

1. **Position** — a UCSC chain liftOver. The panel states what fraction of the
   CRE actually aligns, counting aligned bases rather than the outer extent, so
   a CRE where only 33 % aligns says so instead of looking like a clean match.
   It is labelled "coordinates only".
2. **Factors** — the shared orthologous TFs, computed upstream and compared
   here side by side (see the known data issue below).
3. **Variants** — whether a mouse strain carries the same substitution.

A CRE pair can align well and share no TF, or share TFs and barely align. The
stanza shows all three rather than collapsing them into one score.

## Known data issue

When several human CREs pair with the same mouse CRE, `togovar_cre` returns
`and_tf` sets that are **mutually disjoint** — their union is exactly
`mouse_tf_has_orth`, so each shared TF is assigned to only one human CRE rather
than to every pair that binds it. `and` and `jaccard` therefore under-report the
per-pair overlap (for example FCHS_104206 × FCMM_147216 reports 8 shared TFs
while 13 real TFs are bound on both sides).

### fanta.bio versions

The CREs used to come from a JSON Lines grep API built on v1.2.0, while
TogoCoord had ingested v1.2.1, so a handful of CREs the list named were missing
from TogoCoord (`FCHS_63347` of HRAS, `FCHS_166583` of TP53). Reading the RDF
puts both sides on v1.2.1 and that disagreement is gone; those two CREs simply
do not exist in v1.2.1. The fallback to the CRE list's own coordinates, and the
count in the legend, are kept for the case where TogoCoord cannot be reached.

Switching also changed what is shown, because v1.2.1 is newer data: TP53 goes
from 9 to 11 human CREs and from **0 to 20** TF pairs, CTNNB1 from 19 to 22
human CREs. And it is much faster: the RDF answers in about 200 ms per gene
against about 5 s for the grep API, which was roughly 10 s of the API's total.

### CREs without a transcription factor

Every CRE of the gene is returned, including those with no ChIP-Atlas antigen.
They cannot join a link, so they get **no card**; they appear on the genome
tracks with a dashed outline and are clickable there for their position,
liftOver and variants. Keeping them out of the card row matters: mouse Aldh2 has
nine of them and they sit at the low-coordinate end, so putting them in the row
pushed the four CREs that do pair to the far end and every link became a
diagonal across the whole figure.


The stanza shows `and_tf` as the API returns it, because `jaccard` is derived
from it, but marks the TFs that are bound on both sides and missing from the
shared set with a dashed outline and a note under the comparison. If the
SPARQList is fixed to intersect per pair, those markers disappear on their own.
