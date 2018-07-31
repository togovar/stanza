Stanza(function(stanza, params) {
  stanza.handlebars().registerHelper("locale_string", function(str) {
    if (str) {
      return parseInt(str).toLocaleString();
    } else {
      return '';
    }
  });
  stanza.handlebars().registerHelper("format_float", function(val) {
    var v = parseFloat(val);
    if (v === 0)
      return '0.0';
    else if (v === 1)
      return '1.0';
    else if (v < 0.001)
      return v.toExponential(3);
    else
      return Math.round(v * Math.pow(10, 3)) / Math.pow(10, 3);
  });
  stanza.handlebars().registerHelper("filter_status", function(bool) {
    if (bool) {
      return '<span class="green">PASS</span>';
    } else {
      return '<span class="red">N/A</span>';
    }
  });

  var endpoint = "https://togovar.biosciencedbc.jp/sparql";

  var queries = [
    {
      endpoint: endpoint,
      template: "frequency.rq",
      parameters: params
    },
    {
      endpoint: endpoint,
      template: "exac_frequency.rq",
      parameters: params
    }
  ];

  Promise.all(queries.map(function(q) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve(stanza.query(q));
      }, 500);
    }); 
  })).then(function(results) {
    stanza.render({
      template: "stanza.html",
      parameters: {
        data: stanza.unwrapValueFromBinding(results[0]),
        exac_pop: stanza.unwrapValueFromBinding(results[1])
      }
    });
    if (!(window.ShadyDOM)) {
      stanza.select('main').innerHTML += '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css">';
    }
  }).catch(function(error) {
    console.error(error);
  });
});
