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
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
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
        container.innerHTML = items.map(([key, ev]) => `
            <div class="list-item">
                <div class="flex items-center gap-3 min-w-0">
                    ${ev.mainImage ? `<img src="${ev.mainImage}" alt="" class="resident-thumb" style="width:48px;height:48px;">` : ''}
                    <div class="min-w-0">
                        <div class="font-semibold truncate">${escapeHtml(ev.title || '')}</div>
                        <div class="text-xs" style="color: var(--text-dim);">
                            <span class="mono">${ev.date || ''}</span>
                            ${ev.location ? ' · ' + escapeHtml(ev.location) : ''}
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;"
                        data-action="edit-event" data-key="${key}">
                        <i class="fas fa-pen"></i> Modifica
                    </button>
                    <button class="btn btn-danger" style="padding:6px 12px;font-size:12px;"
                        data-action="delete-event" data-key="${key}" data-label="${escapeAttr(ev.title || '')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
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
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// STREAMS CRUD
// ═══════════════════════════════════════════════════════════════════════════

function initStreams() {
    const streamsRef = ref(database, 'gateRadio/streams');

    onValue(streamsRef, snap => {
        const container = $('#streams-list');
        const data = snap.val();
        if (!data) {
            container.innerHTML = '<p class="text-sm" style="color: var(--text-dim);">Nessuna live ancora.</p>';
            return;
        }
        const items = Object.entries(data).sort((a, b) => new Date(b[1].date) - new Date(a[1].date));
        container.innerHTML = items.map(([key, s]) => `
            <div class="list-item">
                <div class="flex items-center gap-3 min-w-0">
                    ${s.imageUrl ? `<img src="${s.imageUrl}" alt="" class="resident-thumb" style="width:48px;height:48px;">` : ''}
                    <div class="min-w-0">
                        <div class="font-semibold truncate">${escapeHtml(s.artist || '')}</div>
                        <div class="text-xs" style="color: var(--text-dim);">
                            <span class="mono">${s.date || ''}</span>
                            <span class="badge badge-season ml-2">${s.season || ''}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px;"
                        data-action="edit-stream" data-key="${key}">
                        <i class="fas fa-pen"></i> Modifica
                    </button>
                    <button class="btn btn-danger" style="padding:6px 12px;font-size:12px;"
                        data-action="delete-stream" data-key="${key}" data-label="${escapeAttr(s.artist || '')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    });

    $('#stream-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            feedback('stream-feedback', 'Salvataggio...');
            const stream = {
                artist:        $('#st-artist').value.trim(),
                title:         $('#st-title').value.trim() || 'LIVE STREAMING',
                date:          $('#st-date').value,
                timeStart:     $('#st-time-start').value || '18:00',
                timeEnd:       $('#st-time-end').value || '19:00',
                season:        $('#st-season').value,
                soundcloudUrl: $('#st-url').value.trim() || '#',
                imageUrl:      $('#st-image').value.trim(),
                tags:          $('#st-tags').value.split(',').map(t => t.trim()).filter(Boolean),
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
    });
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
            $('#edit-url').value = data.soundcloudUrl && data.soundcloudUrl !== '#' ? data.soundcloudUrl : '';
            editGallery = data.imageUrl ? [data.imageUrl] : [];
        }

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
            updates = {
                title:         $('#edit-title').value.trim(),
                artist:        $('#edit-artist').value.trim(),
                date,
                timeStart:     $('#edit-time-start').value || '18:00',
                timeEnd:       $('#edit-time-end').value || '19:00',
                season:        $('#edit-season').value,
                soundcloudUrl: $('#edit-url').value.trim() || '#',
                imageUrl:      editGallery[0] || '',
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
    { name: 'COUNTERCULTURE',  order: 30, image: 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/residents/counterculture.jpg', bio: 'Manuel López (Counterculture) is a Colombian DJ and live act based in Rome, focused on underground techno, modular live performance and hybrid sets combining vinyl, hardware and digital sources. A member of Gate Radio and resident of the Bugs collective, his sound is raw, hypnotic and functional for the dancefloor. He has performed at underground clubs and spaces in Rome such as Brancaleone and Hacienda, as well as independent venues, record stores and alternative organizations.', instagram: 'https://www.instagram.com/counterculturx/', soundcloud: 'https://soundcloud.com/counterculture666', mixcloud: '' },
    { name: 'MRQS',            order: 40, image: 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/residents/mrqs.jpg', bio: "MRQS brings together two worlds: that of a sound engineer and sound designer, and that of a DJ. This dual expertise is clearly reflected in his sets, which are meticulously crafted, powerful in impact, and surprising in their selections. He moves seamlessly from tribal hardgroove to techno atmospheres, all the way to UK garage grooves, maintaining constant attention to sound quality and the room's response. His experience has been shaped on stages such as Acrobax and through numerous events for various collectives. Beyond the decks, he is the founder and driving force behind Gate Radio.", instagram: 'https://www.instagram.com/romarcomani/', soundcloud: 'https://soundcloud.com/marco-romani-308872897', mixcloud: '' },
    { name: 'MERLO',           order: 50, image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
    { name: 'PUG',             order: 60, image: 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/residents/pug.jpg', bio: 'Pug is a sound designer and producer of club and experimental music. His productions stand out for their use of synthesized sounds, creative sample processing, and polyrhythms. In addition to his DJ career, he performs live sets both solo and B2B, with an approach focused on techno and bass music. His track Cast Iron Plate is included in the compilation Nodi 001.', instagram: 'https://www.instagram.com/prod.pug/', soundcloud: 'https://soundcloud.com/user-66581760', mixcloud: '' },
    { name: 'ROBBSS',          order: 70, image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
    { name: 'SOFFICE',         order: 80, image: 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/residents/soffice.jpg', bio: "A key resident of Freenetica Crew, Soffice is a techno DJ shaped by the Roman underground scene. Her sound moves through percussive grooves and pulsing basslines, drawing inspiration from the energy of '90s and 2000s dancefloors, reworked through a contemporary and dynamic vision. Evolving toward hypnotic, percussion-driven sounds, she delivers solid, dancefloor-focused sets. She has played at key venues such as Cieloterra, Forte Antenne, Warehouse 303, Gate Milano, and Serendipity with MRC.", instagram: 'https://www.instagram.com/s0ffice/', soundcloud: 'https://soundcloud.com/user-872402408', mixcloud: '' },
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

        const items = Object.entries(data).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
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
        $('#res-order').value = data.order || 0;
        $('#res-image').value = data.image || '';
        $('#res-bio').value = data.bio || '';
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
            order:      parseInt($('#res-order').value, 10) || 0,
            image:      $('#res-image').value.trim(),
            bio:        $('#res-bio').value.trim(),
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

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/'/g, "\\'");
}
