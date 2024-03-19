import Stanza from 'togostanza/stanza';

export default class Jbrowse2 extends Stanza {
  async render() {
    const session = {
      views: [
        {
          assembly: this.params.assembly,
          loc: `${this.params.chromosome}:${this.params.start}..${this.params.stop}`,
          type: "LinearGenomeView",
          tracks: [
            "assembly",
            "variant_togovar"
          ]
        }
      ]
    };

    const params = {
      result: {
        src: (this.params.jbrowse ? this.params.jbrowse : "/jbrowse2").concat("/index.html?session=spec-", JSON.stringify(session)),
        width: this.params.width || "100%",
        height: this.params.height || "600px",
      }
    }; // or { error: "message" }

    this.renderTemplate({
      template: "stanza.html.hbs",
      parameters: {
        ...params
      },
    });
  }
}
