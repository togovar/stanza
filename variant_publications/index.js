Stanza(function(stanza, params) {
  stanza.handlebars().registerHelper("pretty_print", function(obj) {
    if (obj instanceof Array) {
      return "<ul>" + obj.map(function(item) {
        return "<li>" + item + "</li>";
      }).join("\n") + "</ul>";
    }
    return obj;
  });

  stanza.handlebars().registerHelper("print_header", function(obj) {
    let html = []
    for (let i in obj) {
      if (i == 0) { html.push("<th class='span2'>" + obj[0] + "</th>")}
      else if (i == 1) { html.push("<th>" + obj[1] + "</th>")}
      else if (i == 2) { html.push("<th class='span2'>" + obj[2] + "</th>")}
      else if (i == 3) { html.push("<th class='span2'>" + obj[3] + "</th>")}
      else if (i == 4) { html.push("<th class='span3'>" + obj[4] + "</th>")}
    }
    return html.join("\n")
  });

  stanza.handlebars().registerHelper("print_publication", function(obj) {
    let html = []
    for (let i in obj) {
      if (i == 0) { html.push("<td>" + obj[0] + "</td>")}
      else if (i == 1) { html.push("<td>" + obj[1] + "</td>")}
      else if (i == 2) { html.push("<td>" + obj[2] + "</td>")}
      else if (i == 3) { html.push("<td>" + obj[3] + "</td>")}
      else if (i == 4) { html.push("<td><ul>" + 
                                   obj[4].map(function(item) {
                                     return "<li>" + item + "</li>";
                                   }).join("\n") +
                                   "</ul></td>")
                       }
    }
    return html.join("\n")
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
