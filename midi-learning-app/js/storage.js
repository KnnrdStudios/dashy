/* Simple namespaced localStorage wrapper */
const Store = (() => {
  const KEY = 'signal-v1';
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  };
  const write = (o) => localStorage.setItem(KEY, JSON.stringify(o));
  return {
    get(k, fallback) {
      const d = read();
      return (k in d) ? d[k] : fallback;
    },
    set(k, v) {
      const d = read(); d[k] = v; write(d);
    },
    push(k, v) {
      const d = read();
      if (!Array.isArray(d[k])) d[k] = [];
      d[k].push(v); write(d);
    },
    all() { return read(); },
    reset() { localStorage.removeItem(KEY); }
  };
})();
