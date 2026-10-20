// js/gate-radio-mini.js — Mini player della radio su tutte le pagine (versione nuova)
//
// Come funziona:
//  - In basso c'è una barra con il set "in onda" e il tasto ▶.
//  - Premendo ▶ la pagina diventa una "cornice": la barra (con il player YouTube)
//    resta qui, e il sito continua a girare dentro un iframe a tutta pagina.
//    Così cambiando pagina la musica non si ferma mai e le pagine funzionano
//    esattamente come prima (nessuno script del sito viene toccato).
//  - Dentro la cornice questo script non disegna la barra: avvisa solo la
//    cornice di cambiare indirizzo/titolo e coordina la pagina Radio.
//  - Il set in onda è calcolato come nella pagina Radio (stessa playlist,
//    stesso orologio): tutti ascoltano lo stesso punto.
(function () {
    'use strict';

    const CACHE_KEY = 'gateradio_radio_cache_v4';           // la stessa usata da js/radio.js
    const YT_API = 'https://www.googleapis.com/youtube/v3';
    const BAR_H = 64;

    const page = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
    const lang = () => (window.GateI18n ? window.GateI18n.getLang() : 'it');
    const t = (it, en) => (lang() === 'en' ? en : it);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ─── SIAMO DENTRO LA CORNICE? ───────────────────────────────────────────────
    let shell = null;
    try { if (window.parent !== window && window.parent.gnShell) shell = window.parent.gnShell; } catch (e) { shell = null; }

    if (shell) {
        const report = () => shell.onFrameNav(location.href, document.title);
        report();
        window.addEventListener('pageshow', report);
        document.addEventListener('DOMContentLoaded', () => {
            // "ASCOLTA ORA" in Home: fa partire la barra invece di cambiare pagina
            document.querySelectorAll('#hero-section a[href*="radio"], #hero-section a[href*="#live"]').forEach(a => {
                a.addEventListener('click', (e) => { e.preventDefault(); shell.play(); });
            });
            // pagina Radio: se parte il suo player grande, la barra si mette in pausa
            const big = document.getElementById('radio-play-btn');
            if (big) big.addEventListener('click', () => shell.pause(), true);
        });
        // la cornice può chiedere alla pagina Radio di fermarsi
        window.gnFrame = { pauseRadio() { if (window.GateRadio && window.GateRadio.isPlaying && window.GateRadio.isPlaying()) window.GateRadio.pause(); } };
        return;
    }

    // ─── PAGINA NORMALE: BARRA + CORNICE ────────────────────────────────────────
    // Sulla pagina Radio c'è già il player grande: niente barra.
    if (page === 'radio') return;

    let playlist = null, state = null, player = null, ytReady = null;
    let frame = null, wantPlay = false;
    let bar, media, nameEl, btn;

    // Playlist: prima quella già salvata dalla pagina Radio, altrimenti la scarichiamo
    async function ensureConfig() {
        if (typeof RADIO_CONFIG !== 'undefined') return RADIO_CONFIG;
        await new Promise((res) => {
            const s = document.createElement('script');
            s.src = 'js/config.js'; s.onload = res; s.onerror = res;
            document.head.appendChild(s);
        });
        return (typeof RADIO_CONFIG !== 'undefined') ? RADIO_CONFIG : null;
    }
    const parseDur = (d) => {
        const m = String(d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 7200;
    };
    async function loadPlaylist() {
        try {
            const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (c && Array.isArray(c.data) && c.data.length) return c.data;
        } catch (e) { /* niente */ }
        const cfg = await ensureConfig();
        if (!cfg || !cfg.YOUTUBE_API_KEY || !cfg.YOUTUBE_PLAYLIST_ID) return [];
        const videos = [];
        let token = '';
        do {
            const r = await fetch(`${YT_API}/playlistItems?part=snippet,contentDetails&playlistId=${cfg.YOUTUBE_PLAYLIST_ID}&maxResults=50&key=${cfg.YOUTUBE_API_KEY}${token ? '&pageToken=' + token : ''}`);
            if (!r.ok) return [];
            const j = await r.json();
            (j.items || []).forEach(it => {
                const id = it.contentDetails && it.contentDetails.videoId;
                if (id) videos.push({ youtubeId: id, artist: it.snippet.title, title: it.snippet.title,
                    imageUrl: (it.snippet.thumbnails && (it.snippet.thumbnails.high || it.snippet.thumbnails.default) || {}).url || '',
                    tags: [], season: 'winter', duration: 7200 });
            });
            token = j.nextPageToken || '';
        } while (token);
        const ok = [];
        for (let i = 0; i < videos.length; i += 50) {
            const chunk = videos.slice(i, i + 50);
            const r = await fetch(`${YT_API}/videos?part=contentDetails,status&id=${chunk.map(v => v.youtubeId).join(',')}&key=${cfg.YOUTUBE_API_KEY}`);
            if (!r.ok) continue;
            const j = await r.json();
            const info = new Map((j.items || []).map(x => [x.id, x]));
            chunk.forEach(v => {
                const x = info.get(v.youtubeId);
                if (x && x.status && x.status.embeddable === false) return;
                if (x) v.duration = parseDur(x.contentDetails.duration);
                ok.push(v);
            });
        }
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: ok })); } catch (e) { /* niente */ }
        return ok;
    }
    // stesso calcolo della pagina Radio: dove siamo adesso nel giro della playlist
    function currentState() {
        const total = playlist.reduce((s, v) => s + (v.duration || 0), 0);
        const pos = Math.floor(Date.now() / 1000) % total;
        let acc = 0;
        for (let i = 0; i < playlist.length; i++) {
            if (pos < acc + playlist[i].duration) return { index: i, video: playlist[i], startAt: pos - acc };
            acc += playlist[i].duration;
        }
        return { index: 0, video: playlist[0], startAt: 0 };
    }
    const nameOf = (v) => String(v.artist || v.title || '').replace(/^GATE\s*RADIO\s*/i, '').trim() || 'GATE RADIO';

    // ─── BARRA ──────────────────────────────────────────────────────────────────
    function buildBar() {
        bar = document.createElement('div');
        bar.className = 'gn-mini';
        bar.innerHTML = `
            <div class="gn-mini-media"><div id="gn-mini-yt"></div></div>
            <a class="gn-mini-txt" href="radio.html">
                <span class="gn-mini-label"><span class="gn-mini-dot" aria-hidden="true"></span>GATE RADIO 24/7</span>
                <span class="gn-mini-name">${t('Sintonizzazione…', 'Tuning in…')}</span>
            </a>
            <button type="button" class="gn-mini-btn"><i class="fas fa-play" aria-hidden="true"></i><span>${t('ASCOLTA ORA', 'LISTEN NOW')}</span></button>`;
        document.body.appendChild(bar);
        document.body.classList.add('gn-has-bar');
        media = bar.querySelector('.gn-mini-media');
        nameEl = bar.querySelector('.gn-mini-name');
        btn = bar.querySelector('.gn-mini-btn');
        btn.addEventListener('click', () => (isPlaying() ? pause() : play()));
        // "ASCOLTA ORA" in Home fa partire la barra
        document.querySelectorAll('#hero-section a[href*="radio"], #hero-section a[href*="#live"]').forEach(a => {
            a.addEventListener('click', (e) => { e.preventDefault(); play(); });
        });
    }
    function setIcon(playing) {
        // in pausa il tasto dice "ASCOLTA ORA"; mentre suona resta solo l'icona di pausa
        btn.innerHTML = playing
            ? `<i class="fas fa-pause" aria-hidden="true"></i>`
            : `<i class="fas fa-play" aria-hidden="true"></i><span>${t('ASCOLTA ORA', 'LISTEN NOW')}</span>`;
        btn.setAttribute('aria-label', playing ? t('Pausa', 'Pause') : t('Ascolta la radio', 'Listen to the radio'));
        bar.classList.toggle('is-playing', playing);
    }
    function showOnAir() {
        if (!state) return;
        nameEl.textContent = nameOf(state.video);
        if (!player && state.video.imageUrl) media.style.backgroundImage = `url("${state.video.imageUrl}")`;
    }

    // ─── CORNICE ────────────────────────────────────────────────────────────────
    window.gnShell = {
        onFrameNav(href, title) {
            try {
                const u = new URL(href);
                u.searchParams.delete('gnshell');
                history.replaceState(history.state, '', u.pathname + u.search + u.hash);
                if (title) document.title = title;
            } catch (e) { /* niente */ }
        },
        play: () => play(),
        pause: () => pause(),
    };
    function enterShell() {
        if (frame) return;
        const y = window.scrollY;
        const u = new URL(location.href);
        u.searchParams.set('gnshell', '1');
        frame = document.createElement('iframe');
        frame.className = 'gn-shell-frame';
        frame.title = 'Gate Radio';
        frame.src = u.pathname + u.search + u.hash;
        frame.addEventListener('load', () => {
            try { if (y) frame.contentWindow.scrollTo(0, y); } catch (e) { /* niente */ }
        }, { once: true });
        [...document.body.children].forEach(el => { if (el !== bar) el.style.display = 'none'; });
        document.body.appendChild(frame);
        document.documentElement.classList.add('gn-shell');
    }

    // ─── PLAYER ─────────────────────────────────────────────────────────────────
    function loadYT() {
        if (ytReady) return ytReady;
        ytReady = new Promise((res) => {
            if (window.YT && window.YT.Player) return res();
            const prev = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = function () { if (prev) prev(); res(); };
            const s = document.createElement('script');
            s.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(s);
        });
        return ytReady;
    }
    const isPlaying = () => !!(player && player.getPlayerState && player.getPlayerState() === 1);

    async function play() {
        wantPlay = true;
        if (!playlist || !playlist.length) return;
        enterShell();
        // la pagina Radio dentro la cornice non deve suonare insieme a noi
        try { frame.contentWindow.gnFrame && frame.contentWindow.gnFrame.pauseRadio(); } catch (e) { /* niente */ }
        state = currentState();                 // ci "colleghiamo" al punto in onda adesso
        showOnAir();
        nameEl.textContent = nameOf(state.video);
        if (player) {
            const cur = player.getVideoData && player.getVideoData().video_id;
            if (cur === state.video.youtubeId) { player.seekTo(Math.floor(state.startAt), true); player.playVideo(); }
            else player.loadVideoById({ videoId: state.video.youtubeId, startSeconds: Math.floor(state.startAt) });
            return;
        }
        await loadYT();
        media.style.backgroundImage = '';
        player = new YT.Player('gn-mini-yt', {
            width: '100%', height: '100%',
            videoId: state.video.youtubeId,
            host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1,
                start: Math.floor(state.startAt), origin: location.origin },
            events: {
                onReady: (e) => { if (wantPlay) e.target.playVideo(); },
                onStateChange: (e) => {
                    if (e.data === 1) setIcon(true);
                    else if (e.data === 2 || e.data === -1 || e.data === 5) setIcon(false);
                    else if (e.data === 0) playNext();
                },
                onError: () => playNext(),
            },
        });
    }
    function pause() {
        wantPlay = false;
        if (player && player.pauseVideo) player.pauseVideo();
    }
    function playNext() {
        if (!player || !playlist) return;
        const i = state ? (state.index + 1) % playlist.length : 0;
        state = { index: i, video: playlist[i], startAt: 0 };
        nameEl.textContent = nameOf(state.video);
        player.loadVideoById({ videoId: state.video.youtubeId, startSeconds: 0 });
    }

    async function init() {
        buildBar();
        playlist = await loadPlaylist();
        if (!playlist.length) { bar.remove(); document.body.classList.remove('gn-has-bar'); return; }
        state = currentState();
        showOnAir();
        // aggiorna il nome "in onda" ogni minuto finché non si ascolta
        setInterval(() => { if (!player) { state = currentState(); showOnAir(); } }, 60000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
