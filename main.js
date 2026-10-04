'use strict';

const root = document.documentElement;
const motionOn = root.dataset.motion === 'on';
const reducedMotion = !motionOn;
const DAYS = ['nedelja', 'ponedeljek', 'torek', 'sreda', 'četrtek', 'petek', 'sobota'];
const DAYS_SHORT = ['ned', 'pon', 'tor', 'sre', 'čet', 'pet', 'sob'];
const MONTHS = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december'];

function fmtDur(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}
const fmtEur = (n) => `${n} €`;
const parseKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
function fmtDay(key, long = true) {
  const d = parseKey(key);
  return long ? `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}` : `${DAYS_SHORT[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
}
function addMin(hhmm, min) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}
async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || 'Napaka. Poskusi znova.'), { status: res.status });
  return body;
}
const store = {
  get: (s, k) => { try { return s.getItem(k); } catch { return null; } },
  set: (s, k, v) => { try { s.setItem(k, v); } catch {} },
  del: (s, k) => { try { s.removeItem(k); } catch {} },
};

// theme: follows the device (light/dark mode) until the header button picks the other one.
// Picking the device's own theme again clears the override, so the site follows the device once more.
const deviceLight = matchMedia('(prefers-color-scheme: light)');
const themeButtons = document.querySelectorAll('.theme-toggle');
const setTheme = (theme) => {
  root.dataset.theme = theme;
  const light = theme === 'light';
  themeButtons.forEach((b) => {
    b.setAttribute('aria-pressed', String(light));
    b.setAttribute('aria-label', light ? 'Temna tema' : 'Svetla tema');
  });
};
setTheme(root.dataset.theme);
themeButtons.forEach((b) => b.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  if ((next === 'light') === deviceLight.matches) store.del(localStorage, 'ms-theme');
  else store.set(localStorage, 'ms-theme', next);
  setTheme(next);
  dispatchEvent(new Event('themechange'));
}));
deviceLight.addEventListener('change', (e) => {
  const next = e.matches ? 'light' : 'dark';
  if (store.get(localStorage, 'ms-theme') || next === root.dataset.theme) return;
  setTheme(next);
  dispatchEvent(new Event('themechange'));
});

// smooth scroll, driven by GSAP's ticker when GSAP is on the page
let lenis = null;
if (motionOn && window.Lenis) {
  lenis = new Lenis({ anchors: true, lerp: 0.1 });
  if (window.gsap && window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

// header: tint after the fold, tuck away while scrolling down
const header = document.querySelector('.site-header');
const solidHeader = header.classList.contains('scrolled');
let lastY = scrollY;
const onScroll = () => {
  const y = scrollY;
  header.classList.toggle('scrolled', solidHeader || y > 24);
  if (motionOn) header.classList.toggle('tuck', y > 200 && y > lastY);
  lastY = y;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// page wipe between our own pages
const wipe = document.querySelector('.wipe');
if (wipe && motionOn) {
  const ease = 'cubic-bezier(0.7, 0, 0.2, 1)';
  if (root.classList.contains('wiping') && document.hidden) {
    store.del(sessionStorage, 'ms-wipe');
    root.classList.remove('wiping');
  } else if (root.classList.contains('wiping')) {
    store.del(sessionStorage, 'ms-wipe');
    wipe.animate([{ transform: 'none' }, { transform: 'translateY(-100%)' }], { duration: 750, delay: 120, easing: ease, fill: 'forwards' })
      .finished.then(() => root.classList.remove('wiping'));
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download') || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    e.preventDefault();
    store.set(sessionStorage, 'ms-wipe', '1');
    const cover = wipe.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 600, easing: ease, fill: 'forwards' });
    // Animations freeze in hidden tabs; never let the wipe block navigation.
    Promise.race([cover.finished, new Promise((r) => setTimeout(r, 750))]).then(() => { location.href = url.href; });
  });
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    wipe.getAnimations().forEach((a) => a.cancel());
    root.classList.remove('wiping');
  });
}

// cursor follower with contextual label
const cursor = document.querySelector('.cursor');
if (cursor && motionOn && matchMedia('(pointer: fine)').matches) {
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');
  const label = ring.querySelector('b');
  let x = -100, y = -100, rx = x, ry = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px, ${y}px)`; }, { passive: true });
  const loop = () => {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor]');
    cursor.classList.toggle('label', !!t);
    if (t) label.textContent = t.dataset.cursor;
  });
}

// magnetic buttons
if (motionOn && matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.magnetic').forEach((m) => {
    m.addEventListener('pointermove', (e) => {
      const r = m.getBoundingClientRect();
      m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    m.addEventListener('pointerleave', () => { m.style.transform = ''; });
  });
}
