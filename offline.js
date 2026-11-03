/* Droplet Labs · Paths — "Save all paths for offline".
   Lives in the bottom row of the Paths menu. Saving lists every file of the hub and of each
   course (from the GitHub API, so new lessons are included automatically; offline-files.json is
   the fallback), stores them in the Cache API, and registers sw.js to serve them offline.
   Re-saving only fetches files whose git sha changed. Remove deletes everything and the worker.
   Debug: ?offlist=local uses offline-files.json instead of the API. */
(function () {
  'use strict';
  var P = window.PATHS, D = window.DLPaths;
  var row = document.getElementById('offRow');
  if (!row || !D) return;
  if (!('serviceWorker' in navigator) || !('caches' in window) || !window.isSecureContext) return;
  row.hidden = false;

  var OWNER = 'evidex-cloud', HUB = OWNER + '.github.io';
  var CACHE = 'dl-paths-offline-v1', FONTS = 'dl-paths-fonts-v1', META = '/__offline-meta.json';
  var LOCAL_LIST = /[?&]offlist=local(&|$)/.test(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var btn = $('offBtn'), label = $('offLabel'), metaEl = $('offMeta'), acts = $('offActs'),
      upd = $('offUpd'), del = $('offDel'), bar = $('offBar'), fill = $('offFill'), note = $('offNote');
  var T = function (k) { return D.T('offline.' + k) || ''; };
  var ua = navigator.userAgent;
  var isIOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

  var state = { mode: 'idle', meta: null, done: 0, total: 0, estimate: 0, failed: 0, msg: '', warn: false };
  var busy = false, delArmed = 0;

  /* ---------- what to save ---------- */
  function repos() {
    var list = [{ id: 'hub', repo: HUB, base: '/' }];
    P.courses.forEach(function (c) {
      var u; try { u = new URL(c.url); } catch (e) { return; }
      var seg = u.pathname.split('/').filter(Boolean)[0];
      if (u.hostname === HUB && seg) list.push({ id: c.id, repo: seg, base: '/' + seg + '/' });
    });
    return list;
  }
  // must match keep() in tools/build-offline-list.py
  function keep(path, hub) {
    var parts = path.split('/');
    if (parts.some(function (p) { return p.charAt(0) === '.'; })) return false;
    if (['tools', 'node_modules', 'tests', 'test', 'scripts'].indexOf(parts[0]) > -1) return false;
    if (parts.length === 1) {
      var n = parts[0], ext = (n.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      if (n === 'LICENSE' || n === 'CNAME') return false;
      if (['.md', '.bat', '.sh', '.py', '.txt', '.ps1'].indexOf(ext) > -1) return false;
      if (hub && (n === 'sw.js' || n === 'offline-files.json')) return false;
    }
    return true;
  }
  var fallback = null;
  function loadFallback() {
    return fallback || (fallback = fetch('/offline-files.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }));
  }
  async function listRepo(r) {
    if (!LOCAL_LIST) {
      try {
        var res = await fetch('https://api.github.com/repos/' + OWNER + '/' + r.repo + '/git/trees/HEAD?recursive=1',
          { headers: { Accept: 'application/vnd.github+json' } });
        if (res.ok) {
          var j = await res.json();
          if (!j.truncated && Array.isArray(j.tree)) {
            return j.tree.filter(function (t) { return t.type === 'blob' && keep(t.path, r.repo === HUB); })
              .map(function (t) { return [t.path, t.size || 0, t.sha]; });
          }
        }
      } catch (e) { /* use the fallback list */ }
    }
    var fb = await loadFallback();
    return fb && fb.repos && fb.repos[r.repo] ? fb.repos[r.repo].files : null;
  }

  /* ---------- cache helpers ---------- */
  async function readMeta() {
    try {
      if (!(await caches.has(CACHE))) return null;          // don't create an empty cache for visitors who never saved
      var c = await caches.open(CACHE), r = await c.match(META); return r ? await r.json() : null;
    } catch (e) { return null; }
  }
  async function registerSW() {
    var reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  }
  async function pool(items, n, fn) {
    var i = 0;
    async function worker() { while (i < items.length) { var k = i++; await fn(items[k]); } }
    var ws = []; for (var w = 0; w < Math.min(n, items.length); w++) ws.push(worker());
    await Promise.all(ws);
  }
  async function grab(url) {
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          if (res.redirected) res = new Response(await res.blob(), { status: 200, headers: res.headers });
          return res;
        }
        if (res.status === 404) return null;
      } catch (e) { /* retry once */ }
    }
    return null;
  }

  /* ---------- save / update ---------- */
  async function save() {
    if (busy) return;
    if (!navigator.onLine) { state.msg = T('needNet'); state.warn = true; render(); return; }
    busy = true; state.mode = 'saving'; state.done = 0; state.total = 0; state.failed = 0; state.msg = ''; state.warn = false; render();
    try {
      await registerSW();
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
      var origin = location.origin, cache = await caches.open(CACHE);
      var old = (await readMeta()) || { files: {} };
      var rs = repos(), lists = await Promise.all(rs.map(listRepo));
      var all = [], missing = [], perRepo = {};
      rs.forEach(function (r, i) {
        if (!lists[i]) { missing.push(r); return; }
        perRepo[r.id] = { files: lists[i].length, bytes: 0, failed: 0 };
        lists[i].forEach(function (f) { all.push({ url: r.base + f[0], size: f[1], sha: f[2], repo: r.id }); perRepo[r.id].bytes += f[1]; });
      });
      if (!all.length) throw new Error('nothing to save');
      var files = {}, todo = [];
      state.total = all.reduce(function (a, f) { return a + f.size; }, 0);
      for (var k = 0; k < all.length; k++) {
        var f = all[k], key = origin + f.url;
        if (old.files[key] === f.sha && await cache.match(key)) { files[key] = f.sha; state.done += f.size; }
        else todo.push(f);
      }
      var changed = todo.length; render();
      var failedList = [];
      await pool(todo, 6, async function (f) {
        var res = await grab(f.url);
        if (res) { await cache.put(origin + f.url, res); files[origin + f.url] = f.sha; }
        else { failedList.push(f.url); perRepo[f.repo].failed++; }
        state.done += f.size; tick();
      });
      // drop files that no longer exist (but keep anything from a repo we could not list this time)
      var keepPrefixes = missing.map(function (r) { return origin + r.base; });
      var keys = await cache.keys();
      for (var q = 0; q < keys.length; q++) {
        var u = keys[q].url;
        if (u === origin + META || files[u]) continue;
        if (missing.length && keepPrefixes.some(function (p) { return u.indexOf(p) === 0; }) && old.files[u]) { files[u] = old.files[u]; continue; }
        await cache.delete(keys[q]);
      }
      await saveFonts(cache, rs);
      var courses = rs.filter(function (r) { return r.id !== 'hub' && perRepo[r.id] && !perRepo[r.id].failed; }).map(function (r) { return r.id; });
      var meta = { v: 1, at: Date.now(), bytes: state.total, files: files, courses: courses, failed: failedList.length,
                   hubOk: !!(perRepo.hub && !perRepo.hub.failed), missing: missing.map(function (r) { return r.id; }) };
      await cache.put(origin + META, new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }));
      try { localStorage.setItem('dl-offline', JSON.stringify({ at: meta.at, bytes: meta.bytes, n: courses.length })); } catch (e) {}
      state.meta = meta; state.mode = 'saved'; state.failed = failedList.length + missing.length;
      state.msg = state.failed ? T('failed').replace('{n}', state.failed) : (changed === 0 ? T('upToDate') : '');
      state.warn = !!state.failed;
    } catch (e) {
      state.mode = state.meta ? 'saved' : 'idle';
      state.msg = navigator.onLine ? T('error') : T('needNet');
      state.warn = true;
    }
    busy = false; render(); markPanel();
  }

  // Outfit / Geist Mono (Latin) so the pages keep their type offline; Chinese falls back to the system font.
  async function saveFonts(cache, rs) {
    try {
      var fc = await caches.open(FONTS), css = {};
      var links = document.querySelectorAll('link[href^="https://fonts.googleapis.com/css2"]');
      for (var i = 0; i < links.length; i++) css[links[i].href] = 1;
      for (var j = 0; j < rs.length; j++) {
        if (rs[j].id === 'hub') continue;
        var r = await cache.match(location.origin + rs[j].base + 'index.html'); if (!r) continue;
        var m = (await r.text()).match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s>]+/g) || [];
        m.forEach(function (u) { css[u.replace(/&amp;/g, '&')] = 1; });
      }
      var woff = {};
      for (var u in css) {
        var res = await fetch(u, { mode: 'cors' }); if (!res.ok) continue;
        var text = await res.text();
        await fc.put(u, new Response(text, { headers: { 'content-type': 'text/css; charset=utf-8' } }));
        var re = /\/\*\s*(latin(?:-ext)?)\s*\*\/\s*@font-face\s*\{[^}]*?url\((https:[^)]+)\)/g, mm;
        while ((mm = re.exec(text))) woff[mm[2]] = 1;
      }
      await pool(Object.keys(woff), 4, async function (w) {
        if (await fc.match(w)) return;
        try { var fr = await fetch(w, { mode: 'cors' }); if (fr.ok) await fc.put(w, fr); } catch (e) {}
      });
    } catch (e) { /* fonts are a nicety */ }
  }

  async function remove() {
    if (busy) return;
    if (Date.now() - delArmed > 3500) { delArmed = Date.now(); render(); setTimeout(render, 3600); return; }
    delArmed = 0; busy = true;
    try {
      await caches.delete(CACHE); await caches.delete(FONTS);
      var regs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < regs.length; i++) if (regs[i].scope === location.origin + '/') await regs[i].unregister();
      try { localStorage.removeItem('dl-offline'); } catch (e) {}
    } catch (e) {}
    busy = false; state.meta = null; state.mode = 'idle'; state.msg = T('removed'); state.warn = false; render(); markPanel();
  }

  /* ---------- UI ---------- */
  var raf = 0;
  function tick() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; render(); }); }
  function mb(b) { return (b / 1e6).toFixed(b < 1e7 ? 1 : 0) + ' MB'; }
  function day(t) {
    try { return new Date(t).toLocaleDateString(D.lang === 'zh' ? 'zh-CN' : 'en', { month: 'short', day: 'numeric' }); } catch (e) { return ''; }
  }
  function render() {
    var m = state.mode;
    row.classList.toggle('is-saving', m === 'saving');
    row.classList.toggle('is-saved', m === 'saved');
    btn.disabled = m !== 'idle';
    if (m === 'saving') {
      var pct = state.total ? Math.min(100, Math.floor(state.done / state.total * 100)) : 0;
      label.textContent = state.meta ? T('updating') : T('saving');
      metaEl.textContent = state.total ? pct + '% · ' + mb(state.done) + ' / ' + mb(state.total) : '';
      bar.hidden = false; fill.style.width = pct + '%';
    } else if (m === 'saved' && state.meta) {
      label.textContent = T('saved');
      metaEl.textContent = T('paths').replace('{n}', state.meta.courses.length) + ' · ' + mb(state.meta.bytes) + ' · ' + day(state.meta.at);
      bar.hidden = true;
    } else {
      label.textContent = T('save');
      metaEl.textContent = state.estimate ? '≈ ' + mb(state.estimate) : '';
      bar.hidden = true;
    }
    acts.hidden = m !== 'saved';
    upd.textContent = T('update');
    del.textContent = delArmed && Date.now() - delArmed < 3500 ? T('confirmRemove') : T('remove');
    del.classList.toggle('armed', !!delArmed && Date.now() - delArmed < 3500);
    var msg = state.msg;
    if (!msg && m === 'idle' && isIOS && !standalone) msg = T('iosHint');
    note.hidden = !msg; note.textContent = msg;
    note.classList.toggle('warn', !!state.warn && msg === state.msg);
  }
  // tick saved courses in the Paths menu
  function markPanel() {
    var saved = state.meta ? state.meta.courses : [];
    var byUrl = {}; P.courses.forEach(function (c) { byUrl[c.url] = c.id; });
    document.querySelectorAll('#ppGrid .pp-item').forEach(function (a) {
      var on = saved.indexOf(byUrl[a.getAttribute('href')]) > -1, em = a.querySelector('em');
      a.classList.toggle('is-off', on);
      if (em) { if (on) { em.setAttribute('data-off', ''); a.title = T('saved'); } else { em.removeAttribute('data-off'); a.removeAttribute('title'); } }
    });
  }

  btn.addEventListener('click', save);
  upd.addEventListener('click', save);
  del.addEventListener('click', remove);
  window.addEventListener('dl:layout', function () { render(); markPanel(); });
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  // size estimate, loaded the first time the menu opens
  var est = false;
  function estimate() {
    if (est) return; est = true;
    loadFallback().then(function (fb) { if (fb && fb.totalBytes) { state.estimate = fb.totalBytes; render(); } });
  }
  ['pathsBtn', 'menuBtn'].forEach(function (id) { var b = $(id); if (b) b.addEventListener('click', estimate); });

  var ready = readMeta().then(function (meta) {
    if (meta) {
      state.meta = meta; state.mode = 'saved';
      registerSW().catch(function () {});           // keep the worker in place for saved copies
    }
    render(); markPanel();
  });
  render();
  window.DLOffline = { save: save, remove: remove, ready: ready, get state() { return state; } };
})();
