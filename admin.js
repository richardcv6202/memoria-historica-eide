/* ============================================================
   EIDE Admin Panel — admin.js  v6
   Usuario: admin | Contraseña: admin26
   + Sistema de almacenamiento en carpeta "resource/" (IndexedDB)
   ============================================================ */
'use strict';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin26';
const KEY_AUTH   = 'eide_admin_auth';

// Claves localStorage (textos y listas)
const KEY_CONTENT   = 'eide_content';
const KEY_IMAGES    = 'eide_images';
const KEY_GALLERY   = 'eide_gallery';
const KEY_VIDEOS    = 'eide_videos';
const KEY_NEWS      = 'eide_news';
const KEY_DIRECTORS = 'eide_directors';
const KEY_ATHLETES  = 'eide_athletes';
const KEY_CONFIG    = 'eide_config';
const KEY_SECTIONS  = 'eide_sections';

const qs  = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const on  = (el, ev, fn) => el && el.addEventListener(ev, fn);

function load(key, def) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); }
  catch { return def; }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function toast(msg, err = false) {
  const t = qs('#adm-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderLeftColor = err ? '#DF0024' : '#0085C7';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function checkAuth() { return localStorage.getItem(KEY_AUTH) === '1'; }
function doLogin(u, p) {
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    localStorage.setItem(KEY_AUTH, '1');
    return true;
  }
  return false;
}
function doLogout() { localStorage.removeItem(KEY_AUTH); location.reload(); }

/* ============================================================
   SISTEMA DE RECURSOS — IndexedDB
   Carpeta virtual: resource/images/  y  resource/videos/
   ============================================================ */
const RES_DB    = 'eide_resources_db';
const RES_VER   = 1;
const RES_STORE = 'files';

function openResourceDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RES_DB, RES_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(RES_STORE)) {
        const store = db.createObjectStore(RES_STORE, { keyPath: 'path' });
        store.createIndex('folder', 'folder', { unique: false });
      }
    };
    req.onsuccess  = e => resolve(e.target.result);
    req.onerror    = () => reject(req.error);
  });
}

/**
 * Guarda un archivo en la carpeta resource/<folder>/<filename>
 * Retorna el path guardado.
 */
async function saveToResource(folder, dataUrl, originalName, mimeType, size) {
  const ts  = Date.now();
  const ext = originalName.split('.').pop() || (mimeType.split('/')[1] || 'bin');
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const filename  = `${ts}_${safeName}`;
  const path      = `resource/${folder}/${filename}`;
  const db = await openResourceDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RES_STORE, 'readwrite');
    tx.objectStore(RES_STORE).put({
      path, folder, name: filename,
      originalName, mimeType, size,
      data: dataUrl,
      created: ts
    });
    tx.oncomplete = () => resolve({ path, filename, dataUrl });
    tx.onerror    = () => reject(tx.error);
  });
}

/** Lista todos los archivos de una carpeta */
async function listResources(folder) {
  const db = await openResourceDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(RES_STORE, 'readonly');
    const idx = tx.objectStore(RES_STORE).index('folder');
    const req = idx.getAll(folder);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** Elimina un archivo por su path */
async function deleteResource(path) {
  const db = await openResourceDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RES_STORE, 'readwrite');
    tx.objectStore(RES_STORE).delete(path);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Formatea bytes */
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

/* ============================================================
   PANTALLA LOGIN
   ============================================================ */
function renderLogin() {
  document.body.innerHTML = `
  <div id="login-screen">
    <div class="login-glow"></div>
    <div class="login-box">
      <div class="login-logo">
        <div class="shield">⚽</div>
        <h2>EIDE "Fladio Álvarez Galán"</h2>
        <p>Panel de Administración</p>
      </div>
      <div class="form-group"><label>Usuario</label><input type="text" id="l-user" placeholder="admin" autocomplete="username"></div>
      <div class="form-group"><label>Contraseña</label><input type="password" id="l-pass" autocomplete="current-password"></div>
      <p class="login-err" id="l-err">Usuario o contraseña incorrectos</p>
      <button class="btn-login" id="l-btn">Entrar →</button>
    </div>
  </div>`;
  const attempt = () => {
    if (doLogin(qs('#l-user').value.trim(), qs('#l-pass').value)) location.reload();
    else { qs('#l-err').style.display = 'block'; qs('#l-pass').value = ''; }
  };
  on(qs('#l-btn'),  'click',   attempt);
  on(qs('#l-pass'), 'keydown', e => { if (e.key === 'Enter') attempt(); });
}

/* ============================================================
   SHELL PRINCIPAL
   ============================================================ */
function renderShell() {
  document.body.innerHTML = `
  <div id="adm-toast"></div>
  <div class="adm-top">
    <div style="display:flex;align-items:center">
      <button class="menu-toggle" id="menu-toggle">☰</button>
      <div class="adm-brand">
        <div class="adm-brand-icon">🏅</div>
        <h1>Panel Admin · <span class="accent">EIDE</span></h1>
      </div>
    </div>
    <div class="top-right">
      <div class="adm-avatar">A</div>
      <span>admin</span>
      <a href="../index.html" target="_blank">🌐 Ver sitio</a>
      <a href="#" id="logout-btn">🚪 Salir</a>
    </div>
  </div>
  <div class="adm-layout">
    <aside class="adm-sidebar" id="sidebar">
      <nav>
        <div class="sidebar-section">Principal</div>
        <a href="#" class="nav-link" data-panel="dashboard">📊 Dashboard</a>
        <a href="#" class="nav-link" data-panel="noticias">📰 Noticias / Eventos</a>
        <div class="sidebar-section">Contenido</div>
        <a href="#" class="nav-link" data-panel="textos">📝 Editar Textos</a>
        <a href="#" class="nav-link" data-panel="directores">👤 Directores</a>
        <a href="#" class="nav-link" data-panel="atletas">🏅 Atletas</a>
        <a href="#" class="nav-link" data-panel="secciones">👁️ Mostrar/Ocultar</a>
        <a href="#" class="nav-link" data-panel="branding">🎨 Logo & Banner</a>
        <div class="sidebar-section">Multimedia</div>
        <a href="#" class="nav-link" data-panel="recursos">📁 Resource Manager</a>
        <a href="#" class="nav-link" data-panel="galeria">🖼️ Galería (Slider)</a>
        <a href="#" class="nav-link" data-panel="videos">🎬 Videos</a>
        <a href="#" class="nav-link" data-panel="imagenes">📷 Imágenes</a>
        <div class="sidebar-section">Sistema</div>
        <a href="#" class="nav-link" data-panel="config">⚙️ Configuración</a>
        <a href="#" class="nav-link" data-panel="backup">💾 Respaldo</a>
      </nav>
    </aside>
    <main class="adm-main" id="adm-main"></main>
  </div>`;

  const menuToggle = qs('#menu-toggle');
  const sidebar    = qs('#sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    qsa('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
      });
    });
  }

  on(qs('#logout-btn'), 'click', e => { e.preventDefault(); doLogout(); });
  qsa('.nav-link').forEach(link => on(link, 'click', e => {
    e.preventDefault();
    qsa('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    showPanel(link.dataset.panel);
  }));
  showPanel('dashboard');
}

/* ============================================================
   ROUTER
   ============================================================ */
const PANELS = {
  dashboard, noticias, textos, directores, atletas, secciones,
  branding, recursos, galeria, videos, imagenes, config, backup
};
function showPanel(name) {
  const main = qs('#adm-main');
  if (!main) return;
  main.innerHTML = '';
  if (PANELS[name]) PANELS[name](main);
  else main.innerHTML = '<div class="adm-panel active"><p>Panel no encontrado</p></div>';
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function dashboard(root) {
  const news  = load(KEY_NEWS,      []);
  const gal   = load(KEY_GALLERY,   []);
  const vids  = load(KEY_VIDEOS,    []);
  const dirs  = load(KEY_DIRECTORS, []);
  const atls  = load(KEY_ATHLETES,  []);
  root.innerHTML = `
  <div class="adm-panel active">
    <div class="panel-title">📊 Dashboard</div>
    <div class="stats-row">
      <div class="stat-card"><div class="num">${news.length}</div><div class="lbl">Noticias</div></div>
      <div class="stat-card verde"><div class="num">${gal.length}</div><div class="lbl">Imágenes galería</div></div>
      <div class="stat-card amarillo"><div class="num">${vids.length}</div><div class="lbl">Videos</div></div>
      <div class="stat-card rojo"><div class="num">${dirs.length + atls.length}</div><div class="lbl">Directores + Atletas</div></div>
    </div>
    <div class="info-banner gold">
      💡 Los archivos multimedia se almacenan automáticamente en la carpeta <strong>resource/images/</strong> y <strong>resource/videos/</strong>.
      Puedes gestionarlos desde el panel <strong>📁 Resource Manager</strong>.
    </div>
    <div class="info-banner">
      ℹ️ Usa los paneles laterales para personalizar logo, banner, textos y secciones visibles.
    </div>
  </div>`;
}

/* ============================================================
   NOTICIAS
   ============================================================ */
function noticias(root) {
  let news = load(KEY_NEWS, []);
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">📰 Noticias / Eventos</div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;margin-bottom:1.5rem">
        <div style="font-weight:700;color:var(--text-secondary);margin-bottom:.8rem">➕ Nueva noticia</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">
          <div class="form-group"><label>Título *</label><input type="text" id="nf-titulo"></div>
          <div class="form-group"><label>Fecha</label><input type="date" id="nf-fecha"></div>
          <div class="form-group"><label>Categoría</label>
            <select id="nf-cat"><option>Noticias</option><option>Deportes</option><option>Eventos</option><option>Reconocimientos</option><option>Académico</option></select>
          </div>
          <div class="form-group"><label>Imagen (URL o archivo)</label>
            <div style="display:flex;gap:.4rem">
              <input type="text" id="nf-img-url" placeholder="https://... o sube imagen" style="flex:1">
              <label class="btn-save btn-sm" style="cursor:pointer;white-space:nowrap">📷 Subir<input type="file" id="nf-img-file" accept="image/*" style="display:none"></label>
            </div>
            <div id="nf-img-preview" style="margin-top:.4rem"></div>
          </div>
        </div>
        <div class="form-group"><label>Resumen</label><textarea id="nf-resumen" rows="3"></textarea></div>
        <button class="btn-save" id="save-news-btn">💾 Publicar noticia</button>
      </div>
      <div class="panel-title" style="margin-top:1rem">Publicadas (${news.length})</div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr><th>#</th><th>Título</th><th>Fecha</th><th>Categoría</th><th>Acción</th></tr></thead>
          <tbody id="news-tbody">
            ${news.map((n,i) => `<tr>
              <td style="color:var(--text-muted)">${i+1}</td>
              <td><strong>${escapeHtml(n.titulo)}</strong></td>
              <td style="color:var(--text-secondary)">${n.fecha||'—'}</td>
              <td><span class="badge badge-ok">${n.categoria}</span></td>
              <td><button class="btn-danger" onclick="delNews(${n.id})">🗑️</button></td>
            </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem">Sin noticias</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

    const fileInput = qs('#nf-img-file');
    on(fileInput, 'change', function() {
      const f = this.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = async e => {
        qs('#nf-img-url').value = e.target.result;
        qs('#nf-img-preview').innerHTML = `<img src="${e.target.result}" style="max-height:80px;border-radius:4px;margin-top:4px">`;
        try { await saveToResource('images', e.target.result, f.name, f.type, f.size); }
        catch(err) { console.warn('Resource save:', err); }
      };
      r.readAsDataURL(f);
    });

    on(qs('#save-news-btn'), 'click', () => {
      const titulo = qs('#nf-titulo').value.trim();
      if (!titulo) { toast('⚠️ El título es obligatorio', true); return; }
      news.unshift({
        id: Date.now(), titulo,
        fecha: qs('#nf-fecha').value,
        categoria: qs('#nf-cat').value,
        resumen: qs('#nf-resumen').value.trim(),
        imgSrc: qs('#nf-img-url').value || ''
      });
      save(KEY_NEWS, news);
      toast('✅ Noticia publicada');
      render();
    });
    window.delNews = id => {
      news = news.filter(n => n.id !== id);
      save(KEY_NEWS, news);
      toast('Noticia eliminada');
      render();
    };
  }
  render();
}

/* ============================================================
   TEXTOS EDITABLES
   ============================================================ */
const SECTIONS_LIST = [
  { key:'lema',            label:'🏠 Banner — Lema' },
  { key:'historia_intro',  label:'🏫 La Escuela — Historia' },
  { key:'mision',          label:'🏫 Misión' },
  { key:'vision',          label:'🏫 Visión' },
  { key:'objeto',          label:'🏫 Objeto Social' },
  { key:'rrhh_texto',      label:'🏫 Recursos Humanos' },
  { key:'matricula_texto', label:'🏫 Matrícula' },
  { key:'fladio_bio',      label:'⭐ El Mártir — Biografía' },
  { key:'fladio_legado',   label:'⭐ Legado' },
  { key:'contacto_direccion', label:'✉️ Dirección' },
  { key:'contacto_email',  label:'✉️ Correo' }
];
function textos(root) {
  let content = load(KEY_CONTENT, {});
  let currentKey = null;
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">📝 Editar Textos del Sitio</div>
      <div style="display:grid;grid-template-columns:230px 1fr;gap:1.2rem;align-items:start">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:.8rem">
          <div style="font-size:.65rem;font-weight:700;letter-spacing:1px;color:var(--text-muted);margin-bottom:.6rem;text-transform:uppercase;padding:0 .25rem">Secciones</div>
          ${SECTIONS_LIST.map(s => `<div class="section-list-item" data-key="${s.key}">${content[s.key]?'✏️ ':''} ${s.label}</div>`).join('')}
        </div>
        <div>
          <div class="form-group">
            <label id="edit-section-label" style="text-transform:none;font-size:.85rem;color:var(--text-primary);font-weight:600">Selecciona una sección</label>
            <textarea id="section-content" rows="14" style="font-family:monospace;font-size:.82rem;margin-top:.5rem"></textarea>
          </div>
          <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
            <button class="btn-save" id="save-section-btn">💾 Guardar cambios</button>
            <button class="btn-outline-sm" id="reset-section-btn">↩ Restaurar</button>
            <span id="section-saved-msg" style="color:#4ade80;font-size:.82rem;display:none">✅ Guardado</span>
          </div>
          <div id="section-preview-wrap" style="margin-top:1rem;display:none">
            <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:.5rem">Vista previa</div>
            <div id="section-preview-content" style="background:var(--bg-card);border:1px solid var(--border);padding:1rem;border-radius:var(--radius);font-size:.88rem;line-height:1.65;color:var(--text-secondary)"></div>
          </div>
        </div>
      </div>
    </div>`;

    qsa('.section-list-item').forEach(el => {
      on(el, 'click', () => {
        currentKey = el.dataset.key;
        qsa('.section-list-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        const val = content[currentKey] || '';
        qs('#section-content').value = val;
        qs('#edit-section-label').textContent = SECTIONS_LIST.find(s => s.key === currentKey)?.label || currentKey;
        updatePreview(val);
        qs('#section-saved-msg').style.display = 'none';
      });
    });

    const updatePreview = val => {
      const wrap = qs('#section-preview-wrap');
      const cont = qs('#section-preview-content');
      if (wrap && cont) {
        if (val) { wrap.style.display = 'block'; cont.innerHTML = val; }
        else       wrap.style.display = 'none';
      }
    };

    on(qs('#section-content'), 'input', () => updatePreview(qs('#section-content').value));
    on(qs('#save-section-btn'), 'click', () => {
      if (!currentKey) { toast('Selecciona una sección', true); return; }
      content[currentKey] = qs('#section-content').value;
      save(KEY_CONTENT, content);
      qs('#section-saved-msg').style.display = 'inline';
      toast('Texto guardado');
      render();
    });
    on(qs('#reset-section-btn'), 'click', () => {
      if (!currentKey) return;
      if (confirm('¿Restaurar texto original?')) {
        delete content[currentKey];
        save(KEY_CONTENT, content);
        qs('#section-content').value = '';
        updatePreview('');
        toast('Restaurado');
        render();
      }
    });
  }
  render();
}

/* ============================================================
   DIRECTORES
   ============================================================ */
function directores(root) {
  let dirs = load(KEY_DIRECTORS, []);
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">👤 Directores adicionales</div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;margin-bottom:1.5rem">
        <div style="font-weight:700;color:var(--text-secondary);margin-bottom:.8rem">➕ Agregar director</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">
          <input type="text" id="df-nombre" placeholder="Nombre completo *">
          <input type="text" id="df-periodo" placeholder="Período (ej. 2000-2005)">
          <input type="text" id="df-nac" placeholder="Lugar de nacimiento">
          <input type="text" id="df-cargo" placeholder="Cargo actual / final">
        </div>
        <textarea id="df-bio" rows="3" placeholder="Síntesis biográfica..." style="width:100%;margin-top:.8rem"></textarea>
        <button class="btn-save" id="save-dir-btn" style="margin-top:.8rem">💾 Guardar director</button>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr><th>Período</th><th>Nombre</th><th>Nacimiento</th><th>Acción</th></tr></thead>
          <tbody>
            ${dirs.map(d => `<tr>
              <td style="color:var(--text-muted)">${d.periodo||'—'}</td>
              <td><strong>${escapeHtml(d.nombre)}</strong></td>
              <td style="color:var(--text-secondary)">${d.nacimiento||'—'}</td>
              <td><button class="btn-danger" onclick="delDir(${d.id})">🗑️</button></td>
            </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:1.5rem">Sin directores agregados</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
    on(qs('#save-dir-btn'), 'click', () => {
      const nombre = qs('#df-nombre').value.trim();
      if (!nombre) { toast('Nombre obligatorio', true); return; }
      dirs.push({ id: Date.now(), nombre, periodo: qs('#df-periodo').value.trim(), nacimiento: qs('#df-nac').value.trim(), cargo: qs('#df-cargo').value.trim(), bio: qs('#df-bio').value.trim() });
      save(KEY_DIRECTORS, dirs);
      toast('Director guardado');
      render();
    });
    window.delDir = id => { dirs = dirs.filter(d => d.id !== id); save(KEY_DIRECTORS, dirs); toast('Eliminado'); render(); };
  }
  render();
}

/* ============================================================
   ATLETAS
   ============================================================ */
function atletas(root) {
  let atls = load(KEY_ATHLETES, []);
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">🏅 Atletas adicionales</div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;margin-bottom:1.5rem">
        <div style="font-weight:700;color:var(--text-secondary);margin-bottom:.8rem">➕ Agregar atleta</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">
          <input type="text" id="af-nombre" placeholder="Nombre completo *">
          <input type="text" id="af-deporte" placeholder="Deporte">
          <select id="af-cat"><option>Olímpico</option><option>Panamericano</option><option>Centroamericano</option><option>Mundial</option><option>Juvenil</option><option>Escolar</option></select>
          <input type="text" id="af-anos" placeholder="Años activo">
        </div>
        <textarea id="af-logros" rows="3" placeholder="Principales logros..." style="width:100%;margin-top:.8rem"></textarea>
        <button class="btn-save" id="save-atl-btn" style="margin-top:.8rem">💾 Guardar atleta</button>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr><th>Nombre</th><th>Deporte</th><th>Categoría</th><th>Acción</th></tr></thead>
          <tbody>
            ${atls.map(a => `<tr>
              <td><strong>${escapeHtml(a.nombre)}</strong></td>
              <td style="color:var(--text-secondary)">${a.deporte||'—'}</td>
              <td><span class="badge badge-ok">${a.categoria}</span></td>
              <td><button class="btn-danger" onclick="delAtl(${a.id})">🗑️</button></td>
            </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:1.5rem">Sin atletas agregados</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
    on(qs('#save-atl-btn'), 'click', () => {
      const nombre = qs('#af-nombre').value.trim();
      if (!nombre) { toast('Nombre obligatorio', true); return; }
      atls.push({ id: Date.now(), nombre, deporte: qs('#af-deporte').value.trim(), categoria: qs('#af-cat').value, anos: qs('#af-anos').value.trim(), logros: qs('#af-logros').value.trim() });
      save(KEY_ATHLETES, atls);
      toast('Atleta guardado');
      render();
    });
    window.delAtl = id => { atls = atls.filter(a => a.id !== id); save(KEY_ATHLETES, atls); toast('Eliminado'); render(); };
  }
  render();
}

/* ============================================================
   SECCIONES — Mostrar/Ocultar
   ============================================================ */
const SITE_SECTIONS = [
  { id:'inicio',             label:'🏠 Inicio / Hero Banner',    lock:true },
  { id:'la-escuela',         label:'🏫 La Escuela',              lock:false },
  { id:'el-martir',          label:'⭐ El Mártir',               lock:false },
  { id:'directores',         label:'👤 Directores',              lock:false },
  { id:'atletas',            label:'🏅 Atletas Destacados',       lock:false },
  { id:'alumnos-trabajadores',label:'🔄 Alumnos → Trabajadores', lock:false },
  { id:'internacionalistas', label:'🌍 Internacionalistas',       lock:false },
  { id:'resultados',         label:'📊 Resultados Deportivos',    lock:false },
  { id:'cronologia',         label:'📅 Cronología JENAR',         lock:false },
  { id:'galeria',            label:'🖼️ Galería Multimedia',       lock:false },
  { id:'actualidad',         label:'📰 Actualidad / Eventos',     lock:false },
  { id:'contacto',           label:'✉️ Contacto / Acerca de',     lock:false }
];
function secciones(root) {
  let secData = load(KEY_SECTIONS, {});
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">👁️ Visibilidad de Secciones</div>
      <div class="info-banner" style="margin-bottom:1.25rem">💡 Las secciones ocultas no se muestran en el sitio público.</div>
      <div id="sections-list">
        ${SITE_SECTIONS.map(sec => {
          const visible = secData[sec.id] !== false;
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.9rem 1rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:.4rem">
            <strong style="font-size:.88rem">${sec.label}</strong>
            ${sec.lock ? '<span style="color:var(--text-muted);font-size:.75rem">(siempre visible)</span>' : ''}
            <label class="toggle-switch"><input type="checkbox" ${visible?'checked':''} ${sec.lock?'disabled':''} onchange="toggleSection('${sec.id}', this.checked)"><span class="toggle-track"><span class="toggle-thumb"></span></span></label>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:1.25rem;display:flex;gap:.75rem;flex-wrap:wrap">
        <button class="btn-gold" onclick="showAllSections()">Mostrar todas</button>
        <button class="btn-outline-sm" onclick="hideAllOptional()">Ocultar opcionales</button>
      </div>
    </div>`;
  }
  window.toggleSection = (id, visible) => {
    secData = load(KEY_SECTIONS, {}); secData[id] = visible;
    save(KEY_SECTIONS, secData); toast(`Sección ${visible?'visible':'oculta'}`); render();
  };
  window.showAllSections = () => {
    secData = {}; SITE_SECTIONS.forEach(s => secData[s.id] = true);
    save(KEY_SECTIONS, secData); toast('✅ Todas visibles'); render();
  };
  window.hideAllOptional = () => {
    secData = load(KEY_SECTIONS, {}); SITE_SECTIONS.filter(s => !s.lock).forEach(s => secData[s.id] = false);
    save(KEY_SECTIONS, secData); toast('Opcionales ocultas'); render();
  };
  render();
}

/* ============================================================
   BRANDING — Logo y Banner
   ============================================================ */
function branding(root) {
  let cfg = load(KEY_CONFIG, {});
  let pendingLogo = null, pendingBanner = null;
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">🎨 Logo & Banner del Sitio</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem">
          <h3 style="font-size:.9rem;font-weight:700;margin-bottom:.8rem;color:var(--text-secondary)">🖼️ Logo (escudo)</h3>
          <div class="upload-area" id="logo-drop">
            <div class="up-icon">🏅</div>
            <p>Arrastra o haz clic para subir logo</p>
            <input type="file" id="logo-file" accept="image/*" style="display:none">
          </div>
          <div id="logo-preview" style="margin:.6rem 0">
            ${cfg.logoImg ? `<img src="${cfg.logoImg}" style="max-height:90px;border-radius:50%;border:2px solid var(--border)">` : '<p style="font-size:.8rem;color:var(--text-muted)">Logo actual: por defecto (E)</p>'}
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button class="btn-save" id="save-logo-btn">💾 Guardar logo</button>
            <button class="btn-outline-sm" id="clear-logo-btn">🗑️ Restaurar</button>
          </div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem">
          <h3 style="font-size:.9rem;font-weight:700;margin-bottom:.8rem;color:var(--text-secondary)">🌄 Banner de fondo (sección Inicio)</h3>
          <div class="upload-area" id="banner-drop">
            <div class="up-icon">📸</div>
            <p>Arrastra o haz clic para subir fondo</p>
            <input type="file" id="banner-file" accept="image/*" style="display:none">
          </div>
          <div id="banner-preview" style="margin:.6rem 0">
            ${cfg.bannerImg ? `<img src="${cfg.bannerImg}" style="max-height:90px;width:100%;object-fit:cover;border-radius:var(--radius-sm)">` : '<p style="font-size:.8rem;color:var(--text-muted)">Banner: gradiente por defecto</p>'}
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button class="btn-save" id="save-banner-btn">💾 Guardar banner</button>
            <button class="btn-outline-sm" id="clear-banner-btn">🗑️ Restaurar gradiente</button>
          </div>
        </div>
      </div>
      <p style="margin-top:1rem;font-size:.8rem;color:var(--text-muted)">⚠️ Los cambios se aplican al recargar el sitio. Las imágenes también se guardan en resource/images/.</p>
    </div>`;

    const handleFile = async (file, previewEl, setVar) => {
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) { toast('Máximo 3 MB', true); return; }
      const reader = new FileReader();
      reader.onload = async e => {
        setVar(e.target.result);
        previewEl.innerHTML = `<img src="${e.target.result}" style="max-height:90px;border-radius:8px;width:100%;object-fit:cover">`;
        try { await saveToResource('images', e.target.result, file.name, file.type, file.size); }
        catch(err) { console.warn('Resource save:', err); }
      };
      reader.readAsDataURL(file);
    };

    const logoDrop   = qs('#logo-drop'),   logoFile   = qs('#logo-file');
    const bannerDrop = qs('#banner-drop'), bannerFile = qs('#banner-file');
    const logoPreview   = qs('#logo-preview');
    const bannerPreview = qs('#banner-preview');

    logoDrop.addEventListener('click',     () => logoFile.click());
    logoDrop.addEventListener('dragover',  e => { e.preventDefault(); logoDrop.classList.add('drag'); });
    logoDrop.addEventListener('dragleave', () => logoDrop.classList.remove('drag'));
    logoDrop.addEventListener('drop',      e => { e.preventDefault(); logoDrop.classList.remove('drag'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], logoPreview, v => pendingLogo = v); });
    logoFile.addEventListener('change',    () => { if (logoFile.files[0]) handleFile(logoFile.files[0], logoPreview, v => pendingLogo = v); });

    bannerDrop.addEventListener('click',     () => bannerFile.click());
    bannerDrop.addEventListener('dragover',  e => { e.preventDefault(); bannerDrop.classList.add('drag'); });
    bannerDrop.addEventListener('dragleave', () => bannerDrop.classList.remove('drag'));
    bannerDrop.addEventListener('drop',      e => { e.preventDefault(); bannerDrop.classList.remove('drag'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], bannerPreview, v => pendingBanner = v); });
    bannerFile.addEventListener('change',    () => { if (bannerFile.files[0]) handleFile(bannerFile.files[0], bannerPreview, v => pendingBanner = v); });

    on(qs('#save-logo-btn'),   'click', () => { if (pendingLogo)   { cfg.logoImg   = pendingLogo;   save(KEY_CONFIG, cfg); toast('Logo guardado');   pendingLogo   = null; render(); } else toast('Selecciona una imagen primero', true); });
    on(qs('#clear-logo-btn'),  'click', () => { delete cfg.logoImg;   save(KEY_CONFIG, cfg); toast('Logo restaurado');   render(); });
    on(qs('#save-banner-btn'), 'click', () => { if (pendingBanner) { cfg.bannerImg = pendingBanner; save(KEY_CONFIG, cfg); toast('Banner guardado'); pendingBanner = null; render(); } else toast('Selecciona una imagen primero', true); });
    on(qs('#clear-banner-btn'),'click', () => { delete cfg.bannerImg; save(KEY_CONFIG, cfg); toast('Banner restaurado'); render(); });
  }
  render();
}

/* ============================================================
   RESOURCE MANAGER — Carpeta resource/
   ============================================================ */
function recursos(root) {
  let activeFolder = 'images';

  async function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">📁 Resource Manager <small>· resource/images/ y resource/videos/</small></div>
      <div class="info-banner green" style="margin-bottom:1rem">
        ✅ Todos los archivos subidos desde Galería, Videos, Noticias y Branding se almacenan automáticamente aquí.
      </div>
      <div class="resource-tabs">
        <div class="folder-tab ${activeFolder==='images'?'active':''}" onclick="switchResFolder('images')">🖼️ resource/images/</div>
        <div class="folder-tab ${activeFolder==='videos'?'active':''}" onclick="switchResFolder('videos')">🎬 resource/videos/</div>
      </div>
      <div id="res-content">
        <div style="text-align:center;padding:2rem;color:var(--text-muted)">Cargando...</div>
      </div>
    </div>`;

    window.switchResFolder = async folder => {
      activeFolder = folder;
      qsa('.folder-tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      await loadFolder(folder);
    };

    await loadFolder(activeFolder);
  }

  async function loadFolder(folder) {
    const cont = qs('#res-content');
    if (!cont) return;
    try {
      const files = await listResources(folder);
      if (!files.length) {
        cont.innerHTML = `<div class="res-empty"><div class="res-empty-icon">📂</div><div>La carpeta <code style="background:var(--bg-card);padding:.15rem .4rem;border-radius:4px;font-size:.8rem">resource/${folder}/</code> está vacía.<br>Sube archivos desde los paneles de Galería, Videos o Noticias.</div></div>`;
        return;
      }
      cont.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
        <span style="font-size:.8rem;color:var(--text-muted)">${files.length} archivo${files.length!==1?'s':''} · resource/${folder}/</span>
      </div>
      <div class="resource-grid" id="res-grid">
        ${files.map(f => `
          <div class="resource-item">
            ${folder==='images'
              ? `<img src="${f.data}" alt="${escapeHtml(f.name)}">`
              : `<div style="width:100%;height:88px;background:var(--bg-input);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin-bottom:.4rem">🎬</div>`}
            <div class="res-name">${escapeHtml(f.originalName || f.name)}</div>
            <div class="res-size">${fmtSize(f.size)}</div>
            <button class="res-del" onclick="delResource('${f.path}', '${folder}')">✕</button>
          </div>`).join('')}
      </div>`;
    } catch(err) {
      cont.innerHTML = `<div class="res-empty"><div class="res-empty-icon">⚠️</div>Error al cargar: ${err.message}</div>`;
    }
  }

  window.delResource = async (path, folder) => {
    if (!confirm('¿Eliminar este archivo del resource?')) return;
    try {
      await deleteResource(path);
      toast('Archivo eliminado del resource');
      await loadFolder(folder);
    } catch(err) { toast('Error al eliminar', true); }
  };

  render();
}

/* ============================================================
   GALERÍA — Slider
   ============================================================ */
function galeria(root) {
  let gallery = load(KEY_GALLERY, []);
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">🖼️ Galería de Imágenes — Slider</div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;margin-bottom:1.5rem">
        <div style="font-weight:700;color:var(--text-secondary);margin-bottom:.8rem">➕ Agregar imagen al slider</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:.8rem">
          <input type="text" id="gi-titulo"  placeholder="Título / pie de foto">
          <input type="text" id="gi-caption" placeholder="Descripción breve">
        </div>
        <div class="upload-area" id="gi-drop">
          <div class="up-icon">🖼️</div>
          <p>Arrastra o haz clic para seleccionar imagen</p>
          <input type="file" id="gi-file" accept="image/*" style="display:none">
        </div>
        <div id="gi-preview" style="margin:.8rem 0"></div>
        <button class="btn-save" id="gi-add-btn">📥 Agregar a la galería</button>
        <div class="info-banner" style="margin-top:.8rem;margin-bottom:0">
          📁 Las imágenes se guardan automáticamente en <strong>resource/images/</strong>
        </div>
      </div>
      <div class="panel-title">Imágenes actuales (${gallery.length})</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem" id="gallery-grid">
        ${gallery.map((img, i) => `
          <div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;position:relative;background:var(--bg-card)">
            <img src="${img.src}" style="width:100%;height:135px;object-fit:cover">
            <div style="padding:.65rem">
              <strong style="font-size:.82rem;color:var(--text-primary)">${img.titulo || 'Sin título'}</strong>
              <p style="font-size:.72rem;color:var(--text-muted);margin-top:.2rem">${img.caption || ''}</p>
            </div>
            <div style="position:absolute;top:4px;right:4px;display:flex;gap:4px">
              ${i > 0 ? `<button class="btn-save btn-sm" onclick="moveGallery(${i},-1)">↑</button>` : ''}
              ${i < gallery.length-1 ? `<button class="btn-save btn-sm" onclick="moveGallery(${i},1)">↓</button>` : ''}
              <button class="btn-danger btn-sm" onclick="delGallery(${i})">✕</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;

    let pendingSrc = null;
    let pendingFile = null;
    const dropArea  = qs('#gi-drop');
    const fileInput = qs('#gi-file');
    dropArea.addEventListener('click',     () => fileInput.click());
    dropArea.addEventListener('dragover',  e => { e.preventDefault(); dropArea.classList.add('drag'); });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag'));
    dropArea.addEventListener('drop',      e => { e.preventDefault(); dropArea.classList.remove('drag'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change',   () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

    function handleFile(file) {
      if (file.size > 5 * 1024 * 1024) { toast('Imagen mayor de 5 MB', true); return; }
      pendingFile = file;
      const r = new FileReader();
      r.onload = e => {
        pendingSrc = e.target.result;
        qs('#gi-preview').innerHTML = `<img src="${pendingSrc}" style="max-height:120px;border-radius:var(--radius-sm)">`;
      };
      r.readAsDataURL(file);
    }

    on(qs('#gi-add-btn'), 'click', async () => {
      if (!pendingSrc) { toast('Selecciona una imagen', true); return; }
      gallery.push({ id: Date.now(), src: pendingSrc, titulo: qs('#gi-titulo').value.trim(), caption: qs('#gi-caption').value.trim() });
      save(KEY_GALLERY, gallery);
      if (pendingFile) {
        try { await saveToResource('images', pendingSrc, pendingFile.name, pendingFile.type, pendingFile.size); }
        catch(err) { console.warn('Resource save:', err); }
      }
      toast('✅ Imagen agregada y guardada en resource/images/');
      render();
    });

    window.delGallery  = i => { gallery.splice(i,1); save(KEY_GALLERY,gallery); render(); };
    window.moveGallery = (i,dir) => { const j=i+dir; if(j>=0&&j<gallery.length){[gallery[i],gallery[j]]=[gallery[j],gallery[i]]; save(KEY_GALLERY,gallery); render();} };
  }
  render();
}

/* ============================================================
   VIDEOS
   ============================================================ */
function videos(root) {
  let vids = load(KEY_VIDEOS, []);
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">🎬 Gestión de Videos</div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;margin-bottom:1.5rem">
        <div style="font-weight:700;color:var(--text-secondary);margin-bottom:.8rem">➕ Agregar video</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">
          <div class="form-group"><label>Título *</label><input type="text" id="vf-titulo" placeholder="Título del video"></div>
          <div class="form-group"><label>Descripción</label><input type="text" id="vf-desc" placeholder="Descripción breve"></div>
          <div class="form-group" style="grid-column:1/-1"><label>URL del video</label><input type="text" id="vf-url" placeholder="https://youtube.com/... o URL local .mp4"></div>
          <div class="form-group">
            <label>Miniatura (URL)</label>
            <div style="display:flex;gap:.4rem">
              <input type="text" id="vf-thumb-url" placeholder="URL o subir imagen" style="flex:1">
              <label class="btn-save btn-sm" style="cursor:pointer;white-space:nowrap">📷 Subir<input type="file" id="vf-thumb-file" accept="image/*" style="display:none"></label>
            </div>
            <div id="vf-thumb-preview" style="margin-top:.4rem"></div>
          </div>
        </div>
        <button class="btn-save" id="vf-add-btn">📥 Agregar video</button>
        <div class="info-banner" style="margin-top:.8rem;margin-bottom:0">
          📁 Las miniaturas se guardan en <strong>resource/images/</strong>
        </div>
      </div>
      <div class="panel-title">Videos registrados (${vids.length})</div>
      ${vids.map(v => `
        <div class="video-row">
          <div class="video-thumb-box">${v.thumbSrc ? `<img src="${v.thumbSrc}" alt="">` : '🎬'}</div>
          <div style="flex:1;min-width:0">
            <strong style="color:var(--text-primary);font-size:.88rem">${escapeHtml(v.titulo)}</strong>
            <div style="font-size:.75rem;color:var(--text-muted);margin-top:.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.url || ''}</div>
            <div style="font-size:.8rem;color:var(--text-secondary);margin-top:.15rem">${v.desc || ''}</div>
          </div>
          <button class="btn-danger" onclick="delVideo(${v.id})">🗑️</button>
        </div>`).join('') || '<div style="text-align:center;padding:2rem;color:var(--text-muted)">No hay videos registrados</div>'}
    </div>`;

    const thumbFile = qs('#vf-thumb-file');
    thumbFile.addEventListener('change', function() {
      const f = this.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = async e => {
        qs('#vf-thumb-url').value = e.target.result;
        qs('#vf-thumb-preview').innerHTML = `<img src="${e.target.result}" style="max-height:60px;border-radius:4px">`;
        try { await saveToResource('images', e.target.result, f.name, f.type, f.size); }
        catch(err) { console.warn('Resource save:', err); }
      };
      r.readAsDataURL(f);
    });

    on(qs('#vf-add-btn'), 'click', () => {
      const titulo = qs('#vf-titulo').value.trim();
      if (!titulo) { toast('Título obligatorio', true); return; }
      vids.push({ id: Date.now(), titulo, url: qs('#vf-url').value.trim(), desc: qs('#vf-desc').value.trim(), thumbSrc: qs('#vf-thumb-url').value.trim() });
      save(KEY_VIDEOS, vids);
      toast('Video agregado');
      render();
    });
    window.delVideo = id => { vids = vids.filter(v => v.id !== id); save(KEY_VIDEOS, vids); toast('Video eliminado'); render(); };
  }
  render();
}

/* ============================================================
   IMÁGENES SUELTAS
   ============================================================ */
const IMG_KEYS = [
  { key:'fladio_foto',  label:'⭐ Foto Capitán Fladio' },
  { key:'escuela_foto', label:'🏫 Foto de la Escuela' },
  { key:'slider_1',     label:'🖼️ Slider placeholder 1' },
  { key:'slider_2',     label:'🖼️ Slider placeholder 2' },
  { key:'slider_3',     label:'🖼️ Slider placeholder 3' },
  { key:'slider_4',     label:'🖼️ Slider placeholder 4' }
];
function imagenes(root) {
  let imgs = load(KEY_IMAGES, {});
  let pendingSrc = null;
  let pendingFile = null;
  function render() {
    root.innerHTML = `
    <div class="adm-panel active">
      <div class="panel-title">📷 Imágenes Sueltas</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem">
          <div style="font-weight:700;color:var(--text-secondary);margin-bottom:.8rem">Subir / reemplazar imagen</div>
          <div class="form-group">
            <label>Posición</label>
            <select id="img-key-sel">${IMG_KEYS.map(k => `<option value="${k.key}">${k.label}</option>`).join('')}</select>
          </div>
          <div class="upload-area" id="img-drop">
            <div class="up-icon">📷</div>
            <p>Arrastra o haz clic</p>
            <input type="file" id="img-file" accept="image/*" style="display:none">
          </div>
          <div id="img-preview" style="margin:.6rem 0"></div>
          <button class="btn-save" id="img-save-btn" style="margin-top:.4rem">💾 Guardar imagen</button>
          <div class="info-banner" style="margin-top:.8rem;margin-bottom:0;font-size:.78rem">
            📁 Se guarda también en <strong>resource/images/</strong>
          </div>
        </div>
        <div>
          <div style="font-weight:700;color:var(--text-secondary);margin-bottom:.75rem;font-size:.85rem">Imágenes guardadas</div>
          ${IMG_KEYS.map(k => imgs[k.key] ? `
            <div style="display:flex;gap:.6rem;margin-bottom:.5rem;align-items:center;background:var(--bg-card);padding:.5rem .75rem;border-radius:var(--radius-sm);border:1px solid var(--border)">
              <img src="${imgs[k.key]}" style="width:55px;height:38px;object-fit:cover;border-radius:4px;flex-shrink:0">
              <span style="flex:1;font-size:.78rem;color:var(--text-secondary)">${k.label}</span>
              <button class="btn-danger" onclick="delImg('${k.key}')">🗑️</button>
            </div>` : '').join('') || '<p style="color:var(--text-muted);font-size:.85rem">Ninguna imagen guardada aún</p>'}
        </div>
      </div>
    </div>`;

    const dropArea  = qs('#img-drop');
    const fileInput = qs('#img-file');
    dropArea.addEventListener('click',     () => fileInput.click());
    dropArea.addEventListener('dragover',  e => { e.preventDefault(); dropArea.classList.add('drag'); });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag'));
    dropArea.addEventListener('drop',      e => { e.preventDefault(); dropArea.classList.remove('drag'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change',   () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

    function handleFile(file) {
      if (file.size > 5 * 1024 * 1024) { toast('> 5 MB', true); return; }
      pendingFile = file;
      const r = new FileReader();
      r.onload = e => {
        pendingSrc = e.target.result;
        qs('#img-preview').innerHTML = `<img src="${pendingSrc}" style="max-height:90px;border-radius:var(--radius-sm)">`;
      };
      r.readAsDataURL(file);
    }

    on(qs('#img-save-btn'), 'click', async () => {
      if (!pendingSrc) { toast('Selecciona imagen', true); return; }
      const key = qs('#img-key-sel').value;
      imgs[key] = pendingSrc;
      save(KEY_IMAGES, imgs);
      if (pendingFile) {
        try { await saveToResource('images', pendingSrc, pendingFile.name, pendingFile.type, pendingFile.size); }
        catch(err) { console.warn('Resource save:', err); }
      }
      toast('✅ Imagen guardada en resource/images/');
      pendingSrc  = null;
      pendingFile = null;
      render();
    });
    window.delImg = key => { delete imgs[key]; save(KEY_IMAGES, imgs); toast('Eliminada'); render(); };
  }
  render();
}

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */
function config(root) {
  const cfg = load(KEY_CONFIG, {});
  root.innerHTML = `
  <div class="adm-panel active">
    <div class="panel-title">⚙️ Configuración General</div>
    <div style="max-width:560px">
      <div class="form-group"><label>Nombre del sitio</label><input type="text" id="cfg-nombre" value="${escapeHtml(cfg.nombre || 'EIDE "Fladio Álvarez Galán"')}"></div>
      <div class="form-group"><label>Lema principal (banner)</label><input type="text" id="cfg-lema" value="${escapeHtml(cfg.lema || '✦ Cantera de Campeones ✦')}"></div>
      <div class="form-group"><label>Correo institucional</label><input type="text" id="cfg-email" value="${escapeHtml(cfg.email || '')}"></div>
      <div class="form-group"><label>Dirección física</label><input type="text" id="cfg-dir" value="${escapeHtml(cfg.direccion || 'Carretera Autopista Santa Fe, Km 8, Isla de la Juventud, Cuba')}"></div>
      <button class="btn-save" id="cfg-save-btn">💾 Guardar configuración</button>
    </div>
  </div>`;
  on(qs('#cfg-save-btn'), 'click', () => {
    const newCfg = {
      nombre:    qs('#cfg-nombre').value,
      lema:      qs('#cfg-lema').value,
      email:     qs('#cfg-email').value,
      direccion: qs('#cfg-dir').value,
      logoImg:   cfg.logoImg,
      bannerImg: cfg.bannerImg
    };
    save(KEY_CONFIG, newCfg);
    toast('✅ Configuración guardada');
  });
}

/* ============================================================
   BACKUP — Respaldo
   ============================================================ */
function backup(root) {
  root.innerHTML = `
  <div class="adm-panel active">
    <div class="panel-title">💾 Respaldo de Datos</div>
    <div class="info-banner" style="margin-bottom:1.25rem">
      📦 Exporta o importa toda la configuración (textos, imágenes, galería, videos, etc.)
    </div>
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">
      <button class="btn-gold" id="export-btn">⬇️ Exportar JSON</button>
      <label class="btn-save" style="cursor:pointer">⬆️ Importar JSON<input type="file" id="import-file" accept=".json" style="display:none"></label>
      <button class="btn-danger" id="clear-btn">🗑️ Borrar todos los datos</button>
    </div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;font-size:.82rem;color:var(--text-secondary)">
      <strong style="color:var(--text-primary)">Nota sobre la carpeta resource/:</strong><br>
      Los archivos multimedia almacenados en IndexedDB (resource/images/ y resource/videos/) 
      <strong>no se incluyen</strong> en el JSON de respaldo por su tamaño. 
      Para conservarlos usa el <strong>📁 Resource Manager</strong> para descargarlos individualmente.
    </div>
  </div>`;

  on(qs('#export-btn'), 'click', () => {
    const data = {};
    [KEY_CONTENT, KEY_IMAGES, KEY_GALLERY, KEY_VIDEOS, KEY_NEWS, KEY_DIRECTORS, KEY_ATHLETES, KEY_CONFIG, KEY_SECTIONS].forEach(k => {
      try { data[k] = JSON.parse(localStorage.getItem(k) || 'null'); } catch(e) {}
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eide_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('Respaldo exportado');
  });

  on(qs('#import-file'), 'change', function() {
    const f = this.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        Object.entries(data).forEach(([k,v]) => { if (v !== null) localStorage.setItem(k, JSON.stringify(v)); });
        toast('Datos importados. Recargando...');
        setTimeout(() => location.reload(), 1500);
      } catch { toast('Archivo inválido', true); }
    };
    r.readAsText(f);
  });

  on(qs('#clear-btn'), 'click', () => {
    if (confirm('¿Borrar TODOS los datos? Esta acción es irreversible.')) {
      [KEY_CONTENT, KEY_IMAGES, KEY_GALLERY, KEY_VIDEOS, KEY_NEWS, KEY_DIRECTORS, KEY_ATHLETES, KEY_CONFIG, KEY_SECTIONS, KEY_AUTH].forEach(k => localStorage.removeItem(k));
      toast('Datos borrados. Recargando...');
      setTimeout(() => location.reload(), 1500);
    }
  });
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) renderShell();
  else renderLogin();
});