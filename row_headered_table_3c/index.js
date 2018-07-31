Handlebars.registerHelper("pretty_print", function(obj) {
  if (obj instanceof Array) {
    return "<ul>" + obj.map(function(item) {
      return "<li>" + item + "</li>";
    }).join("\n") + "</ul>";
  }
  return obj;
});

Stanza(function(stanza, params) {
  var results = [params.url1, params.url2, params.url3].map(function(url) {
    return new Promise(function(resolve, reject) {
      fetch(url, { method: 'GET' }).then(function(response) {
        resolve(response.json());
      }).catch(function(error) {
        reject('There has been a problem with fetch operation: ' + error.message);
      });
    });
  });

  Promise.all(results).then(function (values) {
    var max = Math.max.apply(null, values.map(x => Object.keys(x).length));
    var data = [];
    for (var i = 0; i < max; i++) {
      data.push([]);
    }

    values.forEach(function(element) {
      for (var i = 0; i < max; i++) {
        data[i].push(element[i]);
      }
    });

    stanza.render({
      template: "stanza.html",
      parameters: {
        data: data
      }
    });
    if (!(window.ShadyDOM)) {
      stanza.select('main').innerHTML += '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css">';
    }
  }).catch(function (reason) { 
    console.error(reason)
  });
});
