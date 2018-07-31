Stanza(function(stanza, params) {
  stanza.handlebars().registerHelper("pretty_print", function(obj) {
    if (obj instanceof Array) {
      return "<ul>" + obj.map(function(item) {
        return "<li>" + item + "</li>";
      }).join("\n") + "</ul>";
    }
    return obj;
  });

  fetch(params.url, { method: 'GET' }).then(function(response) {
    return response.json();
  }).then(function(data) {
    stanza.render({
      template: "stanza.html",
      parameters: {
        header: data['header'],
        data: data['data']
      }
    });
    if (!(window.ShadyDOM)) {
      stanza.select('main').innerHTML += '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css">';
    }
  }).catch(function(error) {
    console.error('There has been a problem with fetch operation: ' + error.message)
  });
});
