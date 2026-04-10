// ═══ GATE RADIO — i18n (IT / EN) ═══════════════════════════════════════════
(function () {
    const translations = {
        // ── NAV ──────────────────────────────────────────────────────────────
        'nav.archive':      { it: 'ARCHIVIO',        en: 'ARCHIVE' },
        'nav.schedule':     { it: 'PROGRAMMAZIONE',   en: 'SCHEDULE' },
        'nav.events':       { it: 'EVENTI',           en: 'EVENTS' },
        'nav.about':        { it: 'CHI SIAMO',        en: 'ABOUT US' },
        'nav.contact':      { it: 'CONTATTI',         en: 'CONTACT' },

        // ── FOOTER ──────────────────────────────────────────────────────────
        'footer.desc':      { it: 'Un portale sulla techno, scandito dal ritmo delle stagioni. Esploriamo le sfumature della musica elettronica e le condividiamo con la nostra community.',
                              en: 'A portal on techno, driven by the rhythm of the seasons. We explore the nuances of electronic music and share them with our community.' },
        'footer.links':     { it: 'LINK VELOCI',     en: 'QUICK LINKS' },
        'footer.follow':    { it: 'SEGUICI',          en: 'FOLLOW US' },
        'footer.rights':    { it: 'Tutti i diritti riservati', en: 'All rights reserved' },
        'footer.desc.short':{ it: 'Un portale sulla techno, scandito dal ritmo delle stagioni.', en: 'A portal on techno, driven by the rhythm of the seasons.' },
        'footer.radio247':  { it: 'Radio 24/7',             en: 'Radio 24/7' },
        'footer.archive':   { it: 'Archivio',        en: 'Archive' },
        'footer.schedule':  { it: 'Programmazione',   en: 'Schedule' },
        'footer.events':    { it: 'Eventi',           en: 'Events' },
        'footer.about':     { it: 'Chi Siamo',        en: 'About Us' },
        'footer.contact':   { it: 'Contatti',         en: 'Contact' },

        // ── HOME ────────────────────────────────────────────────────────────
        'home.subtitle':    { it: 'Live Streaming \u2022 Eventi stagionali \u2022 Archivio esclusivo',
                              en: 'Live Streaming \u2022 Seasonal Events \u2022 Exclusive Archive' },
        'home.cta':         { it: 'ASCOLTA ORA',      en: 'LISTEN NOW' },
        'home.latest':      { it: 'ULTIME <span class="text-[var(--accent)]">DIRETTE</span>',
                              en: 'LATEST <span class="text-[var(--accent)]">STREAMS</span>' },
        'home.goarchive':   { it: "VAI ALL'ARCHIVIO", en: 'GO TO ARCHIVE' },
        'home.ourevents':   { it: 'I NOSTRI <span class="text-[var(--accent)]">EVENTI</span>',
                              en: 'OUR <span class="text-[var(--accent)]">EVENTS</span>' },
        'home.eventsdesc':  { it: 'Le nostre serate e i nostri appuntamenti speciali.', en: 'Our parties and special events.' },
        'home.allevents':   { it: 'TUTTI GLI EVENTI', en: 'ALL EVENTS' },

        // ── ARCHIVE ─────────────────────────────────────────────────────────
        'archive.title':    { it: "ESPLORA L'<span class=\"text-[var(--accent)]\">ARCHIVIO</span>",
                              en: 'EXPLORE THE <span class="text-[var(--accent)]">ARCHIVE</span>' },
        'archive.desc':     { it: 'Rivivi le nostre dirette passate. Filtra per stagione.', en: 'Relive our past streams. Filter by season.' },
        'archive.all':      { it: 'TUTTE',            en: 'ALL' },
        'archive.spring':   { it: 'PRIMAVERA',        en: 'SPRING' },
        'archive.summer':   { it: 'ESTATE',           en: 'SUMMER' },
        'archive.autumn':   { it: 'AUTUNNO',          en: 'AUTUMN' },
        'archive.winter':   { it: 'INVERNO',          en: 'WINTER' },

        // ── EVENTS ──────────────────────────────────────────────────────────
        'events.title':     { it: 'I NOSTRI <span class="text-[var(--accent)]">EVENTI</span>',
                              en: 'OUR <span class="text-[var(--accent)]">EVENTS</span>' },
        'events.desc':      { it: 'Scopri i nostri eventi fisici passati e futuri.', en: 'Discover our past and upcoming events.' },

        // ── ARTISTS / RESIDENT ──────────────────────────────────────────────
        'artists.title':    { it: 'I NOSTRI <span class="text-[var(--accent)]">RESIDENT</span>',
                              en: 'OUR <span class="text-[var(--accent)]">RESIDENTS</span>' },
        'artists.desc':     { it: 'I talenti che rappresentano il sound di Gate Radio.', en: 'The talents that represent the sound of Gate Radio.' },

        // ── ABOUT ───────────────────────────────────────────────────────────
        'about.hero':       { it: 'IL PROGETTO <span class="text-[var(--accent)] grifter-font">GATE RADIO</span>',
                              en: 'THE <span class="text-[var(--accent)] grifter-font">GATE RADIO</span> PROJECT' },
        'about.herosub':    { it: 'La nostra storia, la nostra visione, la nostra musica.', en: 'Our story, our vision, our music.' },
        'about.herocta':    { it: 'Scopri Chi Siamo', en: 'Discover Who We Are' },
        'about.identity':   { it: 'LA NOSTRA <span class="text-[var(--accent)]">IDENTIT\u00C0</span>',
                              en: 'OUR <span class="text-[var(--accent)]">IDENTITY</span>' },
        'about.identdesc':  { it: 'Un portale sulla techno, scandito dal ritmo delle stagioni.', en: 'A portal on techno, driven by the rhythm of the seasons.' },
        'about.bio1':       { it: 'Gate Radio nasce alla fine del 2024 da un gruppo di giovani appassionati di musica elettronica, uniti da un sogno condiviso: creare uno spazio di incontro sonoro dove talenti emergenti e artisti affermati potessero convergere e crescere insieme.',
                              en: 'Gate Radio was born at the end of 2024 from a group of young electronic music enthusiasts, united by a shared dream: creating a sonic meeting space where emerging talents and established artists could converge and grow together.' },
        'about.bio2':       { it: "Più di una semplice piattaforma di streaming, Gate Radio è un viaggio musicale che celebra i suoni più innovativi e sperimentali, con l\u2019ambizione di spingere sempre più in là i confini del suono. Al centro c\u2019è un legame profondo con il ciclo naturale delle stagioni \u2014 crediamo che la musica, come la natura, abbia i propri ritmi e le proprie atmosfere. Per questo la nostra programmazione si evolve durante l\u2019anno, cambiando colori e suoni al passare dei mesi.",
                              en: "More than just a streaming platform, Gate Radio is a musical journey celebrating the most innovative and experimental sounds, with the ambition of always pushing the boundaries of sound further. At its core lies a deep connection with the natural cycle of the seasons \u2014 we believe music, like nature, has its own rhythms and atmospheres. That\u2019s why our programming evolves throughout the year, shifting colors and sounds as the months pass." },
        'about.cta':        { it: 'ENTRA A FAR PARTE DEL <span class="text-[var(--accent)]">VIAGGIO</span>',
                              en: 'JOIN THE <span class="text-[var(--accent)]">JOURNEY</span>' },
        'about.ctadesc':    { it: 'Seguici, proponiti come artista o entra in contatto con noi.', en: 'Follow us, apply as an artist or get in touch with us.' },
        'about.apply':      { it: 'Proponiti come Artista', en: 'Apply as Artist' },
        'about.contactus':  { it: 'Contattaci',       en: 'Contact Us' },

        // ── CONTACT ─────────────────────────────────────────────────────────
        'contact.hero':     { it: '<i class="fas fa-envelope-open-text mr-4"></i>ENTRA IN <span class="text-[var(--accent)]">CONTATTO</span>',
                              en: '<i class="fas fa-envelope-open-text mr-4"></i><span class="text-[var(--accent)]">CONTACT</span> US' },
        'contact.herosub':  { it: 'Siamo qui per ascoltarti. Proposte, domande o saluti.', en: "We're here to listen. Proposals, questions or greetings." },
        'contact.herocta':  { it: 'Vai al Modulo',    en: 'Go to Form' },
        'contact.info':     { it: 'INFO DIRETTE',     en: 'DIRECT INFO' },
        'contact.genemail': { it: 'Email Generali',   en: 'General Email' },
        'contact.artprop':  { it: 'Proposte Artistiche', en: 'Artist Proposals' },
        'contact.artlink':  { it: 'Vai al modulo di candidatura', en: 'Go to the application form' },
        'contact.social':   { it: 'SEGUICI SUI SOCIAL', en: 'FOLLOW US ON SOCIAL' },
        'contact.sendmsg':  { it: 'INVIA UN MESSAGGIO', en: 'SEND A MESSAGE' },
        'contact.name':     { it: 'Il tuo nome',      en: 'Your name' },
        'contact.email':    { it: 'La tua email',     en: 'Your email' },
        'contact.reason':   { it: 'Seleziona un motivo...', en: 'Select a reason...' },
        'contact.opt1':     { it: 'Info Generali',    en: 'General Info' },
        'contact.opt2':     { it: 'Proposta di Collaborazione', en: 'Collaboration Proposal' },
        'contact.opt3':     { it: 'Supporto Tecnico', en: 'Technical Support' },
        'contact.opt4':     { it: 'Altro',            en: 'Other' },
        'contact.msgph':    { it: 'Il tuo messaggio...', en: 'Your message...' },
        'contact.submit':   { it: 'INVIA MESSAGGIO',  en: 'SEND MESSAGE' },

        // ── PROGRAMMAZIONE ──────────────────────────────────────────────────
        'sched.title':      { it: 'PROGRAMMAZIONE',   en: 'SCHEDULE' },
        'sched.desc':       { it: 'Scopri i nostri prossimi eventi e le dirette in arrivo.', en: 'Discover our upcoming events and streams.' },
        'sched.all':        { it: 'Tutti',            en: 'All' },
        'sched.streams':    { it: 'Dirette',          en: 'Streams' },
        'sched.liveevents': { it: 'Eventi Fisici',    en: 'Live Events' },
        'sched.mon':        { it: 'LUN', en: 'MON' },
        'sched.tue':        { it: 'MAR', en: 'TUE' },
        'sched.wed':        { it: 'MER', en: 'WED' },
        'sched.thu':        { it: 'GIO', en: 'THU' },
        'sched.fri':        { it: 'VEN', en: 'FRI' },
        'sched.sat':        { it: 'SAB', en: 'SAT' },
        'sched.sun':        { it: 'DOM', en: 'SUN' },
        'sched.stream':     { it: 'Diretta',          en: 'Stream' },
        'sched.event':      { it: 'Evento Fisico',    en: 'Live Event' },
        'sched.wantplay':   { it: 'VUOI SUONARE <span class="text-[var(--accent)]">DA NOI?</span>',
                              en: 'WANT TO PLAY <span class="text-[var(--accent)]">WITH US?</span>' },
        'sched.formdesc':   { it: 'Clicca sul campo data per scegliere uno degli slot disponibili e inviaci la tua proposta.', en: 'Click on the date field to choose an available slot and send us your proposal.' },
        'sched.artistname': { it: 'Nome Artista / DJ', en: 'Artist / DJ Name' },
        'sched.youremail':  { it: 'La tua Email',     en: 'Your Email' },
        'sched.musiclink':  { it: 'Link alla tua Musica', en: 'Link to your Music' },
        'sched.datepropose':{ it: 'Data Proposta',     en: 'Proposed Date' },
        'sched.dateplaceh': { it: 'Seleziona una data disponibile...', en: 'Select an available date...' },
        'sched.biogenre':   { it: 'Breve Bio / Genere Musicale', en: 'Short Bio / Music Genre' },
        'sched.bioplaceh':  { it: 'Descrivi brevemente il tuo progetto...', en: 'Briefly describe your project...' },
        'sched.sendprop':   { it: 'INVIA PROPOSTA',   en: 'SEND PROPOSAL' },

        // ── RADIO ───────────────────────────────────────────────────────────
        'radio.install':    { it: 'Aggiungi Gate Radio alla schermata Home per ascoltare come un\'app.', en: 'Add Gate Radio to your Home screen to listen like an app.' },
        'radio.installbtn': { it: 'Installa',         en: 'Install' },
        'radio.loading':    { it: 'CARICAMENTO...',    en: 'LOADING...' },
        'radio.subdesc':    { it: 'Rotazione continua dei nostri set live \u2014 tutti ascoltano lo stesso punto.', en: 'Continuous rotation of our live sets \u2014 everyone listens to the same point.' },
        'radio.tuning':     { it: 'Sintonizzazione in corso...', en: 'Tuning in...' },
        'radio.next':       { it: 'PROSSIMO',         en: 'NEXT' },
        'radio.rotation1':  { it: 'IN ',              en: 'IN ' },
        'radio.rotation2':  { it: 'ROTAZIONE',        en: 'ROTATION' },
        'radio.clearcache': { it: 'Svuota cache',     en: 'Clear cache' },
        'radio.ready':      { it: 'PRONTO — PREMI PLAY', en: 'READY — PRESS PLAY' },
        'radio.playing':    { it: 'IN ROTAZIONE',    en: 'NOW PLAYING' },
        'radio.paused':     { it: 'IN PAUSA',        en: 'PAUSED' },
        'radio.buffering':  { it: 'BUFFERING...',    en: 'BUFFERING...' },
        'radio.novideo':    { it: 'NESSUN VIDEO DISPONIBILE', en: 'NO VIDEO AVAILABLE' },
        'radio.error':      { it: 'ERRORE — SALTO AL PROSSIMO...', en: 'ERROR — SKIPPING...' },
        'radio.errorlocal': { it: 'ERRORE LOCALE',   en: 'LOCAL ERROR' },
        'radio.loadpl':     { it: 'Caricamento playlist...', en: 'Loading playlist...' },
        'radio.fetchdur':   { it: 'Recupero durate...', en: 'Fetching durations...' },
        'radio.syncing':    { it: 'SINTONIZZAZIONE...', en: 'TUNING...' },
        'radio.pause':      { it: 'Pausa',           en: 'Pause' },
        'radio.play':       { it: 'Riproduci',       en: 'Play' },

        // ── HOME DYNAMIC ────────────────────────────────────────────────────
        'home.listenNow':   { it: 'ASCOLTA ORA',     en: 'LISTEN NOW' },
        'home.nowPlaying':  { it: 'GATE RADIO 24/7 — ORA IN ROTAZIONE', en: 'GATE RADIO 24/7 — NOW PLAYING' },
        'home.stayTuned':   { it: 'Nessun evento in programma.', en: 'No upcoming events.' },
    };

    // ── Helpers ─────────────────────────────────────────────────────────────
    function getLang() {
        return localStorage.getItem('gate_lang') || 'it';
    }
    function setLang(lang) {
        localStorage.setItem('gate_lang', lang);
        applyLang(lang);
    }
    function t(key, lang) {
        const entry = translations[key];
        if (!entry) return '';
        return entry[lang] || entry['it'] || '';
    }

    function applyLang(lang) {
        document.documentElement.lang = lang;
        // Translate all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = t(key, lang);
            if (!val) return;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = val;
            } else if (el.tagName === 'OPTION') {
                el.textContent = val;
            } else {
                el.textContent = val;
            }
        });
        // Translate data-i18n-html (for innerHTML with spans)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const val = t(key, lang);
            if (val) el.innerHTML = val;
        });
        // Update toggle buttons
        document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
    }

    function createToggleGroup() {
        const group = document.createElement('div');
        group.className = 'lang-toggle-group';
        ['IT', 'EN'].forEach(label => {
            const btn = document.createElement('button');
            btn.className = 'lang-toggle-btn';
            btn.textContent = label;
            btn.dataset.lang = label.toLowerCase();
            btn.addEventListener('click', () => setLang(label.toLowerCase()));
            group.appendChild(btn);
        });
        return group;
    }

    // ── Inject toggle into nav ──────────────────────────────────────────────
    function injectToggle() {
        // Desktop nav
        const desktopNav = document.querySelector('header nav .hidden.md\\:flex');
        if (desktopNav) {
            desktopNav.appendChild(createToggleGroup());
        }
        // Mobile nav
        const mobileNav = document.getElementById('mobile-menu');
        if (mobileNav) {
            const group = createToggleGroup();
            group.classList.add('lang-toggle-mobile');
            mobileNav.appendChild(group);
        }
    }

    // ── Expose globally for radio.js / script.js ─────────────────────────
    window.GateI18n = { t, getLang };

    // ── Init ────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        injectToggle();
        applyLang(getLang());
    });
})();
