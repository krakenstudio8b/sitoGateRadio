// js/gate-nuova.js — Modifiche di STRUTTURA della grafica nuova.
// Viene caricato solo quando è attiva la versione nuova (vedi js/style-toggle.js):
// la versione vecchia resta identica a prima.
//
//  1. Menu corto: RADIO · ARCHIVIO · EVENTI · RESIDENT · INFO + OPEN CALL, senza icone
//  2. Home: un solo "ASCOLTA ORA" (va dritto alla Radio)
//  4. Chi siamo: descrizione nuova
//  5. Footer: striscia artisti, prossimo appuntamento, link/contatti/social
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

        // presentazione dentro la torre, al posto della vecchia riga
        // "Live Streaming • Eventi stagionali • Archivio esclusivo"
        const hero = document.getElementById('hero-section');
        if (!hero) return;
        const l = lang() === 'en' ? 'en' : 'it';
        const sub = hero.querySelector('[data-i18n="home.subtitle"], .gn-hero-claim');
        if (sub) {
            sub.removeAttribute('data-i18n');
            sub.className = 'gn-hero-claim hero-text-shadow';
            sub.textContent = l === 'en'
                ? 'An independent project born in Rome: a radio, our nights and a booth open to anyone with something to say through their music.'
                : 'Un progetto indipendente nato a Roma: una radio, le nostre serate e una console aperta a chi ha qualcosa da dire con la propria musica.';
        }
        hero.querySelector('.gn-hero-more')?.remove();
        if (heroCta) {
            const more = document.createElement('a');
            more.className = 'gn-hero-more';
            more.href = 'about.html';
            more.textContent = l === 'en' ? 'Who we are →' : 'Chi siamo →';
            heroCta.insertAdjacentElement('afterend', more);
        }
    }

    // ─── 4. CHI SIAMO: DESCRIZIONE NUOVA ────────────────────────────────────────
    // Testo costruito sul post della open call + i dati dell'archivio.
    const ABOUT = {
        sub: { it: 'Expanding sound boundaries.', en: 'Expanding sound boundaries.' },
        p: [
            { it: "Gate Radio è un progetto indipendente nato a Roma alla fine del 2024, dedicato alla musica elettronica e alla promozione dell'arte in ogni sua forma. Siamo un collettivo: dal nostro studio trasmettiamo dirette DJ e live set, organizziamo serate e apriamo le porte a chi ha qualcosa da dire con la propria musica.",
              en: "Gate Radio is an independent project born in Rome at the end of 2024, devoted to electronic music and to promoting art in all its forms. We are a collective: from our studio we stream DJ and live sets, we throw nights and we open our doors to anyone with something to say through their music." },
            { it: "Dalla prima diretta, nel novembre 2024, sono passatə dalla nostra console più di 90 artistə: i nostri resident, ospiti dalla scena romana e italiana e artistə che oggi suonano tra Berlino e il resto d'Europa. Ogni set resta nel nostro archivio, la memoria di tutto quello che è passato da qui.",
              en: "Since our first stream in November 2024, more than 90 artists have played behind our decks: our residents, guests from the Roman and Italian scene and artists now playing between Berlin and the rest of Europe. Every set stays in our archive, the memory of everything that has passed through here." },
            { it: "Il nostro spazio è anche un punto d'incontro tra realtà diverse. Abbiamo ospitato gli showcase di collettivi ed etichette come Freenetica, ASS3, Resistance is Techno, Bugs, Glumpat, Boiler Groove, Blink, Hangover, Footwork e Prima o Poi Music, e portiamo il nostro suono fuori dallo studio con le serate Gate Nacht.",
              en: "Our space is also a meeting point between different realities. We have hosted showcases by collectives and labels such as Freenetica, ASS3, Resistance is Techno, Bugs, Glumpat, Boiler Groove, Blink, Hangover, Footwork and Prima o Poi Music, and we take our sound beyond the studio with our Gate Nacht nights." },
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

    // ─── 5. FOOTER: colonne ordinate (sito, contatti, social) ─────────────────────────────────
    function buildFooter() {
        const area = document.querySelector('.footer-main-area');
        if (!area) return;
        const socialsSrc = area.dataset.gnSocials || [...area.querySelectorAll('a.footer-social-link')].map(a => a.outerHTML).join('');
        area.dataset.gnSocials = socialsSrc;
        const l = lang() === 'en' ? 'en' : 'it';
        const links = NAV.map(n => `<a href="${n.href}">${t(n.it, n.en)}</a>`).join('');
        const claim = l === 'en'
            ? 'Independent radio and collective from Rome. Live sets from our studio, nights around the city, an open call that never closes.'
            : 'Radio e collettivo indipendente da Roma. Dirette dal nostro studio, serate in giro per la città, un open call sempre aperto.';
        area.innerHTML = `
            <div class="gn-ticker" aria-hidden="true"><div class="gn-ticker-track"></div></div>
            <div class="gn-foot max-w-6xl mx-auto px-6">
                <div class="gn-foot-top">
                    <div class="gn-foot-brand">
                        <img src="https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/logogate2.png" alt="" class="gn-foot-logo" width="56" height="56" loading="lazy">
                        <div>
                            <p class="gn-foot-name">GATE <span class="text-[var(--accent)]">RADIO</span></p>
                            <p class="gn-foot-claim">${claim}</p>
                        </div>
                    </div>
                    <a class="gn-foot-next" id="gn-foot-next" href="events.html" hidden></a>
                </div>
                <div class="gn-foot-cols">
                    <div>
                        <p class="gn-foot-h">${t('SITO', 'SITE')}</p>
                        <nav class="gn-foot-links">${links}</nav>
                    </div>
                    <div>
                        <p class="gn-foot-h">${t('CONTATTI', 'CONTACT')}</p>
                        <div class="gn-foot-links">
                            <a href="mailto:gateradiorm@gmail.com">gateradiorm@gmail.com</a>
                            <a href="${OPEN_CALL_URL}" target="_blank" rel="noopener">${t('Proponi il tuo set', 'Submit your set')}</a>
                            <a href="contact.html">${t('Scrivici', 'Write to us')}</a>
                        </div>
                    </div>
                    <div>
                        <p class="gn-foot-h">${t('SEGUICI', 'FOLLOW')}</p>
                        <div class="gn-foot-socials">${socialsSrc}</div>
                    </div>
                </div>
            </div>`;
        const bottom = document.querySelector('body > footer p');
        if (bottom) bottom.innerHTML = `© ${new Date().getFullYear()} <span class="grifter-font">GATE RADIO</span> · ROMA · EXPANDING SOUND BOUNDARIES`;
        fillFooterData();
    }

    // Dati veri nel footer: chi è passato da Gate (striscia) + prossimo appuntamento
    function fillFooterData() {
        const run = () => {
            const streams = window.streamsData || [];
            const events = window.eventsData || [];
            const now = new Date();
            const endOf = (x) => new Date(`${x.date}T${x.timeEnd || '23:59'}:00`);
            // striscia con i nomi degli artisti passati da Gate, dai più recenti
            const skip = /^(SHOWCASE|GATE|SERATA|EVENT|2024 ARTIST|TEST)/i;
            const names = [];
            streams.filter(x => x.date && endOf(x) < now)
                .sort((a, b) => b.date.localeCompare(a.date))
                .forEach(x => {
                    const labels = (x.liveLinks || []).map(k => k.label).filter(Boolean);
                    const parts = /SHOWCASE/i.test(x.artist || '') ? labels
                        : (x.artist || '').replace(/\(.*?\)/g, '').split(/,|\||&| \+ |\bb2b\b| x /i);
                    parts.forEach(n => {
                        n = String(n).trim().toUpperCase();
                        if (n.length > 1 && !skip.test(n) && !names.includes(n)) names.push(n);
                    });
                });
            const track = document.querySelector('.gn-ticker-track');
            if (track && names.length) {
                const row = names.slice(0, 70).map(n => `<span>${esc(n)}</span>`).join('<b aria-hidden="true">/</b>');
                track.innerHTML = `<div>${row}<b aria-hidden="true">/</b></div><div>${row}<b aria-hidden="true">/</b></div>`;
            }
            // prossimo appuntamento: la prima live o evento pubblicato non ancora finito
            const next = [...streams.map(x => ({ ...x, _k: 'live' })), ...events.map(x => ({ ...x, _k: 'event' }))]
                .filter(x => x.date && endOf(x) >= now)
                .sort((a, b) => (a.date + (a.timeStart || '')).localeCompare(b.date + (b.timeStart || '')))[0];
            const box = document.getElementById('gn-foot-next');
            if (box && next) {
                const img = next.imageUrl || next.mainImage || '';
                const name = next._k === 'event' ? next.title : next.artist;
                const d = new Date(next.date).toLocaleDateString(lang() === 'en' ? 'en-GB' : 'it-IT',
                    { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
                const where = next._k === 'event' ? String(next.location || '').split('·')[0].trim() : (next.location || 'Gate Studio');
                box.href = next._k === 'event' ? 'events.html' : 'index.html#live';
                box.innerHTML = `
                    ${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}
                    <span class="gn-foot-next-txt">
                        <span class="gn-foot-h">${t('PROSSIMO APPUNTAMENTO', 'NEXT UP')}</span>
                        <span class="gn-foot-next-name">${esc(name)}</span>
                        <span class="gn-foot-next-meta">${esc(d)}${next.timeStart ? ' · ' + esc(next.timeStart) : ''}${where ? ' · ' + esc(where) : ''}</span>
                    </span>`;
                box.hidden = false;
            }
        };
        if (window.gateRadioDataPromise) window.gateRadioDataPromise.then(() => setTimeout(run, 50)).catch(() => {});
        else run();
    }

    function init() {
        buildMenu();
        buildHome();
        buildAbout();
        buildArchiveSearch();
        buildFooter();
        // le traduzioni IT/EN cambiano i testi del menu: lo ricostruiamo
        document.addEventListener('click', (e) => {
            if (e.target.closest && e.target.closest('.lang-toggle-btn')) setTimeout(() => { buildMenu(); buildHome(); buildAbout(); buildFooter(); }, 50);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
