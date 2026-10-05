'use strict';

(() => {
  const PHOTOS = [
    ['portugalske_ploscice', 'portugalske ploščice'],
    ['summer_barbie_coded', 'summer barbie coded'],
    ['black_veil_brides', 'black veil brides'],
    ['morske_zvezdice', 'morske zvezdice'],
    ['late_springbreak', 'late springbreak'],
    ['mediteranski_minimal', 'mediteranski minimal'],
    ['hitri_nohtki', 'čist hudi nohtki'],
    ['nezna_dusa', 'nežna duša'],
    ['valentinckoti', 'valentinčkoti'],
    ['spomladanski', 'spomladanski'],
    ['tulipani', 'tulipani'],
    ['tortie_moment', 'tortie moment'],
  ];
  // Example photo per nail art level; swap files here if Marta prefers other sets.
  const LEVEL_PHOTOS = ['tulipani', 'mediteranski_minimal', 'black_veil_brides', 'portugalske_ploscice'];
  const small = matchMedia('(max-width: 760px)').matches;
  const G = motionOn && window.gsap && window.ScrollTrigger && window.SplitText;

  let introDone = Promise.resolve();

  // types text into a node once it is on screen (and after `when`); screen readers get the whole text at once
  const typeOnView = (node, text, { duration = Math.max(0.4, Math.min(1, text.length * 0.045)), when = Promise.resolve() } = {}) => {
    if (!G) { node.textContent = text; return; }
    const typed = el('span', { class: 'typing', 'aria-hidden': 'true' }, '\u200b');
    node.replaceChildren(el('span', { class: 'visually-hidden' }, text), typed);
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      when.then(() => {
        const t = { n: 0 };
        typed.classList.add('caret-on');
        gsap.to(t, {
          n: text.length, duration, ease: 'none',
          onUpdate: () => { typed.textContent = text.slice(0, Math.round(t.n)) || '\u200b'; },
          onComplete: () => gsap.delayedCall(0.8, () => typed.classList.remove('caret-on')),
        });
      });
    }, { threshold: 0.6 });
    io.observe(node);
  };
  document.querySelectorAll('.eyebrow').forEach((n) => typeOnView(n, n.textContent));

  // work gallery
  const work = document.querySelector('.work');
  const track = work.querySelector('.work-track');
  PHOTOS.forEach(([file, caption], i) => {
    const name = el('b', {}, `${file}.jpg`);
    track.append(el('figure', { class: 'shot' },
      el('div', { class: 'frame' }, el('img', { src: `/img/${file}.webp`, alt: `Nail art: ${caption}`, loading: 'lazy', decoding: 'async' })),
      el('figcaption', {}, name, el('span', {}, String(i + 1).padStart(2, '0')))));
    typeOnView(name, `${file}.jpg`);
  });
  track.append(el('a', { class: 'shot shot-end', href: 'https://www.instagram.com/ms.nailartist.zip/', target: '_blank', rel: 'noopener', 'data-cursor': 'instagram' },
    el('span', { class: 'serif' }, 'Še več na Instagramu →'), el('span', { class: 'mono muted' }, '@ms.nailartist.zip')));
  work.querySelector('.wc-all').textContent = String(PHOTOS.length).padStart(2, '0');

  // the row scrolls on its own (swipe, trackpad, arrows); the page never locks
  const [prevBtn, nextBtn] = work.querySelectorAll('.work-btn');
  const wcNow = work.querySelector('.wc-now');
  const workBar = work.querySelector('.work-progress i');
  const step = () => track.querySelector('.shot').offsetWidth + parseFloat(getComputedStyle(track).columnGap);
  const onTrack = () => {
    const max = track.scrollWidth - track.clientWidth;
    workBar.style.transform = `scaleX(${max > 0 ? track.scrollLeft / max : 1})`;
    const atEnd = track.scrollLeft >= max - 1;
    wcNow.textContent = String(atEnd ? PHOTOS.length : Math.min(PHOTOS.length, Math.round(track.scrollLeft / step()) + 1)).padStart(2, '0');
    prevBtn.disabled = track.scrollLeft <= 1;
    nextBtn.disabled = atEnd;
  };
  const cardAt = (left) => Math.max(0, Math.min(track.scrollWidth - track.clientWidth, Math.round(left / step()) * step()));
  // an eased glide to a card when GSAP is here, a plain jump with motion off
  const glide = { left: 0 };
  const glideTo = (left) => {
    if (!G) { track.style.scrollSnapType = ''; track.scrollLeft = left; return; }
    // snapping fights a scroll that is animated frame by frame, so it is off for the glide and back on after
    track.style.scrollSnapType = 'none';
    glide.left = track.scrollLeft;
    gsap.to(glide, { left, duration: 0.9, ease: 'power3.out', overwrite: true,
      onUpdate: () => { track.scrollLeft = glide.left; },
      onComplete: () => { track.style.scrollSnapType = ''; } });
  };
  [prevBtn, nextBtn].forEach((b) => b.addEventListener('click', () => glideTo(cardAt(track.scrollLeft + step() * b.dataset.dir))));

  // mouse drag (touch keeps the browser's own swipe); on release the row keeps the fling and settles on a card
  let drag = null;
  let justDragged = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button) return;
    if (G) gsap.killTweensOf(glide);
    drag = { x: e.clientX, left: track.scrollLeft, moved: false, v: 0, lastX: e.clientX, lastT: e.timeStamp };
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 5) return;
      drag.moved = true;
      track.style.scrollSnapType = 'none';
      track.classList.add('dragging');
    }
    track.scrollLeft = drag.left - dx;
    if (e.timeStamp > drag.lastT) drag.v = (e.clientX - drag.lastX) / (e.timeStamp - drag.lastT);
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
  });
  const endDrag = (e) => {
    if (!drag) return;
    const { moved, lastT } = drag;
    const v = e.timeStamp - lastT > 80 ? 0 : drag.v;
    drag = null;
    if (!moved) return;
    track.classList.remove('dragging');
    justDragged = true;
    setTimeout(() => { justDragged = false; });
    glideTo(cardAt(track.scrollLeft - v * 250));
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);
  // a drag must not open the Instagram card or start the browser's own image drag
  track.addEventListener('click', (e) => { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  track.addEventListener('dragstart', (e) => e.preventDefault());
  track.addEventListener('scroll', onTrack, { passive: true });
  addEventListener('resize', onTrack);
  onTrack();

  // catalog-driven parts: nail art levels, prices, hours, next free slot
  const levelsList = document.querySelector('.levels-list');
  const catalogReady = api('/api/services').then((cat) => {
    const art = cat.categories.flatMap((c) => c.services).filter((s) => s.slot === 'art');
    art.forEach((s, i) => {
      levelsList.append(el('li', {}, el('a', { class: 'lvl', href: `/narocanje.html?izberi=${encodeURIComponent(s.id)}`, 'data-cursor': 'izberi' },
        el('div', { class: 'lvl-media' }, el('img', { src: `/img/${LEVEL_PHOTOS[i] || LEVEL_PHOTOS[0]}.webp`, alt: '', loading: 'lazy' })),
        el('div', { class: 'lvl-body' },
          el('h3', {}, s.title || `Nivo ${s.level}`),
          el('p', {}, s.desc || ''),
          s.surcharge ? el('span', { class: 'surcharge mono' }, s.surcharge) : '',
          el('span', { class: 'lvl-meta' }, el('span', {}, `+ ${fmtDur(s.min)}`), el('span', {}, `+ ${fmtEur(s.eur)}`)),
          el('span', { class: 'lvl-cta' }, 'izberi ta paket →')))));
    });
    const from = (id) => Math.min(...cat.categories.find((c) => c.id === id).services.map((s) => s.eur));
    document.querySelector('.base-line').append('Osnova: naravni nohti od ', el('b', {}, fmtEur(from('naravni'))), ', podaljševanje od ', el('b', {}, fmtEur(from('podaljsevanje'))), '.',
      cat.placeholderPrices ? el('span', { class: 'todo' }, ' začasne cene ') : '',
      cat.priceNote ? el('span', { class: 'price-note mono' }, cat.priceNote) : '');
    const hours = document.querySelector('.hours');
    for (const d of [1, 2, 3, 4, 5, 6, 0]) {
      const h = cat.hours[d];
      hours.append(el('dt', { class: 'mono' }, DAYS_SHORT[d]), el('dd', {}, h ? `${h[0]} – ${h[1]}` : 'zaprto'));
    }
    const firstBase = cat.categories.find((c) => c.id === 'naravni').services[0];
    api(`/api/availability?services=${firstBase.id}`).then((av) => {
      const first = av.days[0];
      if (!first) return;
      const p = document.querySelector('.next-slot');
      p.hidden = false;
      typeOnView(p.querySelector('.next-slot-text'), `naslednji prosti termin: ${fmtDay(first.date, false)} ob ${first.times[0]}`, { when: introDone });
    }).catch(() => {});
  }).catch((e) => console.warn(e));

  if (!G) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // intro: the archive unzips once per session
  function intro() {
    return new Promise((resolve) => {
      const box = document.querySelector('.intro');
      if (store.get(sessionStorage, 'ms-intro') || root.classList.contains('wiping')) { box.remove(); return resolve(); }
      store.set(sessionStorage, 'ms-intro', '1');
      box.classList.add('run');
      lenis?.stop();
      const log = box.querySelector('.intro-log');
      const pct = box.querySelector('.intro-pct span');
      const counter = { p: 0 };
      const tl = gsap.timeline({ onComplete: () => { box.remove(); lenis?.start(); } });
      tl.from('.intro-file', { y: 24, opacity: 0, duration: 0.6, ease: 'expo.out' })
        .to(counter, {
          p: 100, duration: 1.7, ease: 'power2.inOut',
          onUpdate() {
            pct.textContent = String(Math.round(counter.p)).padStart(3, '0');
            const n = Math.floor((counter.p / 100) * PHOTOS.length);
            while (log.children.length < n) log.append(el('li', {}, 'razpakiram: ', el('b', {}, `${PHOTOS[log.children.length][0]}.jpg`)));
          },
        }, 0.2)
        .to('.intro-bar i', { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0.2)
        .to('.intro-body', { opacity: 0, y: -16, duration: 0.35, ease: 'power2.in' })
        .to('.intro-panel.top', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '>-0.05')
        .to('.intro-panel.bottom', { yPercent: 100, duration: 1, ease: 'expo.inOut' }, '<')
        .call(resolve, null, '<0.25');
      const skip = () => tl.progress(1);
      box.addEventListener('click', skip);
      addEventListener('keydown', skip, { once: true });
    });
  }

  // hero entrance
  const title = SplitText.create('.hero-title', { type: 'lines,words,chars', mask: 'lines', linesClass: 'ln' });
  gsap.set(title.chars, { yPercent: 145 });
  gsap.set(['.hero .path', '.hero .sub', '.hero-actions', '.hero-scroll'], { opacity: 0, y: 24 });
  const typed = document.querySelector('.hero .typed');
  const fullPath = typed.textContent;
  typed.textContent = '';

  introDone = intro();
  introDone.then(() => {
    const tl = gsap.timeline();
    // ends slightly zoomed in so the idle drift below never shows an edge
    tl.fromTo('.hero-video', { scale: 1.25 }, { scale: 1.06, duration: 2.4, ease: 'expo.out' }, 0)
      .to(title.chars, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.022 }, 0.1)
      .to('.hero .path', { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 0.2)
      .to({ n: 0 }, { n: fullPath.length, duration: 0.9, ease: 'none', onUpdate() { typed.textContent = fullPath.slice(0, Math.round(this.targets()[0].n)); } }, 0.3)
      .to(['.hero .sub', '.hero-actions', '.hero-scroll'], { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1 }, 0.6);
  });

  // the hero is a still photo; a slow drift keeps it alive (x/y compose with the scroll's scale and yPercent)
  const heroMedia = document.querySelector('.hero-media');
  gsap.to('.hero-video', { x: (i, img) => -(img.offsetWidth || heroMedia.offsetWidth) * 0.022, y: (i, img) => -(img.offsetHeight || heroMedia.offsetHeight) * 0.018, rotation: -0.6, duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  // hero shrinks into a card as you scroll away; light theme on phones already is a card, it just drifts
  if (!small || root.dataset.theme !== 'light') {
    gsap.set('.hero-media', { clipPath: 'inset(0% 0% 0% 0% round 0px)' });
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=90%', scrub: true, pin: true } })
      .to('.hero-media', { clipPath: 'inset(10% 6% 10% 6% round 28px)', ease: 'none' }, 0)
      .to('.hero-video', { scale: 1.15, ease: 'none' }, 0)
      .to('.hero-copy', { yPercent: -12, opacity: 0, ease: 'none' }, 0)
      .to('.hero-scroll', { opacity: 0, ease: 'none', duration: 0.2 }, 0);
  } else {
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero-video', { yPercent: 6, scale: 1.1, ease: 'none' }, 0)
      .to('.hero-copy', { yPercent: -10, ease: 'none' }, 0);
  }
  // ponytail: the phone hero choreography is built once, so a theme switch there reloads instead of rebuilding it
  if (small) addEventListener('themechange', () => location.reload());

  // manifesto: words light up with scroll, photo pills open up
  const words = SplitText.create('.manifesto-text', { type: 'words' }).words;
  gsap.fromTo(words, { opacity: 0.12 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: '.manifesto', start: 'top 75%', end: 'bottom 70%', scrub: true } });
  gsap.utils.toArray('.pill').forEach((p) => gsap.from(p, { width: 0, marginLeft: 0, marginRight: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 80%' } }));

  // interlude: the two type rows slide against each other over a drifting strip of photos
  gsap.timeline({ scrollTrigger: { trigger: '.interlude', start: 'top bottom', end: 'bottom top', scrub: true } })
    .fromTo('.interlude .r1', { xPercent: 5 }, { xPercent: -35, ease: 'none' }, 0)
    .fromTo('.interlude .r2', { xPercent: -40 }, { xPercent: 0, ease: 'none' }, 0)
    .fromTo('.interlude-media', { xPercent: 0 }, { xPercent: -20, ease: 'none' }, 0);

  // section headings rise word by word
  document.querySelectorAll('h2.split').forEach((h) => {
    const s = SplitText.create(h, { type: 'lines,words', mask: 'lines', linesClass: 'ln' });
    gsap.from(s.words, { yPercent: 145, duration: 1.1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: h, start: 'top 88%' } });
  });

  catalogReady.finally(() => {
    // work: shots rise in as the row arrives
    gsap.from(gsap.utils.toArray('.shot', track), { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: track, start: 'top 85%' } });
    // sideways movement (swipe, trackpad, arrows) leans the cards with its speed; page scrolling never moves the row
    const shots = gsap.utils.toArray('.shot', track);
    const skewTo = gsap.quickTo(shots, 'skewX', { duration: 0.5, ease: 'power3' });
    const unskew = gsap.delayedCall(0.12, () => skewTo(0)).pause();
    let lastLeft = track.scrollLeft;
    track.addEventListener('scroll', () => {
      skewTo(gsap.utils.clamp(-6, 6, (lastLeft - track.scrollLeft) * 0.2));
      lastLeft = track.scrollLeft;
      unskew.restart(true);
    }, { passive: true });

    // levels: the four cards are a plain grid; they rise in as it arrives
    gsap.from('.levels-list > li', { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.levels-list', start: 'top 85%' } });

    // steps: the line draws itself, steps follow
    gsap.fromTo('.steps-line path', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.steps-wrap', start: 'top 70%', end: 'center 50%', scrub: true } });
    gsap.from('.step', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.steps', start: 'top 80%' } });
    gsap.from('.step .num', { yPercent: 60, duration: 1.2, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.steps', start: 'top 80%' } });

    // info
    gsap.from('.info-list li', { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.info-list', start: 'top 80%' } });
    gsap.from('.ig-card', { y: 60, opacity: 0, rotate: 2, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.ig-card', start: 'top 85%' } });

    // closing cta: title assembles as you arrive, orb spins in
    gsap.timeline({ scrollTrigger: { trigger: '.cta', start: 'top 80%', end: 'center center', scrub: true } })
      .from('.cta-title > *', { yPercent: 80, opacity: 0, stagger: 0.15, ease: 'none' }, 0)
      .fromTo('.cta-media img', { scale: 1.3 }, { scale: 1, ease: 'none', stagger: 0.05 }, 0)
      .from('.cta-orb', { scale: 0, rotate: -90, ease: 'none' }, 0.3);

    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
})();
