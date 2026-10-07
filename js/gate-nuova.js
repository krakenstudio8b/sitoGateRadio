// js/gate-nuova.js — Modifiche di STRUTTURA della grafica nuova.
// Viene caricato solo quando è attiva la versione nuova (vedi js/style-toggle.js):
// la versione vecchia resta identica a prima.
//
//  1. Menu corto: RADIO · ARCHIVIO · EVENTI · RESIDENT · INFO + OPEN CALL, senza icone
//  2. Home: un solo "ASCOLTA ORA" (va dritto alla Radio) + blocco "GATE È"
//  3. Archivio: ricerca per artista/serata + filtri per tipo
(function () {
    const OPEN_CALL_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf_Ot0_OHSMYUuy2oyQtUJaMOaATIIkiMvNxKs_zMCRhZSMyg/viewform';
    const INSTAGRAM_URL = 'https://instagram.com/gateradio';

    const lang = () => (window.GateI18n ? window.GateI18n.getLang() : 'it');
    const t = (it, en) => (lang() === 'en' ? en : it);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const page = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';

    // ─── 1. MENU CORTO ──────────────────────────────────────────────────────────
    // Programmazione sta dentro Eventi; Chi siamo + Contatti diventano INFO.
    const NAV = [
        { href: 'radio.html',   it: 'RADIO',    en: 'RADIO',    pages: ['radio'] },
        { href: 'archive.html', it: 'ARCHIVIO', en: 'ARCHIVE',  pages: ['archive'] },
        { href: 'events.html',  it: 'EVENTI',   en: 'EVENTS',   pages: ['events', 'programmazione'] },
        { href: 'artists.html', it: 'RESIDENT', en: 'RESIDENTS', pages: ['artists'] },
        { href: 'about.html',   it: 'INFO',     en: 'INFO',     pages: ['about', 'contact'] },
    ];
    function buildMenu() {
        const desktop = document.querySelector('header nav > div.hidden.md\\:flex');
        const mobile = document.getElementById('mobile-menu');
        const item = (n) => `<a href="${n.href}" class="gn-nav-link${n.pages.includes(page) ? ' is-current' : ''}">${t(n.it, n.en)}</a>`;
        const cta = `<a href="${OPEN_CALL_URL}" target="_blank" rel="noopener" class="gn-nav-cta">OPEN CALL</a>`;
        if (desktop) {
            const keepD = [...desktop.children].filter(el => el.tagName !== 'A'); // selettore lingua
            desktop.className = 'gn-nav hidden md:flex';
            desktop.innerHTML = NAV.map(item).join('') + cta;
            keepD.forEach(el => desktop.appendChild(el));
        }
        if (mobile) {
            // il selettore lingua (se c'è) lo teniamo
            const keep = [...mobile.children].filter(el => el.tagName !== 'A');
            mobile.innerHTML = NAV.map(item).join('') + cta;
            keep.forEach(el => mobile.appendChild(el));
        }
    }

    // ─── 2. HOME ────────────────────────────────────────────────────────────────
    function buildHome() {
        if (page !== 'index') return;
        // un solo "ASCOLTA ORA": quello grande porta direttamente alla Radio
        const heroCta = document.querySelector('#hero-section a[href*="#live"]');
        if (heroCta) heroCta.setAttribute('href', 'radio.html');

        // blocco GATE È (Records lo aggiungiamo quando ci sarà qualcosa)
        const live = document.getElementById('live');
        if (!live || document.getElementById('gn-gate-e')) return;
        const tiles = [
            { k: 'RADIO', href: 'radio.html',
              d: t('Diretta 24/7 e tutti i set registrati in studio.', '24/7 stream and every set recorded in our studio.'),
              go: t('ASCOLTA', 'LISTEN') },
            { k: t('SERATE', 'NIGHTS'), href: 'events.html',
              d: t('Gate Nacht, showcase e collaborazioni con collettivi e locali.', 'Gate Nacht, showcases and collabs with collectives and venues.'),
              go: t('PROSSIME DATE', 'UPCOMING DATES') },
            { k: 'OPEN CALL', href: OPEN_CALL_URL, ext: true,
              d: t('Sei un DJ o un live act? Proponi il tuo set.', 'DJ or live act? Pitch us your set.'),
              go: t('PROPONI IL TUO SET', 'SUBMIT YOUR SET') },
            { k: 'MERCH', href: INSTAGRAM_URL, ext: true,
              d: t('Magliette e stampe Gate: le trovi alle nostre serate.', 'Gate tees and prints: find them at our nights.'),
              go: t('SEGUICI SU INSTAGRAM', 'FOLLOW ON INSTAGRAM') },
        ];
        const sec = document.createElement('section');
        sec.id = 'gn-gate-e';
        sec.className = 'gn-gate-e px-6';
        sec.innerHTML = `
            <div class="max-w-6xl mx-auto">
                <h2 class="gn-section-title">GATE <span class="text-[var(--accent)]">${t('È', 'IS')}</span></h2>
                <div class="gn-tiles">
                    ${tiles.map(x => `
                        <a class="gn-tile" href="${x.href}"${x.ext ? ' target="_blank" rel="noopener"' : ''}>
                            <span class="gn-tile-k">${x.k}</span>
                            <span class="gn-tile-d">${x.d}</span>
                            <span class="gn-tile-go">${x.go} →</span>
                        </a>`).join('')}
                </div>
            </div>`;
        live.insertAdjacentElement('afterend', sec);
    }

    // ─── 3. ARCHIVIO: RICERCA + FILTRI PER TIPO ─────────────────────────────────
    function kindOf(item) {
        const txt = `${item.artist || ''} ${item.title || ''}`.toUpperCase();
        if (/SHOWCASE/.test(txt)) return 'showcase';
        if (/NACHT|EVENT/.test(txt) || item._type === 'event') return 'serate';
        if (/RESIDENT/.test(txt)) return 'resident';
        return 'ospiti';
    }
    function buildArchiveSearch() {
        if (page !== 'archive') return;
        const grid = document.getElementById('archive-grid');
        const seasons = document.getElementById('archive-filters');
        if (!grid || !seasons || document.getElementById('gn-archive-tools')) return;

        const KINDS = [
            ['all', t('TUTTI', 'ALL')], ['resident', 'RESIDENT'], ['ospiti', t('OSPITI', 'GUESTS')],
            ['showcase', 'SHOWCASE'], ['serate', t('SERATE', 'NIGHTS')],
        ];
        const box = document.createElement('div');
        box.id = 'gn-archive-tools';
        box.className = 'gn-archive-tools';
        box.innerHTML = `
            <label class="sr-only" for="gn-search">${t('Cerca nell\'archivio', 'Search the archive')}</label>
            <input id="gn-search" type="search" autocomplete="off"
                   placeholder="${t('Cerca artista o serata…', 'Search artist or night…')}" class="gn-search">
            <div class="gn-kinds" role="group" aria-label="${t('Tipo di set', 'Set type')}">
                ${KINDS.map(([k, l], i) => `<button type="button" class="gn-kind${i === 0 ? ' is-active' : ''}" data-kind="${k}">${l}</button>`).join('')}
            </div>
            <p id="gn-count" class="gn-count" aria-live="polite"></p>`;
        seasons.insertAdjacentElement('beforebegin', box);

        let q = '';
        let kind = 'all';
        const input = box.querySelector('#gn-search');
        const count = box.querySelector('#gn-count');
        let empty = null;

        const apply = () => {
            const items = window._allArchiveItems || [];
            const byId = new Map(items.map(i => [String(i.id), i]));
            const words = q.toLowerCase().split(/\s+/).filter(Boolean);
            let shown = 0;
            grid.querySelectorAll('.archive-card[data-stream-id]').forEach(card => {
                const it = byId.get(card.dataset.streamId) || {};
                const hay = `${it.artist || ''} ${it.title || ''} ${(it.liveLinks || []).map(l => l.label).join(' ')} ${it.description || ''}`.toLowerCase();
                const ok = (kind === 'all' || kindOf(it) === kind) && words.every(w => hay.includes(w));
                card.style.display = ok ? '' : 'none';
                if (ok) shown++;
            });
            count.textContent = `${shown} set`;
            if (!empty) {
                empty = document.createElement('p');
                empty.className = 'gn-empty col-span-full';
            }
            empty.textContent = shown ? '' : t('Nessun set trovato. Prova con un altro nome.', 'No sets found. Try another name.');
            if (!shown && !grid.contains(empty)) grid.appendChild(empty);
            if (shown && grid.contains(empty)) empty.remove();
        };

        input.addEventListener('input', () => { q = input.value.trim(); apply(); });
        box.querySelectorAll('.gn-kind').forEach(b => b.addEventListener('click', () => {
            box.querySelectorAll('.gn-kind').forEach(x => x.classList.remove('is-active'));
            b.classList.add('is-active');
            kind = b.dataset.kind;
            apply();
        }));
        // la griglia viene ridisegnata (dati da Firebase, filtro stagioni): riapplichiamo
        new MutationObserver((muts) => {
            if (muts.some(m => [...m.addedNodes].some(n => n.classList && n.classList.contains('archive-card')))) apply();
        }).observe(grid, { childList: true });
        apply();
    }

    function rebuildHomeTiles() {
        const old = document.getElementById('gn-gate-e');
        if (old) { old.remove(); buildHome(); }
    }

    function init() {
        buildMenu();
        buildHome();
        buildArchiveSearch();
        // le traduzioni IT/EN cambiano i testi del menu: lo ricostruiamo
        document.addEventListener('click', (e) => {
            if (e.target.closest && e.target.closest('.lang-toggle-btn')) setTimeout(() => { buildMenu(); rebuildHomeTiles(); }, 50);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
