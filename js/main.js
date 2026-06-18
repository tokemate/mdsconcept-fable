/* MDS Parfümszalon — interakciók (GSAP + ScrollTrigger + Lenis) */

import { createScene } from './scene.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

document.getElementById('year').textContent = new Date().getFullYear();
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ---------- Kapcsolat űrlap (mailto-összeállítás) ---------- */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!contactForm.reportValidity()) return;
    const name = contactForm.elements.name.value.trim();
    const email = contactForm.elements.email.value.trim();
    const message = contactForm.elements.message.value.trim();
    const body = `Név: ${name}\nE-mail: ${email}\n\n${message}`;
    const url = 'mailto:parfum@mdsconcept.hu'
      + '?subject=' + encodeURIComponent('Kapcsolatfelvétel — ' + name)
      + '&body=' + encodeURIComponent(body);
    const status = contactForm.querySelector('.form-status');
    if (status) status.textContent = 'Megnyitottuk a leveleződet — köszönjük!';
    window.location.href = url;
  });
}

/* ---------- Three.js jelenet ---------- */
const scene = reduced ? { setPointer() {}, setProgress() {} } : createScene($('#scene'));
if (reduced) { const c = $('#scene'); if (c) c.style.display = 'none'; }

if (!hasGsap || reduced) {
  // Tartalék: animációk nélkül is minden olvasható
  const pre = $('.preloader');
  if (pre) pre.remove();
  document.documentElement.classList.remove('is-loading');
} else {
  init();
}

function init() {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out', duration: 1 });

  /* ---------- Lenis smooth scroll ---------- */
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  /* ---------- Horgony-linkek ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      closeMenu();
      lenis.scrollTo(target, { offset: -20, duration: 1.4 });
    });
  });

  /* ---------- Preloader + hero bevezetés ---------- */
  document.documentElement.classList.add('is-loading');
  if (!location.hash) window.scrollTo(0, 0);
  const pre = $('.preloader');
  const counter = { v: 0 };
  const heroLines = $$('.hero-title .line-inner');

  gsap.set(heroLines, { yPercent: 115 });
  gsap.set(['.hero-eyebrow', '.hero-sub', '.hero-actions', '.hero-foot'], { autoAlpha: 0, y: 26 });
  gsap.set('.site-header', { autoAlpha: 0, y: -16 });

  let introDone = false;
  const finishIntro = () => {
    if (introDone) return;
    introDone = true;
    pre.remove();
    document.documentElement.classList.remove('is-loading');
    lenis.start();
    ScrollTrigger.refresh();
  };
  const intro = gsap.timeline({ onComplete: finishIntro });

  intro
    .from('.preloader-mark', { autoAlpha: 0, y: 24, duration: 0.7 })
    .to(counter, {
      v: 100,
      duration: 1.15,
      ease: 'power2.inOut',
      onUpdate() { $('.preloader-num').textContent = Math.round(counter.v); },
    }, '<')
    .to('.preloader-inner', { autoAlpha: 0, y: -20, duration: 0.45 }, '+=0.1')
    .to(pre, { yPercent: -100, duration: 0.85, ease: 'power4.inOut' }, '-=0.15')
    .to(heroLines, { yPercent: 0, duration: 1.15, ease: 'power4.out', stagger: 0.11 }, '-=0.4')
    .to('.hero-eyebrow', { autoAlpha: 1, y: 0, duration: 0.8 }, '-=0.85')
    .to('.hero-sub', { autoAlpha: 1, y: 0, duration: 0.8 }, '-=0.65')
    .to('.hero-actions', { autoAlpha: 1, y: 0, duration: 0.8 }, '-=0.6')
    .to('.hero-foot', { autoAlpha: 1, y: 0, duration: 0.8 }, '-=0.55')
    .to('.site-header', { autoAlpha: 1, y: 0, duration: 0.8 }, '-=0.7');

  // Háttérfülben megnyitott lapnál a rAF szünetel — ne ragadjon be a preloader
  if (document.hidden) intro.progress(1);
  setTimeout(() => { if (!introDone) intro.progress(1); }, 6000);

  /* ---------- Fejléc állapot ---------- */
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) { $('.site-header').classList.toggle('is-scrolled', self.scroll() > 60); },
  });

  /* ---------- Hero: scroll-parallaxe + köd elhalványítás ---------- */
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate(self) { scene.setProgress(self.progress); },
  });
  gsap.to('.hero-content', {
    yPercent: -18,
    autoAlpha: 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true },
  });

  if (finePointer) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      scene.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    }, { passive: true });
  }

  /* ---------- Manifesto: szavankénti scrub-kiemelés ---------- */
  $$('[data-scrub-words]').forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.13 }, {
      opacity: 1,
      stagger: 0.04,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: 0.6 },
    });
  });

  /* ---------- Számlálók ---------- */
  $$('[data-count]').forEach((el) => {
    const target = +el.dataset.count;
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter() {
        gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate() { el.textContent = Math.round(obj.v); },
        });
      },
    });
  });

  /* ---------- Általános reveal animációk ---------- */
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: 44,
      duration: 1.1,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });
  $$('[data-reveal-children]').forEach((group) => {
    gsap.from(group.children, {
      autoAlpha: 0,
      y: 44,
      duration: 1.1,
      stagger: 0.12,
      scrollTrigger: { trigger: group, start: 'top 84%', once: true },
    });
  });

  /* ---------- Az utazás: pinelt horizontális görgetés (csak desktop) ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('.journey-track');
    const getDist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const horiz = gsap.to(track, {
      x: () => -getDist(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.journey',
        start: 'top top',
        end: () => '+=' + (getDist() + window.innerHeight * 0.2),
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          gsap.set('.journey-progress span', { scaleX: self.progress });
        },
      },
    });
    return () => horiz.scrollTrigger && horiz.scrollTrigger.kill();
  });

  /* ---------- Marquee ---------- */
  const mTrack = $('.marquee-track');
  if (mTrack) {
    gsap.to(mTrack, { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
  }

  /* ---------- Mágneses gombok ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.22);
        yTo((e.clientY - r.top - r.height / 2) * 0.32);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Egyedi kurzor ---------- */
  if (finePointer) {
    const cursor = $('.cursor');
    gsap.set(cursor, { autoAlpha: 0 });
    const dotX = gsap.quickTo('.cursor-dot', 'x', { duration: 0.12, ease: 'power2' });
    const dotY = gsap.quickTo('.cursor-dot', 'y', { duration: 0.12, ease: 'power2' });
    const ringX = gsap.quickTo('.cursor-ring', 'x', { duration: 0.45, ease: 'power3' });
    const ringY = gsap.quickTo('.cursor-ring', 'y', { duration: 0.45, ease: 'power3' });
    let cursorShown = false;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!cursorShown) {
        cursorShown = true;
        document.body.classList.add('has-cursor');
        gsap.set(['.cursor-dot', '.cursor-ring'], { x: e.clientX, y: e.clientY });
        gsap.to(cursor, { autoAlpha: 1, duration: 0.3 });
      }
      dotX(e.clientX); dotY(e.clientY);
      ringX(e.clientX); ringY(e.clientY);
    }, { passive: true });
    document.addEventListener('mouseover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button'));
    });
  }

  /* ---------- Mobil menü ---------- */
  const toggle = $('.menu-toggle');
  const overlay = $('.menu-overlay');
  const menuTl = gsap.timeline({ paused: true })
    .set(overlay, { visibility: 'visible' })
    .fromTo(overlay, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.65, ease: 'power4.inOut' })
    .from(['.menu-nav a', '.menu-meta'], { y: 34, autoAlpha: 0, stagger: 0.06, duration: 0.55 }, '-=0.2');

  let menuOpen = false;
  function openMenu() {
    menuOpen = true;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Menü bezárása');
    lenis.stop();
    menuTl.timeScale(1).play();
  }
  window.closeMenu = closeMenu;
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menü megnyitása');
    lenis.start();
    menuTl.timeScale(1.6).reverse();
  }
  toggle.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Betűtípusok után frissítés ---------- */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* Szavakra bontás a scrub-kiemeléshez */
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  const frag = document.createDocumentFragment();
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    frag.appendChild(s);
    if (i < words.length - 1) frag.appendChild(document.createTextNode(' '));
  });
  el.appendChild(frag);
  return $$('.w', el);
}
