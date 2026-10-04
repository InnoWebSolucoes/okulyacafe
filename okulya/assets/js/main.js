/* Okulya Café: interactions and motion.
   Everything here is progressive: without this file (or with reduced motion)
   every section still reads as a normal, static page. */
(() => {
  const html = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motion = hasGsap && !reduce;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  if (!motion) html.classList.add('no-motion');
  setTimeout(() => html.classList.remove('is-entering'), 1300);

  /* ---------- small facts ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Open-now, computed on Luanda time. Public holidays can't be known here,
  // so the full hours stay printed next to every status.
  (function openStatus() {
    const els = $$('[data-status]');
    if (!els.length) return;
    let parts;
    try {
      parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Luanda', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
      }).formatToParts(new Date());
    } catch (e) { return; }
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    const day = get('weekday');
    const mins = Number(get('hour')) * 60 + Number(get('minute'));
    const weekend = day === 'Sat' || day === 'Sun';
    const close = weekend ? 18 : 20;
    let text; let open = false;
    if (mins < 7 * 60) text = 'Fechado agora, abrimos hoje às 7h';
    else if (mins < close * 60) { text = `Aberto agora, até às ${close}h`; open = true; }
    else text = 'Fechado agora, abrimos amanhã às 7h';
    els.forEach((el) => { el.textContent = text; el.classList.toggle('is-open', open); });
  })();

  /* ---------- smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollToY = (y) => {
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };
  const scrollToEl = (el, offset = 0) => {
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    scrollToY(y);
  };

  // same-page anchors
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(target, parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    history.replaceState(null, '', `#${id}`);
  });

  /* ---------- header: solid after scrolling, hides going down ---------- */
  const header = $('.site-header');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    if (!header) return;
    header.classList.toggle('is-scrolled', y > 10);
    const hide = y > lastY && y > 240 && !html.classList.contains('menu-open');
    if (Math.abs(y - lastY) > 4) {
      header.classList.toggle('is-hidden', hide);
      html.classList.toggle('header-hidden', hide);
    }
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  const toggle = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');
  function closeMenu() {
    if (!html.classList.contains('menu-open')) return;
    html.classList.remove('menu-open');
    toggle && toggle.setAttribute('aria-expanded', 'false');
    toggle && (toggle.querySelector('b').textContent = 'Abrir menu');
    lenis && lenis.start();
  }
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const open = !html.classList.contains('menu-open');
      if (!open) { closeMenu(); toggle.focus(); return; }
      html.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.querySelector('b').textContent = 'Fechar menu';
      lenis && lenis.stop();
      setTimeout(() => { const first = $('a', mobileMenu); first && first.focus({ preventScroll: true }); }, 350);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && html.classList.contains('menu-open')) { closeMenu(); toggle.focus(); } });
    $$('a', mobileMenu).forEach((a) => a.addEventListener('click', closeMenu));
  }

  /* ---------- page transitions: amber circle wipe from the click ---------- */
  const pt = $('.pt');
  if (pt && !reduce) {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return; // in-page anchor
      // pages only: .html files or extensionless paths like /okulya (not images, PDFs…)
      if (!/\.html$/.test(url.pathname) && /\.[a-z0-9]+$/i.test(url.pathname)) return;
      e.preventDefault();
      pt.style.setProperty('--x', `${e.clientX || innerWidth / 2}px`);
      pt.style.setProperty('--y', `${e.clientY || innerHeight / 2}px`);
      html.classList.remove('is-entering');
      requestAnimationFrame(() => html.classList.add('is-leaving'));
      setTimeout(() => { location.href = url.href; }, 680);
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) html.classList.remove('is-leaving', 'is-entering'); });
  }

  /* ---------- custom cursor (dot + trailing ring) ---------- */
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const c = document.createElement('div');
    c.className = 'cursor is-hidden';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="cursor__ring"><span></span></div><div class="cursor__dot"></div>';
    document.body.appendChild(c);
    html.classList.add('has-cursor');
    const ring = $('.cursor__ring', c); const dot = $('.cursor__dot', c); const label = $('span', ring);
    let mx = -100; let my = -100; let rx = -100; let ry = -100;
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      c.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('mouseleave', () => c.classList.add('is-hidden'));
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('a, button, [data-cursor]');
      const text = el && el.dataset.cursor;
      c.classList.toggle('is-label', !!text);
      c.classList.toggle('is-link', !!el && !text);
      if (text) label.textContent = text;
    });
    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- hero plate carousel (Soquendo's staggered slide swap) ---------- */
  const plates = $$('.hero__plate');
  const dots = $$('.hero__dots button');
  let current = 0; let timer = null;
  function showPlate(next, instant) {
    if (next === current || !plates[next]) return;
    const prev = plates[current];
    const nxt = plates[next];
    dots.forEach((d, i) => d.setAttribute('aria-current', i === next ? 'true' : 'false'));
    if (motion && !instant) {
      gsap.to(prev, { rotation: -140, scale: 0.55, autoAlpha: 0, duration: 0.8, ease: 'power3.in' });
      gsap.fromTo(nxt, { rotation: 140, scale: 0.55, autoAlpha: 0 }, { rotation: 0, scale: 1, autoAlpha: 1, duration: 1.1, delay: 0.36, ease: 'back.out(1.4)' });
    } else {
      prev.classList.remove('is-active'); nxt.classList.add('is-active');
    }
    current = next;
  }
  function autoplay() {
    clearInterval(timer);
    if (reduce) return;
    timer = setInterval(() => { if (!document.hidden) showPlate((current + 1) % plates.length); }, 4800);
  }
  if (plates.length) {
    if (motion) gsap.set(plates, { autoAlpha: 0 });
    dots.forEach((d, i) => d.addEventListener('click', () => { showPlate(i); autoplay(); }));
    autoplay();
  }

  if (!motion) return;
  /* ======================================================================
     Everything below needs GSAP + ScrollTrigger and no reduced motion.
     ====================================================================== */
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- hero: entrance, then the "o" opens into the café on scroll ---------- */
  const hero = $('.hero');
  if (hero) {
    const letters = $$('.hero__l > span', hero);
    const items = $$('[data-hero-item]', hero);
    const reveal = $('.hero__reveal', hero);
    const revealImg = $('.hero__reveal-img', hero);
    const shade = $('.hero__shade', hero);
    const o = $('.hero__o', hero);
    const oImg = $('.hero__o-img', hero);
    const swoosh = $('.hero__swoosh', hero);
    const cue = $('.hero__cue', hero);
    const heroStage = $('.hero__stage', hero);
    const afterLines = $$('.hero__after .line-mask > span', hero);
    const afterLede = $('.hero__after .lede', hero);
    const diaIntro = $('.dia__intro');

    // The zoom needs the whole hero on one screen, so it only runs where that fits.
    const ZOOM = '(min-width: 861px) and (min-height: 640px), (max-width: 860px) and (min-height: 740px)';
    const STILL = '(min-width: 861px) and (max-height: 639px), (max-width: 860px) and (max-height: 739px)';
    const zoomAtLoad = window.matchMedia(ZOOM).matches;

    // The photo layer covers the whole hero. It is shrunk and moved so its
    // inscribed circle sits exactly on the "o". p: 0 = the "o", 1 = full screen.
    const geo = { x: 0, y: 0, s: 1, r0: 0, rEnd: 0 };
    const state = { p: 0, open: zoomAtLoad ? 0 : 1 };
    const measure = () => {
      const hr = hero.getBoundingClientRect();
      const or = o.getBoundingClientRect();
      const W = hr.width; const H = hr.height;
      geo.r0 = Math.min(W, H) / 2;
      geo.rEnd = Math.hypot(W, H) / 2 + 2;
      geo.s = or.width / 2 / geo.r0;
      geo.x = or.left - hr.left + or.width / 2 - W / 2;
      geo.y = or.top - hr.top + or.height / 2 - H / 2;
    };
    const draw = () => {
      const { p } = state;
      const s = geo.s + (1 - geo.s) * p;
      const r = (geo.r0 + (geo.rEnd - geo.r0) * p) * state.open;
      reveal.style.transform = `translate3d(${geo.x * (1 - p)}px, ${geo.y * (1 - p)}px, 0) scale(${s})`;
      reveal.style.clipPath = `circle(${r}px at 50% 50%)`;
    };

    const mm = gsap.matchMedia();
    mm.add({ zoom: ZOOM, still: STILL }, (ctx) => {
      if (!ctx.conditions.zoom) {
        // short screens: a normal hero whose blob drifts up as you leave
        gsap.to(heroStage, { yPercent: -12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        return undefined;
      }
      hero.classList.add('is-zoom');
      if (diaIntro) diaIntro.classList.add('is-merged'); // its heading now appears on the photo
      if (!zoomAtLoad) state.open = 1;
      gsap.set(afterLines, { yPercent: 110 });
      gsap.set(afterLede, { autoAlpha: 0, y: 20 });
      measure(); draw();

      const z = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * 1.4)}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          refreshPriority: 1,
          onRefresh: () => { measure(); draw(); },
        },
      });
      const out = { immediateRender: false, ease: 'power2.in' };
      z.to(state, { p: 1, duration: 1, ease: 'power2.inOut', onUpdate: draw }, 0)
        .fromTo(letters, { yPercent: 0, autoAlpha: 1 }, { yPercent: -60, autoAlpha: 0, stagger: 0.03, duration: 0.35, ...out }, 0)
        .fromTo([swoosh, ...items, cue], { y: 0, autoAlpha: 1 }, { y: -40, autoAlpha: 0, stagger: 0.04, duration: 0.3, ...out }, 0)
        .fromTo(heroStage, { scale: 1, autoAlpha: 1 }, { scale: 0.7, autoAlpha: 0, duration: 0.4, ...out }, 0)
        .to(shade, { opacity: 1, duration: 0.4 }, 0.55)
        .to(afterLines, { yPercent: 0, duration: 0.35, stagger: 0.06, ease: 'power3.out' }, 0.7)
        .to(afterLede, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.8)
        .to({}, { duration: 0.15 });

      return () => {
        hero.classList.remove('is-zoom');
        if (diaIntro) diaIntro.classList.remove('is-merged');
        reveal.style.transform = '';
        reveal.style.clipPath = '';
      };
    });

    // entrance: one orchestrated moment after the page wipe
    const tl = gsap.timeline({ delay: 0.55, defaults: { ease: 'expo.out' } });
    tl.from('.hero__blob', { scale: 0.4, rotation: -30, duration: 1.4, ease: 'back.out(1.3)' }, 0)
      .fromTo(plates[0], { rotation: 160, scale: 0.5, autoAlpha: 0 }, { rotation: 0, scale: 1, autoAlpha: 1, duration: 1.4, ease: 'back.out(1.3)' }, 0.2)
      .from(letters, { yPercent: 115, duration: 1.2, stagger: 0.07 }, 0.3)
      .fromTo(swoosh, { clipPath: 'inset(0% 100% 0% 0%)', rotation: -26 }, { clipPath: 'inset(0% 0% 0% 0%)', rotation: -6, duration: 1.4, ease: 'power3.inOut' }, 0.6)
      .from(items, { y: 28, autoAlpha: 0, duration: 0.9, stagger: 0.18 }, 0.7)
      .from('.hero__sticker', { scale: 0, rotation: -120, duration: 1, ease: 'back.out(1.8)' }, 0.9)
      .from('.hero__dots, .hero__cue', { autoAlpha: 0, duration: 0.8 }, 1.2);
    if (zoomAtLoad) {
      // the photo opens up inside the "o"
      tl.to(state, { open: 1, duration: 1.6, ease: 'expo.inOut', onUpdate: draw }, 0)
        .fromTo(revealImg, { scale: 1.4, rotation: -10 }, { scale: 1, rotation: 0, duration: 2.2 }, 0);
    } else {
      tl.from(oImg, { scale: 0, rotation: -90, duration: 1.3, ease: 'back.out(1.4)' }, 0.1);
    }
    gsap.to('.hero__plates', { rotation: 360, duration: 90, repeat: -1, ease: 'none' });
    // the "o" is measured from the web font's metrics, so re-measure once it loads
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ---------- section titles rise out of their masks ---------- */
  $$('[data-rise]').forEach((el) => {
    gsap.from($$('.line-mask > span', el), {
      yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.14,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  /* ---------- stickers and badges pop in (Bon Bouquet) ---------- */
  gsap.set('[data-pop]', { scale: 0.4, rotation: -25, autoAlpha: 0 });
  ScrollTrigger.batch('[data-pop]', {
    start: 'top 92%', once: true,
    onEnter: (els) => gsap.to(els, { scale: 1, rotation: 0, autoAlpha: 1, duration: 1.1, ease: 'back.out(1.7)', stagger: 0.3 }),
  });

  /* ---------- the day: pinned porthole story ---------- */
  const dia = $('.dia');
  if (dia) {
    const stage = $('.dia__stage', dia);
    const steps = $$('.dia__step', dia);
    const imgs = steps.map((s) => $('.dia__img', s));
    const caps = steps.map((s) => $('.dia__caption', s));
    const circles = steps.map((s) => $('.dia__circle', s));
    const index = $$('.dia__index button', dia);
    const sun = $('.dia__sun', dia);
    const cutA = $('.dia__cutout--a', dia);
    const cutB = $('.dia__cutout--b', dia);
    const hint = $('.dia__hint', dia);
    const n = steps.length;

    dia.classList.add('is-live');
    gsap.set(stage, { '--bg': '#FFFEFB', '--ink': '#2A1810' });
    circles.forEach((c, i) => { c.style.zIndex = i + 1; });
    gsap.set(imgs.slice(1), { yPercent: 101 });
    gsap.set(caps[0], { autoAlpha: 1 });
    gsap.set(caps.slice(1), { autoAlpha: 0, y: 50 });
    gsap.set([cutA, cutB], { autoAlpha: 0 });

    // geometry for the sun's arc, refreshed with ScrollTrigger
    let geo = { cx: 0, cy: 0, R: 0 };
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const c = circles[0].getBoundingClientRect();
      const r = c.width / 2;
      geo = { cx: c.left - s.left + r, cy: c.top - s.top + r, R: r + Math.min(90, Math.max(26, innerWidth * 0.05)) };
    };
    const placeSun = (p) => {
      // rises just below the left horizon and ends high on the right as the moon,
      // clear of the caption column
      const theta = Math.PI + 0.3 - p * (Math.PI + 0.3 - Math.PI / 5);
      gsap.set(sun, { x: geo.cx + geo.R * Math.cos(theta), y: geo.cy - geo.R * Math.sin(theta) });
    };

    const T = (i) => 2 * i - 1; // step i starts its transition at T(i), settles at T(i)+1
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => `+=${Math.round(n * 0.85 * innerHeight)}`,
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
        onRefresh: measure,
        onUpdate: (self) => {
          const time = self.progress * tl.duration();
          placeSun(self.progress);
          const active = Math.max(0, Math.min(n - 1, Math.floor((time + 0.5) / 2)));
          index.forEach((b, i) => {
            b.classList.toggle('is-active', i === active);
            if (i === active) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
          });
        },
      },
    });

    for (let i = 1; i < n; i++) {
      const t = T(i);
      tl.to(caps[i - 1], { autoAlpha: 0, y: -50, duration: 0.45, ease: 'power1.in' }, t)
        .to(imgs[i], { yPercent: 0, duration: 1, ease: 'power2.inOut' }, t)
        .to(imgs[i - 1], { yPercent: -30, duration: 1, ease: 'power2.inOut' }, t)
        .fromTo($('img', imgs[i]), { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'power1.out' }, t)
        .to(caps[i], { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out' }, t + 0.5);
    }
    tl.to({}, { duration: 1 }, T(n - 1) + 1); // hold the last frame

    // morning → dusk → night
    tl.to(stage, { '--bg': '#FBE6C2', duration: 1 }, T(4))
      .to(stage, { '--bg': '#3A2317', '--ink': '#FFFEFB', duration: 1 }, T(5))
      .to(stage, { '--bg': '#24140C', duration: 1 }, T(6))
      .to(sun, { filter: 'saturate(0) brightness(1.7)', duration: 1 }, T(5));

    // plates slide in at lunch and at petiscos
    tl.fromTo(cutA, { x: 220, y: 160, rotation: 120, autoAlpha: 0 }, { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 1, ease: 'power2.out' }, T(3) + 0.3)
      .to(cutA, { x: 260, y: 280, rotation: -90, autoAlpha: 0, duration: 0.9, ease: 'power2.in' }, T(4))
      .fromTo(cutB, { x: -220, y: 160, rotation: -120, autoAlpha: 0 }, { x: 0, y: 0, rotation: 0, autoAlpha: 1, duration: 1, ease: 'power2.out' }, T(4) + 0.3)
      .to(cutB, { x: -260, y: 280, rotation: 90, autoAlpha: 0, duration: 0.9, ease: 'power2.in' }, T(5));
    if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.4 }, 0.3);

    // the opening swoosh turns slowly while waiting
    gsap.to($('.dia__img--open img', dia), { rotation: 360, duration: 40, repeat: -1, ease: 'none' });

    index.forEach((b, i) => b.addEventListener('click', () => {
      const st = tl.scrollTrigger;
      const time = i === 0 ? 0 : T(i) + 1;
      scrollToY(st.start + (st.end - st.start) * (time / tl.duration()));
    }));
    measure();
    placeSun(0);
  }

  /* ---------- marquee rows that speed up with the scroll ---------- */
  $$('[data-marquee]').forEach((row) => {
    const dir = Number(row.dataset.marquee) || 1;
    const track = $('.marquee__track', row);
    row.appendChild(track.cloneNode(true)).setAttribute('aria-hidden', 'true');
    const tracks = $$('.marquee__track', row);
    const tween = gsap.fromTo(tracks, { xPercent: dir > 0 ? 0 : -100 }, { xPercent: dir > 0 ? -100 : 0, duration: 38, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      trigger: row, start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 260, 5);
        gsap.to(tween, { timeScale: boost * self.direction, duration: 0.2, overwrite: true });
        gsap.to(tween, { timeScale: self.direction, duration: 1, delay: 0.25, overwrite: false });
      },
      onToggle: (self) => (self.isActive ? tween.play() : tween.pause()),
    });
  });

  /* ---------- category badges slowly turn as you scroll ---------- */
  $$('.cat__badge').forEach((b, i) => {
    gsap.fromTo(b, { rotation: i % 2 ? 14 : -14 }, { rotation: i % 2 ? -14 : 14, ease: 'none', scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- experience cards drop in, tilted ---------- */
  const cards = $$('.cards .card');
  if (cards.length) {
    gsap.from(cards, {
      y: 140, rotation: (i) => [-12, 10, -8][i % 3], autoAlpha: 0, duration: 1.2, ease: 'back.out(1.2)', stagger: 0.15,
      scrollTrigger: { trigger: '.cards', start: 'top 85%' },
    });
  }

  /* ---------- two-tone text fills in word by word ---------- */
  $$('[data-fill]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.to($$('.w', el), {
      color: '#2A1810', stagger: 0.12, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true },
    });
  });

  /* ---------- Instagram: the stack fans out ---------- */
  const fan = $('.fan');
  if (fan) {
    gsap.fromTo(fan, { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: fan, start: 'top 90%', end: 'top 35%', scrub: 0.6 } });
  }

  /* ---------- inner pages ---------- */
  // floating plates in page heroes drift on scroll
  $$('.page-hero__plate').forEach((p, i) => {
    gsap.from(p, { scale: 0.3, rotation: -90, autoAlpha: 0, duration: 1.4, delay: 0.6 + i * 0.18, ease: 'back.out(1.4)' });
    gsap.to(p, { yPercent: -60 - i * 25, rotation: i % 2 ? -50 : 50, ease: 'none', scrollTrigger: { trigger: p.closest('section'), start: 'top top', end: 'bottom top', scrub: true } });
  });
  const pageHero = $('.page-hero');
  if (pageHero) {
    gsap.from($$('[data-hero-item]', pageHero), { y: 28, autoAlpha: 0, duration: 0.9, stagger: 0.18, delay: 0.8, ease: 'expo.out' });
  }

  // about: the porthole grows until it fills the screen
  const grow = $('.grow-circle');
  if (grow) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: grow, start: 'top top', end: 'bottom bottom', scrub: 0.5 } });
    tl.fromTo('.grow-circle__img', { clipPath: 'circle(22% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', ease: 'power1.inOut', duration: 1 }, 0)
      .fromTo('.grow-circle__img img', { scale: 1.3 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .to('.grow-circle__text', { autoAlpha: 1, duration: 0.3 }, 0.65);
  }

  // menu: staggered items per category (Soquendo's 180ms cadence)
  $$('.menu-section').forEach((sec) => {
    gsap.from($$('.menu-item', sec), {
      y: 34, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: sec, start: 'top 70%' },
    });
    const img = $('.menu-section__aside img', sec);
    if (img) gsap.fromTo(img, { rotation: -40 }, { rotation: 30, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // experiences page: media shapes ease in with a slight turn
  $$('.exp-row__media .shape').forEach((s) => {
    gsap.from(s, { scale: 0.75, rotation: -6, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 85%' } });
  });

  // pinning changes the page height, so re-aim any #hash we arrived with
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) setTimeout(() => {
      const y = target.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
      if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    }, 60);
  });
})();

/* ---------- menu page: scroll-spy for the category bar (works without GSAP) ---------- */
(() => {
  const links = [...document.querySelectorAll('.menu-nav a')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const bar = document.querySelector('.menu-nav ul');
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const a = byId.get(en.target.id);
      if (!a) return;
      links.forEach((l) => { l.classList.toggle('is-active', l === a); if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
      bar.scrollTo({ left: a.offsetLeft - bar.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
})();
