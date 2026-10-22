/**
 * Shubham Haraniya — portfolio
 * Motion system: GSAP + ScrollTrigger + Lenis (all self-hosted in js/vendor).
 *
 * Principles
 *  - Content is visible by default; motion is layered on only when GSAP loaded and
 *    the visitor hasn't asked for reduced motion.
 *  - One language: masked rises for type, soft fades for blocks, scrubbed progress for
 *    "reading" effects, springy-but-short hovers for controls.
 *  - Everything non-decorative (theme, menu, nav, copy-email, form) works without GSAP.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const reduce = root.classList.contains('reduce') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animate = hasGsap && !reduce;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };

  let lenis = null;
  let resolveReady;
  const ready = new Promise((res) => { resolveReady = res; });

  /* If GSAP failed to load, fall back to a fully static (but complete) page. */
  if (!hasGsap) {
    root.classList.remove('js');
    root.classList.add('no-loader');
  }

  /* ──────────────────────────────────────────
     Theme
  ────────────────────────────────────────── */
  function initTheme() {
    const btn = $('#theme-toggle');
    const meta = $('meta[name="theme-color"]');
    const apply = (t) => {
      root.setAttribute('data-theme', t);
      if (meta) meta.setAttribute('content', t === 'dark' ? '#0F1114' : '#F5F3EE');
      if (btn) {
        btn.setAttribute('aria-pressed', String(t === 'dark'));
        btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      }
    };
    apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      store.set('portfolio-theme', next);
    });
  }

  /* ──────────────────────────────────────────
     Scrolling (Lenis) + anchors
  ────────────────────────────────────────── */
  function initScroll() {
    if (animate) {
      lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    }

    function goTo(hash) {
      if (hash === '#home' || hash === '#' || hash === '') {
        lenis ? lenis.scrollTo(0, { duration: 1.4 }) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        return;
      }
      const target = $(hash);
      if (!target) return;
      /* Lenis honours the html scroll-padding-top (header height + gap), same as native scrollIntoView */
      if (lenis) lenis.scrollTo(target, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const hash = a.getAttribute('href');
      if (hash.length > 1 && !$(hash)) return;
      e.preventDefault();
      closeMenu();
      goTo(hash);
      try { history.replaceState(null, '', hash === '#home' ? location.pathname + location.search : hash); } catch (err) { /* file:// etc. */ }
    });

    /* Keyboard users tabbing into the (visually hidden-behind-main) footer */
    const footer = $('#footer');
    if (footer) {
      footer.addEventListener('focusin', () => {
        if (!isDesktop()) return;
        lenis ? lenis.scrollTo('bottom', { immediate: true }) : window.scrollTo(0, document.documentElement.scrollHeight);
      });
    }
  }

  /* ──────────────────────────────────────────
     Header: scrolled state, active section, progress
  ────────────────────────────────────────── */
  function initHeader() {
    const bar = $('#topbar');
    let scrolled = false;
    const onScroll = () => {
      const s = window.scrollY > 8;
      if (s !== scrolled) { scrolled = s; bar.classList.toggle('is-scrolled', s); }
      const btt = $('#btt');
      if (btt) btt.classList.toggle('is-visible', window.scrollY > 900);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const links = $$('.nav a[data-nav]');
    const ids = links.map((l) => l.dataset.nav);
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((l) => {
            const on = l.dataset.nav === en.target.id;
            l.classList.toggle('is-active', on);
            if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => io.observe(s));
    }

    if (animate) {
      window.gsap.to('#progress span', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: 0.25 },
      });
    }

    const btt = $('#btt');
    if (btt) btt.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 1.4 }) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })));
  }

  /* ──────────────────────────────────────────
     Mobile menu
  ────────────────────────────────────────── */
  const menu = $('#menu');
  const menuBtn = $('#menu-btn');
  let menuOpen = false;
  function setMenu(open) {
    if (!menu || !menuBtn || open === menuOpen) return;
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    $('.menu-btn-label', menuBtn).textContent = open ? 'Close' : 'Menu';
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) { const first = $('a', menu); if (first) setTimeout(() => first.focus({ preventScroll: true }), 250); }
    else menuBtn.focus({ preventScroll: true });
  }
  function closeMenu() { setMenu(false); }
  function initMenu() {
    if (!menu || !menuBtn) return;
    menuBtn.addEventListener('click', () => setMenu(!menuOpen));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
    /* simple focus trap */
    menu.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = $$('a, button', menu).filter((n) => !n.disabled);
      const all = [menuBtn, ...f];
      const i = all.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); all[all.length - 1].focus(); }
      else if (!e.shiftKey && i === all.length - 1) { e.preventDefault(); all[0].focus(); }
    });
  }

  /* ──────────────────────────────────────────
     Text splitting
  ────────────────────────────────────────── */
  function splitWords(el, mask) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.setAttribute('aria-hidden', 'true');
            if (mask) {
              w.className = 'w';
              const i = document.createElement('span');
              i.className = 'wi';
              i.textContent = p;
              w.append(i);
            } else {
              w.className = 'sw';
              w.textContent = p;
            }
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
    el.setAttribute('aria-label', label);
    return mask ? $$('.wi', el) : $$('.sw', el);
  }

  /* ──────────────────────────────────────────
     Loader → intro
  ────────────────────────────────────────── */
  function runLoader() {
    const loader = $('#loader');
    const skip = root.classList.contains('no-loader') || !animate || !loader;
    if (skip) { resolveReady(); return; }

    const gsap = window.gsap;
    const num = $('#loader-num');
    const bar = $('#loader-bar');
    const o = { v: 0 };
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      loader.style.display = 'none';
      document.body.style.overflow = menuOpen ? 'hidden' : '';
      if (lenis && !menuOpen) lenis.start();
      store.sset('sh-loaded', '1');
    };

    gsap.timeline()
      .to(o, {
        v: 100, duration: 1.25, ease: 'power2.inOut',
        onUpdate: () => { num.textContent = String(Math.round(o.v)); bar.style.transform = 'scaleX(' + o.v / 100 + ')'; },
      })
      .to(loader, { yPercent: -100, duration: 0.95, ease: 'power4.inOut', onComplete: finish }, '+=0.15')
      .add(resolveReady, '-=0.5');

    setTimeout(() => { finish(); resolveReady(); }, 5000); // failsafe
  }

  /* ──────────────────────────────────────────
     Hero
  ────────────────────────────────────────── */
  function initHero() {
    const hero = $('#home');
    const sheet = $('.sheet');
    if (!hero || !sheet) return;

    const syncSticky = () => {
      const fits = hero.offsetHeight <= window.innerHeight + 2;
      hero.classList.toggle('is-sticky', fits && isDesktop());
    };
    syncSticky();

    if (!animate) return;
    const gsap = window.gsap;

    const lines = $$('.hero-title .line-inner', hero);
    const fades = $$('[data-hero-fade]', hero);
    const edges = $$('.g-edges path', hero);
    const nodes = $$('.g-node, .g-core', hero);
    const hl = $('.hl', hero);

    gsap.set(lines, { yPercent: 112, visibility: 'visible' });
    gsap.set(fades, { opacity: 0, y: 24 });
    gsap.set(edges, { strokeDashoffset: 1 });
    gsap.set(nodes, { opacity: 0 });
    if (hl) gsap.set(hl, { '--hl': 0 });

    ready.then(() => {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to(lines, { yPercent: 0, duration: 1.35, stagger: 0.09 }, 0)
        .to(hl, { '--hl': 1, duration: 1, ease: 'power3.out' }, 0.55)
        .to(fades, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.5)
        .to(edges, { strokeDashoffset: 0, duration: 1.4, stagger: 0.12, ease: 'power2.inOut' }, 0.3)
        .to(nodes, { opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power2.out' }, 0.2);
    });

    /* Hero recedes as the sheet slides over it */
    gsap.matchMedia().add('(min-width: 900px)', () => {
        if (!hero.classList.contains('is-sticky')) return;
        gsap.to('.hero-inner', {
          y: -60, scale: 0.965, opacity: 0.3, transformOrigin: '50% 0%', ease: 'none',
          scrollTrigger: { trigger: sheet, start: 'top bottom', end: 'top top', scrub: true },
        });
        gsap.to('.hero-graph', {
          y: -50, ease: 'none',
          scrollTrigger: { trigger: sheet, start: 'top bottom', end: 'top top', scrub: true },
        });
    });

    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => { syncSticky(); window.ScrollTrigger.refresh(); }, 200);
    });
  }

  /* ──────────────────────────────────────────
     Scroll-driven reveals
  ────────────────────────────────────────── */
  function initReveals() {
    if (!animate) return;
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;

    /* Headings: masked word rise */
    $$('[data-split]').forEach((el) => {
      const words = splitWords(el, true);
      gsap.set(words, { yPercent: 115 });
      ST.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.045 }),
      });
    });

    /* Manifesto: words light up as you read */
    $$('[data-scrub-words]').forEach((el) => {
      const words = splitWords(el, false);
      gsap.set(words, { opacity: 0.16 });
      gsap.to(words, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 58%', scrub: true },
      });
    });

    /* Blocks: soft fade-rise, batched so siblings cascade */
    ST.batch('.reveal, .reveal-stagger > *', {
      start: 'top 91%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: 0.09, overwrite: true }),
    });

    /* Divider rules draw in */
    $$('[data-line]').forEach((el) => {
      gsap.fromTo(el, { scaleX: 0 }, {
        scaleX: 1, duration: 1.5, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 94%', once: true },
      });
    });

    /* Case-study pipelines: line draws, steps cascade */
    $$('.case-panel').forEach((panel) => {
      const flow = $('.flow', panel);
      if (!flow) return;
      const steps = $$('li', flow);
      gsap.set(flow, { '--flow': 0 });
      gsap.set(steps, { opacity: 0, x: -14 });
      ST.create({
        trigger: panel, start: 'top 78%', once: true,
        onEnter: () => {
          gsap.to(flow, { '--flow': 1, duration: 1.4, ease: 'power2.inOut' });
          gsap.to(steps, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', stagger: 0.14, delay: 0.1 });
        },
      });
    });

    /* Skill tags */
    $$('.tags').forEach((ul) => {
      const tags = $$('li', ul);
      gsap.set(tags, { opacity: 0, y: 14 });
      ST.create({
        trigger: ul, start: 'top 92%', once: true,
        onEnter: () => gsap.to(tags, {
          opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: { each: 0.018, from: 'start' },
          onComplete: () => gsap.set(tags, { clearProps: 'opacity,transform' }),
        }),
      });
    });

    /* Big outlined numerals drift against the scroll (desktop only) */
    gsap.matchMedia().add('(min-width: 900px)', () => {
        $$('[data-parallax]').forEach((el) => {
          const d = parseFloat(el.dataset.parallax) || 40;
          gsap.fromTo(el, { y: d }, {
            y: -d, ease: 'none',
            scrollTrigger: { trigger: el.closest('.case'), start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });
    });
  }

  /* ──────────────────────────────────────────
     Counters (verified numbers only)
  ────────────────────────────────────────── */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    if (!animate) return; // static final values already in the markup

    const gsap = window.gsap;
    els.forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const fmt = (v) => v.toFixed(dec);
      el.textContent = fmt(0);
      const o = { v: 0 };
      const run = (delay) => gsap.to(o, {
        v: end, duration: 1.8, ease: 'power3.out', delay,
        onUpdate: () => { el.textContent = fmt(o.v); },
        onComplete: () => { el.textContent = fmt(end); },
      });
      if (el.closest('#home')) {
        /* hero stats sit at the fold: start them with the intro rather than waiting for a scroll */
        ready.then(() => run(0.9));
      } else {
        window.ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => run(0.1) });
      }
    });
  }

  /* ──────────────────────────────────────────
     Pointer-driven details (desktop, fine pointer, motion allowed)
  ────────────────────────────────────────── */
  function initPointer() {
    if (!animate || !finePointer) return;
    const gsap = window.gsap;

    /* Cursor ring + contextual label */
    const ring = $('#cursor-ring');
    const label = $('#cursor-label');
    if (ring && label) {
      document.body.classList.add('cursor-on');
      const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
      const ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
      const lx = gsap.quickTo(label, 'x', { duration: 0.2, ease: 'power3' });
      const ly = gsap.quickTo(label, 'y', { duration: 0.2, ease: 'power3' });
      window.addEventListener('pointermove', (e) => {
        document.body.classList.add('cursor-visible');
        rx(e.clientX); ry(e.clientY); lx(e.clientX); ly(e.clientY);
      }, { passive: true });
      document.addEventListener('pointerleave', () => document.body.classList.remove('cursor-visible'));
      document.addEventListener('pointerover', (e) => {
        const t = e.target.closest ? e.target : e.target.parentElement;
        if (!t) return;
        const hot = t.closest('a, button, input, textarea, label, [role="button"]');
        document.body.classList.toggle('cursor-hover', !!hot);
        const c = t.closest('[data-cursor]');
        if (c) { label.textContent = c.dataset.cursor; document.body.classList.add('cursor-labelled'); }
        else document.body.classList.remove('cursor-labelled');
      });
    }

    /* Magnetic buttons */
    $$('.btn-magnetic').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.22);
        my((e.clientY - (r.top + r.height / 2)) * 0.32);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });

    /* Depth/tilt on project panels */
    if (isDesktop()) {
      $$('[data-tilt]').forEach((panel) => {
        gsap.set(panel, { transformPerspective: 1000 });
        const rX = gsap.quickTo(panel, 'rotationX', { duration: 0.7, ease: 'power3' });
        const rY = gsap.quickTo(panel, 'rotationY', { duration: 0.7, ease: 'power3' });
        panel.addEventListener('pointermove', (e) => {
          const r = panel.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          rX(-py * 5); rY(px * 7);
        });
        panel.addEventListener('pointerleave', () => { rX(0); rY(0); });
      });
    }
  }

  /* ──────────────────────────────────────────
     Footer reveal
  ────────────────────────────────────────── */
  function initFooter() {
    const footer = $('#footer');
    const main = $('#main');
    if (!footer || !main) return;

    const setH = () => root.style.setProperty('--footer-h', isDesktop() ? footer.offsetHeight + 'px' : '0px');
    setH();
    if ('ResizeObserver' in window) new ResizeObserver(() => { setH(); if (hasGsap) window.ScrollTrigger.refresh(); }).observe(footer);
    window.addEventListener('resize', setH);

    if (!animate) return;
    const gsap = window.gsap;
    const words = $$('.footer-name span', footer);

    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
        gsap.fromTo(words, { yPercent: 105 }, {
          yPercent: 0, ease: 'none', stagger: 0.12,
          scrollTrigger: {
            trigger: main, scrub: true,
            start: 'bottom bottom',
            end: () => 'bottom bottom-=' + Math.max(footer.offsetHeight * 0.85, 1),
          },
        });
    });
    mm.add('(max-width: 899px)', () => {
        gsap.from(words, {
          yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.1,
          scrollTrigger: { trigger: footer, start: 'top 90%', once: true },
        });
    });
  }

  /* ──────────────────────────────────────────
     Contact: copy email + form
  ────────────────────────────────────────── */
  function initContact() {
    const copyBtn = $('#copy-mail');
    const status = $('#copy-status');
    if (copyBtn) {
      const txt = $('.copy-text', copyBtn);
      let timer;
      const done = (ok) => {
        txt.textContent = ok ? 'Copied ✓' : 'Copy failed';
        if (status) status.textContent = ok ? 'Email address copied to clipboard' : 'Could not copy automatically; the address is shown beside this button';
        clearTimeout(timer);
        timer = setTimeout(() => { txt.textContent = 'Copy email'; }, 2200);
      };
      copyBtn.addEventListener('click', async () => {
        const email = copyBtn.dataset.email;
        try {
          await navigator.clipboard.writeText(email);
          done(true);
        } catch (err) {
          try {
            const ta = document.createElement('textarea');
            ta.value = email; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            done(ok);
          } catch (e2) { done(false); }
        }
      });
    }

    const form = $('#contact-form');
    if (!form) return;
    const btn = $('#submit-btn');
    const label = $('.submit-text', btn);
    const out = $('#form-status');
    const say = (msg, kind) => { out.textContent = msg; out.className = 'form-status' + (kind ? ' ' + kind : ''); };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = $$('input[required], textarea[required]', form);
      let bad = null;
      fields.forEach((f) => { const ok = f.checkValidity() && f.value.trim() !== ''; f.classList.toggle('invalid', !ok); if (!ok && !bad) bad = f; });
      if (bad) { say('Please fill in your name, a valid email and a message.', 'err'); bad.focus(); return; }

      btn.disabled = true;
      const orig = label.textContent;
      label.textContent = 'Sending…';
      say('');
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.success) {
          say('Thanks — your message was sent.', 'ok');
          form.reset();
        } else {
          say('The message could not be sent. Please email me directly at spharaniya18@gmail.com.', 'err');
        }
      } catch (err) {
        say('Network error — please email me directly at spharaniya18@gmail.com.', 'err');
      }
      btn.disabled = false;
      label.textContent = orig;
    });
    $$('input, textarea', form).forEach((f) => f.addEventListener('input', () => f.classList.remove('invalid')));
  }

  /* ──────────────────────────────────────────
     Boot
  ────────────────────────────────────────── */
  function boot() {
    if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);
    initTheme();
    initMenu();
    initScroll();
    initHeader();
    initHero();
    initReveals();
    initCounters();
    initPointer();
    initFooter();
    initContact();
    runLoader();

    if (hasGsap) {
      const refresh = () => window.ScrollTrigger.refresh();
      window.addEventListener('load', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    }

    /* Safety net: never leave content hidden if something above misbehaves */
    setTimeout(() => {
      const hidden = $$('.reveal, .reveal-stagger > *').filter((n) => getComputedStyle(n).opacity === '0' && n.getBoundingClientRect().top < window.innerHeight);
      if (hidden.length > 6) root.classList.add('force-show');
    }, 9000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
