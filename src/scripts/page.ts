import { track } from '../simulator/analytics';

/** Comportamentos gerais da página: header, menu móvel, entradas, CTAs e vídeo. */
export function initPage() {
  initHeader();
  initMobileMenu();
  initReveal();
  initTracking();
  initVideo();
  initFloatingWhatsApp();
}

function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;height:8px;width:1px;';
  document.body.prepend(sentinel);
  new IntersectionObserver(([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting)).observe(sentinel);

  // Destaca o link da seção visível.
  const links = [...header.querySelectorAll<HTMLAnchorElement>('.nav-desktop a[href^="#"]')];
  const sections = links.map((a) => document.querySelector<HTMLElement>(a.hash)).filter((s): s is HTMLElement => !!s);
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        for (const a of links) {
          const active = a.hash === `#${e.target.id}`;
          a.classList.toggle('is-active', active);
          if (active) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => spy.observe(s));
}

function initMobileMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.getElementById('menu-movel');
  if (!toggle || !menu) return;

  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.hidden = !open;
    document.documentElement.classList.toggle('menu-open', open);
    if (open) menu.querySelector<HTMLElement>('a, button')?.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  matchMedia('(min-width: 1100px)').addEventListener('change', (e) => e.matches && setOpen(false));
}

function initReveal() {
  const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  items.forEach((el) => io.observe(el));
}

function initTracking() {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-track]');
    if (!el) return;
    track(el.dataset.track!, { location: el.dataset.trackLocation });
  });
}

/** Vídeo do YouTube carregado só após o clique (privacidade e desempenho). */
function initVideo() {
  document.querySelectorAll<HTMLButtonElement>('[data-video-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.videoId}?autoplay=1&rel=0`;
      iframe.title = btn.dataset.videoTitle ?? 'Vídeo';
      iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.className = 'video-frame';
      btn.replaceWith(iframe);
      track('video_play', { video: btn.dataset.videoId });
    });
  });
}

/** Botão flutuante de WhatsApp: some enquanto o simulador está na tela. */
function initFloatingWhatsApp() {
  const fab = document.querySelector<HTMLElement>('[data-wa-fab]');
  const sim = document.getElementById('simulador');
  const hero = document.getElementById('inicio');
  if (!fab || !sim || !hero) return;
  let simVisible = false;
  let heroVisible = true;
  const update = () => fab.classList.toggle('is-visible', !simVisible && !heroVisible);
  new IntersectionObserver(([e]) => ((simVisible = e.isIntersecting), update()), { rootMargin: '0px 0px -10% 0px' }).observe(sim);
  new IntersectionObserver(([e]) => ((heroVisible = e.isIntersecting), update())).observe(hero);
}
