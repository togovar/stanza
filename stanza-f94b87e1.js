import { S as Stanza } from './stanza-33919c9f.js';

Stanza.prototype.embedScriptTag = function (...src) {
  const self = this;

  return src.reduce(
    (previousValue, currentValue) =>
      previousValue.then(() => new Promise((resolve, _reject) => {
        const script = document.createElement('script');
        script.src = currentValue;
        self.root.appendChild(script);
        script.onload = script.onreadystatechange = () => resolve();
      })),
    Promise.resolve()
  );
};
//# sourceMappingURL=stanza-f94b87e1.js.map
