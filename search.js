/* Droplet Labs · Paths — course search.
   Returns every course related to the query, ranked. Searches both languages across
   name, subject, tags, keywords, the "ask" line and the one-line description.
   Works in the browser (window.PathSearch) and in Node (module.exports) for testing. */
(function (root) {
  'use strict';
  var STOP = { the: 1, a: 1, an: 1, of: 1, to: 1, and: 1, or: 1, in: 1, on: 1, for: 1, how: 1, what: 1, is: 1, are: 1, i: 1, my: 1, me: 1,
    with: 1, by: 1, from: 1, about: 1, learn: 1, learning: 1, course: 1, courses: 1, path: 1, paths: 1, want: 1, do: 1, does: 1, it: 1, its: 1 };
  var W = { name: 6, subject: 5, tags: 4, keywords: 3, ask: 2, line: 2 };
  var CJK = /[㐀-鿿豈-﫿]/;

  function norm(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[’‘`]/g, "'"); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function tokens(q) {
    var out = [];
    norm(q).split(/[\s,，、;；/|·。？?！!：:()（）"“”]+/).forEach(function (part) {
      if (!part) return;
      // split mixed runs: "比特币mining" -> "比特币", "mining"
      (part.match(/[㐀-鿿豈-﫿]+|[^㐀-鿿豈-﫿]+/g) || []).forEach(function (t) {
        t = t.replace(/^[-'.]+|[-'.]+$/g, '');
        if (!t || STOP[t]) return;
        if (out.indexOf(t) < 0) out.push(t);
      });
    });
    return out;
  }

  // one matcher per token: returns match quality 0..1 for a text
  function matcher(t) {
    if (CJK.test(t)) {
      var grams = [];
      for (var i = 0; i < t.length - 1; i++) grams.push(t.slice(i, i + 2));
      return function (text) {
        if (text.indexOf(t) > -1) return 1;
        if (t.length < 3) return 0;
        var hit = grams.filter(function (g) { return text.indexOf(g) > -1; }).length;
        return hit / grams.length > 0.6 ? 0.6 * hit / grams.length : 0;
      };
    }
    var B = '(^|[^a-z0-9])', E = '(s|es)?([^a-z0-9]|$)';
    // a whole-word hit (token, tokens) outranks a prefix hit (tokenization)
    var exact = [new RegExp(B + esc(t) + E)], prefix = [];
    if (t.length > 4 && /s$/.test(t)) exact.push(new RegExp(B + esc(t.slice(0, -1)) + E));   // auctions -> auction
    if (t.length > 2) {
      prefix.push(new RegExp(B + esc(t)));
      if (t.length > 4 && /s$/.test(t)) prefix.push(new RegExp(B + esc(t.slice(0, -1))));   // tokens -> token...
      if (t.length > 5 && /ing$/.test(t)) prefix.push(new RegExp(B + esc(t.slice(0, -3))));  // hedging -> hedge
    }
    return function (text) {
      for (var i = 0; i < exact.length; i++) if (exact[i].test(text)) return 1;
      for (var j = 0; j < prefix.length; j++) if (prefix[j].test(text)) return 0.8;
      return 0;
    };
  }

  function indexCourse(c) {
    var both = function (o) { return o ? [o.en, o.zh].filter(Boolean) : []; };
    return {
      c: c,
      f: {
        name: norm(both(c.name).join(' | ') + ' | ' + c.id),
        subject: norm(both(c.subject).join(' | ')),
        tags: norm([].concat(c.tags ? c.tags.en || [] : [], c.tags ? c.tags.zh || [] : []).join(' | ')),
        keywords: norm(c.keywords),
        ask: norm(both(c.ask).join(' | ')),
        line: norm(both(c.line).join(' | '))
      },
      tagList: c.tags || {},
      kw: norm(c.keywords).split(/\s+/)
    };
  }

  function create(courses) {
    var idx = courses.map(indexCourse);
    return function search(q, lang) {
      var toks = tokens(q);
      if (!toks.length) return [];
      var ms = toks.map(matcher);
      var res = idx.map(function (it) {
        var score = 0, hitToks = 0, why = [], via = {};
        ms.forEach(function (m, ti) {
          var best = 0, bestField = null;
          Object.keys(W).forEach(function (k) {
            var q = m(it.f[k]); if (q && W[k] * q > best) { best = W[k] * q; bestField = k; }
          });
          if (best) { score += best; hitToks++; via[bestField] = 1; }
          // collect human-readable reasons: matching tags first, then keywords
          var tl = (it.tagList[lang] || it.tagList.en || []);
          tl.forEach(function (tag) { if (m(norm(tag)) && why.indexOf(tag) < 0) why.push(tag); });
          if (why.length < 3) it.kw.forEach(function (w) { if (why.length < 3 && m(w) && why.indexOf(w) < 0 && !why.some(function (x) { return norm(x) === w; })) why.push(w); });
        });
        if (!score) return null;
        if (hitToks === toks.length && toks.length > 1) score += 4;           // matched every word
        return { c: it.c, score: score, all: hitToks === toks.length, why: why.slice(0, 3), inLine: !!via.line || !!via.ask };
      }).filter(Boolean);
      // with several words, keep partial matches but rank full matches first
      res.sort(function (a, b) { return (b.all - a.all) || (b.score - a.score); });
      return res;
    };
  }

  var api = { create: create, tokens: tokens };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PathSearch = api;
})(typeof window !== 'undefined' ? window : this);
