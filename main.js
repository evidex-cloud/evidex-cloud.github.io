/* Droplet Labs · Paths — UI layer. Builds every section from courses.js. */
(function () {
  'use strict';
  var P = window.PATHS, C = window.COPY, courses = P.courses;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tint(el, c) { el.style.setProperty('--c', c.color); el.style.setProperty('--c-rgb', rgb(c.color)); }

  /* ---------- language ---------- */
  var lang = 'en';
  try { lang = localStorage.getItem('dl-paths-lang') || 'en'; } catch (e) {}
  var qm = /[?&]lang=(en|zh)/.exec(location.search); if (qm) lang = qm[1];
  if (!C[lang]) lang = 'en';
  function T(key) { return key.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, C[lang]); }
  function L(obj) { return obj ? (obj[lang] != null ? obj[lang] : obj.en) : ''; }

  var sum = function (k) { return courses.reduce(function (a, c) { return a + (c[k] || 0); }, 0); };
  var totals = { count: courses.length, lessons: sum('lessons'), demos: sum('demos'), stages: sum('stages') };
  var WORD = {
    en: ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'],
    zh: ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  };
  function fill(s) {
    return String(s)
      .replace('{N}', WORD[lang][totals.count] || totals.count)
      .replace('{count}', totals.count)
      .replace('{lessons}', totals.lessons);
  }

  var ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5"/></svg>';
  function glyph(c) { return '<svg class="g-svg" viewBox="0 0 24 24" aria-hidden="true">' + (c.glyph || '<path d="M12 3 18 9a6.5 6.5 0 1 1-12 0Z"/>') + '</svg>'; }

  /* ---------- render ---------- */
  function renderHero() {
    $('#heroKicker').textContent = fill(T('hero.kicker'));
    $('#heroSub').textContent = T('hero.sub');
    var parts = fill(T('hero.title')).split('*'), html = '', i = 0;
    parts.forEach(function (part, pi) {
      var toks = lang === 'zh' ? Array.from(part) : part.split(/(\s+)/);
      toks.forEach(function (t) {
        if (!t) return;
        if (/^\s+$/.test(t)) { html += ' '; return; }
        html += '<span class="w' + (pi % 2 ? ' g' : '') + '" style="--i:' + (i++) + '">' + esc(t) + '</span>';
      });
    });
    $('#heroTitle').innerHTML = html;
    $('#heroTitle').setAttribute('aria-label', fill(T('hero.title')).replace(/\*/g, ''));

    var chips = $('#seekChips'); chips.innerHTML = '';
    courses.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'schip'; b.dataset.id = c.id; tint(b, c);
      b.innerHTML = '<i></i>' + esc(L(c.name));
      b.addEventListener('click', function () { goTo(c.id); });
      chips.appendChild(b);
    });
    $('#seekGo').setAttribute('aria-label', T('hero.go'));
  }

  function renderSteps() {
    var box = $('#steps'), n = courses.length, other = lang === 'en' ? 'zh' : 'en';
    box.innerHTML = courses.map(function (c, i) {
      return '<section class="step" id="path-' + c.id + '" data-shot="course:' + c.id + '" data-scrim="0" data-rail="' + c.id + '">' +
        '<article class="step-card glass" data-c="' + c.color + '">' +
          '<div class="step-top"><span class="step-idx"><b>' + String(i + 1).padStart(2, '0') + '</b> / ' + String(n).padStart(2, '0') + '</span>' +
          '<span class="subj"><i></i>' + esc(L(c.subject)) + '</span></div>' +
          '<h3 class="step-name">' + esc(L(c.name)) + '</h3>' +
          '<p class="step-alt">' + esc(c.name[other] || '') + '</p>' +
          '<p class="step-line">' + esc(L(c.line)) + '</p>' +
          '<div class="nums">' +
            '<div><b>' + c.stages + '</b><span>' + T('step.stages') + '</span></div>' +
            '<div><b>' + c.lessons + '</b><span>' + T('step.lessons') + '</span></div>' +
            '<div><b>' + c.demos + '</b><span>' + T('step.demos') + '</span></div>' +
          '</div>' +
          '<ul class="tags">' + L(c.tags).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
          '<div class="step-actions">' +
            '<a class="btn btn-c" href="' + c.url + '" target="_blank" rel="noopener"><span>' + T('step.start') + '</span>' + ARROW + '</a>' +
          '</div>' +
        '</article></section>';
    }).join('');
    $$('.step-card', box).forEach(function (el, i) { tint(el, courses[i]); });

    var rail = $('#rail');
    rail.innerHTML = courses.map(function (c) {
      return '<a href="#path-' + c.id + '" data-id="' + c.id + '"><span>' + esc(L(c.name)) + '</span><i></i></a>';
    }).join('');
    $$('a', rail).forEach(function (a, i) {
      tint(a, courses[i]);
      a.addEventListener('click', function (e) { e.preventDefault(); goTo(courses[i].id); });
    });
  }

  function renderMarquee() {
    var items = [];
    courses.forEach(function (c) { L(c.tags).forEach(function (t) { items.push({ t: t, c: c }); }); });
    // interleave courses so neighbours differ in colour
    var byC = courses.map(function (c) { return L(c.tags).map(function (t) { return { t: t, c: c }; }); }), mixed = [];
    for (var k = 0; k < 8; k++) byC.forEach(function (arr) { if (arr[k]) mixed.push(arr[k]); });
    var one = mixed.map(function (x) { return '<span style="--c:' + x.c.color + '"><i></i>' + esc(x.t) + '</span>'; }).join('');
    $('#marquee').innerHTML = one + one;
  }

  function renderCards() {
    var box = $('#cards');
    var html = courses.map(function (c, i) {
      return '<a class="pcard glass reveal" style="--d:' + (i % 3) * 0.08 + 's;--dl:' + (-i * 1.3) + 's" href="' + c.url + '" target="_blank" rel="noopener">' +
        '<div class="p-top"><span class="p-glyph">' + glyph(c) + '</span><span class="p-subj">' + esc(L(c.subject)) + '</span></div>' +
        '<h3 class="p-name">' + esc(L(c.name)) + '</h3>' +
        '<p class="p-alt">' + esc(c.name[lang === 'en' ? 'zh' : 'en'] || '') + '</p>' +
        '<p class="p-line">' + esc(L(c.line)) + '</p>' +
        '<div class="p-foot"><span>' + c.stages + ' ' + T('step.stages') + ' · ' + c.lessons + ' ' + T('step.lessons') + '</span>' +
        '<span class="p-open">' + T('grid.open') + ARROW + '</span></div></a>';
    }).join('');
    if (P.showNext) {
      html += '<div class="pcard next glass reveal"><span class="next-drop"><span></span></span><div><h3 class="p-name">' + T('grid.nextName') +
        '</h3><p class="p-line">' + T('grid.nextLine') + '</p></div></div>';
    }
    box.innerHTML = html;
    $$('.pcard', box).forEach(function (el, i) { if (courses[i]) tint(el, courses[i]); });
    bindTilt();
  }

  function renderStats() {
    var rows = [
      [totals.count, T('stats.paths')], [totals.lessons, T('stats.lessons')], [totals.demos, T('stats.demos')],
      [totals.stages, T('stats.stages')], [2, T('stats.langs')]
    ];
    $('#stats').innerHTML = rows.map(function (r, i) {
      return '<div class="stat reveal" style="--d:' + i * 0.07 + 's"><b data-to="' + r[0] + '">' + r[0] + '</b><span>' + esc(r[1]) + '</span></div>';
    }).join('');
    counted = false;
  }

  var ART = [
    '<svg viewBox="0 0 240 120" aria-hidden="true"><defs><linearGradient id="haGrad" x1="0" x2="1"><stop offset="0" stop-color="#F6CDB8"/><stop offset=".5" stop-color="#EAA6C8"/><stop offset="1" stop-color="#B9B6F2"/></linearGradient></defs>' +
      '<path class="ha-path" d="M20 96 C 70 96, 70 60, 120 60 S 170 24, 220 24"/><path class="ha-live" d="M20 96 C 70 96, 70 60, 120 60 S 170 24, 220 24"/>' +
      '<circle class="ha-dot" cx="20" cy="96" r="4"/><circle class="ha-dot" cx="120" cy="60" r="4"/><circle class="ha-dot" cx="220" cy="24" r="4"/></svg>',
    '<svg viewBox="0 0 240 120" aria-hidden="true"><path class="ha-grid" d="M20 20v80h200M20 60h200M80 20v80M140 20v80M200 20v80"/>' +
      '<path class="ha-curve" id="haCurve" d="M20 88 L112 88 L220 26"/><circle r="5" fill="#F6CDB8"><animateMotion dur="4s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1"><mpath href="#haCurve"/></animateMotion></circle></svg>',
    '<svg viewBox="0 0 240 120" aria-hidden="true"><rect class="ha-lock" x="78" y="18" width="84" height="84" rx="14"/>' +
      '<path d="M120 36 L136 52 A22.6 22.6 0 1 1 104 52 Z" fill="#2E9FD6"><animate attributeName="opacity" values=".55;1;.55" dur="3s" repeatCount="indefinite"/></path>' +
      '<path class="ha-lock" d="M92 92h56" opacity=".4"/></svg>'
  ];
  function renderHow() {
    $('#howList').innerHTML = T('how.items').map(function (it, i) {
      return '<div class="how-item glass reveal" style="--d:' + i * 0.1 + 's"><div class="how-art">' + ART[i % ART.length] + '</div><h3>' + esc(it.h) + '</h3><p>' + esc(it.p) + '</p></div>';
    }).join('');
  }

  function renderFooter() {
    $('#footPaths').innerHTML = courses.map(function (c) {
      return '<li><a href="' + c.url + '" target="_blank" rel="noopener" style="--c:' + c.color + '"><i></i>' + esc(L(c.name)) + '</a></li>';
    }).join('');
    $$('[data-home]').forEach(function (a) { a.href = P.site.home; });
    $('#mailBtn').href = $('#footMail').href = 'mailto:' + P.site.email;
    $('#footMail').textContent = $('#mailLine').textContent = P.site.email;
  }

  function renderText() {
    $$('[data-t]').forEach(function (el) { var v = T(el.dataset.t); if (typeof v === 'string') el.textContent = fill(v); });
    var other = lang === 'en' ? '中文' : 'EN';
    $('#langBtn').textContent = other; $('#langBtn2').textContent = other;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    if (lang === 'zh' && !$('#notoSC')) {
      var l = document.createElement('link'); l.id = 'notoSC'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500&display=swap';
      document.head.appendChild(l);
    }
  }

  function renderAll() {
    renderText(); renderHero(); renderSteps(); renderMarquee(); renderCards(); renderStats(); renderHow(); renderFooter();
    observeReveals(); restartTyping(); scrimEls = null;
    window.dispatchEvent(new CustomEvent('dl:layout'));
  }

  function setLang(l) {
    lang = l; try { localStorage.setItem('dl-paths-lang', l); } catch (e) {}
    renderAll();
  }
  $('#langBtn').addEventListener('click', function () { setLang(lang === 'en' ? 'zh' : 'en'); });
  $('#langBtn2').addEventListener('click', function () { setLang(lang === 'en' ? 'zh' : 'en'); });

  /* ---------- navigation ---------- */
  function scrollToEl(el) {
    var r = el.getBoundingClientRect();
    var top = window.scrollY + r.top + (r.height > innerHeight ? r.height / 2 - innerHeight / 2 : 0) - (r.height > innerHeight ? 0 : 80);
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  function goTo(id) { var el = document.getElementById('path-' + id); if (el) scrollToEl(el); }
  window.addEventListener('dl:pick', function (e) { goTo(e.detail.id); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.closest('#rail')) return;
    var id = a.getAttribute('href').slice(1);
    var el = id === 'top' ? document.body : document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' }); else scrollToEl(el);
  });

  /* ---------- search ---------- */
  var seek = $('#seek'), input = $('#seekInput'), ph = $('#seekPh'), msg = $('#seekMsg');
  function matches(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    var words = q.split(/\s+/);
    return courses.map(function (c) {
      var hay = [c.keywords, c.name.en, c.name.zh, c.subject.en, c.subject.zh, c.tags.en.join(' '), c.tags.zh.join(' ')].join(' ').toLowerCase();
      var s = 0; words.forEach(function (w) { if (hay.indexOf(w) > -1) s += 1 + (c.name.en.toLowerCase().indexOf(w) > -1 ? 1 : 0); });
      return { c: c, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
  }
  input.addEventListener('input', function () {
    var q = input.value, hits = matches(q);
    seek.classList.toggle('typing', q.length > 0);
    seek.classList.toggle('filtering', q.trim().length > 0);
    msg.hidden = true;
    $$('.schip').forEach(function (b) { b.classList.toggle('hit', hits.some(function (h) { return h.c.id === b.dataset.id; })); });
  });
  seek.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) { scrollToEl($('#river')); return; }
    var hits = matches(q);
    if (!hits.length) { msg.textContent = T('hero.noMatch'); msg.hidden = false; return; }
    goTo(hits[0].c.id);
  });

  var typeTimer = null;
  function restartTyping() {
    clearTimeout(typeTimer);
    var asks = courses.map(function (c) { return L(c.ask) + '…'; }), ai = 0, ci = 0, dir = 1;
    function tick() {
      var s = asks[ai];
      if (dir > 0) { ci++; ph.textContent = s.slice(0, ci); if (ci >= s.length) { dir = -1; return (typeTimer = setTimeout(tick, 1900)); } }
      else { ci -= 2; ph.textContent = s.slice(0, Math.max(0, ci)); if (ci <= 0) { dir = 1; ci = 0; ai = (ai + 1) % asks.length; return (typeTimer = setTimeout(tick, 350)); } }
      typeTimer = setTimeout(tick, dir > 0 ? 42 + Math.random() * 40 : 18);
    }
    ph.textContent = ''; typeTimer = setTimeout(tick, 2100);
  }

  /* ---------- reveal + counters ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); if (en.target.classList.contains('stat')) countUp(); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  function observeReveals() {
    $$('.reveal:not(.in), .step-card:not(.in)').forEach(function (el) { if (io) io.observe(el); else el.classList.add('in'); });
  }
  var counted = false;
  function countUp() {
    if (counted) return; counted = true;
    $$('.stat b').forEach(function (b) {
      var to = +b.dataset.to, t0 = performance.now(), dur = 1800;
      (function f(now) {
        var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(2, -10 * t);
        b.textContent = Math.round(to * (t === 1 ? 1 : e)); if (t < 1) requestAnimationFrame(f);
      })(t0);
    });
  }

  /* ---------- tilt ---------- */
  function bindTilt() {
    if (!fine) return;
    $$('.pcard').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add('tilting');
        el.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 12).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* magnetic buttons */
  if (fine) {
    document.addEventListener('pointermove', function (e) {
      var b = e.target.closest && e.target.closest('.btn, .seek-go');
      $$('.btn.mag, .seek-go.mag').forEach(function (m) { if (m !== b) { m.classList.remove('mag'); m.style.transform = ''; } });
      if (!b || b.closest('.pcard')) return;
      var r = b.getBoundingClientRect();
      b.classList.add('mag');
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + 'px)';
    });
  }

  /* ---------- scroll state: nav, scrim, rail ---------- */
  var nav = $('#nav'), scrim = $('#scrim'), rail = $('#rail'), ticking = false, scrimEls = null;
  function onScroll() {
    ticking = false;
    nav.classList.toggle('scrolled', scrollY > 30);
    var mid = innerHeight / 2, scr = 0, railId = null;
    if (!scrimEls) scrimEls = $$('[data-scrim]');
    scrimEls.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { scr = +s.dataset.scrim; if (s.dataset.rail) railId = s.dataset.rail; }
    });
    var foot = $('.foot').getBoundingClientRect(); if (foot.top < mid) scr = 1;
    if (scrim.style.opacity !== String(scr)) scrim.style.opacity = scr;
    rail.classList.toggle('on', !!railId);
    $$('a', rail).forEach(function (a) { a.classList.toggle('on', a.dataset.id === railId); });
    var secs = ['river', 'how', 'labs'], cur = null;
    secs.forEach(function (id) { var el = document.getElementById(id), r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) cur = id; });
    $$('.nav-links a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + cur); });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- boot ---------- */
  // debug: ?y=1200 renders the page as if scrolled to 1200px (screenshots of scrolled pages fail in some headless setups)
  var fy = /[?&]y=(\d+)/.exec(location.search);
  if (fy) { window.__fakeY = +fy[1]; $$('main, .foot').forEach(function (el) { el.style.transform = 'translateY(-' + fy[1] + 'px)'; }); }
  window.DLPaths = { get lang() { return lang; }, L: L, T: T };
  renderAll();
  var fat = /[?&]at=([\w:-]+)/.exec(location.search), fel = fat && document.querySelector('[data-shot="' + fat[1] + '"]');
  if (fel) {
    var fr = fel.getBoundingClientRect(), fyv = Math.max(0, Math.round(fr.top + fr.height / 2 - innerHeight / 2));
    window.__fakeY = fyv; $$('main, .foot').forEach(function (el) { el.style.transform = 'translateY(-' + fyv + 'px)'; });
  }
  onScroll();
  function ready() { document.body.classList.add('ready'); }
  window.addEventListener('dl:ready', function () { setTimeout(ready, 250); });
  setTimeout(ready, 3200);
  if (/[?&]nl(&|$)/.test(location.search)) ready();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { window.dispatchEvent(new CustomEvent('dl:layout')); });
})();
