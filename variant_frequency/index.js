Stanza((stanza, params) => {
  stanza.handlebars().registerHelper("locale_string", (str) => {
    if (str) {
      return parseInt(str).toLocaleString();
    } else {
      return '';
    }
  });
  stanza.handlebars().registerHelper("format_float", (val) => {
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
  stanza.handlebars().registerHelper("filter_status", (bool) => {
    if (bool) {
      return '<span class="green">PASS</span>';
    } else {
      return '<span class="red">N/A</span>';
    }
  });

  var results = [params.url1, params.url2].map((url) => {
    return new Promise((resolve, reject) => {
      fetch(url, { method: 'GET', headers: { Accept: 'application/json' } }).then((response) => {
        resolve(response.json());
      }).catch((error) => {
        reject('There has been a problem with fetch operation: ' + error.message);
      });
    });
  });

  Promise.all(results).then((values) => {
    stanza.render({
      template: "stanza.html",
      parameters: {
        data: stanza.unwrapValueFromBinding(values[0]),
        exac_pop: stanza.unwrapValueFromBinding(values[1])
      }
    });
    if (!(window.ShadyDOM)) {
      stanza.select('main').innerHTML += '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css">';
    }
  }).catch((msg) => { 
    console.error(msg)
  });
});
