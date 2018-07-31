Stanza(function(stanza, params) {
  var q = stanza.query({
    endpoint: "https://togovar.biosciencedbc.jp/sparql",
    template: "position.rq",
    parameters: params
  });

  q.then(function(data) {
    const range = 50;

    seq_label = "";
    display_start_pos = 0;
    display_end_pos = 0;

    result = stanza.unwrapValueFromBinding(data);
    if (result.length > 0) {
      start = result[0].start;
      stop = result[0].stop;
      seq_label = result[0].seq_label;
      display_start_pos = Math.max(parseInt(start) - range, 0);
      display_end_pos = parseInt(stop) + range;
    }

    stanza.render({
      template: "stanza.html",
    });
    display(stanza.select('#target'), seq_label, display_start_pos, display_end_pos);
  });
});