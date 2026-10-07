// js/gate-nuova.js — Modifiche di STRUTTURA della grafica nuova.
// Viene caricato solo quando è attiva la versione nuova (vedi js/style-toggle.js):
// la versione vecchia resta identica a prima.
//
//  1. Menu corto: RADIO · ARCHIVIO · EVENTI · RESIDENT · INFO + OPEN CALL, senza icone
//  2. Home: un solo "ASCOLTA ORA" (va dritto alla Radio)
//  4. Chi siamo: descrizione nuova
//  3. Archivio: ricerca per artista/serata + filtri per tipo
(function () {
    const OPEN_CALL_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf_Ot0_OHSMYUuy2oyQtUJaMOaATIIkiMvNxKs_zMCRhZSMyg/viewform';

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
    }

    // ─── 4. CHI SIAMO: DESCRIZIONE NUOVA ────────────────────────────────────────
    // Testo costruito sul post della open call + i dati dell'archivio.
    const ABOUT = {
        sub: { it: 'Expanding sound boundaries.', en: 'Expanding sound boundaries.' },
        p: [
            { it: "Gate Radio è un progetto indipendente nato a Roma alla fine del 2024, dedicato alla musica elettronica e alla promozione dell'arte in ogni sua forma. Siamo un collettivo: dal nostro studio trasmettiamo dirette DJ e live set, organizziamo serate e apriamo le porte a chi ha qualcosa da dire con la propria musica.",
              en: "Gate Radio is an independent project born in Rome at the end of 2024, devoted to electronic music and to promoting art in all its forms. We are a collective: from our studio we stream DJ and live sets, we throw nights and we open our doors to anyone with something to say through their music." },
            { it: "Dalla prima diretta, nel novembre 2024, sono passate da qui più di 60 sessioni: i nostri resident, ospiti dalla scena romana e italiana e artistə che oggi suonano tra Berlino e il resto d'Europa. Ogni set resta nel nostro archivio, la memoria di tutto quello che è passato da questa console.",
              en: "Since our first stream in November 2024, more than 60 sessions have gone through here: our residents, guests from the Roman and Italian scene and artists now playing between Berlin and the rest of Europe. Every set stays in our archive, the memory of everything that has passed through this booth." },
            { it: "Il nostro spazio è anche un punto d'incontro tra realtà diverse. Abbiamo ospitato gli showcase di collettivi ed etichette come Freenetica, ASS3, Resistance is Techno, Bugs, Glumpat, Boiler Groove, Blink, Hangover, Footwork e Prima o Poi Music, e portiamo il nostro suono fuori dallo studio con le serate Gate Nacht.",
              en: "Our space is also a meeting point between different realities. We have hosted showcases by collectives and labels such as Freenetica, ASS3, Resistance is Techno, Bugs, Glumpat, Boiler Groove, Blink, Hangover, Footwork and Prima o Poi Music, and we take our sound beyond the studio with our Gate Nacht nights." },
            { it: "La programmazione segue il ritmo delle stagioni: ognuna ha i suoi colori e le sue atmosfere, e cambia insieme alla musica che passa in radio.",
              en: "Our programming follows the rhythm of the seasons: each one has its own colours and atmosphere, changing together with the music on air." },
            { it: "Crediamo nelle opportunità reali e vogliamo dare voce a chi spesso non trova spazio altrove: che tu sia unə DJ, unə live performer con esperienza o unə giovane artistə alla ricerca della prima vera occasione, questo spazio è anche tuo. La nostra Open Call è aperta.",
              en: "We believe in real opportunities and want to give a voice to those who rarely find room elsewhere: whether you are a DJ, an experienced live performer or a young artist looking for your first real chance, this space is yours too. Our Open Call is open." },
        ],
    };
    function buildAbout() {
        if (page !== 'about') return;
        const sub = document.querySelector('[data-i18n="about.identdesc"], #gn-about-sub');
        const box = document.querySelector('#chi-siamo-section .chi-siamo-text');
        if (!sub || !box) return;
        const l = lang() === 'en' ? 'en' : 'it';
        // togliamo il collegamento alle vecchie traduzioni, altrimenti il cambio
        // lingua rimetterebbe il testo vecchio
        sub.removeAttribute('data-i18n');
        sub.id = 'gn-about-sub';
        sub.textContent = ABOUT.sub[l];
        box.innerHTML = ABOUT.p.map(x => `<p>${esc(x[l])}</p>`).join('') +
            `<p class="gn-about-cta"><a href="${OPEN_CALL_URL}" target="_blank" rel="noopener">${l === 'en' ? 'SUBMIT YOUR SET' : 'PROPONI IL TUO SET'} →</a></p>`;
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

    function init() {
        buildMenu();
        buildHome();
        buildAbout();
        buildArchiveSearch();
        // le traduzioni IT/EN cambiano i testi del menu: lo ricostruiamo
        document.addEventListener('click', (e) => {
            if (e.target.closest && e.target.closest('.lang-toggle-btn')) setTimeout(() => { buildMenu(); buildAbout(); }, 50);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
