const REVIEW_STATUS = {
	"no assertion provided": 0,
	"no assertion criteria provided": 0,
	"no assertion for the individual variant": 0,
	"criteria provided, single submitter": 1,
	"criteria provided, conflicting interpretations": 1,
	"criteria provided, multiple submitters, no conflicts": 2,
	"reviewed by expert panel": 3,
	"practice guideline": 4
};

Stanza(function (stanza, params) {
	let Handlebars = stanza.handlebars;

	Handlebars.registerHelper('link', function (text, url) {
		url = Handlebars.escapeExpression(url);
		text = Handlebars.escapeExpression(text);

		return new Handlebars.SafeString(
			"<a href='" + url + "'>" + text + "</a>"
		);
	});

	Handlebars.registerHelper('get-clinical-significance-sign', function (interpretation) {
		let data_sign = ""
		if (interpretation === "Pathogenic") {
			data_sign = 'P'
		} else if (interpretation === "Likely pathogenic") {
			data_sign = 'LP'
		} else if (interpretation === "Uncertain significance") {
			data_sign = 'US'
		} else if (interpretation === "likely benign") {
			data_sign = 'LB'
		} else if (interpretation === "Benign") {
			data_sign = 'B'
		} else if (interpretation === "Conflicting interpretations of pathogenicity") {
			data_sign = 'CI'
		} else if (interpretation === "Drug response") {
			data_sign = 'DR'
		} else if (interpretation === "Association") {
			data_sign = 'A'
		} else if (interpretation === "Risk factor") {
			data_sign = 'RF'
		} else if (interpretation === "Protective") {
			data_sign = 'PR'
		} else if (interpretation === "Affects") {
			data_sign = 'AF'
		} else if (interpretation === "Other") {
			data_sign = 'O'
		} else if (interpretation === "Not provided") {
			data_sign = 'NP'
		} else if (interpretation === "Association_not found") {
			data_sign = 'AN'
		}
		return data_sign
	});

	let url = (params.api ? params.api : "").concat("/variant_clinvar?tgv_id=", params.tgv_id);

	if (params.ep) {
		url = url.concat("&ep=", encodeURIComponent(params.ep))
	}

	fetch(url, {
		method: "GET",
		headers: {
			"Accept": "application/json"
		}
	}).then(function (response) {
		if (response.ok) {
			return response.json();
		}
	}).then(function (json) {
		let bindings = stanza.unwrapValueFromBinding(json);

		bindings.forEach(function (binding) {
			binding.stars = REVIEW_STATUS[binding.review_status] || 0;
			binding.condition = {
				label: binding.condition,
				url: "https://identifiers.org/medgen:".concat(binding.medgen)
			}
		});

		stanza.render({
			template: "stanza.html",
			parameters: {
				bindings: bindings
			}
		});

		rowspanize(stanza.select("#target"));
	}).catch(function (e) {
		stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
		throw e;
	});
});