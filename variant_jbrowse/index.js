Stanza((stanza, params) => {
  const RANGE = 50;

  stanza.query({
    endpoint: params.ep ? params.ep : "/sparql",
    template: "fetch_position.rq",
    parameters: params
  }).then((data) => {
    let v = stanza.unwrapValueFromBinding(data)[0];

    let type = v.type;
    let chr = v.chromosome;
    let start = parseInt(v.start);
    let stop = parseInt(v.stop);

    if (type.match("SO_0000159")) { // deletion
      start = start - 1;
    } else if (type.match("SO_0000667")) { // insertion
      stop = stop - 1;
    }

    let from = start - RANGE;
    let to = stop + RANGE;

    let options = "data=".concat(encodeURIComponent("data/" + params.assembly),
      "&loc=", encodeURIComponent(chr + ":" + from + ".." + to),
      "&highlight=", encodeURIComponent(chr + ":" + start + ".." + stop));

    stanza.render({
      template: "stanza.html",
      parameters: {
        options: options,
        width: params.width || "100%",
        height: params.height || "600px"
      }
    });
  }).catch(function (e) {
    stanza.root.querySelector("main").innerHTML = "<p>" + e.message + "</p>";
    throw e;
  });
});
