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
      if (meta) meta.setAttribute('content', t === 'dark' ? '#15171C' : '#F5F3EE');
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
    /* Active link = the last section whose top has passed the middle of the screen. Computed from live
       positions (not an IntersectionObserver): the hero is sticky, so it never "re-enters" and Home would
       otherwise stay unlit after scrolling back to the top. */
    if (sections.length) {
      let cur = null; let navRaf = 0;
      const setActive = () => {
        navRaf = 0;
        const line = window.innerHeight * 0.5;
        let id = sections[0].id;
        sections.forEach((sec) => { if (sec.getBoundingClientRect().top <= line) id = sec.id; });
        if (id === cur) return;
        cur = id;
        links.forEach((l) => {
          const on = l.dataset.nav === id;
          l.classList.toggle('is-active', on);
          if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
        });
      };
      const queueActive = () => { if (!navRaf) navRaf = requestAnimationFrame(setActive); };
      window.addEventListener('scroll', queueActive, { passive: true });
      window.addEventListener('resize', queueActive);
      setActive();
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
    const plain = el.tagName === 'P'; // aria-label is not valid on <p>; leave its words readable instead
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.append(' '); return; }
            const w = document.createElement('span');
            if (!plain) w.setAttribute('aria-hidden', 'true');
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
    if (!plain) el.setAttribute('aria-label', label);
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
        v: 100, duration: 0.85, ease: 'power2.inOut',
        onUpdate: () => { num.textContent = String(Math.round(o.v)); bar.style.transform = 'scaleX(' + o.v / 100 + ')'; },
      })
      .to(loader, { yPercent: -100, duration: 0.75, ease: 'power4.inOut', onComplete: finish }, '+=0.05')
      .add(resolveReady, '-=0.45');

    setTimeout(() => { finish(); resolveReady(); }, 5000); // failsafe
  }

  /* ──────────────────────────────────────────
     Hero neural network — what I do, as a network
     Four input neurons → two hidden layers of four → ONE output neuron. Every neuron carries a few tools
     and pops one up as a chip when a signal passes through it. The output neuron "predicts" a role and its
     read-out changes as different routes arrive: AI Engineer, ML Engineer, Forward Deployed Engineer,
     Data Scientist. Click an input neuron to follow its routes (and the roles it feeds); click the output
     to step through the roles one by one. Orbs have depth (size, shadow, pointer parallax and pull).
     The canvas is decorative (aria-hidden); the neurons you can click are also real buttons overlaid on it.
     Only runs while the hero is on screen; one static frame under reduced motion.
  ────────────────────────────────────────── */
  function initNeuralNet(hero) {
    const canvas = $('.nm-net', hero);
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return null;

    const LAYERS = [4, 4, 4, 1];
    const XS = [0, 0.33, 0.67, 1];
    const OUT = 3; const OUT_ID = 12;
    const CAPTIONS = ['stack', 'methods', 'practice', 'role'];
    const SKILLS = ['ML & Data', 'Deep learning & Vision', 'LLMs & RAG', 'Backend & MLOps']; // names for assistive tech only
    // the tools each neuron carries, one list per layer (every one is also in the Skills section)
    const TIERS = [
      [['Python', 'SQL', 'Pandas'], ['PyTorch', 'OpenCV', 'NumPy'], ['Transformers', 'LangChain', 'Embeddings'], ['Git', 'Docker', 'PostgreSQL']],
      [['XGBoost', 'Scikit-learn', 'Feature eng.'], ['CNNs', 'Grad-CAM', 'Transfer learning'], ['LoRA · QLoRA', 'RAG', 'LangGraph'], ['FastAPI', 'REST APIs', 'Streamlit']],
      [['EDA', 'Cross-validation', 'Statistics'], ['F1 · ROC-AUC', 'RAGAS', 'Error analysis'], ['MCP', 'Tool calling', 'Guardrails'], ['MLflow', 'W&B', 'Modal']],
    ];
    // the nodes (per layer 0–2) that make up each role's route into the single output
    const ROLES = [
      { name: 'AI Engineer', blurb: 'LLMs · RAG · agents', set: [[1, 2], [1, 2], [1, 2]] },
      { name: 'ML Engineer', blurb: 'training · evaluation · MLOps', set: [[0, 1, 3], [1, 3], [1, 3]] },
      { name: 'Forward Deployed Engineer', blurb: 'APIs · deployment · LLM apps', set: [[2, 3], [2, 3], [2, 3]] },
      { name: 'Data Scientist', blurb: 'data · modelling · evaluation', set: [[0, 1], [0, 1], [0, 1]] },
    ];
    const LAST_IN = LAYERS[0] - 1;
    const MONO = '"JetBrains Mono", ui-monospace, monospace';
    const rolesOfSkill = (i) => ROLES.map((r, k) => (r.set[0].includes(i) ? k : -1)).filter((k) => k >= 0);
    const chipText = (n, k) => TIERS[n.l][n.i][((k % 3) + 3) % 3];

    const rand = (seed) => () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeBack = (t) => { const c = 1.9; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
    const TAU = Math.PI * 2;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    let W = 0; let H = 0; let dpr = 1;
    let nodes = []; let edges = []; let feed = null; let F = 100; let small = false; let labelY = 0;
    let edgeBy = new Map();
    let view = null; // { nodes:Set, edges:Set } of the current selection
    let col = { ink: [21, 23, 28], bg: [245, 243, 238], lime: [199, 243, 107] };
    const pulses = []; const rings = []; const chips = new Map();
    const ghosts = []; let colX = []; const SEED = (Math.random() * 1e9) | 0;  // a different layout every visit
    // sel = a pinned input neuron (-1 none); pin = a pinned role (-1 none); out = the role last "predicted"
    const st = { intro: reduce ? 1 : 0, running: false, visible: true, raf: 0, last: 0, spawn: 0.3, cycle: 0, px: 0, py: 0, tx: 0, ty: 0, mx: -999, my: -999, hover: -1, t: 0, sel: -1, pin: -1, selRoles: [], out: -1, outT: 1, sweep: null, sweepIn: 4.5, gap: finePointer ? 0 : 30 };

    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const parse = (v, fallback) => {
      v = (v || '').trim();
      let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
      if (m) {
        let h = m[1];
        if (h.length === 3) h = h.split('').map((x) => x + x).join('');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
      m = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(v);
      return m ? [+m[1], +m[2], +m[3]] : fallback;
    };
    function readColors() {
      const cs = getComputedStyle(root);
      col = { ink: parse(cs.getPropertyValue('--ink'), col.ink), bg: parse(cs.getPropertyValue('--bg'), col.bg), lime: parse(cs.getPropertyValue('--lime'), col.lime) };
    }
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round);

    /* Accessible layer: the canvas is decorative, so the clickable neurons are also real buttons
       (keyboard + screen reader), and the selection gets a real link to the Skills section. */
    const host = canvas.parentNode;
    const layer = document.createElement('div');
    layer.className = 'nm-pick'; layer.setAttribute('role', 'group');
    layer.setAttribute('aria-label', 'Skills-to-role network: pick an input neuron to follow its routes, or the output neuron to step through the roles');
    const btns = SKILLS.map((s, i) => ({ id: i, label: `Input neuron ${i + 1}, ${s} — follow its routes to the roles it supports` }));
    btns.push({ id: OUT_ID, label: 'Output neuron — step through the predicted roles' });
    const btnEls = btns.map((b) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'nm-pk'; el.setAttribute('aria-pressed', 'false'); el.setAttribute('aria-label', b.label);
      el.addEventListener('click', () => select(b.id));
      layer.appendChild(el); return el;
    });
    const open = document.createElement('a');
    open.className = 'nm-open mono'; open.href = '#skills'; open.setAttribute('data-cursor', 'Open');
    open.hidden = true;
    layer.appendChild(open);
    const live = document.createElement('span');
    live.className = 'visually-hidden'; live.setAttribute('aria-live', 'polite');
    layer.appendChild(live);
    host.insertBefore(layer, canvas.nextSibling);

    // soft lime glow sprite (drawn scaled — much cheaper than shadowBlur)
    const glow = document.createElement('canvas');
    glow.width = glow.height = 96;
    function paintGlow() {
      const g = glow.getContext('2d');
      g.clearRect(0, 0, 96, 96);
      const grd = g.createRadialGradient(48, 48, 0, 48, 48, 48);
      grd.addColorStop(0, rgba(col.lime, 0.95));
      grd.addColorStop(0.3, rgba(col.lime, 0.4));
      grd.addColorStop(1, rgba(col.lime, 0));
      g.fillStyle = grd; g.fillRect(0, 0, 96, 96);
    }

    /* geometry ------------------------------------------------ */
    const fontSize = () => (small ? 9 : clamp(F * 0.058, 10, 12.5));
    const baseR = (f, sm) => (sm ? clamp(f * 0.09, 5, 9) : clamp(f * 0.078, 8, 17));
    function nodePos(n) { return [n.x + n.ox, n.y + n.oy]; }
    function ctrl(e) {
      const a = nodes[e.a]; const b = nodes[e.b];
      const ax = a.x + a.ox; const ay = a.y + a.oy; const bx = b.x + b.ox; const by = b.y + b.oy;
      return [ax, ay, (ax + bx) / 2 + e.bend * (ay - by) * 0.2, (ay + by) / 2 + e.bend * (bx - ax) * 0.2, bx, by];
    }
    function edgePt(e, t) {
      if (e.feed) {
        const d = t * (e.l1 + e.l2);
        if (d <= e.l1) return [e.x0 + d, e.y0];
        const s = (d - e.l1) / e.l2; const u = 1 - s;
        return [u * u * u * e.cx0 + 3 * u * u * s * e.c1x + 3 * u * s * s * e.c2x + s * s * s * e.cx1,
          u * u * u * e.cy0 + 3 * u * u * s * e.c1y + 3 * u * s * s * e.c2y + s * s * s * e.cy1];
      }
      const [ax, ay, mx, my, bx, by] = ctrl(e); const u = 1 - t;
      return [u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by];
    }
    const len = (e) => {
      if (e.feed) return e.l1 + e.l2;
      const a = nodes[e.a]; const b = nodes[e.b];
      return Math.hypot(b.x - a.x, b.y - a.y) * 1.05;
    };

    /* Room the hero leaves to the right of the output neuron (its glow and rings). */
    function rightPad(f, sm) { return Math.ceil(sm ? baseR(f, sm) * 2 : baseR(f, false) * 3.7 + 10); }  /* output radius (1.2 × 1.75 × base) × orbit 1.7 + parallax */

    function build(geo) {
      F = geo.F; small = geo.small;
      W = geo.w; H = geo.h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.cssText = `left:${geo.left}px;top:${geo.top}px;width:${W}px;height:${H}px`;
      layer.style.cssText = `left:${geo.left}px;top:${geo.top}px;width:${W}px;height:${H}px`;
      const r = rand(SEED);
      const base = baseR(F, small);
      labelY = geo.labelY;
      colX = XS.map((x) => geo.nx + geo.nw * x);
      nodes = [];
      LAYERS.forEach((n, l) => {
        for (let i = 0; i < n; i++) {
          const id = l * 4 + i;
          const fy = n === 1 ? 0.5 : l === 0 ? 0.1 + 0.8 * (i / (n - 1)) : 0.09 + 0.82 * (i / (n - 1));
          const z = r();
          // grown, not ruled: every neuron is nudged off its column and given its own size
          // (the output neuron and the last input stay put — the read-out and the underline's feed expect them there)
          const fixed = l === OUT || id === LAST_IN;
          const jx = fixed ? 0 : l === 0 ? r() * geo.nw * 0.05 : (r() - 0.5) * geo.nw * 0.11;   // inputs only ever drift away from the name
          const jy = fixed ? 0 : (r() - 0.5) * geo.nh * (l === 0 ? 0.06 : 0.1);
          nodes.push({ id, l, i, x: colX[l] + jx, y: geo.ny + geo.nh * fy + jy, z, ph: r() * TAU, r: base * (0.74 + 0.56 * z) * (l === OUT ? 1.75 : 1), act: 0, ox: 0, oy: 0, out: [], ti: i });
        }
      });
      // faint out-of-focus neurons behind the real ones, for depth
      ghosts.length = 0;
      for (let g = 0; g < (small ? 4 : 8); g++) {
        ghosts.push({ x: geo.nx + geo.nw * (0.02 + 0.96 * r()), y: geo.ny + geo.nh * (-0.02 + 1.06 * r()), r: base * (0.45 + 0.5 * r()), z: r() * 0.4, ph: r() * TAU, near: [], dx: 0, dy: 0 });
      }
      ghosts.forEach((g, gi) => { g.near = ghosts.map((h, j) => ({ j, d: Math.hypot(h.x - g.x, h.y - g.y) })).filter((o) => o.j !== gi).sort((p, q) => p.d - q.d).slice(0, 2).map((o) => o.j); });
      edges = []; edgeBy = new Map();
      for (let l = 0; l < LAYERS.length - 1; l++) {
        for (let i = 0; i < LAYERS[l]; i++) {
          for (let j = 0; j < LAYERS[l + 1]; j++) {
            const e = { a: l * 4 + i, b: (l + 1) * 4 + j, w: 0.3 + 0.7 * r(), bend: (r() - 0.5) * 1.0, act: 0 };
            edges.push(e); edgeBy.set(`${e.a}-${e.b}`, e);
          }
        }
      }
      feed = null;
      if (geo.feed) {
        const f = geo.feed; const n3 = nodes[LAST_IN];
        const R = Math.max(8, f.uy - n3.y);
        feed = { feed: true, x0: f.x0, y0: f.uy, l1: Math.max(1, n3.x - R - f.x0), l2: R * Math.PI / 2, act: 0, a: -1, b: LAST_IN, bend: 0,
          cx0: n3.x - R, cy0: f.uy, c1x: n3.x - R + 0.552 * R, c1y: f.uy, c2x: n3.x, c2y: f.uy - R + 0.552 * R, cx1: n3.x, cy1: n3.y };
      }
      nodes.forEach((n, k) => { n.out = edges.filter((e) => e.a === k); });
      applySelection();
      placeOverlay();
    }

    /* routes ---------------------------------------------------- */
    function routeOf(r, onlyIn) {
      const s = ROLES[r].set; const lay = [onlyIn >= 0 ? [onlyIn] : s[0], s[1], s[2], [0]];
      const ns = new Set(); const es = new Set();
      lay.forEach((arr, l) => arr.forEach((i) => ns.add(l * 4 + i)));
      for (let l = 0; l < OUT; l++) lay[l].forEach((a) => lay[l + 1].forEach((b) => { const e = edgeBy.get(`${l * 4 + a}-${(l + 1) * 4 + b}`); if (e) es.add(e); }));
      return { nodes: ns, edges: es };
    }
    function applySelection() {
      view = null; st.selRoles = [];
      if (st.pin >= 0) st.selRoles = [st.pin];
      else if (st.sel >= 0 && nodes[st.sel]) st.selRoles = rolesOfSkill(nodes[st.sel].i);
      if (!st.selRoles.length || !edges.length) return;
      view = { nodes: new Set(), edges: new Set() };
      st.selRoles.forEach((r) => { const v = routeOf(r, st.pin >= 0 ? -1 : nodes[st.sel].i); v.nodes.forEach((x) => view.nodes.add(x)); v.edges.forEach((x) => view.edges.add(x)); });
    }
    function makePath(r, inIdx) {
      const s = ROLES[r].set; const a0 = inIdx >= 0 ? inIdx : pick(s[0]); const a1 = pick(s[1]); const a2 = pick(s[2]);
      const path = [edgeBy.get(`${a0}-${4 + a1}`), edgeBy.get(`${4 + a1}-${8 + a2}`), edgeBy.get(`${8 + a2}-${OUT_ID}`)];
      return (a0 === LAST_IN && feed) ? [feed].concat(path) : path;
    }
    /* send a few signals along a role's route (staggered), optionally from one fixed input neuron */
    function emit(r, inIdx, speedMul) {
      if (pulses.length > 12) return;
      const ins = inIdx >= 0 ? [inIdx] : ROLES[r].set[0];
      ins.forEach((i, j) => pulses.push({ path: makePath(r, i), k: 0, u: 0, speed: F * 1.5 * (speedMul || 1), role: r, delay: j * 0.16, born: false, from: i }));
    }
    function wave() { for (let r = 0; r < ROLES.length; r++) setTimeout(() => emit(r, -1, 1.3), r * 140); }

    /* chips: the tool a neuron is carrying right now */
    function popChip(n) { chips.set(n.id, { t: 0, txt: chipText(n, n.ti++) }); }
    function setOut(r) { if (r !== st.out) { st.out = r; st.outT = 0; syncMobile(); } }

    /* selection ------------------------------------------------- */
    function placeOverlay() {
      btnEls.forEach((b, k) => { const n = nodes[btns[k].id]; if (n) { b.style.left = `${n.x}px`; b.style.top = `${n.y}px`; } });
      open.style.right = '0px';
      open.style.top = small ? `${H + 2}px` : '-30px';
      syncMobile();
    }
    /* phones have no room beside the output neuron, so the role name lives in a pill under the strip */
    function syncMobile() {
      if (!small) return;
      const r = st.pin >= 0 ? st.pin : st.out;
      open.hidden = false;
      open.textContent = r >= 0 ? `${ROLES[r].name} ↓` : 'Skills ↓';
    }
    function select(k) {
      if (k === OUT_ID) { st.pin = st.pin >= 3 ? -1 : st.pin + 1; st.sel = -1; } else { st.sel = k === st.sel ? -1 : k; st.pin = -1; }
      btnEls.forEach((b, i) => b.setAttribute('aria-pressed', String(btns[i].id === OUT_ID ? st.pin >= 0 : btns[i].id === st.sel)));
      pulses.length = 0; chips.clear(); st.spawn = 0; st.cycle = 0;
      applySelection();
      if (st.pin >= 0) setOut(st.pin);
      if (st.pin >= 0 || st.sel >= 0) {
        if (st.sel >= 0 && st.selRoles.length) setOut(st.selRoles[0]);
        open.hidden = false; open.textContent = small ? `${ROLES[st.out >= 0 ? st.out : 0].name} ↓` : 'See all skills ↓';
        live.textContent = st.pin >= 0
          ? `${ROLES[st.pin].name} (${ROLES[st.pin].blurb}). The tools and routes that lead to it are highlighted.`
          : `${SKILLS[nodes[st.sel].i]}: routes to ${st.selRoles.map((r) => ROLES[r].name).join(' and ')}.`;
      } else { open.hidden = !small; live.textContent = 'Selection cleared.'; if (small) syncMobile(); }
      if (!st.running) paint();
    }

    /* frame ----------------------------------------------------- */
    function frame(ts) {
      if (!st.last) st.last = ts - 16;
      const el = ts - st.last;
      if (el < st.gap) { if (st.running) st.raf = requestAnimationFrame(frame); return; }
      st.last = ts;
      step(Math.min(0.05, el / 1000)); draw();
      if (st.running) st.raf = requestAnimationFrame(frame);
    }
    function step(dt) {
      st.t += dt; st.outT += dt;
      st.px += (st.tx - st.px) * Math.min(1, dt * 5); st.py += (st.ty - st.py) * Math.min(1, dt * 5);
      nodes.forEach((n) => {
        // depth parallax + a gentle magnetic pull towards the pointer
        const d = (n.z - 0.35) * F * 0.14;
        let tx = st.px * d; let ty = st.py * d;
        const dx = st.mx - n.x; const dy = st.my - n.y; const dist = Math.hypot(dx, dy);
        const reach = F * 0.7;
        if (dist < reach && dist > 1) { const k = (1 - dist / reach) * F * 0.07; tx += (dx / dist) * k; ty += (dy / dist) * k; }
        tx += Math.sin(st.t * 0.55 + n.ph) * F * 0.013; ty += Math.cos(st.t * 0.47 + n.ph * 1.7) * F * 0.016;  // slow idle drift
        n.ox += (tx - n.ox) * Math.min(1, dt * 7); n.oy += (ty - n.oy) * Math.min(1, dt * 7);
        n.act = Math.max(0, n.act - dt * 1.4);
        if (dist < reach) n.act = Math.max(n.act, 0.38 * (1 - dist / reach));     // neurons near the pointer glow
        if (st.sweep) n.act = Math.max(n.act, sweepG(n.x) * 0.9);
      });
      edges.forEach((e) => { e.act = Math.max(0, e.act - dt * 1.7); });
      if (feed) feed.act = Math.max(0, feed.act - dt * 1.7);
      chips.forEach((c, id) => { c.t += dt; if (c.t > 1.5 && st.hover !== id) chips.delete(id); });
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        if (p.delay > 0) { p.delay -= dt; continue; }
        if (!p.born) { p.born = true; const n0 = nodes[p.from]; n0.act = 1; popChip(n0); } // the input neuron it starts from
        const e = p.path[p.k];
        e.act = 1;
        p.u += (p.speed / len(e)) * dt;
        if (p.u >= 1) {
          const n = nodes[e.b]; n.act = 1;
          if (n.l >= 1 && n.l <= 2) popChip(n);
          if (n.l === OUT) { rings.push({ t: 0 }); setOut(p.role); }
          p.k += 1; p.u = 0;
          if (p.k >= p.path.length) pulses.splice(i, 1);
        }
      }
      // idle "forward pass": a band of light crosses the network, then a weaker ripple comes back
      if (st.intro >= 1 && !reduce) {
        if (st.sweep) {
          const sw = st.sweep; sw.t += dt / (sw.dir > 0 ? 1.7 : 1.3);
          if (sw.t >= 1) {
            if (sw.dir > 0) { rings.push({ t: 0 }); st.cycle += 1; setOut(st.cycle % ROLES.length); st.sweep = { t: 0, dir: -1, amp: 0.5 }; } else st.sweep = null;
          }
        } else {
          st.sweepIn -= dt;
          if (st.sweepIn <= 0 && st.sel < 0 && st.pin < 0 && pulses.length < 3) { st.sweep = { t: 0, dir: 1, amp: 1 }; st.sweepIn = 8 + Math.random() * 4; }
        }
      }
      for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt / 1.2; if (rings[i].t >= 1) rings.splice(i, 1); }
      if (st.intro >= 1 && !reduce) {
        st.spawn -= dt;
        if (st.spawn <= 0) {
          st.cycle += 1;
          if (st.pin >= 0) { emit(st.pin, -1, 1.1); st.spawn = 1.6; } else if (st.sel >= 0) { emit(st.selRoles[st.cycle % st.selRoles.length], nodes[st.sel].i, 1.1); st.spawn = 1.5; } else { emit(st.cycle % ROLES.length, -1, 1.1); st.spawn = 2.4; }
        }
      }
    }

    function sweepG(x) {
      const sw = st.sweep; if (!sw) return 0;
      const a = nodes[0].x - F * 0.3; const b = nodes[OUT_ID].x;
      const e = sw.t < 0.5 ? 2 * sw.t * sw.t : 1 - Math.pow(-2 * sw.t + 2, 2) / 2;
      const sx = sw.dir > 0 ? a + (b - a) * e : b + (a - b) * e; const k = (x - sx) / (F * 0.34);
      return sw.amp * Math.exp(-k * k);
    }
    function strokeEdge(e, prog) {
      ctx.beginPath();
      if (!e.feed && prog >= 0.999) {
        const [ax, ay, mx, my, bx, by] = ctrl(e);
        ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke(); return;
      }
      const steps = e.feed ? 22 : 14; const end = Math.max(1, Math.round(steps * prog));
      for (let s = 0; s <= end; s++) { const p = edgePt(e, s / steps); if (s === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
      ctx.stroke();
    }
    function pill(x, y, w, h, fill, stroke) {
      const r = Math.min(h / 2, 10);
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    }

    /* a tool chip beside a neuron: above it on layers 0 and 2, below it on layer 1 (so neighbours never collide) */
    function drawChip(n, txt, a, sc) {
      const fs = fontSize(); ctx.font = `500 ${fs}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(txt).width + 14; const h = fs * 1.85;
      const [x0, y0] = nodePos(n);
      const x = clamp(x0, w / 2 + 2, W - w / 2 - 2); const gapY = n.r + 7;
      const below = n.l === 1 && (small || y0 + gapY + h < labelY - 10);   // a chip that would land on the layer captions goes above instead
      const y = clamp(below ? y0 + gapY + h / 2 : y0 - gapY - h / 2, h / 2 + 1, H - h / 2 - 1);
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = a;
      pill(-w / 2, -h / 2, w, h, rgba(col.ink, 0.93), null);
      ctx.fillStyle = rgba(col.bg, 1); ctx.fillText(txt, 0, 0.5);
      ctx.restore();
    }

    /* the output read-out: the role the network "predicts", cross-fading as routes arrive */
    function readout(x, y, r) {
      const fs = fontSize(); const k = st.out; const ro = k >= 0 ? ROLES[k] : null;
      const a = clamp(st.outT / 0.3) * clamp((st.intro - 0.85) / 0.15);
      if (a <= 0) return;
      const wid = (t, sub) => { ctx.font = `${sub ? 400 : 600} ${sub ? fs - 1 : fs}px ${MONO}`; return ctx.measureText(t).width; };
      let rows = ro ? [{ t: `ŷ  ${ro.name}` }, { t: ro.blurb, sub: true }] : (reduce ? [{ t: 'ŷ  pick an input' }, { t: 'click a neuron on the left', sub: true }] : [{ t: 'ŷ  …' }, { t: 'signals incoming', sub: true }]);
      const avail = W - (nodes[2 * 4].x + 18) - 2;  // room to the right of the last hidden column
      if (ro && Math.max(...rows.map((q) => wid(q.t, q.sub))) + 18 > avail) {
        // narrow: drop the blurb, and break a long title over two lines
        rows = (wid(ro.name) + 18 > avail ? ro.name.replace(/ (?=[^ ]+$)/, '\n').split('\n') : [ro.name]).map((t) => ({ t }));
      }
      const lh = fs * 1.3; const h = rows.length * lh + fs * 0.9;
      const w = Math.max(...rows.map((q) => wid(q.t, q.sub))) + 18; const sc = 0.94 + 0.06 * easeBack(clamp(st.outT / 0.3));
      const px = clamp(x - w / 2, 2, W - w - 2); const py = Math.min(H - h - 2, y + r * 2.05 + 6); // below the neuron: the hidden layer's chips sit above theirs
      ctx.save(); ctx.globalAlpha = a; ctx.translate(px + w / 2, py); ctx.scale(sc, sc); ctx.translate(-(px + w / 2), -py);
      pill(px, py, w, h, rgba(col.lime, 1), rgba([21, 23, 28], 0.9));
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      rows.forEach((q, i) => {
        ctx.font = `${q.sub ? 400 : 600} ${q.sub ? fs - 1 : fs}px ${MONO}`; ctx.fillStyle = q.sub ? 'rgba(21,23,28,0.72)' : 'rgb(21,23,28)';
        ctx.fillText(q.t, px + 9, py + fs * 0.45 + lh * (i + 0.5));
      });
      ctx.restore();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const L = LAYERS.length;
      const lt = (l) => clamp(st.intro * (L + 0.8) - l, 0, 1); // layer reveal progress, left → right
      const hov = st.hover; const lw = small ? 0.8 : 1; const lite = small || !finePointer; // touch: skip the dash flow, shadows and gradients
      const hot = new Set();
      if (hov >= 0 && nodes[hov] && nodes[hov].l < OUT) { nodes[hov].out.forEach((e) => hot.add(e)); edges.forEach((e) => { if (e.b === hov) hot.add(e); }); }

      // layer captions (desktop)
      if (!small && st.intro > 0.6) {
        ctx.font = `500 ${clamp(F * 0.052, 9, 11)}px ${MONO}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        const spaced = colX[1] - colX[0] > 125;
        LAYERS.forEach((n, l) => {
          const x = colX[l];
          ctx.fillStyle = rgba(col.ink, 0.42 * clamp((st.intro - 0.6) / 0.4));
          ctx.fillText(spaced ? CAPTIONS[l].toUpperCase().split('').join(' ') : CAPTIONS[l].toUpperCase(), x, labelY);
        });
      }

      // depth: faint out-of-focus neurons and links behind everything
      if (ghosts.length && st.intro > 0.3) {
        const ga = clamp((st.intro - 0.3) * 1.5);
        ghosts.forEach((g) => { g.dx = Math.sin(st.t * 0.35 + g.ph) * F * 0.03 - st.px * (0.45 - g.z) * F * 0.1; g.dy = Math.cos(st.t * 0.3 + g.ph) * F * 0.03 - st.py * (0.45 - g.z) * F * 0.1; });
        ctx.setLineDash([]); ctx.lineWidth = 1;
        ghosts.forEach((g) => g.near.forEach((j) => { const h = ghosts[j]; ctx.strokeStyle = rgba(col.ink, 0.07 * ga); ctx.beginPath(); ctx.moveTo(g.x + g.dx, g.y + g.dy); ctx.lineTo(h.x + h.dx, h.y + h.dy); ctx.stroke(); }));
        ghosts.forEach((g) => { ctx.beginPath(); ctx.arc(g.x + g.dx, g.y + g.dy, g.r, 0, TAU); ctx.fillStyle = rgba(col.ink, 0.045 * ga); ctx.fill(); ctx.strokeStyle = rgba(col.ink, 0.12 * ga); ctx.stroke(); });
      }

      // connections: ink structure + a quiet flow of dashes + lime where signals pass
      ctx.lineCap = 'round';
      edges.forEach((e) => {
        const a = nodes[e.a]; const b = nodes[e.b];
        const prog = easeOut(lt(b.l));
        if (prog <= 0) return;
        const depth = (a.z + b.z) / 2; const isHot = hot.has(e);
        const dim = view && !view.edges.has(e) ? 0.4 : 1;
        let near = 0;
        if (st.mx > -500 && !small) { const m = edgePt(e, 0.5); near = clamp(1 - Math.hypot(m[0] - st.mx, m[1] - st.my) / (F * 0.8)); }
        const sg = st.sweep ? sweepG((a.x + b.x) / 2) : 0;
        ctx.setLineDash([]);
        ctx.strokeStyle = rgba(col.ink, Math.min(0.9, ((0.14 + 0.18 * depth) * (0.55 + 0.45 * e.w)) * dim + (isHot ? 0.45 : 0) + 0.3 * near + 0.3 * sg));
        ctx.lineWidth = (0.9 + 0.8 * e.w) * lw + (isHot ? 0.7 : 0) + 0.6 * near;
        strokeEdge(e, prog);
        if (prog >= 0.999 && !reduce && !lite && dim === 1) {
          ctx.setLineDash([7, 26]); ctx.lineDashOffset = -st.t * (18 + 26 * e.w);
          ctx.strokeStyle = rgba(col.lime, Math.min(1, (isHot ? 1 : 0.7) + 0.3 * near)); ctx.lineWidth = (1.8 + 0.8 * e.w) * lw;
          strokeEdge(e, 1); ctx.setLineDash([]);
        }
        if (sg > 0.04) { ctx.strokeStyle = rgba(col.lime, 0.9 * sg); ctx.lineWidth = (1.8 + 1.6 * sg) * lw; strokeEdge(e, prog); }
        if (e.act > 0.02) { ctx.strokeStyle = rgba(col.lime, 0.95 * e.act); ctx.lineWidth = 2.6 * lw; strokeEdge(e, prog); }
      });
      // the selected routes: ink outline + lime core
      if (view) {
        ctx.setLineDash([]);
        view.edges.forEach((e) => {
          const pr = easeOut(lt(nodes[e.b].l)); if (pr <= 0) return;
          ctx.strokeStyle = rgba(col.ink, 0.85); ctx.lineWidth = 4.2 * lw; strokeEdge(e, pr);
          ctx.strokeStyle = rgba(col.lime, 1); ctx.lineWidth = 2.4 * lw; strokeEdge(e, pr);
        });
      }
      if (feed && st.intro > 0.5 && (feed.act > 0.02 || (view && view.nodes.has(LAST_IN)))) { ctx.strokeStyle = rgba(col.lime, view ? 0.95 : 0.95 * feed.act); ctx.lineWidth = 3; strokeEdge(feed, 1); }

      // signals: comet with a fading tail and a glowing head
      pulses.forEach((p) => {
        if (p.delay > 0) return;
        const e = p.path[p.k]; const tail = 0.34;
        for (let s = 0; s < 7; s++) {
          const t0 = clamp(p.u - tail * (1 - s / 7), 0, 1); const t1 = clamp(p.u - tail * (1 - (s + 1) / 7), 0, 1);
          if (t1 <= t0) continue;
          const A = edgePt(e, t0); const B = edgePt(e, t1);
          ctx.strokeStyle = rgba(col.lime, 0.12 + 0.88 * ((s + 1) / 7)); ctx.lineWidth = (1.6 + 2.4 * (s / 6)) * lw;
          ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        }
        const h = edgePt(e, p.u); const g = clamp(F * 0.07, 7, 14);
        ctx.drawImage(glow, h[0] - g, h[1] - g, g * 2, g * 2);
        ctx.fillStyle = rgba([255, 255, 255], 0.9); ctx.beginPath(); ctx.arc(h[0], h[1], g * 0.18, 0, TAU); ctx.fill();
      });

      // neurons — back to front so nearer orbs overlap farther ones
      const order = nodes.map((n, k) => k).sort((p, q) => nodes[p].z - nodes[q].z);
      order.forEach((k) => {
        const n = nodes[k]; const prog = easeOut(lt(n.l));
        if (prog <= 0) return;
        const [x, y] = nodePos(n); const isOut = n.l === OUT; const isH = k === hov;
        const r = n.r * (0.35 + 0.65 * prog) * (isH ? 1.15 : 1) * (1 + 0.14 * n.act);
        const a = (0.6 + 0.4 * n.z) * prog;
        const inView = view && view.nodes.has(k);
        if (view && !inView) ctx.globalAlpha = 0.45;
        if (!lite) { ctx.fillStyle = rgba(col.ink, 0.07 * prog); ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 1.55, r * 0.95, r * 0.28, 0, 0, TAU); ctx.fill(); }
        if (n.act > 0.02 || isOut) {
          const g = r * (isOut ? 3.1 : 3.4); const ga = ctx.globalAlpha; ctx.globalAlpha = ga * (isOut ? 0.5 + 0.5 * n.act : n.act) * prog;
          ctx.drawImage(glow, x - g, y - g, g * 2, g * 2); ctx.globalAlpha = ga;
        }
        const rim = mix(col.bg, col.ink, 0.1 + 0.08 * (1 - n.z));
        let fill;
        if (lite) fill = isOut ? rgba(col.lime, 1) : `rgb(${mix(mix(col.bg, [255, 255, 255], 0.35), col.lime, n.act)})`;
        else {
          fill = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
          if (isOut) { fill.addColorStop(0, rgba([240, 255, 200], 1)); fill.addColorStop(1, rgba(col.lime, 1)); } else {
            fill.addColorStop(0, `rgb(${mix(col.bg, [255, 255, 255], 0.6)})`); fill.addColorStop(1, `rgb(${mix(rim, col.lime, n.act)})`);
          }
        }
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill();
        ctx.lineWidth = (isOut ? 2 : 1.5) * (small ? 0.8 : 1); ctx.strokeStyle = rgba(isOut ? [21, 23, 28] : col.ink, a); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * (isOut ? 0.34 : 0.3), 0, TAU);
        ctx.fillStyle = isOut ? rgba([21, 23, 28], 0.9) : `rgb(${mix(col.ink, col.lime, n.act)})`; ctx.globalAlpha = (isOut ? 1 : (0.35 + 0.65 * n.act)) * prog * (view && !inView ? 0.45 : 1); ctx.fill(); ctx.globalAlpha = 1;
        const chosen = k === st.sel || (isOut && st.pin >= 0);
        if (isH || chosen || (inView && n.l > 0 && n.l < OUT)) {
          ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.strokeStyle = isH ? rgba(col.lime, 0.95) : rgba(col.ink, 0.85); ctx.lineWidth = 2; ctx.stroke();
          if (!isH) { ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, TAU); ctx.strokeStyle = rgba(col.lime, 1); ctx.lineWidth = 2.4; ctx.stroke(); }
        }
        if (isOut && prog > 0.9) {
          // rotating dashed orbit + expanding hit rings, then the role read-out
          ctx.save(); ctx.translate(x, y); ctx.rotate(st.t * 0.5); ctx.setLineDash([4, 7]);
          ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, TAU); ctx.strokeStyle = rgba(col.ink, 0.5); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); ctx.setLineDash([]);
          rings.forEach((rg) => { ctx.beginPath(); ctx.arc(x, y, r * (1 + rg.t * 2.4), 0, TAU); ctx.strokeStyle = rgba(col.lime, 0.95 * (1 - rg.t)); ctx.lineWidth = 2; ctx.stroke(); });
          if (!small) readout(x, y, r);
        }
      });

      // tool chips: popped by signals, or kept on (and cycling) along a selected route
      if (st.intro > 0.85) {
        const shown = new Set(); const persist = view && !small; // phones: only popped chips, the strip is too small for a full set
        nodes.forEach((n) => {
          if (n.l > 2) return;
          if (persist && view.nodes.has(n.id)) {
            const ph = st.t / 1.8 + n.i * 0.7; const idx = Math.floor(ph); const f = ph - idx;
            const sc = reduce ? 1 : 0.7 + 0.3 * easeBack(clamp(f / 0.18));
            drawChip(n, chipText(n, idx), reduce ? 1 : clamp(f / 0.07) * clamp((1 - f) / 0.07), sc); shown.add(n.id);
          }
        });
        chips.forEach((c, id) => {
          if (shown.has(id) || (persist && st.hover !== id)) return;
          const n = nodes[id]; const a = clamp(c.t / 0.08) * (st.hover === id ? 1 : clamp((1.5 - c.t) / 0.2));
          drawChip(n, c.txt, a, 0.7 + 0.3 * easeBack(clamp(c.t / 0.28)));
        });
      }
    }

    /* loop control --------------------------------------------- */
    function start() {
      if (reduce || st.running || !st.visible || document.hidden) return;
      st.running = true; st.last = 0; st.raf = requestAnimationFrame(frame);
    }
    function stop() { st.running = false; cancelAnimationFrame(st.raf); }
    function paint() { step(0); draw(); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { st.visible = en.isIntersecting; if (st.visible) start(); else stop(); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

    /* interaction ------------------------------------------------ */
    function local(ev) { const b = canvas.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top, b]; }
    function nearest(x, y) {
      let best = -1; let bd = 1e9;
      nodes.forEach((n, k) => { const d = Math.hypot(n.x + n.ox - x, n.y + n.oy - y); if (d < n.r * 1.9 + 10 && d < bd) { bd = d; best = k; } });
      return best;
    }
    const pickable = (k) => k >= 0 && (nodes[k].l === 0 || nodes[k].l === OUT);
    function fireFrom(k, mul) {
      if (st.sel >= 0 || st.pin >= 0) return;
      const n = nodes[k];
      if (n.l === 0) { const rs = rolesOfSkill(n.i); if (rs.length) emit(pick(rs), n.i, mul); }
    }
    if (!reduce) {
      canvas.addEventListener('pointermove', (ev) => {
        const [x, y, b] = local(ev);
        st.tx = (x / b.width - 0.5) * 2; st.ty = (y / b.height - 0.5) * 2;
        if (ev.pointerType === 'touch') return;
        st.mx = x; st.my = y;
        const h = nearest(x, y);
        if (h !== st.hover) {
          st.hover = h; canvas.classList.toggle('is-hot', pickable(h));
          if (h >= 0 && nodes[h].l >= 1 && nodes[h].l <= 2) popChip(nodes[h]); else if (h >= 0) fireFrom(h, 1.2);
        }
      });
      canvas.addEventListener('pointerleave', () => { st.hover = -1; st.tx = 0; st.ty = 0; st.mx = -999; st.my = -999; canvas.classList.remove('is-hot'); });
      canvas.addEventListener('pointerdown', (ev) => {
        const [x, y] = local(ev); const h = nearest(x, y);
        if (h >= 0 && nodes[h].l === 0) fireFrom(h, 1.3); else if (h < 0 && st.sel < 0 && st.pin < 0) wave();
      });
    }
    // choosing is a click (so a scroll-swipe across the canvas on a phone never selects by accident)
    canvas.addEventListener('click', (ev) => {
      const [x, y] = local(ev); const h = nearest(x, y);
      if (pickable(h)) select(nodes[h].id); else if (st.sel >= 0 || st.pin >= 0) { st.pin = st.pin >= 0 ? 3 : -1; select(st.pin >= 0 ? OUT_ID : st.sel); }
    });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && (st.sel >= 0 || st.pin >= 0)) { st.pin = st.pin >= 0 ? 3 : -1; select(st.pin >= 0 ? OUT_ID : st.sel); } });

    new MutationObserver(() => { readColors(); paintGlow(); if (!st.running) paint(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    readColors(); paintGlow();

    return {
      build(geo) { build(geo); if (!st.running) paint(); },
      rightPad,
      get intro() { return st.intro; },
      set intro(v) { st.intro = v; if (!st.running) paint(); },
      start, stop,
    };
  }

  /* ──────────────────────────────────────────
     Hero
  ────────────────────────────────────────── */
  function initHero() {
    const hero = $('#home');
    const sheet = $('.sheet');
    if (!hero || !sheet) return;

    /* The page below (ticker, About, …) slides up over the hero. The hero pins at its own bottom edge:
       when it is shorter than the window that is the top; when it is taller it scrolls until its end is
       in view, then holds while the sheet covers it. */
    const syncSticky = () => {
      if (reduce || !hasGsap) { hero.classList.remove('is-sticky'); hero.style.top = ''; return; }
      hero.classList.add('is-sticky');
      hero.style.top = `${Math.min(0, window.innerHeight - hero.offsetHeight)}px`;
    };
    syncSticky();

    const nameBox = $('.hero-name', hero);
    const nm = $('.nm', hero);
    const ulSvg = $('.nm-ul', hero);
    const ulPath = $('.nm-ul .ul', hero);
    const net = initNeuralNet(hero);

    /* Lay the underline and network out from the *measured* name, so they stay locked to the
       letters whatever font or size the browser ends up rendering. */
    function layout() {
      if (!nameBox || !nm || !ulPath) return;
      const F = parseFloat(getComputedStyle(nm).fontSize) || 100;
      const lineEnds = $$('.nm-line', nm).map((ln) => {
        const ls = $$('.nm-l', ln); const last = ls[ls.length - 1];
        return last ? last.offsetLeft + last.offsetWidth : 0;
      });
      const r1 = lineEnds[0] || 0; const r2 = lineEnds[lineEnds.length - 1] || r1;
      const nameH = nm.offsetHeight; const W = nameBox.clientWidth;
      const uy = nameH + 0.07 * F;
      const desktop = isDesktop();
      ulSvg.style.height = `${uy + 0.2 * F}px`;
      ulSvg.setAttribute('viewBox', `0 0 ${W} ${uy + 0.2 * F}`);
      if (!net) { ulPath.setAttribute('d', `M${0.02 * F} ${uy} H${r2}`); return; }

      if (desktop) {
        const NF = F;
        const x0n = Math.max(r1, r2) + 0.25 * F;          // first neurons, straight after the name
        /* The network is a little taller than the name and rises slightly above it, so it stays the
           visual counterweight to the (smaller) type; its bottom stays on the name's baseline. */
        const netH = nameH * 1.04; const netTop = nameH - netH;
        const n3y = netTop + netH * 0.9; const R = Math.max(10, uy - n3y);
        const rp = net.rightPad(NF, false);                 // room for the output neuron's glow and rings
        const nw = Math.min(3.2 * netH, Math.max(1.1 * NF, W - x0n - rp));
        const x0 = Math.max(x0n, W - rp - nw);              // if the network can't use all the room, the underline simply runs a little further
        hero.style.setProperty('--lede-x', `${Math.round(x0)}px`);
        const left = Math.max(0, x0 - R - 0.9 * F); const top = netTop - 0.1 * NF;
        /* the glow around the output neuron may spill into the page margin to the right of the content box */
        const ex = Math.max(0, Math.min(0.4 * NF, document.documentElement.clientWidth - nameBox.getBoundingClientRect().right - 6));
        const w = Math.min(W - left, x0 - left + nw + rp) + ex; const h = uy + 0.22 * F - top;
        ulPath.setAttribute('d', `M${0.02 * F} ${uy} H${x0 - R} C${x0 - R + 0.552 * R} ${uy} ${x0} ${uy - R + 0.552 * R} ${x0} ${uy - R}`);
        net.build({ F: NF, small: false, left, top, w, h, nx: x0 - left, nw, ny: netTop - top, nh: netH, labelY: uy - top + 0.06 * F, feed: { x0: 0, uy: uy - top } });
      } else {
        const sh = Math.min(F * 1.25, 130); const gap = 0.16 * F;
        ulPath.setAttribute('d', `M${0.02 * F} ${uy} H${r2}`);
        hero.style.removeProperty('--lede-x');
        const pad = 10; const rp = net.rightPad(F, true);
        net.build({ F, small: true, left: 0, top: uy + gap, w: W, h: sh, nx: pad + 4, nw: W - 2 * pad - 14 - rp, ny: 8, nh: sh - 16, labelY: 0, feed: null });
      }
    }
    layout();
    let lt;
    const relayout = () => { clearTimeout(lt); lt = setTimeout(() => { layout(); syncSticky(); }, 80); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    if ('ResizeObserver' in window && nameBox) new ResizeObserver(relayout).observe(nameBox);

    if (!animate) { if (net) { net.intro = 1; } return; }
    const gsap = window.gsap;

    const letters = $$('.nm-l', hero);
    const nameLines = $$('.nm-line', hero);
    const lines = $$('.hero-headline .line-inner', hero);
    const fades = $$('[data-hero-fade]', hero);
    const hl = $('.hl', hero);

    gsap.set(letters, { yPercent: 118, rotation: 3, transformOrigin: '0% 100%', visibility: 'visible' });
    gsap.set(lines, { yPercent: 112, visibility: 'visible' });
    gsap.set(fades, { opacity: 0, y: 24 });
    gsap.set(ulPath, { strokeDashoffset: 1 });
    if (hl) gsap.set(hl, { '--hl': 0 });

    ready.then(() => {
      layout(); // fonts are in by now; measure again before anything moves
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      /* 1 — the name: masked rise, letter by letter, line 2 trailing line 1 */
      nameLines.forEach((line, i) => {
        tl.to($$('.nm-l', line), { yPercent: 0, rotation: 0, duration: 1.05, stagger: 0.04 }, 0.05 + i * 0.14);
      });
      /* 2 — the accent stroke draws, then the network grows out of it, layer by layer */
      tl.to(ulPath, { strokeDashoffset: 0, duration: 1.2, ease: 'power3.inOut' }, 0.55);
      if (net) {
        const o = { v: 0 };
        tl.to(o, { v: 1, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { net.intro = o.v; } }, 0.8)
          .add(() => net.start(), 0.8);
      }
      /* 3 — headline right behind it, then actions, rail, stats */
      tl.to(lines, { yPercent: 0, duration: 1.2, stagger: 0.1 }, 0.55)
        .to(hl, { '--hl': 1, duration: 0.9, ease: 'power3.out' }, 1.0)
        .to(fades, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.8);
    });

    /* Hero recedes as the sheet slides over it; its layers (name, band, stats) separate slightly for depth */
    gsap.matchMedia().add('(min-width: 900px)', () => {
        const trig = { trigger: sheet, start: 'top bottom', end: 'top top', scrub: true };
        gsap.to('.hero-inner', { y: -60, scale: 0.965, opacity: 0.3, transformOrigin: '50% 0%', ease: 'none', scrollTrigger: trig });
        gsap.to(nameBox, { y: -34, ease: 'none', scrollTrigger: trig });
        gsap.to($('.hero-band', hero), { y: -14, ease: 'none', scrollTrigger: trig });
    });
    window.addEventListener('resize', () => {
      clearTimeout(lt);
      lt = setTimeout(() => { layout(); syncSticky(); window.ScrollTrigger.refresh(); }, 200);
    });
  }

  /* ──────────────────────────────────────────
     Section titles + descriptions
     One source of truth: the page's JSON-LD (ProfilePage.hasPart). As a section crosses the middle of the
     window the tab title and meta description follow it, so history, bookmarks and tab strips read sensibly.
     (Search engines index the static head; this only improves the live page.)
  ────────────────────────────────────────── */
  function initSectionMeta() {
    const ldEl = $('script[type="application/ld+json"]'); const descEl = $('meta[name="description"]');
    if (!ldEl || !descEl || !('IntersectionObserver' in window)) return;
    let parts = [];
    try { const g = JSON.parse(ldEl.textContent)['@graph'] || []; parts = (g.find((n) => n['@type'] === 'ProfilePage') || {}).hasPart || []; } catch (e) { return; }
    const info = new Map(); const els = [];
    parts.forEach((pt) => {
      const id = (pt.cssSelector || '').replace('#', ''); const el = id && document.getElementById(id);
      if (el) { info.set(id, pt); els.push(el); }
    });
    if (!els.length) return;
    const baseTitle = document.title; const baseDesc = descEl.getAttribute('content');
    const live = new Set(); let cur = ''; let timer = 0;
    const apply = () => {
      // nested sections (a project inside "Selected work"): the one that starts lowest wins
      let best = null;
      live.forEach((el) => { if (!best || el.getBoundingClientRect().top > best.getBoundingClientRect().top) best = el; });
      const id = best ? best.id : '';
      if (id === cur) return;
      cur = id;
      const pt = info.get(id);
      document.title = pt ? `${pt.name} — Shubham Haraniya` : baseTitle;
      descEl.setAttribute('content', pt ? pt.description : baseDesc);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) live.add(en.target); else live.delete(en.target); });
      clearTimeout(timer); timer = setTimeout(apply, 250);
    }, { rootMargin: '-45% 0px -50% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ──────────────────────────────────────────
     Tabs (progressive: without JS all panels simply stack)
  ────────────────────────────────────────── */
  function initTabs() {
    $$('[data-tabs]').forEach((wrap) => {
      const tabs = $$('[role="tab"]', wrap);
      const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
      if (!tabs.length) return;
      wrap.classList.add('tabs-on');
      const select = (i, focus) => {
        tabs.forEach((t, n) => {
          const on = n === i;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          panels[n].hidden = !on;
        });
        if (focus) tabs[i].focus();
        if (hasGsap) window.ScrollTrigger.refresh();
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(i));
        t.addEventListener('keydown', (e) => {
          const k = e.key;
          let n = null;
          if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % tabs.length;
          else if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
          else if (k === 'Home') n = 0;
          else if (k === 'End') n = tabs.length - 1;
          if (n !== null) { e.preventDefault(); select(n, true); }
        });
      });
      select(0, false);
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
      /* words move from secondary to primary ink (both pass contrast) rather than fading from near-invisible */
      gsap.set(words, { '--p': 0 });
      gsap.to(words, {
        '--p': 1, ease: 'none', stagger: 0.12,
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
      const arch = $('.arch', panel);
      if (arch) {
        /* architecture diagram: bands fade in, nodes cascade top to bottom, the arrows follow */
        const bands = $$('.arch-band', arch); const nodes = $$('.arch-n', arch); const edges = $$('.arch-e, .lab', arch);
        gsap.set(bands, { opacity: 0 }); gsap.set(nodes, { opacity: 0, y: 12 }); gsap.set(edges, { opacity: 0 });
        ST.create({
          trigger: arch, start: 'top 85%', once: true,
          onEnter: () => {
            gsap.to(bands, { opacity: 1, duration: 0.8, stagger: 0.18, ease: 'power2.out' });
            gsap.to(nodes, { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: 'power3.out', delay: 0.15, onComplete: () => gsap.set(nodes, { clearProps: 'transform' }) });
            gsap.to(edges, { opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power1.out', delay: 0.5 });
          },
        });
      }
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

    /* Skills: each group pops in — heading slides under its rule, tags spring up one after another */
    const pop = (tags, delay = 0) => gsap.fromTo(tags,
      { opacity: 0, scale: 0.55, y: 22, rotation: () => gsap.utils.random(-7, 7) },
      { opacity: 1, scale: 1, y: 0, rotation: 0, duration: 0.8, ease: 'back.out(2.4)', delay, stagger: { each: 0.028, from: 'start' }, overwrite: 'auto',
        onComplete: () => gsap.set(tags, { clearProps: 'opacity,transform' }) });
    $$('.skill-group').forEach((g) => {
      const head = $('h3', g); const tags = $$(':scope > .tags > li', g);
      gsap.set(head, { opacity: 0, x: -28 });
      gsap.set(tags, { opacity: 0, scale: 0.55, y: 22 });
      ST.create({
        trigger: g, start: 'top 86%', once: true,
        onEnter: () => {
          gsap.to(head, { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out', onComplete: () => gsap.set(head, { clearProps: 'opacity,transform' }) });
          pop(tags, 0.12);
        },
      });
      /* the extra tags spring out each time a group is opened */
      const more = $('.more-skills', g);
      if (more) more.addEventListener('toggle', () => { if (more.open) pop($$('.tags li', more), 0.05); });
    });

    /* Section eyebrows: tag and label slide in with a lime tick that draws */
    $$('.section-head .eyebrow, .resume-band .eyebrow').forEach((el) => {
      gsap.set(el, { clipPath: 'inset(0 100% 0 0)', x: -14 });
      ST.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => gsap.to(el, { clipPath: 'inset(0 0% 0 0)', x: 0, duration: 1.1, ease: 'expo.out', onComplete: () => gsap.set(el, { clearProps: 'clipPath,transform' }) }),
      });
    });

    /* Figures: unmask like a lifting curtain, then drift a touch slower than the text beside them */
    $$('.fig-media:not(.fig-media-chart)').forEach((m) => {
      gsap.set(m, { clipPath: 'inset(12% 8% 12% 8% round 26px)', opacity: 0.001 });
      ST.create({
        trigger: m, start: 'top 90%', once: true,
        onEnter: () => gsap.to(m, { clipPath: 'inset(0% 0% 0% 0% round 18px)', opacity: 1, duration: 1.3, ease: 'expo.out', onComplete: () => gsap.set(m, { clearProps: 'clipPath,opacity' }) }),
      });
    });

    gsap.matchMedia().add('(min-width: 900px)', () => {
      /* Depth: figures and big display headings travel at slightly different speeds from the body copy */
      $$('.fig').forEach((el) => {
        gsap.fromTo(el, { y: 26 }, { y: -26, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });
      $$('.section-head:not(.sticky-head) .display').forEach((el) => {
        gsap.fromTo(el, { y: 18 }, { y: -18, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
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
     Experience & education: each block's rule draws across, its label slides in, and every entry
     builds itself — date, masked title, details, bullets — while a lime spine fills as you scroll past.
  ────────────────────────────────────────── */
  function initTimeline() {
    if (!animate) return;
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    const clean = (els, props) => gsap.set(els, { clearProps: props || 'opacity,transform,clipPath' });

    $$('.timeline .tl-block').forEach((block) => {
      const label = $('.tl-label', block);
      gsap.set(block, { '--rule': 0 });
      if (label) gsap.set(label, { opacity: 0, x: -22 });
      ST.create({
        trigger: block, start: 'top 88%', once: true,
        onEnter: () => {
          gsap.to(block, { '--rule': 1, duration: 1.4, ease: 'expo.out' });
          if (label) gsap.to(label, { opacity: 1, x: 0, duration: 1, ease: 'expo.out', delay: 0.1, onComplete: () => clean(label) });
        },
      });
    });

    $$('.timeline .tl-entry').forEach((entry) => {
      const date = $('.tl-date', entry);
      const title = $('h4', entry);
      const words = title ? splitWords(title, true) : [];
      const rest = $$('.tl-org, .tl-meta', entry);
      const big = $('.tl-big', entry);
      const points = $$('.tl-points li', entry);
      gsap.set(entry, { '--p': 0, '--dot': 0 });
      if (date) gsap.set(date, { opacity: 0, x: -26 });
      if (words.length) gsap.set(words, { yPercent: 115 });
      if (rest.length) gsap.set(rest, { opacity: 0, y: 14 });
      if (big) gsap.set(big, { clipPath: 'inset(0 0 100% 0)', y: 24 });
      if (points.length) gsap.set(points, { opacity: 0, x: -18 });

      ST.create({
        trigger: entry, start: 'top 86%', once: true,
        onEnter: () => {
          const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
          tl.to(entry, { '--dot': 1, duration: 0.7, ease: 'back.out(3)' }, 0);
          if (date) tl.to(date, { opacity: 1, x: 0, duration: 0.9, onComplete: () => clean(date) }, 0);
          if (words.length) tl.to(words, { yPercent: 0, duration: 1.1, stagger: 0.05 }, 0.08);
          if (rest.length) tl.to(rest, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, onComplete: () => clean(rest) }, 0.3);
          if (points.length) tl.to(points, { opacity: 1, x: 0, duration: 0.9, stagger: 0.14, onComplete: () => clean(points) }, 0.4);
          if (big) tl.to(big, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.1, onComplete: () => clean(big) }, 0.1);
        },
      });

      /* the lime spine fills while the entry passes through the middle of the screen; the node lights when it is reached */
      gsap.to(entry, {
        '--p': 1, ease: 'none',
        scrollTrigger: { trigger: entry, start: 'top 62%', end: 'bottom 42%', scrub: true, onToggle: (self) => entry.classList.toggle('is-lit', self.progress > 0) },
      });
    });

    /* achievement numerals drift a little against the scroll */
    gsap.matchMedia().add('(min-width: 900px)', () => {
      $$('.timeline .tl-big').forEach((el) => {
        gsap.fromTo(el.parentElement, { y: 14 }, { y: -14, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });
    });
  }

  /* ──────────────────────────────────────────
     Skills ticker (PyTorch / LoRA / RAG / …) — reacts to scrolling:
     it drifts on its own, speeds up in the direction you scroll, reverses when you scroll back,
     leans slightly with the speed, and its items pop in the first time the strip arrives.
  ────────────────────────────────────────── */
  function initTicker() {
    const strip = $('.ticker');
    const track = $('.ticker-track');
    if (!strip || !track || !animate) return;
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    const items = $$('span, i', track);

    track.style.animation = 'none'; // hand the motion over from the CSS keyframes to GSAP
    const drift = gsap.to(track, { xPercent: -50, ease: 'none', duration: 46, repeat: -1 });
    const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3.out' });
    let dir = 1;
    let paused = false;

    ST.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        if (paused) return;
        const v = self.getVelocity();
        if (self.direction !== 0) dir = self.direction;
        const boost = Math.min(7, Math.abs(v) / 260);
        gsap.to(drift, { timeScale: dir * (1 + boost), duration: 0.25, overwrite: true });
        gsap.to(drift, { timeScale: dir, duration: 1.4, delay: 0.25, ease: 'power2.out', overwrite: 'auto' });
        skew(Math.max(-7, Math.min(7, -v / 260)));
      },
    });
    ST.addEventListener('scrollEnd', () => skew(0));

    /* hover / keyboard focus slows it to a stop so a tag can be read */
    const hold = (on) => { paused = on; gsap.to(drift, { timeScale: on ? 0 : dir, duration: 0.5, overwrite: true }); };
    strip.addEventListener('pointerenter', () => hold(true));
    strip.addEventListener('pointerleave', () => hold(false));

    /* first arrival: items pop in */
    gsap.set(items, { opacity: 0, scale: 0.4, y: 14 });
    ST.create({
      trigger: strip, start: 'top 98%', once: true,
      onEnter: () => gsap.to(items, {
        opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(2.2)', stagger: { each: 0.025, from: 'start' },
        onComplete: () => gsap.set(items, { clearProps: 'opacity,transform' }),
      }),
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
        panel.addEventListener('pointerleave', () => { rX(0); rY(0); panel.classList.remove('is-glare'); });
        panel.addEventListener('pointerenter', () => panel.classList.add('is-glare'));
        panel.addEventListener('pointermove', (e) => {
          const r = panel.getBoundingClientRect();
          panel.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          panel.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
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
        /* Driven by the *live* position of the page's bottom edge rather than a pre-measured ScrollTrigger range,
           so a late layout change (fonts, images) can never leave the wordmark half-risen at the end of the page. */
        const tl = gsap.timeline({ paused: true });
        tl.fromTo(words, { yPercent: 105 }, { yPercent: 0, ease: 'none', stagger: 0.12 });
        let raf = 0;
        const update = () => {
          raf = 0;
          const span = Math.max(footer.offsetHeight * 0.7, 1);
          const p = (window.innerHeight - main.getBoundingClientRect().bottom) / span;
          tl.progress(Math.min(1, Math.max(0, p)));
        };
        const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
        window.addEventListener('scroll', queue, { passive: true });
        window.addEventListener('resize', queue);
        update();
        return () => { window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); if (raf) cancelAnimationFrame(raf); tl.kill(); };
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
    initTabs();
    initReveals();
    initTicker();
    initTimeline();
    initSectionMeta();
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
