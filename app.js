/* ============================================================
   EIDE "Fladio Álvarez Galán" — app.js  v5 (PWA Ready)
   Carga logo, banner, textos, galería, videos, secciones desde localStorage
   + Soporte para PWA y detección de conexión
   ============================================================ */
'use strict';

const qs  = (s, ctx = document) => ctx.querySelector(s);
const qsa = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const on  = (el, ev, fn) => el && el.addEventListener(ev, fn);

/* ────────────────────────────────────────────
   0. Detección de conexión y mensaje offline
   ──────────────────────────────────────────── */
function initConnectionStatus() {
  // Mostrar notificación si el usuario está offline al cargar
  if (!navigator.onLine) {
    showToast('📡 Sin conexión a internet. Algunas imágenes podrían no cargarse.', 5000);
  }
  
  // Escuchar cambios de conexión
  window.addEventListener('online', () => {
    showToast('✅ Conexión restablecida', 3000);
    // Recargar contenido que podría haber fallado
    location.reload();
  });
  
  window.addEventListener('offline', () => {
    showToast('📡 Sin conexión. Modo offline activado', 4000);
  });
}

/* ────────────────────────────────────────────
   1. Aplicar visibilidad de secciones (ocultar/mostrar)
   ──────────────────────────────────────────── */
function applySectionVisibility() {
  try {
    const secData = JSON.parse(localStorage.getItem('eide_sections') || '{}');
    Object.entries(secData).forEach(([id, visible]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('section-hidden', !visible);
    });
  } catch(e) {}
}

/* ────────────────────────────────────────────
   2. Aplicar logo y banner personalizados
   ──────────────────────────────────────────── */
function applyBranding(cfg) {
  // Logo
  const logoShield = document.querySelector('.logo-shield');
  if (logoShield) {
    if (cfg.logoImg && cfg.logoImg.trim()) {
      logoShield.innerHTML = `<img src="${cfg.logoImg}" alt="Logo EIDE" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else if (logoShield.innerHTML.includes('<img')) {
      logoShield.innerHTML = 'E'; // restaura el texto original
    }
  }

  // Banner de fondo en #inicio
  const hero = document.querySelector('#inicio');
  if (hero) {
    if (cfg.bannerImg && cfg.bannerImg.trim()) {
      hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url("${cfg.bannerImg}")`;
      hero.style.backgroundSize = 'cover';
      hero.style.backgroundPosition = 'center';
      hero.style.backgroundRepeat = 'no-repeat';
      hero.style.backgroundBlendMode = 'normal';
    } else {
      // Restaura el estilo original
      hero.style.backgroundImage = '';
      hero.style.backgroundSize = '';
      hero.style.backgroundPosition = '';
      hero.style.backgroundRepeat = '';
    }
  }
}

/* ────────────────────────────────────────────
   3. Cargar todo el contenido del admin
   ──────────────────────────────────────────── */
function loadAdminContent() {
  applySectionVisibility();

  // Configuración global (incluye logo y banner)
  try {
    const cfg = JSON.parse(localStorage.getItem('eide_config') || '{}');
    applyBranding(cfg);
    if (cfg.lema)      qsa('[data-editable="lema"]').forEach(el => { el.textContent = cfg.lema; });
    if (cfg.email)     qsa('[data-editable="contacto_email"]').forEach(el => { el.textContent = cfg.email; });
    if (cfg.direccion) qsa('[data-editable="contacto_direccion"]').forEach(el => { el.textContent = cfg.direccion; });
  } catch(e) {}

  // Textos editables
  try {
    const content = JSON.parse(localStorage.getItem('eide_content') || '{}');
    Object.entries(content).forEach(([key, val]) => {
      qsa(`[data-editable="${key}"]`).forEach(el => {
        if (val && val.trim()) el.innerHTML = val;
      });
    });
  } catch(e) {}

  // Imágenes individuales
  try {
    const imgs = JSON.parse(localStorage.getItem('eide_images') || '{}');
    Object.entries(imgs).forEach(([key, src]) => {
      qsa(`[data-imgkey="${key}"]`).forEach(el => {
        if (el.tagName === 'IMG') {
          el.src = src;
        } else {
          el.style.background = 'none';
          el.style.padding    = '0';
          el.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block" alt="${key}">`;
        }
      });
    });
  } catch(e) {}

  // Galería slider
  try {
    const gallery = JSON.parse(localStorage.getItem('eide_gallery') || '[]');
    if (gallery.length > 0) buildSliderFromGallery(gallery);
  } catch(e) {}

  // Videos
  try {
    const videos = JSON.parse(localStorage.getItem('eide_videos') || '[]');
    if (videos.length > 0) prependVideosToGrid(videos);
  } catch(e) {}

  // Noticias dinámicas
  try {
    const news = JSON.parse(localStorage.getItem('eide_news') || '[]');
    if (news.length > 0) renderDynamicNews(news);
  } catch(e) {}

  // Directores extra
  try {
    const dirs = JSON.parse(localStorage.getItem('eide_directors') || '[]');
    renderExtraDirectors(dirs);
  } catch(e) {}

  // Atletas extra
  try {
    const atls = JSON.parse(localStorage.getItem('eide_athletes') || '[]');
    renderExtraAthletes(atls);
  } catch(e) {}
}

/* ─── Funciones auxiliares (slider, videos, noticias, directores, atletas) ─── */
function buildSliderFromGallery(gallery) {
  const container = qs('#galeria-slider');
  if (!container) return;
  const track = qs('.slider-track', container);
  if (!track) return;
  track.innerHTML = gallery.map(item => `
    <div class="slide">
      <img src="${item.src}" alt="${item.titulo || ''}" style="width:100%;height:100%;object-fit:cover">
      <div class="slide-caption">${item.titulo || ''}${item.caption ? ' — ' + item.caption : ''}</div>
    </div>
  `).join('');
  if (window._sliderRebuild) window._sliderRebuild();
}

function prependVideosToGrid(videos) {
  const container = qs('#videos-container');
  if (!container) return;
  const html = videos.map(v => {
    const isYT = v.url && (v.url.includes('youtube') || v.url.includes('youtu.be'));
    const thumb = v.thumbSrc
      ? `<img src="${v.thumbSrc}" style="width:100%;height:100%;object-fit:cover" alt="${v.titulo}">`
      : isYT
        ? `<img src="https://img.youtube.com/vi/${extractYTId(v.url)}/hqdefault.jpg" style="width:100%;height:100%;object-fit:cover">`
        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#222;color:rgba(255,255,255,.4);font-size:2.5rem">🎬</div>`;
    return `
      <div class="video-thumb" data-title="${v.titulo}" data-src="${v.url || ''}" data-desc="${v.desc || ''}">
        <div class="vt-poster" style="background:#111;position:relative;overflow:hidden">
          ${thumb}
          <div class="vt-play" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">▶</div>
        </div>
        <div class="vt-info"><h4>${escapeHtml(v.titulo)}</h4><span>${escapeHtml(v.desc || '')}</span></div>
      </div>`;
  }).join('');
  container.insertAdjacentHTML('afterbegin', html);
  bindLightboxThumbs();
}

function extractYTId(url) {
  const m = url.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : '';
}

function renderDynamicNews(news) {
  const container = qs('#noticias-dinamicas');
  if (!container) return;
  const COLORES = { 'Deportes':'linear-gradient(135deg,#0057A8,#009F3D)','Reconocimientos':'linear-gradient(135deg,#DF0024,#8b0000)','Académico':'linear-gradient(135deg,#004400,#009F3D)','Eventos':'linear-gradient(135deg,#003f6b,#0085C7)','Noticias':'linear-gradient(135deg,#F7C300,#0057A8)' };
  const BADGES = { 'Deportes':'badge-verde','Reconocimientos':'badge-rojo','Académico':'badge-verde','Eventos':'badge-azul','Noticias':'badge-azul' };
  container.innerHTML = news.slice(0,6).map(n => `
    <div class="noticia-card">
      ${n.imgSrc ? `<img src="${n.imgSrc}" class="nc-img" style="object-fit:cover;width:100%;height:185px">` : `<div class="nc-img" style="background:${COLORES[n.categoria]||COLORES.Noticias};display:flex;align-items:center;justify-content:center;font-size:3rem;color:rgba(255,255,255,.7)">📰</div>`}
      <div class="nc-body">
        <span class="badge ${BADGES[n.categoria]||'badge-azul'}">${escapeHtml(n.categoria)||'Noticias'}</span>
        <div class="nc-fecha">📅 ${n.fecha||''}</div>
        <h4>${escapeHtml(n.titulo||'')}</h4>
        <p>${escapeHtml(n.resumen||'')}</p>
      </div>
    </div>`).join('');
}

function renderExtraDirectors(dirs) {
  const cont = qs('#directores-adicionales');
  if (!cont || dirs.length===0) return;
  cont.innerHTML = `<h4 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;margin-bottom:1rem;color:var(--azul)">Directores registrados desde el panel admin</h4>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem">
    ${dirs.map(d => `<div class="ficha-card"><h3>${escapeHtml(d.periodo||'?')} · ${escapeHtml(d.nombre)}</h3><p>${d.nacimiento?'<strong>Nacimiento:</strong> '+escapeHtml(d.nacimiento)+'<br>':''}${d.cargo?'<strong>Cargo:</strong> '+escapeHtml(d.cargo)+'<br>':''}${escapeHtml(d.bio||'')}</p></div>`).join('')}
    </div>`;
}

function renderExtraAthletes(atls) {
  const cont = qs('#atletas-adicionales');
  if (!cont || atls.length===0) return;
  cont.innerHTML = `<h4 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;margin-bottom:1rem;color:var(--azul)">Atletas registrados desde el panel admin</h4>
    <div class="atletas-grid">${atls.map(a => `<div class="atleta-card"><div class="atleta-foto">🏅</div><div class="atleta-body"><h4>${escapeHtml(a.nombre)}</h4><div class="deporte">${escapeHtml(a.deporte||'')}</div><p class="logros">${escapeHtml(a.logros||'')}</p><div class="medallas"><span class="medalla m-oro">${escapeHtml(a.categoria)}</span>${a.anos?'<span class="medalla m-plata">'+escapeHtml(a.anos)+'</span>':''}</div></div></div>`).join('')}</div>`;
}

/* ─── Slider, tabs, lightbox, nav, search, toast ─── */
function initSlider(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const track = container.querySelector('.slider-track');
  const dotsWrap = document.getElementById('galeria-slider-dots');
  const prevBtn = container.querySelector('.slider-btn.prev');
  const nextBtn = container.querySelector('.slider-btn.next');
  let current = 0, timer;

  function getSlides() { return container.querySelectorAll('.slide'); }
  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    getSlides().forEach((_,i) => {
      const d = document.createElement('button');
      d.className = 'dot' + (i===0?' active':'');
      d.setAttribute('aria-label', `Diapositiva ${i+1}`);
      d.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(d);
    });
  }
  function goTo(n) {
    const slides = getSlides();
    if (!slides.length) return;
    current = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${current*100}%)`;
    if (dotsWrap) dotsWrap.querySelectorAll('.dot').forEach((d,i) => d.classList.toggle('active', i===current));
    resetTimer();
  }
  function resetTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => goTo(current+1), 5500);
  }
  buildDots();
  if (prevBtn) prevBtn.addEventListener('click', () => goTo(current-1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(current+1));
  resetTimer();
  window._sliderRebuild = () => { buildDots(); goTo(0); };
}

function initTabs() {
  document.querySelectorAll('.tabs').forEach(tabsEl => {
    const group = tabsEl.dataset.group;
    const contents = document.querySelectorAll(`.tab-content[data-group="${group}"]`);
    tabsEl.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        contents.forEach(c => c.classList.toggle('active', c.dataset.tab === btn.dataset.tab));
      });
    });
    tabsEl.querySelector('.tab-btn')?.click();
  });
}

function bindLightboxThumbs() {
  const lb = document.getElementById('lightbox');
  const lbBody = document.getElementById('lb-body');
  if (!lb || !lbBody) return;
  document.querySelectorAll('.video-thumb').forEach(thumb => {
    if (thumb._lbBound) return;
    thumb._lbBound = true;
    thumb.addEventListener('click', () => {
      let src = thumb.dataset.src || '';
      if (src.includes('watch?v=')) src = src.replace('watch?v=', 'embed/');
      if (src.includes('youtu.be/')) src = src.replace('youtu.be/', 'www.youtube.com/embed/');
      lbBody.innerHTML = src ? `<iframe src="${src}" allowfullscreen style="width:100%;aspect-ratio:16/9;border:none;border-radius:8px"></iframe>` : `<div style="color:rgba(255,255,255,.45);text-align:center;padding:3rem"><div style="font-size:3rem;margin-bottom:1rem">🎬</div><p><strong>${escapeHtml(thumb.dataset.title)}</strong></p><p style="margin-top:.5rem;font-size:.83rem">Agrega URL desde el admin</p></div>`;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });
}

function initLightbox() {
  const lb = document.getElementById('lightbox');
  const lbClose = document.getElementById('lb-close');
  const lbBody = document.getElementById('lb-body');
  if (!lb) return;
  const close = () => { lb.classList.remove('open'); if(lbBody) lbBody.innerHTML = ''; document.body.style.overflow = ''; };
  lbClose?.addEventListener('click', close);
  lb.addEventListener('click', e => { if(e.target === lb) close(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });
  bindLightboxThumbs();
}

function initNav() {
  const btn = document.querySelector('.hamburger');
  const menu = document.querySelector('.nav-menu');
  if(!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? '✕' : '☰';
  });
  document.querySelectorAll('.nav-menu a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open');
    btn.textContent = '☰';
  }));
}

function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]:not(.section-hidden)');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting)
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+e.target.id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => io.observe(s));
}

function initSearch() {
  const input = document.getElementById('search-input');
  if(!input) return;
  input.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const q = input.value.toLowerCase().trim();
    if(!q) return;
    let found = null;
    document.querySelectorAll('section[id]:not(.section-hidden)').forEach(s => {
      if(!found && s.textContent.toLowerCase().includes(q)) found = s;
    });
    if(found) {
      found.scrollIntoView({ behavior:'smooth', block:'start' });
      showToast(`🔍 Encontrado en: ${found.id}`);
    } else showToast('Sin resultados para: ' + q);
  });
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if(!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const msg = form.querySelector('.success-msg');
    if(msg) msg.style.display = 'block';
    showToast('✅ ¡Gracias por tu aporte!');
    form.reset();
  });
}

function showToast(txt, dur=3500) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = txt;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));
}

/* ──────────────────────────────────────────────────────
   CRONOLOGÍA INTERACTIVA
   ────────────────────────────────────────────────────── */
function initTimeline() {
  const timeline = document.getElementById('cr-timeline');
  if (!timeline) return;

  /* Expansión al hacer clic en tarjeta */
  timeline.querySelectorAll('.cr-card').forEach(card => {
    card.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');
      // Cierra todas
      timeline.querySelectorAll('.cr-card.open').forEach(c => c.classList.remove('open'));
      // Abre esta si no estaba abierta
      if (!isOpen) card.classList.add('open');
    });
  });

  /* Filtros por década */
  document.querySelectorAll('.cr-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cr-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      timeline.querySelectorAll('.cr-entry').forEach(entry => {
        if (filter === 'all') {
          entry.classList.remove('hidden-filter');
        } else {
          const decade = parseInt(entry.dataset.decade, 10);
          const filterYear = parseInt(filter, 10);
          const show = decade >= filterYear && decade < filterYear + 10;
          entry.classList.toggle('hidden-filter', !show);
        }
      });
      // Re-trigger animations on visible entries
      triggerTimelineAnimations();
    });
  });

  /* Animación scroll con IntersectionObserver */
  function triggerTimelineAnimations() {
    const io = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px' });

    timeline.querySelectorAll('.cr-entry:not(.hidden-filter)').forEach(el => {
      el.classList.remove('visible');
      io.observe(el);
    });
  }

  triggerTimelineAnimations();
}

/* ──────────────────────────────────────────────────────
   INIT — Punto de entrada principal
   ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar detección de conexión
  initConnectionStatus();
  
  // Cargar todo el contenido del admin
  loadAdminContent();
  
  // Inicializar componentes UI
  initNav();
  initScrollSpy();
  initSlider('galeria-slider');
  initTabs();
  initLightbox();
  initContactForm();
  initSearch();
  initTimeline();
});