/* Droplet Labs · Paths — Home Screen app helpers.
   Runs on the hub page and (injected by sw.js) on every course page. It only acts when the
   site is opened from the iPhone Home Screen (standalone mode), where there is no browser
   back button and target="_blank" links would leave the app (and its offline copy).
   ?standalone forces it on for testing. */
(function () {
  'use strict';
  var forced = /[?&]standalone(&|$)/.test(location.search);
  var standalone = forced || window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (!standalone || window.__dlShell) return;
  window.__dlShell = true;

  // 1. Keep links to this site inside the app instead of opening a separate browser view.
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || a.target !== '_blank' || e.defaultPrevented) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    e.preventDefault();
    location.href = u.href;
  }, true);

  // 2. On a course page, a small round button back to all paths.
  var p = location.pathname;
  if (p === '/' || p === '/index.html') return;

  // 3. The Home Screen app draws under the status bar (black-translucent), and the course pages
  //    don't reserve that space. Push their fixed top bar, reading bar and lesson drawer below the
  //    clock / Dynamic Island, and keep bottom cards above the home indicator. All courses share
  //    one shell, so --nav-top drives the bar and every sticky offset under it.
  var css = document.createElement('style');
  css.id = 'dl-safe-area';
  css.textContent =
    ':root{--nav-top:calc(10px + env(safe-area-inset-top, 0px)) !important}' +
    '.readbar{top:env(safe-area-inset-top, 0px) !important}' +
    '@media (max-width:1080px){' +
      '.sidebar{padding-top:calc(22px + env(safe-area-inset-top, 0px)) !important;padding-bottom:calc(40px + env(safe-area-inset-bottom, 0px)) !important}' +
      '.gloss-card{bottom:calc(14px + env(safe-area-inset-bottom, 0px)) !important}' +
    '}';
  (document.head || document.documentElement).appendChild(css);
  // The status bar text is white in this mode; course pages are light, so give it a dark strip.
  function strip() {
    if (document.getElementById('dl-statusbar')) return;
    var s = document.createElement('div');
    s.id = 'dl-statusbar';
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top, 0px);background:#0B0B0D;z-index:2147482999;pointer-events:none';
    document.body.appendChild(s);
  }
  if (document.body) strip(); else document.addEventListener('DOMContentLoaded', strip);
  function add() {
    if (document.getElementById('dl-home')) return;
    var zh = /^zh/i.test(document.documentElement.lang || '');
    var b = document.createElement('a');
    b.id = 'dl-home';
    b.href = '/';
    b.setAttribute('aria-label', zh ? '全部课程' : 'All paths');
    b.title = zh ? '全部课程' : 'All paths';
    b.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">' +
      '<rect x="3" y="3" width="5.5" height="5.5" rx="1.4"/><rect x="11.5" y="3" width="5.5" height="5.5" rx="1.4"/>' +
      '<rect x="3" y="11.5" width="5.5" height="5.5" rx="1.4"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.4"/></svg>';
    b.style.cssText = [
      'position:fixed', 'z-index:2147483000',
      'left:calc(12px + env(safe-area-inset-left, 0px))', 'bottom:calc(14px + env(safe-area-inset-bottom, 0px))',
      'width:40px', 'height:40px', 'border-radius:50%', 'display:grid', 'place-items:center',
      'color:#EEF0FA', 'background:rgba(10,14,36,.72)', 'border:1px solid rgba(255,255,255,.18)',
      '-webkit-backdrop-filter:blur(10px)', 'backdrop-filter:blur(10px)',
      'box-shadow:0 8px 24px -10px rgba(3,5,20,.8)', 'text-decoration:none', 'opacity:.82',
      '-webkit-tap-highlight-color:transparent', 'transition:transform .35s cubic-bezier(.2,.7,.1,1), opacity .35s'
    ].join(';');
    document.body.appendChild(b);
    // like Safari's own toolbar: tuck away while reading down, come back on the way up
    var last = window.scrollY, hidden = false;
    window.addEventListener('scroll', function () {
      var y = window.scrollY, d = y - last;
      if (Math.abs(d) < 6) return;
      var hide = d > 0 && y > 120;
      if (hide !== hidden) {
        hidden = hide;
        b.style.transform = hide ? 'translateY(calc(100% + 30px))' : 'none';
        b.style.opacity = hide ? '0' : '.82';
        b.style.pointerEvents = hide ? 'none' : 'auto';
      }
      last = y;
    }, { passive: true });
  }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
