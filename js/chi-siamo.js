// Chi siamo (about.html): testi IT/EN, numeri veri dall'archivio, stagioni da
// toccare, il "cancello" che si apre scorrendo, entrate morbide delle sezioni.
// Stile in css/chi-siamo.css.
(function () {
    'use strict';
    const page = document.querySelector('main.ab');
    if (!page) return;

    const OPEN_CALL_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf_Ot0_OHSMYUuy2oyQtUJaMOaATIIkiMvNxKs_zMCRhZSMyg/viewform';
    // Testo dalla descrizione ufficiale di GATE Radio (05/11/2026) + il post della open call
    const TESTI = [
        { it: "Nata dal basso e per il basso, GATE Radio si propone come uno spazio di condivisione, ricerca e sperimentazione sonora.",
          en: "Born from the ground up, for the underground, GATE Radio sets out to be a space for sharing, research and sonic experimentation." },
        { it: "Attraverso live streaming, set di singoli artisti e showcase di collettivi, GATE esplora diverse sonorità e dà spazio a progetti indipendenti e nuove realtà della scena elettronica.",
          en: "Through live streams, solo artist sets and collective showcases, GATE explores different sounds and gives space to independent projects and new names in the electronic scene." },
        { it: "Crediamo nelle opportunità reali e vogliamo dare voce a chi spesso non trova spazio altrove: che tu sia unə DJ, unə live performer con esperienza o unə giovane artistə alla ricerca della prima vera occasione. La nostra open call è sempre aperta.",
          en: "We believe in real opportunities and want to give a voice to those who rarely find room elsewhere: whether you are a DJ, an experienced live performer or a young artist looking for your first real chance. Our open call is always open." },
    ];
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => (window.GateI18n && window.GateI18n.getLang() === 'en') ? 'en' : 'it';

    page.querySelectorAll('[data-open-call]').forEach(a => { a.href = OPEN_CALL_URL; });

    function scriviTesti() {
        const l = lang();
        page.querySelectorAll('[data-it]').forEach(el => { el.textContent = el.dataset[l] || el.dataset.it; });
        page.querySelectorAll('[data-ab-p]').forEach(box => {
            box.innerHTML = box.dataset.abP.split(',').map(i => {
                return `<p>${esc(TESTI[+i][l])}</p>`;
            }).join('');
        });
    }

    // ── numeri veri: dirette, artistə, showcase, Gate Nacht, dirette per stagione
    const STAGIONI = ['winter', 'spring', 'summer', 'autumn'];
    function stagioneDa(dateStr) {
        const d = new Date(dateStr + 'T12:00:00'), m = d.getMonth(), g = d.getDate();
        const iniPrim = d.getFullYear() === 2026 ? 28 : 21;
        if ((m === 2 && g >= iniPrim) || (m > 2 && m < 5) || (m === 5 && g < 21)) return 'spring';
        if ((m === 5 && g >= 21) || (m > 5 && m < 8) || (m === 8 && g < 21)) return 'summer';
        if ((m === 8 && g >= 21) || (m > 8 && m < 11) || (m === 11 && g < 21)) return 'autumn';
        return 'winter';
    }
    function contaNumeri(data) {
        const seen = new Set();
        const streams = [...(window.streamsData || []), ...((data && data.streams) || [])]
            .filter(x => x && x.date && !seen.has(String(x.id)) && seen.add(String(x.id)));
        const events = (data && data.events) || window.eventsData || [];
        const now = new Date();
        const fine = (x) => new Date(`${x.date}T${x.timeEnd || '23:59'}:00`);
        const passate = streams.filter(x => fine(x) < now && x.noLive !== true);
        if (!passate.length) return;
        // stessi nomi della striscia in fondo alla pagina
        const skip = /^(SHOWCASE|GATE|SERATA|EVENT|2024 ARTIST|TEST)/i;
        const nomi = new Set();
        passate.forEach(x => {
            const labels = (x.liveLinks || []).map(k => k.label).filter(Boolean);
            const parts = /SHOWCASE/i.test(x.artist || '') ? labels
                : (x.artist || '').replace(/\(.*?\)/g, '').split(/,|\||&| \+ |\bb2b\b| x /i);
            parts.forEach(n => { n = String(n).trim().toUpperCase(); if (n.length > 1 && !skip.test(n)) nomi.add(n); });
        });
        const perStagione = {};
        STAGIONI.forEach(s => { perStagione[s] = 0; });
        passate.forEach(x => {
            const s = String(x.season || '').toLowerCase();
            perStagione[STAGIONI.includes(s) ? s : stagioneDa(x.date)]++;
        });
        const titolo = (e) => String(e.title || '').toUpperCase();
        const val = {
            dirette: passate.length,
            artisti: nomi.size,
            showcase: events.filter(e => titolo(e).includes('SHOWCASE')).length,
            nacht: events.filter(e => titolo(e).includes('NACHT')).length,
        };
        STAGIONI.forEach(s => { val['st-' + s] = perStagione[s]; });
        Object.entries(val).forEach(([k, v]) => {
            const el = page.querySelector(`[data-num="${k}"]`);
            if (el && v) el.textContent = v;
        });
    }

    // ── stagioni: quella di oggi segnata "adesso"; toccandone una il sito si colora così
    function stagioni() {
        const row = page.querySelector('.ab-stagioni-row');
        if (!row) return;
        const html = document.documentElement;
        const oggi = STAGIONI.find(s => html.classList.contains(s)) || stagioneDa(new Date().toISOString().slice(0, 10));
        const btns = [...row.querySelectorAll('.ab-st')];
        btns.forEach(b => b.classList.toggle('is-ora', b.dataset.st === oggi));
        const scegli = (s) => {
            html.classList.remove(...STAGIONI);
            html.classList.add(s);
            const diversa = s !== oggi;
            row.classList.toggle('has-scelta', diversa);
            btns.forEach(b => {
                const on = diversa && b.dataset.st === s;
                b.classList.toggle('is-scelta', on);
                b.setAttribute('aria-pressed', String(on));
            });
        };
        btns.forEach(b => b.addEventListener('click', () => {
            // ritoccando quella scelta si torna alla stagione di oggi
            scegli(b.classList.contains('is-scelta') ? oggi : b.dataset.st);
        }));
    }

    // ── il cancello: scorrendo il simbolo si allarga e si entra nel colore della stagione
    function cancello() {
        const sec = page.querySelector('.ab-gate');
        const stage = sec && sec.querySelector('.ab-gate-stage');
        if (!stage || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const clamp = (v) => Math.max(0, Math.min(1, v));
        let raf = 0;
        const aggiorna = () => {
            raf = 0;
            const corsa = sec.offsetHeight - stage.offsetHeight;
            const p = clamp((-sec.getBoundingClientRect().top + (parseFloat(getComputedStyle(stage).top) || 0)) / (corsa || 1));
            const s = stage.querySelector('.ab-gate-logo').offsetWidth || 1;
            // il cerchio centrale (27% del simbolo) deve coprire tutto lo schermo
            const diag = Math.hypot(stage.offsetWidth, stage.offsetHeight);
            const kMax = (diag / 0.27) / s * 1.1;
            const e = Math.pow(p, 2.2);
            const k = 1 + (kMax - 1) * e;
            stage.style.setProperty('--p', p.toFixed(4));
            stage.style.setProperty('--k', k.toFixed(4));
            stage.style.setProperty('--m', (s * k).toFixed(1) + 'px');
            stage.style.setProperty('--o', clamp(1 - (p - 0.05) / 0.3).toFixed(3)); // il bianco lascia il posto al colore
            stage.style.setProperty('--t', clamp(1 - p / 0.12).toFixed(3));          // titolo via subito
            stage.style.setProperty('--c', clamp((p - 0.72) / 0.18).toFixed(3));     // "Chi siamo" alla fine
        };
        const chiedi = () => { if (!raf) raf = requestAnimationFrame(aggiorna); };
        addEventListener('scroll', chiedi, { passive: true });
        addEventListener('resize', chiedi);
        aggiorna();
    }

    // ── entrate: titolo, poi testo, poi immagini (60–90 ms l'uno dall'altro)
    function entrate() {
        if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const gruppi = page.querySelectorAll('.ab-intro, .ab-numeri, .ab-foto, .ab-nacht, .ab-stagioni, .ab-open');
        gruppi.forEach(g => {
            // (sui contenitori, non sui pulsanti: le loro transizioni restano rapide)
            const pezzi = g.querySelectorAll('.ab-h2, .ab-intro-photo, .ab-intro-text [data-ab-p], .ab-num > div, .ab-stagioni-head p, .ab-stagioni-row, .ab-frase, .ab-foto-larga, .ab-foto-riga figure, .ab-regole li, .ab-open p, .ab-open-btns');
            pezzi.forEach((el, i) => { el.classList.add('ab-in'); el.style.setProperty('--d', `${Math.min(i, 6) * 75}ms`); });
        });
        const io = new IntersectionObserver((voci) => {
            voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('ab-vista'); io.unobserve(v.target); } });
        }, { rootMargin: '0px 0px -10% 0px' });
        page.querySelectorAll('.ab-in').forEach(el => io.observe(el));
    }

    scriviTesti();
    stagioni();
    cancello();
    entrate();
    // dati: se firebase-data.js non è ancora partito, aspettiamo la fine del caricamento
    const numeri = () => {
        if (window.gateRadioDataPromise) window.gateRadioDataPromise.then(contaNumeri).catch(() => {});
        else contaNumeri(null);
    };
    if (window.gateRadioDataPromise || document.readyState === 'complete') numeri();
    else addEventListener('load', numeri, { once: true });
    document.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('.lang-toggle-btn')) setTimeout(scriviTesti, 60);
    });
})();
