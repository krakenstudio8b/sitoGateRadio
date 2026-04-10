// js/radio.js — Gate Radio 24/7 Player
//
// Funziona in due modalità:
//
//  A) YOUTUBE PLAYLIST (consigliata)
//     Imposta RADIO_CONFIG.YOUTUBE_API_KEY e RADIO_CONFIG.YOUTUBE_PLAYLIST_ID in config.js.
//     Il sistema scarica automaticamente i video e le durate dalla playlist.
//     Cache in localStorage per 24h → nessuna chiamata inutile.
//
//  B) FALLBACK (streams-data.js)
//     Se la configurazione API manca o fallisce, usa i video con URL YouTube
//     presenti in streams-data.js. Le durate vengono apprese dal player in
//     tempo reale e cachate, quindi la precisione migliora ad ogni visita.

(function () {
    'use strict';

    // ─── COSTANTI ────────────────────────────────────────────────────────────────
    const CACHE_KEY      = 'gateradio_radio_cache_v4';   // incrementa per invalidare cache
    const DURATION_KEY   = 'gateradio_durations';
    const YT_BASE        = 'https://www.googleapis.com/youtube/v3';

    // Rimuove vecchie versioni della cache al caricamento
    ['gateradio_radio_cache', 'gateradio_radio_cache_v2', 'gateradio_radio_cache_v3'].forEach(k => {
        try { localStorage.removeItem(k); } catch {}
    });

    // ─── UTILITY ─────────────────────────────────────────────────────────────────

    function extractYouTubeId(url) {
        if (!url || url === '#') return null;
        const m = url.match(/(?:live\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        return m ? m[1] : null;
    }

    // Converte durata ISO 8601 (PT1H30M45S) in secondi
    function parseISO8601(dur) {
        const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!m) return 7200;
        return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
    }

    function formatTime(sec) {
        sec = Math.floor(sec);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return h > 0
            ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
            : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    function $(id) { return document.getElementById(id); }

    // ─── CACHE LOCALE ────────────────────────────────────────────────────────────

    function loadCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
    }

    function saveCache(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
    }

    function isCacheValid(cache) {
        if (!cache || !cache.ts || !cache.data) return false;
        const ttl = ((typeof RADIO_CONFIG !== 'undefined' && RADIO_CONFIG.CACHE_TTL_HOURS) || 24) * 3600 * 1000;
        return (Date.now() - cache.ts) < ttl;
    }

    // Cache durate apprese dal player (localStorage permanente)
    function loadDurationCache() {
        try { return JSON.parse(localStorage.getItem(DURATION_KEY) || '{}'); } catch { return {}; }
    }

    function saveDuration(youtubeId, seconds) {
        try {
            const c = loadDurationCache();
            c[youtubeId] = seconds;
            localStorage.setItem(DURATION_KEY, JSON.stringify(c));
        } catch {}
    }

    // ─── FETCH PLAYLIST DA YOUTUBE API ───────────────────────────────────────────

    async function fetchPlaylistVideos(playlistId, apiKey) {
        const videos    = [];
        let   pageToken = '';

        // Pagina attraverso tutti i video della playlist (max 50 per pagina)
        do {
            const url = `${YT_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}${pageToken ? '&pageToken=' + pageToken : ''}`;
            const res  = await fetch(url);
            if (!res.ok) throw new Error(`playlistItems error: ${res.status}`);
            const json = await res.json();

            if (json.error) throw new Error(json.error.message);

            for (const item of (json.items || [])) {
                const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
                if (!vid) continue;
                videos.push({
                    youtubeId:  vid,
                    artist:     item.snippet?.title || 'Unknown',
                    title:      item.snippet?.title || '',
                    imageUrl:   item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
                    tags:       [],
                    season:     'winter',
                    duration:   7200  // placeholder, sovrascritta sotto
                });
            }

            pageToken = json.nextPageToken || '';
        } while (pageToken);

        return videos;
    }

    async function fetchVideoDurations(videos, apiKey) {
        const durationCache  = loadDurationCache();
        const nonEmbeddable  = new Set();
        const ids            = videos.map(v => v.youtubeId);

        // Batch da 50 — aggiunge anche "status" per filtrare video non incorporabili
        for (let i = 0; i < ids.length; i += 50) {
            const chunk = ids.slice(i, i + 50).join(',');
            const url   = `${YT_BASE}/videos?part=contentDetails,status&id=${chunk}&key=${apiKey}`;
            const res   = await fetch(url);
            if (!res.ok) continue;
            const json  = await res.json();
            for (const item of (json.items || [])) {
                const sec = parseISO8601(item.contentDetails?.duration || 'PT2H');
                durationCache[item.id] = sec;
                saveDuration(item.id, sec);

                // Filtra video con embedding disabilitato
                if (item.status?.embeddable === false) {
                    nonEmbeddable.add(item.id);
                    console.warn(`[GateRadio] Video non incorporabile (escluso dalla rotazione): ${item.id}`);
                }
            }
        }

        const filtered = videos.filter(v => !nonEmbeddable.has(v.youtubeId));
        console.log(`[GateRadio] ${filtered.length}/${videos.length} video incorporabili nella rotazione.`);

        if (filtered.length === 0) {
            // Tutti i video hanno embedding disabilitato → mostra info utile
            showEmbedBlockedInfo(videos, nonEmbeddable);
            return [];
        }

        return filtered.map(v => ({
            ...v,
            duration: durationCache[v.youtubeId] || 7200
        }));
    }

    function showEmbedBlockedInfo(videos, nonEmbeddable) {
        const loading = $('radio-loading');
        if (!loading) return;

        const ids = [...nonEmbeddable].slice(0, 5);
        const ytLinks = ids.map(id =>
            `<a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"
                style="color:var(--accent);font-size:0.7rem;font-family:monospace">${id}</a>`
        ).join('<br>');

        loading.innerHTML = `
            <div style="max-width:420px;text-align:center;padding:2rem 1rem">
                <i class="fas fa-lock" style="font-size:2.5rem;color:var(--accent);margin-bottom:1rem"></i>
                <p style="color:#e2e8f0;font-weight:600;margin-bottom:0.5rem">
                    Nessun video incorporabile (${nonEmbeddable.size}/${videos.length})
                </p>
                <p style="color:var(--text-secondary);font-size:0.8rem;line-height:1.6;margin-bottom:1rem">
                    Devi abilitare <strong style="color:#fff">l'incorporamento</strong> in YouTube Studio per ogni video:
                </p>
                <ol style="color:var(--text-secondary);font-size:0.78rem;text-align:left;line-height:2;margin-bottom:1.25rem">
                    <li>Vai su <a href="https://studio.youtube.com" target="_blank" rel="noopener" style="color:var(--accent)">studio.youtube.com</a></li>
                    <li>Contenuti → seleziona tutti i video</li>
                    <li>Modifica → Distribuzione → spunta <em>Consenti incorporamento</em></li>
                    <li>Salva e attendi qualche minuto</li>
                </ol>
                <p style="color:var(--text-secondary);font-size:0.72rem;margin-bottom:0.75rem">
                    Video bloccati trovati (esempio):<br>${ytLinks}
                </p>
                <button onclick="localStorage.removeItem('gateradio_radio_cache_v3');localStorage.removeItem('gateradio_durations');location.reload()"
                    style="background:var(--accent);color:#000;font-weight:700;padding:0.5rem 1.5rem;border-radius:9999px;font-size:0.8rem;cursor:pointer;border:none;margin-top:0.5rem">
                    <i class="fas fa-rotate-right"></i> Ricarica dopo aver salvato
                </button>
            </div>
        `;
    }

    // ─── COSTRUZIONE PLAYLIST (FALLBACK da streams-data.js) ──────────────────────

    function buildFallbackPlaylist() {
        const raw           = (typeof streamsData !== 'undefined') ? streamsData : [];
        const durationCache = loadDurationCache();

        return raw
            .filter(s => extractYouTubeId(s.soundcloudUrl) !== null)
            .map(s => {
                const yid = extractYouTubeId(s.soundcloudUrl);
                return {
                    youtubeId: yid,
                    artist:    s.artist,
                    title:     s.title,
                    imageUrl:  s.imageUrl,
                    tags:      s.tags || [],
                    season:    s.season || 'winter',
                    duration:  s.duration || durationCache[yid] || 7200
                };
            });
    }

    // ─── INIT PLAYLIST ───────────────────────────────────────────────────────────

    async function initPlaylist() {
        const cfg = (typeof RADIO_CONFIG !== 'undefined') ? RADIO_CONFIG : {};

        // Modalità A: YouTube Playlist API
        if (cfg.YOUTUBE_API_KEY && cfg.YOUTUBE_PLAYLIST_ID) {
            const cached = loadCache();
            if (isCacheValid(cached)) {
                console.log('[GateRadio] Playlist da cache locale.');
                return cached.data;
            }
            try {
                showStatus('Caricamento playlist...', 'radio.loadpl');
                let videos = await fetchPlaylistVideos(cfg.YOUTUBE_PLAYLIST_ID, cfg.YOUTUBE_API_KEY);
                if (videos.length === 0) throw new Error('Playlist vuota');
                showStatus('Recupero durate...', 'radio.fetchdur');
                videos = await fetchVideoDurations(videos, cfg.YOUTUBE_API_KEY);
                saveCache(videos);
                console.log(`[GateRadio] Playlist YouTube: ${videos.length} video caricati.`);
                return videos;
            } catch (err) {
                console.warn('[GateRadio] Errore API YouTube, uso fallback:', err.message);
            }
        }

        // Modalità B: Fallback streams-data.js
        console.log('[GateRadio] Modalità fallback (streams-data.js).');
        return buildFallbackPlaylist();
    }

    // ─── CALCOLO POSIZIONE CORRENTE ──────────────────────────────────────────────

    function getCurrentState(playlist) {
        const total    = playlist.reduce((s, v) => s + v.duration, 0);
        const cyclePos = Math.floor(Date.now() / 1000) % total;
        let   elapsed  = 0;

        for (let i = 0; i < playlist.length; i++) {
            const v = playlist[i];
            if (cyclePos < elapsed + v.duration) {
                const ni = (i + 1) % playlist.length;
                return { current: v, currentIndex: i, startAt: cyclePos - elapsed, next: playlist[ni], nextIndex: ni };
            }
            elapsed += v.duration;
        }
        return { current: playlist[0], currentIndex: 0, startAt: 0, next: playlist[1] || playlist[0], nextIndex: 1 % playlist.length };
    }

    // ─── STATO INTERNO ───────────────────────────────────────────────────────────

    let playlist          = [];
    let player            = null;
    let state             = null;
    let elapsedSeconds    = 0;
    let isPlaying         = false;
    let tickInterval      = null;
    let firstPlay         = true;
    let consecutiveErrors = 0;
    let skipTimer         = null;
    let lastVolume        = 100;

    // ─── UI ─────────────────────────────────────────────────────────────────────

    function updateUI() {
        if (!state) return;
        const { current, next } = state;

        const set    = (id, val) => { const el = $(id); if (el) el.textContent = val; };
        const setSrc = (id, src, alt) => { const el = $(id); if (el) { el.src = src; el.alt = alt || ''; } };

        set('radio-artist',      current.artist);
        set('radio-title',       current.title);
        set('radio-duration',    formatTime(current.duration));
        set('radio-next-artist', next.artist);
        set('radio-next-title',  next.title);
        setSrc('radio-artwork',      current.imageUrl, current.artist);
        setSrc('radio-next-artwork', next.imageUrl,    next.artist);

        const tagsEl = $('radio-tags');
        if (tagsEl) tagsEl.innerHTML = current.tags.map(t => `<span class="card-tag">${t}</span>`).join('');

        const container = $('radio-player-container');
        if (container) {
            container.classList.remove('winter','spring','summer','autumn');
            container.classList.add(current.season || 'winter');
        }

        updateProgress();
        renderMiniPlaylist();
        updateMediaSession();
    }

    function updateProgress() {
        if (!state) return;
        const bar  = $('radio-progress-bar');
        const time = $('radio-current-time');
        const pct  = Math.min((elapsedSeconds / state.current.duration) * 100, 100);
        if (bar)  bar.style.width = `${pct}%`;
        if (time) time.textContent = formatTime(elapsedSeconds);
    }

    function updatePlayBtn(playing) {
        const btn = $('radio-play-btn');
        if (!btn) return;
        btn.innerHTML = playing ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        const _t = window.GateI18n ? (k) => window.GateI18n.t(k, window.GateI18n.getLang()) : () => null;
        btn.setAttribute('aria-label', playing ? (_t('radio.pause') || 'Pausa') : (_t('radio.play') || 'Riproduci'));
    }

    function showStatus(msg, i18nKey) {
        const el = $('radio-status-text');
        if (!el) return;
        if (i18nKey && window.GateI18n) {
            const translated = window.GateI18n.t(i18nKey, window.GateI18n.getLang());
            el.textContent = translated || msg;
        } else {
            el.textContent = msg;
        }
    }

    // ─── VOLUME ──────────────────────────────────────────────────────────────────

    function updateVolumeIcon(vol) {
        const btn = $('radio-mute-btn');
        if (!btn) return;
        let icon = 'fa-volume-high';
        if (vol === 0)      icon = 'fa-volume-xmark';
        else if (vol < 40)  icon = 'fa-volume-low';
        btn.innerHTML = `<i class="fas ${icon}"></i>`;
    }

    function setVolume(vol) {
        vol = Math.max(0, Math.min(100, vol));
        if (player) player.setVolume(vol);
        const slider = $('radio-volume');
        const label  = $('radio-volume-label');
        if (slider) slider.value = vol;
        if (label)  label.textContent = vol;
        updateVolumeIcon(vol);
        // Aggiorna il fill visivo del range
        if (slider) slider.style.background =
            `linear-gradient(to right, var(--accent) ${vol}%, rgba(255,255,255,0.15) ${vol}%)`;
    }

    // ─── MEDIA SESSION API ────────────────────────────────────────────────────────

    function updateMediaSession() {
        if (!state || !('mediaSession' in navigator)) return;
        const { current } = state;

        navigator.mediaSession.metadata = new MediaMetadata({
            title:  current.title  || 'Gate Radio 24/7',
            artist: current.artist || 'GATE RADIO',
            album:  'Gate Radio 24/7',
            artwork: current.imageUrl ? [
                { src: current.imageUrl, sizes: '480x360', type: 'image/jpeg' }
            ] : []
        });

        navigator.mediaSession.setActionHandler('play',          () => player?.playVideo());
        navigator.mediaSession.setActionHandler('pause',         () => player?.pauseVideo());
        navigator.mediaSession.setActionHandler('nexttrack',     () => {
            loadNext();
            if (player && isPlaying) player.loadVideoById({ videoId: state.current.youtubeId, startSeconds: 0 });
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            loadPrev();
            if (player && isPlaying) player.loadVideoById({ videoId: state.current.youtubeId, startSeconds: 0 });
        });
        navigator.mediaSession.setActionHandler('stop', () => player?.pauseVideo());
    }

    function renderMiniPlaylist() {
        const container = $('radio-mini-playlist');
        if (!container || !state) return;

        const count = Math.min(6, playlist.length);
        const items = Array.from({ length: count }, (_, i) => {
            const idx = (state.currentIndex + i) % playlist.length;
            return { ...playlist[idx], isCurrent: i === 0 };
        });

        container.innerHTML = items.map(item => `
            <div class="radio-playlist-item ${item.isCurrent ? 'radio-playlist-current' : ''}">
                <img src="${item.imageUrl}" alt="${item.artist}" class="radio-playlist-thumb" loading="lazy">
                <div class="radio-playlist-info">
                    <p class="radio-playlist-artist">${item.artist}</p>
                    <p class="radio-playlist-title">${item.title}</p>
                </div>
                ${item.isCurrent ? '<div class="radio-playlist-playing"><i class="fas fa-volume-high"></i></div>' : ''}
            </div>
        `).join('');
    }

    // ─── TICK E CAMBIO VIDEO ──────────────────────────────────────────────────────

    function startTick() {
        stopTick();
        tickInterval = setInterval(() => {
            elapsedSeconds++;
            if (elapsedSeconds >= state.current.duration) { loadNext(); return; }
            updateProgress();
        }, 1000);
    }

    function stopTick() {
        if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    }

    function loadAt(index, startAt) {
        stopTick();
        const ni  = (index + 1) % playlist.length;
        state = { current: playlist[index], currentIndex: index, startAt, next: playlist[ni], nextIndex: ni };
        elapsedSeconds = startAt;
        firstPlay = true;
        updateUI();
        if (player && isPlaying) {
            player.loadVideoById({ videoId: state.current.youtubeId, startSeconds: Math.floor(startAt) });
        }
        showStatus('IN ROTAZIONE', 'radio.playing');
    }

    function loadNext() { loadAt((state.currentIndex + 1) % playlist.length, 0); }
    function loadPrev() { loadAt((state.currentIndex - 1 + playlist.length) % playlist.length, 0); }

    // ─── YOUTUBE IFRAME API ──────────────────────────────────────────────────────

    window.onYouTubeIframeAPIReady = function () {
        const playerEl = $('radio-yt-player');
        if (!playerEl || !state) return;

        player = new YT.Player('radio-yt-player', {
            height: '100%',
            width:  '100%',
            videoId: state.current.youtubeId,
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
                autoplay: 0, controls: 1, rel: 0,
                modestbranding: 1, playsinline: 1,
                start: Math.floor(state.startAt),
                enablejsapi: 1, fs: 1,
                origin: window.location.origin || 'https://gateradio.com'
            },
            events: {
                onReady:       onPlayerReady,
                onStateChange: onPlayerStateChange,
                onError:       onPlayerError
            }
        });
    };

    function onPlayerReady() {
        const loading = $('radio-loading');
        if (loading) loading.classList.add('hidden');
        const wrapper = $('radio-player-wrapper');
        if (wrapper) wrapper.classList.remove('opacity-0');
        showStatus('PRONTO — PREMI PLAY', 'radio.ready');
    }

    function onPlayerStateChange(event) {
        if (event.data === 1) {           // PLAYING
            isPlaying = true;
            consecutiveErrors = 0;
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            if (firstPlay) {
                firstPlay = false;
                elapsedSeconds = state.startAt;

                // Apprendi la durata reale dal player e cachela
                const realDuration = Math.floor(player.getDuration());
                if (realDuration > 60 && realDuration !== state.current.duration) {
                    state.current.duration = realDuration;
                    saveDuration(state.current.youtubeId, realDuration);
                    set('radio-duration', formatTime(realDuration));
                }
            }
            startTick();
            updatePlayBtn(true);
            showStatus('IN ROTAZIONE', 'radio.playing');
        } else if (event.data === 2) {    // PAUSED
            isPlaying = false;
            stopTick();
            updatePlayBtn(false);
            showStatus('IN PAUSA', 'radio.paused');
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        } else if (event.data === 0) {    // ENDED
            loadNext();
            if (player) player.loadVideoById({ videoId: state.current.youtubeId, startSeconds: 0 });
        } else if (event.data === 3) {    // BUFFERING
            showStatus('BUFFERING...', 'radio.buffering');
        }
    }

    function set(id, val) { const el = $(id); if (el) el.textContent = val; }

    function skipToNext() {
        if (skipTimer) { clearTimeout(skipTimer); skipTimer = null; }
        const errEl = $('radio-embed-error');
        if (errEl) errEl.remove();
        loadNext();
        if (player) player.loadVideoById({ videoId: state.current.youtubeId, startSeconds: 0 });
    }

    function onPlayerError(event) {
        const code           = event.data;
        const isEmbedBlocked = [101, 150, 153].includes(code);
        console.warn(`[GateRadio] Errore YouTube (codice: ${code})${isEmbedBlocked ? ' — embedding bloccato' : ''}.`);

        consecutiveErrors++;

        // Se TUTTI i video della playlist danno errore, smetti di girare in loop
        if (consecutiveErrors >= playlist.length) {
            showStatus('NESSUN VIDEO DISPONIBILE', 'radio.novideo');
            const wrapper = $('radio-video-wrapper');
            if (wrapper) {
                wrapper.insertAdjacentHTML('beforeend', `
                    <div id="radio-embed-error" style="
                        position:absolute;inset:0;background:rgba(0,0,0,0.92);
                        display:flex;flex-direction:column;align-items:center;
                        justify-content:center;gap:1rem;z-index:10;border-radius:0.75rem;padding:1.5rem;text-align:center;">
                        <i class="fas fa-broadcast-tower" style="font-size:2.5rem;color:var(--accent)"></i>
                        <p style="color:#e2e8f0;font-size:0.9rem;line-height:1.6;max-width:300px">
                            <strong style="color:var(--accent)">Nessun video incorporabile.</strong><br>
                            Vai su YouTube Studio → seleziona tutti i video → Modifica → spunta <em>Consenti incorporamento</em>, poi attendi qualche ora.<br>
                            <span style="opacity:0.6;font-size:0.75rem">Oppure svuota la cache e riprova.</span>
                        </p>
                        <button onclick="localStorage.removeItem('${CACHE_KEY}');localStorage.removeItem('${DURATION_KEY}');location.reload()"
                           style="background:var(--accent);color:#000;font-weight:700;padding:0.5rem 1.5rem;border-radius:9999px;font-size:0.8rem;cursor:pointer;border:none">
                           Svuota cache e ricarica
                        </button>
                    </div>
                `);
            }
            return;
        }

        if (isEmbedBlocked && state) {
            const wrapper = $('radio-video-wrapper');
            const ytUrl   = `https://www.youtube.com/watch?v=${state.current.youtubeId}`;
            if (wrapper) {
                const errExist = $('radio-embed-error');
                if (errExist) errExist.remove();
                wrapper.insertAdjacentHTML('beforeend', `
                    <div id="radio-embed-error" style="
                        position:absolute;inset:0;background:rgba(0,0,0,0.88);
                        display:flex;flex-direction:column;align-items:center;
                        justify-content:center;gap:1rem;z-index:10;border-radius:0.75rem;padding:1.5rem;text-align:center;">
                        <i class="fas fa-lock" style="font-size:2rem;color:var(--accent)"></i>
                        <p style="color:#e2e8f0;font-size:0.85rem;line-height:1.5;max-width:260px">
                            Embedding non abilitato su questo video.<br>
                            <span style="opacity:0.6;font-size:0.75rem">Salto automatico tra 8s...</span>
                        </p>
                        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;justify-content:center">
                            <a href="${ytUrl}" target="_blank" rel="noopener"
                               style="background:var(--accent);color:#000;font-weight:700;padding:0.5rem 1.25rem;border-radius:9999px;font-size:0.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:0.4rem">
                               <i class="fab fa-youtube"></i> Guarda su YouTube
                            </a>
                            <button id="radio-skip-error-btn"
                               style="background:rgba(255,255,255,0.1);color:#e2e8f0;border:1px solid rgba(255,255,255,0.2);font-weight:600;padding:0.5rem 1.25rem;border-radius:9999px;font-size:0.8rem;cursor:pointer">
                               Salta →
                            </button>
                        </div>
                    </div>
                `);
                const skipBtn = $('radio-skip-error-btn');
                if (skipBtn) skipBtn.addEventListener('click', skipToNext);
                skipTimer = setTimeout(skipToNext, 8000);
                return;
            }
        }

        // Errore generico (codice 2, 5...) — salta subito
        showStatus('ERRORE — SALTO AL PROSSIMO...', 'radio.error');
        skipTimer = setTimeout(skipToNext, 1500);
    }

    // ─── INIT ────────────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', async () => {
        if (!$('radio-player-container')) return;

        // YouTube IFrame API non funziona su file:// — richiede un server HTTP
        if (window.location.protocol === 'file:') {
            showStatus('ERRORE LOCALE', 'radio.errorlocal');
            const loading = $('radio-loading');
            if (loading) loading.innerHTML = `
                <div style="max-width:420px;text-align:center;padding:2rem 1rem">
                    <i class="fas fa-server" style="font-size:2.5rem;color:var(--accent);margin-bottom:1rem"></i>
                    <p style="color:#e2e8f0;font-weight:600;margin-bottom:0.5rem">
                        Serve un server locale
                    </p>
                    <p style="color:var(--text-secondary);font-size:0.82rem;line-height:1.7;margin-bottom:1rem">
                        YouTube IFrame API non funziona quando apri il file direttamente dal filesystem (<code style="color:var(--accent)">file://</code>).<br>
                        Devi aprirlo tramite un server HTTP.
                    </p>
                    <p style="color:var(--text-secondary);font-size:0.78rem;line-height:1.8;text-align:left">
                        <strong style="color:#fff">Metodo più veloce — terminale nella cartella del sito:</strong><br>
                        <code style="color:var(--accent);background:rgba(255,255,255,0.05);padding:0.2rem 0.5rem;border-radius:4px;display:block;margin:0.4rem 0">
                            python -m http.server 8080
                        </code>
                        Poi apri: <code style="color:var(--accent)">http://localhost:8080/radio.html</code>
                    </p>
                    <p style="color:var(--text-secondary);font-size:0.75rem;margin-top:1rem;opacity:0.6">
                        In produzione (su dominio vero) funziona senza problemi.
                    </p>
                </div>
            `;
            return;
        }

        showStatus('SINTONIZZAZIONE...', 'radio.syncing');

        // Carica playlist (API YouTube o fallback)
        playlist = await initPlaylist();

        if (playlist.length === 0) {
            showStatus('NESSUN VIDEO DISPONIBILE', 'radio.novideo');
            const loading = $('radio-loading');
            if (loading) loading.innerHTML = '<p class="text-red-400 text-sm">Nessun video trovato. Controlla la configurazione in config.js.</p>';
            return;
        }

        // Calcola posizione corrente
        state          = getCurrentState(playlist);
        elapsedSeconds = state.startAt;
        updateUI();

        // Pulsanti
        const playBtn = $('radio-play-btn');
        if (playBtn) playBtn.addEventListener('click', () => {
            if (!player) return;
            isPlaying ? player.pauseVideo() : player.playVideo();
        });
        const nextBtn = $('radio-next-btn');
        if (nextBtn) nextBtn.addEventListener('click', () => {
            loadNext();
            if (player && isPlaying) player.loadVideoById({ videoId: state.current.youtubeId, startSeconds: 0 });
        });
        const prevBtn = $('radio-prev-btn');
        if (prevBtn) prevBtn.addEventListener('click', () => {
            loadPrev();
            if (player && isPlaying) player.loadVideoById({ videoId: state.current.youtubeId, startSeconds: 0 });
        });

        // Volume slider
        const volSlider = $('radio-volume');
        const muteBtn   = $('radio-mute-btn');
        if (volSlider) {
            setVolume(100);
            volSlider.addEventListener('input', () => {
                const v = parseInt(volSlider.value);
                lastVolume = v > 0 ? v : lastVolume;
                setVolume(v);
            });
        }
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                if (!player) return;
                const currentVol = parseInt($('radio-volume')?.value ?? 100);
                if (currentVol === 0) {
                    setVolume(lastVolume || 80);
                } else {
                    lastVolume = currentVol;
                    setVolume(0);
                }
            });
        }

        // Carica YouTube IFrame API
        if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
            const tag  = document.createElement('script');
            tag.src    = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        } else {
            window.onYouTubeIframeAPIReady();
        }
    });

    // Esporta per uso esterno (widget in index.html)
    window.GateRadio = {
        getCurrentState: () => state ? state : null,
        formatTime,
        getPlaylist:     () => playlist
    };

})();
