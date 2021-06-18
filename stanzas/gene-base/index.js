export default async function geneBase(stanza, params) {

  const sparqlist = (params?.sparqlist || "/sparqlist")
    .concat(`/api/gene_base?hgnc_id=${params.hgnc_id}`)
    .concat(params.ep ? `&ep=${encodeURIComponent(params.ep)}` : "");

  const r = await fetch(sparqlist,{	
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  }).then(res => {
    if (res.ok){
      return res.json();
    }
    throw new Error(sparqlist + " returns status " + res.status);
  }).then(json => {
    let bindings = stanza.unwrapValueFromBinding(json);
    let binding = bindings[0];

    let approved_names = [];
    let alias = [];
    let locations = [];

    bindings.forEach(record => {
      approved_names.push(record.approved_name);
      alias.push(record.alias);
      locations.push(record.chromosomal_location);
    });
      binding.ApprovedName = approved_names.filter(function (x, i, self) { return self.indexOf(x) === i; }).join(',');
      binding.Alias = alias.filter(function (x, i, self) { return self.indexOf(x) === i; }).join(',');
      binding.ChromosomalLocation = locations.filter(function (x, i, self) { return self.indexOf(x) === i; }).join(',');

    binding.HGNCID = (binding.hgnc_uri !== undefined) ? binding.hgnc_uri.substr(28) : binding.hgnc_uri;
    binding.HGNCURI = "http://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/HGNC:" + binding.HGNCID;
    binding.NCBIGene = (binding.ncbigene !== undefined) ? binding.ncbigene.substr(32) : binding.ncbigene;
    binding.NCBIGeneURI = "https://www.ncbi.nlm.nih.gov/gene/" + binding.NCBIGene;
    binding.EnsemblURI = (binding.ensg !== undefined) ? "https://asia.ensembl.org/Homo_sapiens/Gene/Summary?g=" + binding.ensg.substr(31): "";
    binding.Ensembl = (binding.ensg !== undefined) ? binding.ensg.substr(31) : binding.ensg;
    binding.RefSeqURI = (binding.refseq !== undefined) ? "https://www.ncbi.nlm.nih.gov/nuccore/" + binding.refseq.substr(30): "";
    binding.RefSeq = (binding.refseq !== undefined) ? binding.refseq.substr(30) : binding.refseq;

	
    return {result: {...binding}};
  }).catch(e => ({error: {message: e.message}}));
  stanza.render({
    template: 'stanza.html.hbs',
    parameters: {
      params: params,
      ...r,
    }
  });
}
