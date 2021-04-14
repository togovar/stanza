import Stanza from "togostanza/src/stanza.mjs";

Stanza.prototype.embbedScriptTag = function (...src) {
  const self = this;

  return src.map(x => {
    return new Promise((resolve, _reject) => {
      const script = document.createElement('script');
      script.src = x;
      self.root.appendChild(script);
      script.onload = script.onreadystatechange = () => {
        resolve();
      };
    });
  }).reduce((previousValue, currentValue) => {
    return previousValue.then(currentValue)
  }, Promise.resolve());
};
