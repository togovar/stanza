export const DATASETS = {
  "gem_j_wga": {
    "id": "gem_j_wga",
    "idx": 1,
    "source": "GEM-J WGA",
    "dataset": () => "GEM-J WGA",
    "population": "Japanese",
  },
  "jga_ngs": {
    "id": "jga_ngs",
    "idx": 2,
    "source": "JGA-NGS",
    "dataset": () => "JGA-NGS",
    "population": "Japanese",
  },
  "jga_snp": {
    "id": "jga_snp",
    "idx": 3,
    "source": "JGA-SNP",
    "dataset": () => "JGA-SNP",
    "population": "Japanese",
  },
  "tommo": {
    "id": "tommo",
    "idx": 4,
    "source": "ToMMo 8.3KJPN",
    "dataset": (assembly) => {
      switch (assembly) {
        case "GRCh37":
          return "ToMMo 8.3KJPN"
        case "GRCh38":
          return "ToMMo 14KJPN"
        default:
          return "ToMMo"
      }
    },
    "population": "Japanese",
  },
  "hgvd": {
    "id": "hgvd",
    "idx": 5,
    "source": "HGVD",
    "dataset": () => "HGVD",
    "population": "Japanese",
  },
  "gnomad_genomes": {
    "id": "gnomad_genomes",
    "idx": 6,
    "source": "gnomAD Genomes",
    "dataset": () => "gnomAD Genomes",
    "population": "Total",
  },
  "gnomad_genomes_african": {
    "id": "gnomad_genomes_african",
    "idx": 7,
    "source": "gnomAD Genomes:African-American/African",
    "dataset": () => "gnomAD Genomes",
    "population": "African-American/African",
  },
  "gnomad_genomes_latino": {
    "id": "gnomad_genomes_latino",
    "idx": 8,
    "source": "gnomAD Genomes:Latino",
    "dataset": () => "gnomAD Genomes",
    "population": "Latino",
  },
  "gnomad_genomes_other": {
    "id": "gnomad_genomes_other",
    "idx": 8,
    "source": "gnomAD Genomes:Other",
    "dataset": () => "gnomAD Genomes",
    "population": "Other",
  },
  "gnomad_genomes_european_non_finnish": {
    "id": "gnomad_genomes_european_non_finnish",
    "idx": 9,
    "source": "gnomAD Genomes:Non-Finnish European",
    "dataset": () => "gnomAD Genomes",
    "population": "European (Non-Finnish)",
  },
  "gnomad_genomes_ashkenazi_jewish": {
    "id": "gnomad_genomes_ashkenazi_jewish",
    "idx": 10,
    "source": "gnomAD Genomes:Ashkenazi Jewish",
    "dataset": () => "gnomAD Genomes",
    "population": "Ashkenazi Jewish",
  },
  "gnomad_genomes_east_asian": {
    "id": "gnomad_genomes_east_asian",
    "idx": 11,
    "source": "gnomAD Genomes:East Asian",
    "dataset": () => "gnomAD Genomes",
    "population": "East Asian",
  },
  "gnomad_genomes_european_finnish": {
    "id": "gnomad_genomes_european_finnish",
    "idx": 12,
    "source": "gnomAD Genomes:Finnish",
    "dataset": () => "gnomAD Genomes",
    "population": "European (Finnish)",
  },
  "gnomad_exomes": {
    "id": "gnomad_exomes",
    "idx": 13,
    "source": "gnomAD Exomes",
    "dataset": () => "gnomAD Exomes",
    "population": "Total",
  },
  "gnomad_exomes_african": {
    "id": "gnomad_exomes_african",
    "idx": 14,
    "source": "gnomAD Exomes:African-American/African",
    "dataset": () => "gnomAD Exomes",
    "population": "African-American/African",
  },
  "gnomad_exomes_latino": {
    "id": "gnomad_exomes_latino",
    "idx": 15,
    "source": "gnomAD Exomes:Latino",
    "dataset": () => "gnomAD Exomes",
    "population": "Latino",
  },
  "gnomad_exomes_other": {
    "id": "gnomad_exomes_other",
    "idx": 16,
    "source": "gnomAD Exomes:Other",
    "dataset": () => "gnomAD Exomes",
    "population": "Other",
  },
  "gnomad_exomes_european_non_finnish": {
    "id": "gnomad_exomes_european_non_finnish",
    "idx": 17,
    "source": "gnomAD Exomes:Non-Finnish European",
    "dataset": () => "gnomAD Exomes",
    "population": "European (Non-Finnish)",
  },
  "gnomad_exomes_ashkenazi_jewish": {
    "id": "gnomad_exomes_ashkenazi_jewish",
    "idx": 18,
    "source": "gnomAD Exomes:Ashkenazi Jewish",
    "dataset": () => "gnomAD Exomes",
    "population": "Ashkenazi Jewish",
  },
  "gnomad_exomes_east_asian": {
    "id": "gnomad_exomes_east_asian",
    "idx": 19,
    "source": "gnomAD Exomes:East Asian",
    "dataset": () => "gnomAD Exomes",
    "population": "East Asian",
  },
  "gnomad_exomes_european_finnish": {
    "id": "gnomad_exomes_european_finnish",
    "idx": 20,
    "source": "gnomAD Exomes:Finnish",
    "dataset": () => "gnomAD Exomes",
    "population": "European (Finnish)",
  },
  "gnomad_exomes_south_asian": {
    "id": "gnomad_exomes_south_asian",
    "idx": 21,
    "source": "gnomAD Exomes:South Asian",
    "dataset": () => "gnomAD Exomes",
    "population": "South Asian",
  },
};

export const ensureAllDatasets = frequencies => {
  ["gem_j_wga", "jga_ngs", "jga_snp", "tommo", "hgvd", "gnomad_genomes", "gnomad_exomes"].forEach(source => {
    if (!frequencies.find(x => x.source === source)) {
      frequencies.push({source: source});
    }
  });

  return frequencies;
};

export const SO = {
  "SO_0001483": {
    "id": "SO_0001483",
    "label": "SNV",
  },
  "SO_0000667": {
    "id": "SO_0000667",
    "label": "insertion",
  },
  "SO_0000159": {
    "id": "SO_0000159",
    "label": "deletion",
  },
  "SO_1000032": {
    "id": "SO_1000032",
    "label": "indel",
  },
  "SO_1000002": {
    "id": "SO_1000002",
    "label": "substitution",
  },
};

export const CONSEQUENCE = {
  "SO_0001893": {
    "id": "SO_0001893",
    "key": "transcript_ablation",
    "label": "Transcript ablation",
    "impact": "HIGH",
    "order": 1,
  },
  "SO_0001574": {
    "id": "SO_0001574",
    "key": "splice_acceptor_variant",
    "label": "Splice acceptor variant",
    "impact": "HIGH",
    "order": 2,
  },
  "SO_0001575": {
    "id": "SO_0001575",
    "key": "splice_donor_variant",
    "label": "Splice donor variant",
    "impact": "HIGH",
    "order": 3,
  },
  "SO_0001587": {
    "id": "SO_0001587",
    "key": "stop_gained",
    "label": "Stop gained",
    "impact": "HIGH",
    "order": 4,
  },
  "SO_0001589": {
    "id": "SO_0001589",
    "key": "frameshift_variant",
    "label": "Frameshift variant",
    "impact": "HIGH",
    "order": 5,
  },
  "SO_0001578": {
    "id": "SO_0001578",
    "key": "stop_lost",
    "label": "Stop lost",
    "impact": "HIGH",
    "order": 6,
  },
  "SO_0002012": {
    "id": "SO_0002012",
    "key": "start_lost",
    "label": "Start lost",
    "impact": "HIGH",
    "order": 7,
  },
  "SO_0001889": {
    "id": "SO_0001889",
    "key": "transcript_amplification",
    "label": "Transcript amplification",
    "impact": "HIGH",
    "order": 8,
  },
  "SO_0001821": {
    "id": "SO_0001821",
    "key": "inframe_insertion",
    "label": "Inframe insertion",
    "impact": "MODERATE",
    "order": 9,
  },
  "SO_0001822": {
    "id": "SO_0001822",
    "key": "inframe_deletion",
    "label": "Inframe deletion",
    "impact": "MODERATE",
    "order": 10,
  },
  "SO_0001583": {
    "id": "SO_0001583",
    "key": "missense_variant",
    "label": "Missense variant",
    "impact": "MODERATE",
    "order": 11,
  },
  "SO_0001818": {
    "id": "SO_0001818",
    "key": "protein_altering_variant",
    "label": "Protein altering variant",
    "impact": "MODERATE",
    "order": 12,
  },
  "SO_0001630": {
    "id": "SO_0001630",
    "key": "splice_region_variant",
    "label": "Splice region variant",
    "impact": "LOW",
    "order": 13,
  },
  "SO_0001626": {
    "id": "SO_0001626",
    "key": "incomplete_terminal_codon_variant",
    "label": "Incomplete terminal codon variant",
    "impact": "LOW",
    "order": 14,
  },
  "SO_0002019": {
    "id": "SO_0002019",
    "key": "start_retained_variant",
    "label": "Start retained variant",
    "impact": "LOW",
    "order": 15,
  },
  "SO_0001567": {
    "id": "SO_0001567",
    "key": "stop_retained_variant",
    "label": "Stop retained variant",
    "impact": "LOW",
    "order": 16,
  },
  "SO_0001819": {
    "id": "SO_0001819",
    "key": "synonymous_variant",
    "label": "Synonymous variant",
    "impact": "LOW",
    "order": 17,
  },
  "SO_0001580": {
    "id": "SO_0001580",
    "key": "coding_sequence_variant",
    "label": "Coding sequence variant",
    "impact": "MODIFIER",
    "order": 18,
  },
  "SO_0001620": {
    "id": "SO_0001620",
    "key": "mature_miRNA_variant",
    "label": "Mature miRNA variant",
    "impact": "MODIFIER",
    "order": 19,
  },
  "SO_0001623": {
    "id": "SO_0001623",
    "key": "5_prime_UTR_variant",
    "label": "5 prime UTR variant",
    "impact": "MODIFIER",
    "order": 20,
  },
  "SO_0001624": {
    "id": "SO_0001624",
    "key": "3_prime_UTR_variant",
    "label": "3 prime UTR variant",
    "impact": "MODIFIER",
    "order": 21,
  },
  "SO_0001792": {
    "id": "SO_0001792",
    "key": "non_coding_transcript_exon_variant",
    "label": "Non coding transcript exon variant",
    "impact": "MODIFIER",
    "order": 22,
  },
  "SO_0001627": {
    "id": "SO_0001627",
    "key": "intron_variant",
    "label": "Intron variant",
    "impact": "MODIFIER",
    "order": 23,
  },
  "SO_0001621": {
    "id": "SO_0001621",
    "key": "NMD_transcript_variant",
    "label": "NMD transcript variant",
    "impact": "MODIFIER",
    "order": 24,
  },
  "SO_0001619": {
    "id": "SO_0001619",
    "key": "non_coding_transcript_variant",
    "label": "Non coding transcript variant",
    "impact": "MODIFIER",
    "order": 25,
  },
  "SO_0001631": {
    "id": "SO_0001631",
    "key": "upstream_gene_variant",
    "label": "Upstream gene variant",
    "impact": "MODIFIER",
    "order": 26,
  },
  "SO_0001632": {
    "id": "SO_0001632",
    "key": "downstream_gene_variant",
    "label": "Downstream gene variant",
    "impact": "MODIFIER",
    "order": 27,
  },
  "SO_0001895": {
    "id": "SO_0001895",
    "key": "TFBS_ablation",
    "label": "TFBS ablation",
    "impact": "MODIFIER",
    "order": 28,
  },
  "SO_0001892": {
    "id": "SO_0001892",
    "key": "TFBS_amplification",
    "label": "TFBS amplification",
    "impact": "MODIFIER",
    "order": 29,
  },
  "SO_0001782": {
    "id": "SO_0001782",
    "key": "TF_binding_site_variant",
    "label": "TF binding site variant",
    "impact": "MODIFIER",
    "order": 30,
  },
  "SO_0001894": {
    "id": "SO_0001894",
    "key": "regulatory_region_ablation",
    "label": "Regulatory region ablation",
    "impact": "MODERATE",
    "order": 31,
  },
  "SO_0001891": {
    "id": "SO_0001891",
    "key": "regulatory_region_amplification",
    "label": "Regulatory region amplification",
    "impact": "MODIFIER",
    "order": 32,
  },
  "SO_0001907": {
    "id": "SO_0001907",
    "key": "feature_elongation",
    "label": "Feature elongation",
    "impact": "MODIFIER",
    "order": 33,
  },
  "SO_0001566": {
    "id": "SO_0001566",
    "key": "regulatory_region_variant",
    "label": "Regulatory region variant",
    "impact": "MODIFIER",
    "order": 34,
  },
  "SO_0001906": {
    "id": "SO_0001906",
    "key": "feature_truncation",
    "label": "Feature truncation",
    "impact": "MODIFIER",
    "order": 35,
  },
  "SO_0001628": {
    "id": "SO_0001628",
    "key": "intergenic_variant",
    "label": "Intergenic variant",
    "impact": "MODIFIER",
    "order": 36,
  },
};

export const CLINICAL_SIGNIFICANCE = {
  "pathogenic": {
    "key": "P",
  },
  "likely pathogenic": {
    "key": "LP",
  },
  "uncertain significance": {
    "key": "US",
  },
  "likely benign": {
    "key": "LB",
  },
  "benign": {
    "key": "B",
  },
  "conflicting interpretations of pathogenicity": {
    "key": "CI",
  },
  "drug response": {
    "key": "DR",
  },
  "association": {
    "key": "A",
  },
  "risk factor": {
    "key": "RF",
  },
  "protective": {
    "key": "PR",
  },
  "affects": {
    "key": "AF",
  },
  "other": {
    "key": "O",
  },
  "not provided": {
    "key": "NP",
  },
  "association_not found": {
    "key": "AN",
  },
};

export const REVIEW_STATUS = {
  "no assertion provided": {
    "stars": 0,
  },
  "no assertion criteria provided": {
    "stars": 0,
  },
  "no assertion for the individual variant": {
    "stars": 0,
  },
  "criteria provided, single submitter": {
    "stars": 1,
  },
  "criteria provided, conflicting interpretations": {
    "stars": 1,
  },
  "criteria provided, multiple submitters, no conflicts": {
    "stars": 2,
  },
  "reviewed by expert panel": {
    "stars": 3,
  },
  "practice guideline": {
    "stars": 4,
  },
};

export const SIFT = {
  "deleterious": {
    "key": "D",
    "label": "Deleterious"
  },
  "tolerated": {
    "key": "T",
    "label": "Tolerated"
  },
};

export const POLYPHEN = {
  "probably_damaging": {
    "key": "PROBD",
    "label": "Probably Damaging"
  },
  "possibly_damaging": {
    "key": "POSSD",
    "label": "Possibly Damaging"
  },
  "benign": {
    "key": "B",
    "label": "Benign"
  },
  "unknown": {
    "key": "U",
    "label": "Unknown"
  },
};
