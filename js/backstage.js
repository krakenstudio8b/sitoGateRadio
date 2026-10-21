// ═══════════════════════════════════════════════════════════════════════════
// GATE RADIO — BACKSTAGE
// Pannello admin per gestire eventi, stream e resident del sito.
// Stesso progetto Firebase del gestionale Studio Kraken Gate.
// ═══════════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
    getDatabase, ref, onValue, push, update, remove, get, set
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBtQZkX6r4F2W0BsIo6nsD27dUZHv3e8RU",
    authDomain: "studio-kraken-gate.firebaseapp.com",
    projectId: "studio-kraken-gate",
    storageBucket: "studio-kraken-gate.firebasestorage.app",
    messagingSenderId: "744360512833",
    appId: "1:744360512833:web:ed0952f304c37bd5ee25c0",
    measurementId: "G-39RLC549LJ",
    databaseURL: "https://studio-kraken-gate-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// ── Helpers ────────────────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function feedback(id, msg, ok = true) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'feedback ' + (ok ? 'ok' : 'err');
    if (msg) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3500);
}

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// ── Upload immagini su R2 ────────────────────────────────────────────────────
// La route /api/upload è servita dallo stesso worker del sito (vedi _worker.js).
// Niente chiavi nel codice: mandiamo il token di login Firebase dell'admin,
// il worker lo verifica e controlla che l'utente abbia ruolo admin.
const UPLOAD_API_URL = '/api/upload';

// Versione piccola (600 px) per le card del sito: rimpicciolita bene qui, il
// browser che rimpicciolisce l'originale crea "pallini" sul retino delle locandine.
// Se il browser non sa farla (es. vecchi Safari) si va avanti senza.
async function creaMiniatura(file) {
    try {
        const probe = await createImageBitmap(file);
        const w = Math.min(600, probe.width);
        const h = Math.round(probe.height * w / probe.width);
        probe.close();
        const bmp = await createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(bmp, 0, 0);
        bmp.close();
        return await new Promise(res => canvas.toBlob(b => res(b && b.type === 'image/webp' ? b : null), 'image/webp', 0.82));
    } catch (e) {
        return null;
    }
}

async function uploadFile(file, folder) {
    if (!auth.currentUser) throw new Error('Sessione scaduta: rifai il login');
    const idToken = await auth.currentUser.getIdToken();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    const thumb = await creaMiniatura(file);
    if (thumb) fd.append('thumb', thumb, 'thumb.webp');
    const res = await fetch(UPLOAD_API_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + idToken },
        body: fd,
    });
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) throw new Error(data.error || `Upload fallito (HTTP ${res.status})`);
    return data.url;
}

// Collega un <input type="file"> a un <input type="text/url">: al cambio file
// carica su R2 e scrive l'URL pubblico nel campo. onDone(url) opzionale.
function wireUploader(fileInputId, urlInputId, folder, feedbackId, onDone) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || fileInput.dataset.wired) return;
    fileInput.dataset.wired = '1';
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (feedbackId) feedback(feedbackId, 'Caricamento immagine…');
        try {
            const url = await uploadFile(file, folder);
            const urlInput = urlInputId && document.getElementById(urlInputId);
            if (urlInput) urlInput.value = url;
            if (feedbackId) feedback(feedbackId, '✓ Immagine caricata');
            if (onDone) onDone(url);
        } catch (err) {
            if (feedbackId) feedback(feedbackId, 'Errore upload: ' + err.message, false);
        } finally {
            fileInput.value = '';
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

const loginView = $('#login-view');
const appView = $('#app-view');

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        show(loginView); hide(appView);
        return;
    }
    // Verifica ruolo admin leggendo users/{uid}
    try {
        const snap = await get(ref(database, `users/${user.uid}`));
        const profile = snap.val() || {};
        if (profile.role !== 'admin') {
            alert('Accesso negato: ruolo admin richiesto.\nContatta un amministratore se pensi sia un errore.');
            await signOut(auth);
            return;
        }
        $('#user-email').textContent = user.email || '';
        hide(loginView); show(appView);
        initApp();
    } catch (err) {
        console.error('Errore verifica ruolo:', err);
        alert('Errore di autenticazione: ' + err.message);
        await signOut(auth);
    }
});

$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const pwd = $('#login-password').value;
    const errEl = $('#login-error');
    hide(errEl);
    try {
        await signInWithEmailAndPassword(auth, email, pwd);
    } catch (err) {
        errEl.textContent = err.code === 'auth/invalid-credential'
            ? 'Credenziali non valide.'
            : ('Errore: ' + err.message);
        show(errEl);
    }
});

// Reset password: manda la mail di recupero all'indirizzo scritto nel campo email.
// Il messaggio di conferma è volutamente identico anche se l'utente non esiste,
// così la pagina non rivela quali email sono registrate.
$('#forgot-btn').addEventListener('click', async () => {
    const email = $('#login-email').value.trim();
    const errEl = $('#login-error');
    const infoEl = $('#login-info');
    hide(errEl); hide(infoEl);

    if (!email) {
        errEl.textContent = 'Scrivi prima la tua email qui sopra, poi ripremi.';
        show(errEl);
        $('#login-email').focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
    } catch (err) {
        // auth/user-not-found e auth/invalid-email non li distinguiamo all'utente
        if (err.code !== 'auth/user-not-found' && err.code !== 'auth/invalid-email') {
            errEl.textContent = 'Errore: ' + err.message;
            show(errEl);
            return;
        }
    }
    infoEl.textContent = 'Se l\'indirizzo è registrato, ti è arrivata la mail per reimpostare la password. Controlla anche lo spam.';
    show(infoEl);
});

$('#logout-btn').addEventListener('click', () => signOut(auth));

// ═══════════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════════

$$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        $$('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        $$('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + tab));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// APP INIT — chiamato solo dopo auth admin verificata
// ═══════════════════════════════════════════════════════════════════════════

let appInitialized = false;
function initApp() {
    if (appInitialized) return;
    appInitialized = true;
    initEvents();
    initStreams();
    initResidents();

    // Uploader immagini diretti dai form (file → R2 → URL)
    wireUploader('ev-image-file',  'ev-image',  'Eventi Gate',   'event-feedback');
    wireUploader('st-image-file',  'st-image',  'Grafiche Gate', 'stream-feedback');
    wireUploader('res-image-file', 'res-image', 'residents',     'resident-feedback');
    // Nel modale di modifica il file caricato viene aggiunto alla gallery
    wireUploader('edit-image-file', null, 'Grafiche Gate', 'edit-image-feedback', (url) => {
        editGallery.push(url);
        renderEditGallery();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS CRUD
// ═══════════════════════════════════════════════════════════════════════════

function initEvents() {
    const eventsRef = ref(database, 'gateRadio/events');

    onValue(eventsRef, snap => {
        const container = $('#events-list');
        const data = snap.val();
        if (!data) {
            container.innerHTML = '<p class="text-sm" style="color: var(--text-dim);">Nessun evento ancora.</p>';
            return;
        }
        const items = Object.entries(data).sort((a, b) => new Date(b[1].date) - new Date(a[1].date));
        container.innerHTML = items.map(([key, ev]) => {
            const hidden = ev.published === false;
            return `
            <div class="list-item" ${hidden ? 'style="opacity:.55;"' : ''}>
                <div class="flex items-center gap-3 min-w-0">
                    ${ev.mainImage ? `<img src="${ev.mainImage}" alt="" class="resident-thumb" style="width:48px;height:48px;">` : ''}
                    <div class="min-w-0">
                        <div class="font-semibold truncate">
                            ${escapeHtml(ev.title || '')}
                            ${hidden ? '<span class="badge ml-2" style="background:rgba(239,68,68,.12);color:var(--danger);border:1px solid rgba(239,68,68,.3);">NASCOSTO</span>' : ''}
                        </div>
                        <div class="text-xs" style="color: var(--text-dim);">
                            <span class="mono">${ev.date || ''}</span>
                            ${ev.location ? ' · ' + escapeHtml(ev.location) : ''}
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;"
                        data-action="toggle-event" data-key="${key}"
                        title="${hidden ? 'Mostra sul sito' : 'Nascondi dal sito'}">
                        <i class="fas ${hidden ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                    <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;"
                        data-action="edit-event" data-key="${key}">
                        <i class="fas fa-pen"></i> Modifica
                    </button>
                    <button class="btn btn-danger" style="padding:6px 12px;font-size:12px;"
                        data-action="delete-event" data-key="${key}" data-label="${escapeAttr(ev.title || '')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    });

    $('#event-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            feedback('event-feedback', 'Salvataggio...');
            const mainImage = $('#ev-image').value.trim();
            const event = {
                title:          $('#ev-title').value.trim(),
                title_en:       $('#ev-title-en').value.trim(),
                date:           $('#ev-date').value,
                location:       $('#ev-location').value.trim(),
                description:    $('#ev-description').value.trim(),
                description_en: $('#ev-description-en').value.trim(),
                details:        $('#ev-details').value.trim(),
                details_en:     $('#ev-details-en').value.trim(),
                mainImage:      mainImage,
                galleryImages:  mainImage ? [mainImage] : [],
                tags:           $('#ev-tags').value.split(',').map(t => t.trim()).filter(Boolean),
                published:      true,
            };
            await push(eventsRef, event);
            feedback('event-feedback', '✓ Evento pubblicato!');
            e.target.reset();
        } catch (err) {
            feedback('event-feedback', 'Errore: ' + err.message, false);
        } finally {
            btn.disabled = false;
        }
    });

    // Delegazione click su lista eventi
    $('#events-list').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const key = btn.dataset.key;
        if (btn.dataset.action === 'edit-event') openEditModal('event', key);
        if (btn.dataset.action === 'delete-event') deleteItem(`gateRadio/events/${key}`, btn.dataset.label);
        if (btn.dataset.action === 'toggle-event') {
            get(ref(database, `gateRadio/events/${key}/published`)).then(s => {
                const currentlyVisible = s.val() !== false;
                update(ref(database, `gateRadio/events/${key}`), { published: !currentlyVisible })
                    .catch(err => alert('Errore: ' + err.message));
            });
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// STREAMS CRUD
// ═══════════════════════════════════════════════════════════════════════════

// published === false → live in attesa di approvazione (arrivata dal Sheet).
// Tutto il resto (senza il campo, o true) è già pubblicato sul sito.
// Le live del calendario con data, orario e nome sono approvate in automatico
// (stessa regola di js/firebase-data.js); restano "in attesa" le altre e
// quelle nascoste con l'occhio (hidden:true).
function isVisibleStream(s) {
    return s.hidden !== true && (s.published !== false
        || (s.source === 'google-sheets' && !!s.date && !!s.timeStart && !!s.artist));
}

// Data di oggi come "YYYY-MM-DD" nell'ora italiana del computer (non UTC),
// così una live di stasera non risulta "passata" già dalle 2 di notte.
function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// La live ha almeno un link della diretta? (soundcloudUrl o liveLinks; '#' = vuoto)
function hasLiveLink(s) {
    const links = Array.isArray(s.liveLinks) ? s.liveLinks
        : (s.liveLinks && typeof s.liveLinks === 'object' ? Object.values(s.liveLinks) : []);
    if (links.some(l => l && l.url && String(l.url).trim() && l.url !== '#')) return true;
    const sc = String(s.soundcloudUrl || '').trim();
    return !!sc && sc !== '#';
}

// Cosa manca a una live: link della diretta, copertina, descrizione italiana
function missingFields(s) {
    const miss = [];
    if (!hasLiveLink(s) && s.noLive !== true) miss.push('link');   // noLive = serata senza diretta
    if (!String(s.imageUrl || '').trim()) miss.push('cover');
    if (!String(s.description || '').trim()) miss.push('desc');
    return miss;
}
const MISS_LABELS = {
    link:  { icon: 'fa-link',     text: 'Link diretta' },
    cover: { icon: 'fa-image',    text: 'Copertina' },
    desc:  { icon: 'fa-align-left', text: 'Descrizione' },
};

// Stato della scheda Live (dati arrivati da Firebase + filtri scelti)
let streamItems = [];        // [[key, live], ...] ordinate dalla più recente
let streamFilter = 'all';    // all | future | past | hidden | pending
let streamSearch = '';
let fixFilter = 'all';       // all | link | cover | desc
let fixShowAll = false;
let fixCollapsed = false;
const FIX_PAGE = 10;         // quante live mostrare nel pannello prima di "Mostra tutte"

function initStreams() {
    const streamsRef = ref(database, 'gateRadio/streams');

    onValue(streamsRef, snap => {
        const data = snap.val();
        streamItems = data
            ? Object.entries(data).sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
            : [];
        renderStreamsList();
        renderFixPanel();
    });

    // Ricerca + filtri della lista
    $('#streams-search').addEventListener('input', e => {
        streamSearch = e.target.value;
        renderStreamsList();
    });
    $('#streams-filters').addEventListener('click', e => {
        const chip = e.target.closest('[data-filter]');
        if (!chip) return;
        streamFilter = chip.dataset.filter;
        renderStreamsList();
    });

    // Pannello "Da sistemare"
    $('#fix-filters').addEventListener('click', e => {
        const chip = e.target.closest('[data-fix]');
        if (!chip) return;
        fixFilter = chip.dataset.fix;
        fixShowAll = false;
        renderFixPanel();
    });
    $('#fix-more-btn').addEventListener('click', () => {
        fixShowAll = !fixShowAll;
        renderFixPanel();
    });
    $('#fix-toggle').addEventListener('click', () => {
        fixCollapsed = !fixCollapsed;
        renderFixPanel();
    });
    $('#edit-kind').addEventListener('click', e => {
        const b = e.target.closest('[data-kind]');
        if (b) setEditKind(b.dataset.kind === 'nolive');
    });
    $('#fix-list').addEventListener('click', e => {
        const btn = e.target.closest('[data-action="edit-stream"]');
        if (btn) openEditModal('stream', btn.dataset.key);
        const noLive = e.target.closest('[data-action="no-live-stream"]');
        if (noLive) {
            update(ref(database, `gateRadio/streams/${noLive.dataset.key}`), { noLive: true })
                .catch(err => alert('Errore: ' + err.message));
        }
    });

    // Suggerimenti YouTube nel modale di modifica
    $('#yt-search-btn').addEventListener('click', searchYouTubeForEdit);
    $('#yt-results').addEventListener('click', e => {
        const btn = e.target.closest('[data-yt-link]');
        if (btn) linkYouTubeVideo(btn.dataset.ytLink, btn);
    });

    $('#stream-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            feedback('stream-feedback', 'Salvataggio...');
            const stLinks = parseLiveLinks($('#st-url').value);
            const stream = {
                artist:         $('#st-artist').value.trim(),
                title:          $('#st-title').value.trim() || 'LIVE STREAMING',
                date:           $('#st-date').value,
                timeStart:      $('#st-time-start').value || '18:00',
                timeEnd:        $('#st-time-end').value || '19:00',
                season:         $('#st-season').value,
                soundcloudUrl:  stLinks.length ? stLinks[0].url : '#',
                liveLinks:      stLinks.length > 1 ? stLinks : null,
                imageUrl:       $('#st-image').value.trim(),
                description:    $('#st-description').value.trim(),
                description_en: $('#st-description-en').value.trim(),
                tags:           $('#st-tags').value.split(',').map(t => t.trim()).filter(Boolean),
                published:      true, // creata a mano → online subito
            };
            await push(streamsRef, stream);
            feedback('stream-feedback', '✓ Live pubblicata!');
            e.target.reset();
            $('#st-title').value = 'LIVE STREAMING';
        } catch (err) {
            feedback('stream-feedback', 'Errore: ' + err.message, false);
        } finally {
            btn.disabled = false;
        }
    });

    $('#streams-list').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const key = btn.dataset.key;
        if (btn.dataset.action === 'edit-stream') openEditModal('stream', key);
        if (btn.dataset.action === 'delete-stream') deleteItem(`gateRadio/streams/${key}`, btn.dataset.label);
        if (btn.dataset.action === 'publish-stream') {
            update(ref(database, `gateRadio/streams/${key}`), { published: true, hidden: null })
                .catch(err => alert('Errore: ' + err.message));
        }
        if (btn.dataset.action === 'publish-as-event') publishStreamAsEvent(key);
        if (btn.dataset.action === 'hide-stream') {
            update(ref(database, `gateRadio/streams/${key}`), { published: false, hidden: true })
                .catch(err => alert('Errore: ' + err.message));
        }
    });
}

// ── Lista "Live in archivio" con ricerca e filtri ───────────────────────────
function renderStreamsList() {
    const container = $('#streams-list');
    const today = todayISO();
    const items = streamItems;

    // Quante live per ogni filtro (il numero accanto alla pillola)
    const groups = {
        all:     () => true,
        future:  (s) => !!s.date && s.date >= today,
        past:    (s) => !!s.date && s.date < today,
        hidden:  (s) => s.hidden === true,
        pending: (s) => !isVisibleStream(s) && s.hidden !== true,
    };
    const filterDefs = [
        ['all', 'Tutte'], ['future', 'Future'], ['past', 'Passate'],
        ['hidden', 'Nascoste'], ['pending', 'In attesa'],
    ];
    $('#streams-filters').innerHTML = filterDefs.map(([id, label]) => `
        <button type="button" class="chip ${streamFilter === id ? 'active' : ''}" data-filter="${id}">
            ${label}<span class="count">${items.filter(([, s]) => groups[id](s)).length}</span>
        </button>`).join('');

    if (!items.length) {
        container.innerHTML = '<p class="text-sm" style="color: var(--text-dim);">Nessuna live ancora.</p>';
        return;
    }

    // Ricerca su nome artista e titolo, senza badare a maiuscole/spazi/punteggiatura
    const q = normalizeText(streamSearch);
    const matchesSearch = (s) => !q || normalizeText(`${s.artist || ''} ${s.title || ''}`).includes(q);

    let filtered = items.filter(([, s]) => groups[streamFilter](s) && matchesSearch(s));
    // Le future dalla più vicina alla più lontana
    if (streamFilter === 'future') filtered = [...filtered].reverse();

    if (!filtered.length) {
        container.innerHTML = `<p class="text-sm" style="color: var(--text-dim);">Nessuna live trovata${q ? ' per "' + escapeHtml(streamSearch.trim()) + '"' : ''}.</p>`;
        return;
    }

    // "Tutte" senza ricerca: come prima, prima quelle da approvare poi le pubblicate
    if (streamFilter !== 'all') {
        container.innerHTML = filtered.map(it => renderStreamRow(it, !isVisibleStream(it[1]))).join('');
        return;
    }
    const pending = filtered.filter(([, s]) => !isVisibleStream(s));
    const live    = filtered.filter(([, s]) => isVisibleStream(s));
    let html = '';
    if (pending.length) {
        html += `<div class="mb-2 text-sm font-semibold" style="color: var(--accent);">
            <i class="fas fa-hourglass-half mr-1"></i> ${pending.length} live non pubblicate (in attesa o nascoste)
        </div>`;
        html += pending.map(it => renderStreamRow(it, true)).join('');
        if (live.length) html += `<div class="mt-5 mb-2 text-sm font-semibold" style="color: var(--text-dim);">Pubblicate sul sito</div>`;
    }
    html += live.map(it => renderStreamRow(it, false)).join('');
    container.innerHTML = html;
}

function renderStreamRow([key, s], isPending) {
    const pendingBadge = s.hidden === true
        ? '<span class="badge ml-2" style="background:rgba(239,68,68,.12);color:var(--danger);border:1px solid rgba(239,68,68,.3);">NASCOSTA</span>'
        : '<span class="badge ml-2" style="background:rgba(255,242,0,.15);color:var(--accent);border:1px solid rgba(255,242,0,.3);">IN ATTESA</span>';
    return `
            <div class="list-item" ${isPending ? 'style="border-color: var(--accent);"' : ''}>
                <div class="flex items-center gap-3 min-w-0">
                    ${s.imageUrl ? `<img src="${s.imageUrl}" alt="" class="resident-thumb" style="width:48px;height:48px;">` : ''}
                    <div class="min-w-0">
                        <div class="font-semibold truncate">
                            ${escapeHtml(s.artist || '')}
                            ${isPending ? pendingBadge : ''}
                        </div>
                        <div class="text-xs" style="color: var(--text-dim);">
                            <span class="mono">${s.date || ''}</span>
                            <span class="badge badge-season ml-2">${s.season || ''}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    ${isPending ? `
                    <button class="btn" style="padding:6px 12px;font-size:12px;background:var(--ok);color:#000;"
                        data-action="publish-stream" data-key="${key}">
                        <i class="fas fa-check"></i> Pubblica
                    </button>` : ''}
                    ${isPending && ['SHOWCASE', 'EVENT'].includes(s.title) ? `
                    <button class="btn" style="padding:6px 12px;font-size:12px;background:var(--accent);color:#000;"
                        data-action="publish-as-event" data-key="${key}" title="Crea anche una scheda Evento">
                        <i class="fas fa-calendar-day"></i> Come Evento
                    </button>` : ''}
                    ${!isPending ? `
                    <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;"
                        data-action="hide-stream" data-key="${key}" title="Nascondi dal sito">
                        <i class="fas fa-eye"></i>
                    </button>` : ''}
                    <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;"
                        data-action="edit-stream" data-key="${key}">
                        <i class="fas fa-pen"></i> Modifica
                    </button>
                    <button class="btn btn-danger" style="padding:6px 12px;font-size:12px;"
                        data-action="delete-stream" data-key="${key}" data-label="${escapeAttr(s.artist || '')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
}

// Interruttore "Diretta / Evento senza diretta" nel modale di modifica live
let editNoLive = false;
function setEditKind(noLive) {
    editNoLive = !!noLive;
    document.querySelectorAll('#edit-kind [data-kind]').forEach(b =>
        b.classList.toggle('active', (b.dataset.kind === 'nolive') === editNoLive));
}

// ── Pannello "Da sistemare" ─────────────────────────────────────────────────
// Live già passate e visibili sul sito a cui manca link, copertina o descrizione.
function renderFixPanel() {
    const panel = $('#fix-panel');
    const today = todayISO();
    const toFix = streamItems
        .filter(([, s]) => isVisibleStream(s) && !!s.date && s.date < today)
        .map(([key, s]) => ({ key, s, miss: missingFields(s) }))
        .filter(it => it.miss.length > 0);

    if (!toFix.length) { hide(panel); return; }
    show(panel);

    $('#fix-count').textContent = toFix.length;
    $('#fix-count').title = `${toFix.length} live da completare`;
    $('#fix-body').classList.toggle('hidden', fixCollapsed);
    $('#fix-toggle').innerHTML = fixCollapsed
        ? '<i class="fas fa-chevron-down"></i> Apri'
        : '<i class="fas fa-chevron-up"></i> Chiudi';

    // Pillole: tutte / solo senza link / senza copertina / senza descrizione
    const countOf = (m) => toFix.filter(it => it.miss.includes(m)).length;
    const defs = [['all', 'Tutte', toFix.length], ['link', 'Senza link', countOf('link')],
        ['cover', 'Senza copertina', countOf('cover')], ['desc', 'Senza descrizione', countOf('desc')]];
    if (fixFilter !== 'all' && !countOf(fixFilter)) fixFilter = 'all';
    $('#fix-filters').innerHTML = defs.filter(([id, , n]) => id === 'all' || n > 0).map(([id, label, n]) => `
        <button type="button" class="chip ${fixFilter === id ? 'active' : ''}" data-fix="${id}">
            ${label}<span class="count">${n}</span>
        </button>`).join('');

    const list = fixFilter === 'all' ? toFix : toFix.filter(it => it.miss.includes(fixFilter));
    const visible = fixShowAll ? list : list.slice(0, FIX_PAGE);

    $('#fix-list').innerHTML = visible.map(({ key, s, miss }) => `
        <div class="list-item">
            <div class="flex items-center gap-3 min-w-0">
                ${s.imageUrl ? `<img src="${s.imageUrl}" alt="" class="resident-thumb" style="width:48px;height:48px;">` : ''}
                <div class="min-w-0">
                    <div class="font-semibold truncate">${escapeHtml(s.artist || '(senza nome)')}</div>
                    <div class="text-xs flex flex-wrap items-center gap-1 mt-1" style="color: var(--text-dim);">
                        <span class="mono mr-1">${formatDateIT(s.date)}</span>
                        ${miss.map(m => `<span class="badge badge-miss"><i class="fas ${MISS_LABELS[m].icon} mr-1"></i>${MISS_LABELS[m].text}</span>`).join('')}
                    </div>
                </div>
            </div>
            <div class="flex gap-2 flex-shrink-0">
${miss.includes('link') ? `
                <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;" title="Serata o post senza streaming: non serve il link"
                    data-action="no-live-stream" data-key="${key}">
                    <i class="fas fa-video-slash"></i> Non è una diretta
                </button>` : ''}
                <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;"
                    data-action="edit-stream" data-key="${key}">
                    <i class="fas fa-pen"></i> Modifica
                </button>
            </div>
        </div>`).join('');

    const more = $('#fix-more');
    if (list.length > FIX_PAGE) {
        show(more);
        $('#fix-more-btn').innerHTML = fixShowAll
            ? '<i class="fas fa-chevron-up"></i> Mostra meno'
            : `<i class="fas fa-chevron-down"></i> Mostra tutte (${list.length})`;
    } else {
        hide(more);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUGGERIMENTO LINK YOUTUBE
// Nel modale di modifica di una live: legge gli ultimi video del canale Gate
// Radio (chiave e playlist da js/config.js, stessa API di js/radio.js) e
// propone quelli col nome dell'artista nel titolo o usciti vicino alla data
// della live. "Collega" aggiunge il link nel campo "Link della live".
// Si limita a LEGGERE YouTube: nel database si scrive solo premendo Salva.
// ═══════════════════════════════════════════════════════════════════════════

const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const YT_DATE_WINDOW_DAYS = 7;   // "data vicina" = entro una settimana dalla live
const YT_MAX_RESULTS = 8;
let ytVideosPromise = null;      // video letti una volta sola per sessione
let configPromise = null;

// config.js è uno script "classico" del sito: se nel backstage non è ancora
// caricato lo aggiungiamo al volo. RADIO_CONFIG diventa poi leggibile da qui.
function loadRadioConfig() {
    if (typeof RADIO_CONFIG !== 'undefined') return Promise.resolve(RADIO_CONFIG);
    if (!configPromise) {
        configPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'js/config.js';
            s.onload = () => (typeof RADIO_CONFIG !== 'undefined')
                ? resolve(RADIO_CONFIG)
                : reject(new Error('config.js caricato ma RADIO_CONFIG manca'));
            s.onerror = () => { configPromise = null; reject(new Error('impossibile caricare js/config.js')); };
            document.head.appendChild(s);
        });
    }
    return configPromise;
}

// Legge fino a maxPages pagine (50 video l'una) di una playlist YouTube
async function fetchYTPlaylist(playlistId, apiKey, maxPages) {
    const out = [];
    let pageToken = '';
    let pages = 0;
    do {
        const url = `${YT_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&key=${encodeURIComponent(apiKey)}${pageToken ? '&pageToken=' + pageToken : ''}`;
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) throw new Error(json.error?.message || `YouTube HTTP ${res.status}`);
        for (const item of (json.items || [])) {
            const id = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
            // i video privati/eliminati non hanno data di pubblicazione
            const published = item.contentDetails?.videoPublishedAt;
            if (!id || !published) continue;
            out.push({
                id,
                title: item.snippet?.title || '',
                date: published,
                thumb: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
                channelId: item.snippet?.videoOwnerChannelId || item.snippet?.channelId || '',
            });
        }
        pageToken = json.nextPageToken || '';
        pages++;
    } while (pageToken && pages < maxPages);
    return out;
}

// Tutti i video utili: la playlist del sito + gli ultimi caricamenti del canale
// (le dirette nuove spesso non sono ancora nella playlist). Esclusi gli Shorts.
function loadYouTubeVideos() {
    if (ytVideosPromise) return ytVideosPromise;
    ytVideosPromise = (async () => {
        const cfg = await loadRadioConfig();
        if (!cfg.YOUTUBE_API_KEY || !cfg.YOUTUBE_PLAYLIST_ID) {
            throw new Error('mancano YOUTUBE_API_KEY o YOUTUBE_PLAYLIST_ID in js/config.js');
        }
        const fromPlaylist = await fetchYTPlaylist(cfg.YOUTUBE_PLAYLIST_ID, cfg.YOUTUBE_API_KEY, 6);
        // La playlist "caricamenti" di un canale UCxxxx si chiama UUxxxx
        let fromUploads = [];
        const channelId = (fromPlaylist.find(v => v.channelId.startsWith('UC')) || {}).channelId;
        if (channelId) {
            try {
                fromUploads = await fetchYTPlaylist('UU' + channelId.slice(2), cfg.YOUTUBE_API_KEY, 6);
            } catch (err) {
                console.warn('[Backstage] caricamenti del canale non letti:', err.message);
            }
        }
        const byId = new Map();
        [...fromUploads, ...fromPlaylist].forEach(v => { if (!byId.has(v.id)) byId.set(v.id, v); });
        return [...byId.values()]
            .filter(v => !/#shorts/i.test(v.title) && !/^\s*highlight/i.test(v.title))
            .sort((a, b) => b.date.localeCompare(a.date));
    })();
    // se va male si potrà riprovare
    ytVideosPromise.catch(() => { ytVideosPromise = null; });
    return ytVideosPromise;
}

// Nomi dell'artista da cercare nel titolo: il nome intero e, per le line-up
// ("FIONN, ROSIE CPT", "A b2b B"), anche ogni nome da solo.
function artistNeedles(artist) {
    const parts = String(artist || '')
        .split(/,|&|\+|\/|\||\bb2b\b|\bfeat\.?|\bft\.?|\bvs\.?|\bwith\b/i)
        .map(normalizeText);
    return [...new Set([normalizeText(artist), ...parts])].filter(n => n.length >= 3);
}

// Giorni tra la data della live (YYYY-MM-DD) e quella del video (ISO, UTC)
function daysBetween(liveDate, videoIso) {
    const a = Date.parse(liveDate + 'T12:00:00');
    const b = Date.parse(videoIso);
    if (isNaN(a) || isNaN(b)) return Infinity;
    return Math.round((b - a) / 86400000);
}

function suggestYouTubeVideos(videos, artist, liveDate) {
    const needles = artistNeedles(artist);
    return videos
        .map(v => {
            const t = normalizeText(v.title);
            const nameMatch = needles.some(n => t.includes(n));
            const diff = liveDate ? daysBetween(liveDate, v.date) : Infinity;
            const dateNear = Math.abs(diff) <= YT_DATE_WINDOW_DAYS;
            return { ...v, nameMatch, dateNear, diff };
        })
        .filter(v => v.nameMatch || v.dateNear)
        // prima chi ha nome E data, poi solo nome, poi solo data; a parità il più vicino
        .sort((a, b) => ((b.nameMatch * 2 + b.dateNear) - (a.nameMatch * 2 + a.dateNear))
            || (Math.abs(a.diff) - Math.abs(b.diff)))
        .slice(0, YT_MAX_RESULTS);
}

function ytWatchUrl(id) { return `https://www.youtube.com/watch?v=${id}`; }

// Il campo link contiene già questo video? (qualsiasi forma di link YouTube)
function linkFieldHasVideo(id) {
    return $('#edit-url').value.includes(id);
}

async function searchYouTubeForEdit() {
    const box = $('#yt-results');
    const btn = $('#yt-search-btn');
    const artist = $('#edit-artist').value.trim();
    const liveDate = $('#edit-date').value;
    if (!artist && !liveDate) {
        feedback('yt-feedback', 'Scrivi prima artista o data', false);
        return;
    }
    btn.disabled = true;
    box.innerHTML = '<p class="text-xs" style="color: var(--text-dim);"><i class="fas fa-spinner fa-spin mr-1"></i> Leggo i video del canale…</p>';
    try {
        const videos = await loadYouTubeVideos();
        const found = suggestYouTubeVideos(videos, artist, liveDate);
        if (!found.length) {
            box.innerHTML = `<p class="text-xs" style="color: var(--text-dim);">
                Nessun video con "${escapeHtml(artist)}" nel titolo né uscito entro ${YT_DATE_WINDOW_DAYS} giorni dalla live
                (controllati ${videos.length} video). Forse non è ancora stato caricato.</p>`;
            return;
        }
        box.innerHTML = `<p class="text-xs mb-2" style="color: var(--text-dim);">
                Possibili video (su ${videos.length} letti). Controlla che sia quello giusto prima di collegarlo:</p>`
            + found.map(v => {
                const already = linkFieldHasVideo(v.id);
                const when = v.diff === 0 ? 'stesso giorno'
                    : (v.diff > 0 ? `${v.diff} gg dopo` : `${-v.diff} gg prima`);
                return `
                <div class="yt-item">
                    ${v.thumb ? `<img src="${v.thumb}" alt="" loading="lazy">` : ''}
                    <div class="min-w-0 flex-1">
                        <a href="${ytWatchUrl(v.id)}" target="_blank" rel="noopener" class="text-sm font-semibold block truncate" style="color: var(--text);" title="Apri su YouTube">${escapeHtml(v.title)}</a>
                        <div class="text-xs flex flex-wrap items-center gap-1 mt-1" style="color: var(--text-dim);">
                            <span class="mono mr-1">${formatDateIT(v.date.slice(0, 10))}</span>
                            ${v.nameMatch ? '<span class="badge badge-ok">nome</span>' : ''}
                            ${v.dateNear ? `<span class="badge badge-season">data: ${when}</span>` : ''}
                        </div>
                    </div>
                    <button type="button" class="btn ${already ? 'btn-ghost' : 'btn-primary'}" style="padding:6px 12px;font-size:12px;white-space:nowrap;"
                        data-yt-link="${v.id}" ${already ? 'disabled' : ''}>
                        ${already ? '<i class="fas fa-check"></i> Collegato' : '<i class="fas fa-link"></i> Collega'}
                    </button>
                </div>`;
            }).join('');
    } catch (err) {
        box.innerHTML = '';
        feedback('yt-feedback', 'YouTube non risponde: ' + err.message, false);
    } finally {
        btn.disabled = false;
    }
}

// Aggiunge il link del video nel campo "Link della live" (non salva: serve Salva)
function linkYouTubeVideo(id, btn) {
    const field = $('#edit-url');
    if (linkFieldHasVideo(id)) return;
    const url = ytWatchUrl(id);
    const current = field.value.trim();
    field.value = current ? current + '\n' + url : url;
    btn.disabled = true;
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-ghost');
    btn.innerHTML = '<i class="fas fa-check"></i> Collegato';
    feedback('yt-feedback', current
        ? '✓ Aggiunto come riga in più: se serve scrivi "NOME | " davanti. Poi premi Salva.'
        : '✓ Link inserito. Ricordati di premere Salva.');
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOWCASE → EVENTO
// Converte una live "in attesa" (riconosciuta come SHOWCASE/EVENT dal sync) in
// una scheda Evento, lasciandola anche tra le Live (published:true).
// La scheda evento nasce da quel che c'è sulla live; va poi rifinita nel tab Eventi.
// ═══════════════════════════════════════════════════════════════════════════

async function publishStreamAsEvent(key) {
    try {
        const snap = await get(ref(database, `gateRadio/streams/${key}`));
        const s = snap.val();
        if (!s) return alert('Live non trovata');

        const isShowcase = s.title === 'SHOWCASE';
        const artist = (s.artist || '').trim();
        const eventTitle = isShowcase
            ? (artist ? `SHOWCASE — ${artist}` : 'SHOWCASE')
            : (artist || 'EVENTO');

        if (!confirm(`Pubblicare "${eventTitle}" come Evento?\nApparirà tra gli Eventi e resterà anche nelle Live. Potrai rifinirlo nel tab Eventi.`)) return;

        const details = [];
        if (s.timeStart) details.push(`Orario: ${s.timeStart}${s.timeEnd ? '–' + s.timeEnd : ''}`);
        details.push('Ingresso libero allo studio');
        if (s.note) details.push(s.note);

        const ev = {
            title:          eventTitle,
            title_en:       '',
            date:           s.date || '',
            location:       '',
            description:    s.bio || '',
            description_en: '',
            details:        details.join(' · '),
            details_en:     '',
            mainImage:      s.imageUrl || '',
            galleryImages:  s.imageUrl ? [s.imageUrl] : [],
            tags:           Array.isArray(s.tags) ? s.tags : [],
            source:         'showcase-from-live',
        };

        const evKey = push(ref(database, 'gateRadio/events')).key;
        await update(ref(database), {
            [`gateRadio/events/${evKey}`]: ev,
            [`gateRadio/streams/${key}/published`]: true,
        });
        feedback('stream-feedback', '✓ Creato Evento + Live pubblicata. Rifiniscilo nel tab Eventi.');
    } catch (err) {
        alert('Errore: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EDIT MODAL (events + streams)
// ═══════════════════════════════════════════════════════════════════════════

let editGallery = [];

function openEditModal(type, key) {
    const modal = $('#edit-modal');
    const path = `gateRadio/${type === 'stream' ? 'streams' : 'events'}/${key}`;

    get(ref(database, path)).then(snap => {
        const data = snap.val();
        if (!data) return alert('Elemento non trovato');

        $('#edit-key').value = key;
        $('#edit-type').value = type;
        $('#edit-modal-title').textContent =
            type === 'stream' ? `Modifica: ${data.artist}` : `Modifica: ${data.title}`;

        $('#edit-title').value = data.title || '';
        $('#edit-date').value = data.date || '';
        $('#edit-tags').value = (data.tags || []).join(', ');

        $$('.edit-event-only').forEach(el => el.style.display = type === 'event' ? '' : 'none');
        $$('.edit-stream-only').forEach(el => el.style.display = type === 'stream' ? '' : 'none');

        if (type === 'event') {
            $('#edit-title-en').value = data.title_en || '';
            $('#edit-location').value = data.location || '';
            $('#edit-description').value = data.description || '';
            $('#edit-description-en').value = data.description_en || '';
            $('#edit-details').value = data.details || '';
            $('#edit-details-en').value = data.details_en || '';
            editGallery = data.galleryImages && data.galleryImages.length > 0
                ? [...data.galleryImages]
                : (data.mainImage ? [data.mainImage] : []);
        } else {
            $('#edit-artist').value = data.artist || '';
            $('#edit-season').value = data.season || 'winter';
            $('#edit-time-start').value = data.timeStart || '18:00';
            $('#edit-time-end').value = data.timeEnd || '19:00';
            $('#edit-url').value = liveLinksToText(data);
            $('#edit-st-description').value = data.description || '';
            $('#edit-st-description-en').value = data.description_en || '';
            editGallery = data.imageUrl ? [data.imageUrl] : [];
            setEditKind(data.noLive === true);
        }

        // suggerimenti YouTube della live aperta prima: via
        $('#yt-results').innerHTML = '';
        $('#yt-feedback').textContent = '';

        renderEditGallery();
        modal.classList.add('open');
    });
}

window.closeEditModal = function() {
    $('#edit-modal').classList.remove('open');
    editGallery = [];
};

function renderEditGallery() {
    const container = $('#edit-gallery');
    if (editGallery.length === 0) {
        container.innerHTML = '<p class="text-xs" style="color: var(--text-dim);">Nessuna immagine</p>';
        return;
    }
    container.innerHTML = editGallery.map((url, i) => `
        <div class="gallery-thumb">
            <img src="${url}" alt="Img ${i + 1}">
            <button type="button" class="remove" data-idx="${i}">&times;</button>
            ${i === 0 ? '<span class="main-tag">PRINCIPALE</span>' : ''}
        </div>
    `).join('');
    container.querySelectorAll('.remove').forEach(b => {
        b.addEventListener('click', () => {
            editGallery.splice(parseInt(b.dataset.idx, 10), 1);
            renderEditGallery();
        });
    });
}

window.addEditImage = function() {
    const input = $('#edit-new-image-url');
    const url = input.value.trim();
    if (!url) {
        feedback('edit-image-feedback', 'Incolla un URL valido', false);
        return;
    }
    editGallery.push(url);
    input.value = '';
    renderEditGallery();
    feedback('edit-image-feedback', '✓ Immagine aggiunta');
};

$('#edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const key = $('#edit-key').value;
    const type = $('#edit-type').value;
    const path = `gateRadio/${type === 'stream' ? 'streams' : 'events'}/${key}`;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
        const tags = $('#edit-tags').value.split(',').map(t => t.trim()).filter(Boolean);
        const date = $('#edit-date').value;
        let updates;

        if (type === 'stream') {
            const editLinks = parseLiveLinks($('#edit-url').value);
            updates = {
                title:         $('#edit-title').value.trim(),
                artist:        $('#edit-artist').value.trim(),
                date,
                timeStart:     $('#edit-time-start').value || '18:00',
                timeEnd:       $('#edit-time-end').value || '19:00',
                season:        $('#edit-season').value,
                soundcloudUrl:  editLinks.length ? editLinks[0].url : '#',
                liveLinks:      editLinks.length > 1 ? editLinks : null,
                imageUrl:       editGallery[0] || '',
                description:    $('#edit-st-description').value.trim(),
                description_en: $('#edit-st-description-en').value.trim(),
                noLive:         editNoLive ? true : null,
                tags,
            };
        } else {
            updates = {
                title:          $('#edit-title').value.trim(),
                title_en:       $('#edit-title-en').value.trim(),
                date,
                location:       $('#edit-location').value.trim(),
                description:    $('#edit-description').value.trim(),
                description_en: $('#edit-description-en').value.trim(),
                details:        $('#edit-details').value.trim(),
                details_en:     $('#edit-details-en').value.trim(),
                mainImage:      editGallery[0] || '',
                galleryImages:  editGallery.length > 0 ? editGallery : [],
                tags,
            };
        }

        await update(ref(database, path), updates);
        feedback('edit-feedback', '✓ Salvato');
        setTimeout(() => closeEditModal(), 600);
    } catch (err) {
        feedback('edit-feedback', 'Errore: ' + err.message, false);
    } finally {
        btn.disabled = false;
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// RESIDENTS CRUD
// ═══════════════════════════════════════════════════════════════════════════

// Dati hardcoded attualmente nel sito (js/script.js::gestioneArtisti).
// Usati come seed iniziale quando il DB è vuoto.
const DEFAULT_RESIDENTS = [
    { name: 'ADAD',            order: 10, image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
    { name: 'ALIUS BENZ',      order: 20, image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
    { name: 'COUNTERCULTURE',  order: 30, image: 'https://media.gateradiorm.com/residents/counterculture.jpg', bio: 'Manuel López (Counterculture) is a Colombian DJ and live act based in Rome, focused on underground techno, modular live performance and hybrid sets combining vinyl, hardware and digital sources. A member of Gate Radio and resident of the Bugs collective, his sound is raw, hypnotic and functional for the dancefloor. He has performed at underground clubs and spaces in Rome such as Brancaleone and Hacienda, as well as independent venues, record stores and alternative organizations.', instagram: 'https://www.instagram.com/counterculturx/', soundcloud: 'https://soundcloud.com/counterculture666', mixcloud: '' },
    { name: 'MRQS',            order: 40, image: 'https://media.gateradiorm.com/residents/mrqs.jpg', bio: "MRQS brings together two worlds: that of a sound engineer and sound designer, and that of a DJ. This dual expertise is clearly reflected in his sets, which are meticulously crafted, powerful in impact, and surprising in their selections. He moves seamlessly from tribal hardgroove to techno atmospheres, all the way to UK garage grooves, maintaining constant attention to sound quality and the room's response. His experience has been shaped on stages such as Acrobax and through numerous events for various collectives. Beyond the decks, he is the founder and driving force behind Gate Radio.", instagram: 'https://www.instagram.com/romarcomani/', soundcloud: 'https://soundcloud.com/marco-romani-308872897', mixcloud: '' },
    { name: 'MERLO',           order: 50, image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
    { name: 'PUG',             order: 60, image: 'https://media.gateradiorm.com/residents/pug.jpg', bio: 'Pug is a sound designer and producer of club and experimental music. His productions stand out for their use of synthesized sounds, creative sample processing, and polyrhythms. In addition to his DJ career, he performs live sets both solo and B2B, with an approach focused on techno and bass music. His track Cast Iron Plate is included in the compilation Nodi 001.', instagram: 'https://www.instagram.com/prod.pug/', soundcloud: 'https://soundcloud.com/user-66581760', mixcloud: '' },
    { name: 'ROBBSS',          order: 70, image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
    { name: 'SOFFICE',         order: 80, image: 'https://media.gateradiorm.com/residents/soffice.jpg', bio: "A key resident of Freenetica Crew, Soffice is a techno DJ shaped by the Roman underground scene. Her sound moves through percussive grooves and pulsing basslines, drawing inspiration from the energy of '90s and 2000s dancefloors, reworked through a contemporary and dynamic vision. Evolving toward hypnotic, percussion-driven sounds, she delivers solid, dancefloor-focused sets. She has played at key venues such as Cieloterra, Forte Antenne, Warehouse 303, Gate Milano, and Serendipity with MRC.", instagram: 'https://www.instagram.com/s0ffice/', soundcloud: 'https://soundcloud.com/user-872402408', mixcloud: '' },
];

function initResidents() {
    const residentsRef = ref(database, 'gateRadio/residents');

    onValue(residentsRef, snap => {
        const container = $('#residents-list');
        const seedWrapper = $('#residents-seed-wrapper');
        const data = snap.val();

        if (!data) {
            container.innerHTML = '<p class="text-sm" style="color: var(--text-dim);">Nessun resident nel database.</p>';
            show(seedWrapper);
            return;
        }
        hide(seedWrapper);

        // Stesso ordine del sito: alfabetico per nome (il vecchio campo "order" resta nei dati ma non conta più)
        const items = Object.entries(data).sort((a, b) =>
            String(a[1].name || '').localeCompare(String(b[1].name || ''), 'it', { sensitivity: 'base' }));
        container.innerHTML = items.map(([key, r]) => {
            const hasBio = r.bio && r.bio.trim();
            const hasImg = r.image && r.image.trim();
            return `
                <div class="list-item">
                    <div class="flex items-center gap-4 min-w-0">
                        <img src="${hasImg ? r.image : 'assets/resident_placeholder.svg'}"
                            alt="" class="resident-thumb">
                        <div class="min-w-0">
                            <div class="font-semibold">${escapeHtml(r.name || '')}</div>
                            <div class="text-xs" style="color: var(--text-dim);">
                                ${hasImg ? '<i class="fas fa-image mr-1 accent"></i>' : '<i class="fas fa-image mr-1" style="opacity:.3;"></i>'}
                                ${hasBio ? '<i class="fas fa-file-alt mx-2 accent"></i>' : '<i class="fas fa-file-alt mx-2" style="opacity:.3;"></i>'}
                                ${r.instagram ? '<i class="fab fa-instagram mx-1 accent"></i>' : '<i class="fab fa-instagram mx-1" style="opacity:.3;"></i>'}
                                ${r.soundcloud ? '<i class="fab fa-soundcloud mx-1 accent"></i>' : '<i class="fab fa-soundcloud mx-1" style="opacity:.3;"></i>'}
                                ${r.mixcloud ? '<i class="fab fa-mixcloud mx-1 accent"></i>' : '<i class="fab fa-mixcloud mx-1" style="opacity:.3;"></i>'}
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;"
                            data-action="edit-resident" data-key="${key}">
                            <i class="fas fa-pen"></i> Modifica
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    });

    $('#residents-seed-btn').addEventListener('click', async () => {
        if (!confirm('Importare i 8 resident di default nel database?')) return;
        const updates = {};
        DEFAULT_RESIDENTS.forEach(r => {
            const safeKey = r.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            updates[safeKey] = r;
        });
        try {
            await update(ref(database, 'gateRadio/residents'), updates);
        } catch (err) {
            alert('Errore: ' + err.message);
        }
    });

    $('#residents-list').addEventListener('click', e => {
        const btn = e.target.closest('[data-action="edit-resident"]');
        if (!btn) return;
        openResidentModal(btn.dataset.key);
    });
}

function openResidentModal(key) {
    const modal = $('#resident-modal');
    get(ref(database, `gateRadio/residents/${key}`)).then(snap => {
        const data = snap.val();
        if (!data) return alert('Resident non trovato');
        $('#res-key').value = key;
        $('#resident-modal-title').textContent = `Modifica: ${data.name}`;
        $('#res-name').value = data.name || '';
        $('#res-image').value = data.image || '';
        $('#res-bio').value = data.bio || '';
        $('#res-bio-it').value = data.bio_it || '';
        $('#res-instagram').value = data.instagram || '';
        $('#res-soundcloud').value = data.soundcloud || '';
        $('#res-mixcloud').value = data.mixcloud || '';
        modal.classList.add('open');
    });
}

window.closeResidentModal = function() {
    $('#resident-modal').classList.remove('open');
};

$('#resident-form').addEventListener('submit', async e => {
    e.preventDefault();
    const key = $('#res-key').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        const data = {
            name:       $('#res-name').value.trim(),
            image:      $('#res-image').value.trim(),
            bio:        $('#res-bio').value.trim(),
            bio_it:     $('#res-bio-it').value.trim(),
            instagram:  $('#res-instagram').value.trim(),
            soundcloud: $('#res-soundcloud').value.trim(),
            mixcloud:   $('#res-mixcloud').value.trim(),
        };
        await update(ref(database, `gateRadio/residents/${key}`), data);
        feedback('resident-feedback', '✓ Salvato');
        setTimeout(() => closeResidentModal(), 600);
    } catch (err) {
        feedback('resident-feedback', 'Errore: ' + err.message, false);
    } finally {
        btn.disabled = false;
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE (shared)
// ═══════════════════════════════════════════════════════════════════════════

function deleteItem(path, label) {
    if (!confirm(`Eliminare "${label}"?`)) return;
    remove(ref(database, path)).catch(err => alert('Errore: ' + err.message));
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

// Una serata può essere spezzata in più dirette YouTube.
// Nel form si scrive una riga per diretta: "NOME ARTISTA | link" (o solo il link).
function parseLiveLinks(text) {
    return String(text || '')
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean)
        .map(row => {
            const i = row.lastIndexOf('|');
            if (i === -1) return { label: '', url: row };
            return { label: row.slice(0, i).trim(), url: row.slice(i + 1).trim() };
        })
        .filter(l => l.url && l.url !== '#');
}

function liveLinksToText(data) {
    if (Array.isArray(data.liveLinks) && data.liveLinks.length) {
        return data.liveLinks.map(l => (l.label ? l.label + ' | ' : '') + l.url).join('\n');
    }
    return (data.soundcloudUrl && data.soundcloudUrl !== '#') ? data.soundcloudUrl : '';
}

// Testo "pulito" per confronti: minuscole, senza accenti, spazi e punteggiatura
// ("Rosie C.P.T." → "rosiecpt")
function normalizeText(s) {
    return String(s || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// "2026-10-21" → "21/10/2026"
function formatDateIT(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || '');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/'/g, "\\'");
}
