function stringToDomElement(str, parent) {
  const parentTag = parent ? parent.tagName : 'div';
  const wrapper= document.createElement(parentTag);
  wrapper.innerHTML= str;
  return wrapper.firstChild;

  // const el = (new DOMParser()).parseFromString(str, "text/html");
  // const d = el.body.firstChild; // el.documentElement;
  // return d;
}

/* templFill пример использования:
  const rez = templFill("a[$\{a}] b[$\{b}] c.cc[$\{c.cc}]", params);
*/
const templFill = (templ, p) => {
  if (!(typeof p === 'object' && p !== null && !Array.isArray(p))) {console.error("templFill -- parameter is not a object!"); return templ;}
  let body = 'const {' + Object.keys(p).reduce((acc, key) => acc += key + ',', '') + '} = p;' + '\r\n';
  body += 'return `' + templ + '`;' + '\r\n';
  const f = new Function('p', body);
  return f(p);
};
