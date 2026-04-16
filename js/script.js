// Configurazione per le date di booking
const bookingConfig = {
    availableDates: [
        "2025-07-11", "2025-07-18", "2025-07-25",
        "2025-08-01", "2025-08-08"
    ]
};

document.addEventListener('DOMContentLoaded', async () => {
    // Carica dati da Firebase e uniscili con quelli statici
    if (window.gateRadioDataPromise) {
        const fbData = await window.gateRadioDataPromise;
        if (fbData.streams && fbData.streams.length > 0) {
            const staticIds = new Set((window.streamsData || []).map(s => String(s.id)));
            const newStreams = fbData.streams.filter(s => !staticIds.has(String(s.id)));
            if (newStreams.length > 0) {
                window.streamsData = [...(window.streamsData || []), ...newStreams];
            }
        }
        if (fbData.events && fbData.events.length > 0) {
            const staticIds = new Set((window.eventsData || []).map(e => String(e.id)));
            const newEvents = fbData.events.filter(e => !staticIds.has(String(e.id)));
            if (newEvents.length > 0) {
                window.eventsData = [...(window.eventsData || []), ...newEvents];
            }
        }
    }


    // Funzioni helper
    function $(selector) { return document.querySelector(selector); }
    function $$(selector) { return document.querySelectorAll(selector); }
    
    function toLocalDateString(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // --- MODALE GALLERIA UNIFICATO (eventi, streaming, calendario) ---
    const galleryModal = $('#event-gallery-modal');
    const galleryModalContent = galleryModal?.querySelector('.event-modal-content');
    const galleryContainerEl = $('#gallery-container');
    const galleryLightbox = $('#lightbox');
    const galleryLightboxImg = $('#lightbox-image');
    const FALLBACK_IMG = 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/logoverticaleconscritta.png';
    const SEASON_CLASSES = ['winter', 'spring', 'summer', 'autumn'];

    function openGalleryModal({ title = '', dateStr = '', location = '', description = '', details = '', tags = [], images = [], actionsHTML = '', seasonClass = '' } = {}) {
        if (!galleryModal || !galleryModalContent || !galleryContainerEl) return;

        galleryModal.classList.remove(...SEASON_CLASSES);
        if (seasonClass) galleryModal.classList.add(seasonClass);

        $('#modal-event-title').textContent = title;
        $('#modal-event-date').textContent = dateStr;
        $('#modal-event-location').textContent = location;
        const dateLocEl = galleryModal.querySelector('.modal-event-date-location');
        if (dateLocEl) dateLocEl.style.display = (dateStr || location) ? '' : 'none';

        const descEl = $('#modal-event-description');
        if (descEl) {
            descEl.textContent = description;
            descEl.style.display = description ? '' : 'none';
        }
        const detailsEl = $('#modal-event-details');
        if (detailsEl) {
            detailsEl.textContent = details;
            detailsEl.style.display = details ? '' : 'none';
        }
        $('#modal-event-tags').innerHTML = tags.map(tag => `<span class="card-tag">${tag}</span>`).join('');
        const actionsEl = $('#modal-event-actions');
        if (actionsEl) actionsEl.innerHTML = actionsHTML || '';

        const imgs = images && images.length > 0 ? images : [FALLBACK_IMG];
        galleryModalContent.classList.remove('single-image-mode');
        if (imgs.length === 1) {
            galleryModalContent.classList.add('single-image-mode');
            galleryContainerEl.innerHTML = `<div class="single-image-wrapper"><img src="${imgs[0]}" alt="${title}" loading="lazy"></div>`;
        } else if (imgs.length === 2) {
            galleryContainerEl.innerHTML = `<div class="gallery-grid gallery-grid-2">${imgs.map(src => `<div class="gallery-item"><img src="${src}" alt="${title}" loading="lazy"></div>`).join('')}</div>`;
        } else if (imgs.length === 3) {
            galleryContainerEl.innerHTML = `<div class="gallery-grid gallery-grid-3"><div class="gallery-item gallery-item-big"><img src="${imgs[0]}" alt="${title}" loading="lazy"></div><div class="gallery-item"><img src="${imgs[1]}" alt="${title}" loading="lazy"></div><div class="gallery-item"><img src="${imgs[2]}" alt="${title}" loading="lazy"></div></div>`;
        } else {
            const half = Math.ceil(imgs.length / 2);
            const row1 = imgs.slice(0, half);
            const row2 = imgs.slice(half);
            galleryContainerEl.innerHTML = `
                <div class="gallery-row">${row1.map(src => `<div class="gallery-item"><img src="${src}" alt="${title}" loading="lazy"></div>`).join('')}</div>
                <div class="gallery-row posts-row">${row2.map(src => `<div class="gallery-item"><img src="${src}" alt="${title}" loading="lazy"></div>`).join('')}</div>`;
        }

        if (galleryLightbox && galleryLightboxImg) {
            $$('.gallery-item img, .single-image-wrapper img').forEach(img => {
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    galleryLightboxImg.src = img.src;
                    galleryLightbox.classList.remove('hidden');
                });
            });
        }

        galleryModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeGalleryModal() {
        if (!galleryModal) return;
        galleryModal.classList.add('hidden');
        galleryModal.classList.remove(...SEASON_CLASSES);
        document.body.style.overflow = '';
    }

    if (galleryModal) {
        $('#event-modal-close')?.addEventListener('click', closeGalleryModal);
        galleryModal.querySelector('.event-modal-backdrop')?.addEventListener('click', closeGalleryModal);
        if (galleryLightbox) {
            galleryLightbox.addEventListener('click', () => galleryLightbox.classList.add('hidden'));
        }
    }

    // --- APERTURA MODALE STREAMING (archivio + artisti + calendario) ---
    const _glLang = () => window.GateI18n ? window.GateI18n.getLang() : 'it';
    const _glLocale = () => _glLang() === 'en' ? 'en-GB' : 'it-IT';

    const openArchiveModal = (streamId) => {
        const stream = (window._allArchiveItems || (typeof streamsData !== 'undefined' ? streamsData : []) || []).find(s => s.id == streamId);
        if (!stream) return;

        const dateStr = stream.date
            ? new Date(stream.date).toLocaleDateString(_glLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : '';
        const timeStr = stream.timeStart
            ? `${stream.timeStart}${stream.timeEnd ? ' → ' + stream.timeEnd : ''}`
            : '';
        const isFuture = stream.date && new Date(stream.date) >= new Date(new Date().setHours(0,0,0,0));
        const location = timeStr || (isFuture ? 'PROSSIMA DIRETTA' : 'DIRETTA ARCHIVIATA');

        const images = stream.galleryImages && stream.galleryImages.length > 0
            ? stream.galleryImages
            : (stream.imageUrl ? [stream.imageUrl] : []);

        let actionsHTML = '';
        if (stream.soundcloudUrl && stream.soundcloudUrl !== '#') {
            actionsHTML = `<a href="${stream.soundcloudUrl}" target="_blank" rel="noopener" class="archive-modal-soundcloud-btn"><i class="fas fa-play-circle mr-2"></i>GUARDA LA STREAMING</a>`;
        } else if (isFuture) {
            actionsHTML = `<p class="text-sm text-[var(--text-secondary)]">Resta sintonizzato.</p>`;
        }

        openGalleryModal({
            title: stream.artist || stream.title || '',
            dateStr,
            location,
            description: stream.title || '',
            tags: stream.tags || [],
            images,
            actionsHTML,
            seasonClass: stream.season || '',
        });
    };

    // --- APERTURA MODALE EVENTO (eventi sul sito + calendario) ---
    const openEventModal = (event) => {
        if (!event) return;
        const lang = _glLang();
        const locale = _glLocale();
        const dateStr = event.date
            ? new Date(event.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : '';
        const images = event.galleryImages && event.galleryImages.length > 0
            ? event.galleryImages
            : (event.mainImage ? [event.mainImage] : []);
        openGalleryModal({
            title: (lang === 'en' && event.title_en) ? event.title_en : event.title,
            dateStr,
            location: event.location || '',
            description: (lang === 'en' && event.description_en) ? event.description_en : (event.description || ''),
            details: (lang === 'en' && event.details_en) ? event.details_en : (event.details || ''),
            tags: event.tags || [],
            images,
        });
    };

    // LISTENER GLOBALE PER I CLICK CHE APRONO IL MODALE STREAMING
    document.body.addEventListener('click', function(event) {
        if (event.target.closest('.card-play-button-link')) return;

        const archiveCard = event.target.closest('.archive-card[data-stream-id]');
        const artistStreamLink = event.target.closest('.artist-stream-link');

        if (archiveCard) {
            openArchiveModal(archiveCard.dataset.streamId);
        } else if (artistStreamLink) {
            event.preventDefault();
            openArchiveModal(artistStreamLink.dataset.streamId);
        }
    });


    function gestioneMenuMobile() {
        const mobileMenuButton = $('#mobile-menu-button');
        const mobileMenu = $('#mobile-menu');
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenuButton.classList.toggle('is-active');
                mobileMenu.classList.toggle('hidden');
            });
        }
    }

    function aggiornaAnnoFooter() {
        const yearSpan = $('#footer-year');
        if(yearSpan) yearSpan.textContent = new Date().getFullYear();
    }
    
    // Ritorna un Date combinando date + timeStart (o 00:00 di default)
    function itemStartDateTime(item) {
        const t = item.timeStart || '00:00';
        return new Date(`${item.date}T${t}:00`);
    }
    // Ritorna un Date combinando date + timeEnd (o 23:59 di default → fine giornata)
    function itemEndDateTime(item) {
        const t = item.timeEnd || '23:59';
        return new Date(`${item.date}T${t}:00`);
    }

    function findNextEvent(data) {
        if (!data) return null;
        const now = new Date();
        // "Upcoming" = fine (timeEnd o 23:59 di default) non ancora passata.
        // Così una live di oggi senza orario esplicito resta COMING SOON per
        // tutta la giornata, invece di sparire subito dopo la mezzanotte.
        const futureEvents = data
            .filter(event => itemEndDateTime(event) > now)
            .sort((a, b) => itemStartDateTime(a) - itemStartDateTime(b));
        return futureEvents.length > 0 ? futureEvents[0] : null;
    }

    async function initLivePlayer() {
        try {
            if (typeof TWITCH_CONFIG !== 'undefined') {
                if (TWITCH_CONFIG.TEST_MODE) {
                    renderLiveContent(TWITCH_CONFIG.FORCE_LIVE_STATE);
                    return;
                }
                const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CONFIG.CLIENT_ID}&client_secret=${TWITCH_CONFIG.CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
                const tokenData = await tokenResponse.json();
                const accessToken = tokenData.access_token;
                const streamResponse = await fetch(`https://api.twitch.tv/helix/streams?user_login=${TWITCH_CONFIG.CHANNEL_NAME}`, { headers: { 'Client-ID': TWITCH_CONFIG.CLIENT_ID, 'Authorization': `Bearer ${accessToken}` } });
                const streamData = await streamResponse.json();
                renderLiveContent(streamData.data.length > 0);
            }
        } catch (error) {
            console.error("Errore API Twitch:", error);
            renderLiveContent(false);
        }
    }

    function renderLiveContent(isLive) {
        const dynamicLiveBtn = $('#dynamic-live-button');
        if (dynamicLiveBtn) {
            if (isLive) {
                dynamicLiveBtn.classList.remove('hidden');
            } else {
                dynamicLiveBtn.classList.add('hidden');
            }
        }
        
        const liveContainer = $('#live-section-content');
        if (!liveContainer) return;

        // Considera sia gli stream che gli eventi per la card COMING SOON.
        // Normalizzo i campi così il render successivo funziona in entrambi i casi
        // (eventi usano `mainImage`/`title`, stream usano `imageUrl`/`artist`).
        const _streams = (typeof streamsData !== 'undefined' ? streamsData : []).map(s => ({ ...s, _kind: 'stream' }));
        const _events  = (typeof eventsData  !== 'undefined' ? eventsData  : []).map(e => ({
            ...e,
            _kind: 'event',
            imageUrl: e.mainImage || e.imageUrl || '',
            artist: e.title || 'EVENTO',
            title: 'EVENTO',
        }));
        const nextStream = findNextEvent([..._streams, ..._events]);
        
        const _t = window.GateI18n ? (k, fb) => window.GateI18n.t(k, window.GateI18n.getLang()) || fb : (k, fb) => fb;
        const _lang = window.GateI18n ? window.GateI18n.getLang() : 'it';
        const listenNow = _t('home.listenNow', 'ASCOLTA ORA');
        const nowPlaying = _t('home.nowPlaying', 'GATE RADIO 24/7 — ORA IN ROTAZIONE');
        const stayTunedMsg = _t('home.stayTuned', 'Nessun evento in programma.');

        // Widget Radio 24/7 riutilizzabile (usato in COMING SOON e STAY TUNED)
        const buildRadioWidget = () => {
            if (typeof GateRadio !== 'undefined') {
                const rs = GateRadio.getCurrentState();
                return `
                    <div class="radio-widget-banner">
                        <div class="radio-widget-info">
                            <div class="radio-widget-dot"></div>
                            <div class="radio-widget-texts">
                                <p class="radio-widget-label grifter-font">${nowPlaying}</p>
                                <p class="radio-widget-artist">${rs.current.artist}</p>
                            </div>
                        </div>
                        <a href="radio.html" class="btn-primary font-bold py-2 px-6 rounded-full text-sm inline-flex items-center gap-2 flex-shrink-0">
                            <i class="fas fa-radio"></i> ${listenNow}
                        </a>
                    </div>`;
            }
            return `
                <div class="radio-widget-banner inline-flex flex-col items-center gap-3 mx-auto px-6 py-3">
                    <div class="radio-widget-info justify-center">
                        <div class="radio-widget-dot"></div>
                        <p class="radio-widget-label text-xl font-bold grifter-font">GATE RADIO 24/7</p>
                    </div>
                    <a href="radio.html" class="btn-primary font-bold py-2 px-6 rounded-full text-sm inline-flex items-center gap-2">
                        <i class="fas fa-radio"></i> ${listenNow}
                    </a>
                </div>`;
        };

        if (isLive) {
            liveContainer.innerHTML = `<div class="mb-12"><div class="on-air-indicator">ON AIR</div></div><div style="aspect-ratio: 16/9;" class="w-full rounded-lg overflow-hidden glow-border"><iframe src="https://player.twitch.tv/?channel=${TWITCH_CONFIG.CHANNEL_NAME}&parent=${window.location.hostname}&autoplay=true&muted=true" height="100%" width="100%" allowfullscreen class="w-full h-full"></iframe></div>`;
        } else if (nextStream) {
            const eventDate    = new Date(nextStream.date);
            const dateLocale   = _lang === 'en' ? 'en-GB' : 'it-IT';
            const formattedDate = eventDate.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
            const eventTime    = (nextStream.timeStart && nextStream.timeEnd) ? `${nextStream.timeStart} -> ${nextStream.timeEnd}` : "18:00 -> 19:00";

            const eventImage = nextStream.imageUrl || 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/logogate2.png';
            liveContainer.innerHTML = `
                <div class="coming-soon-container text-center flex flex-col items-center">
                    <div class="w-full">${buildRadioWidget()}</div>
                    <div class="inline-block bg-black rounded-xl px-8 pt-20 pb-8 mt-20">
                        <h2 class="coming-soon-title grifter-font mb-16" style="font-size: 2rem;">COMING SOON</h2>
                        <div class="next-event-card mb-6 mx-auto">
                            <img src="${eventImage}" alt="${nextStream.title}" class="w-full h-auto" loading="lazy">
                        </div>
                        <p class="next-event-date">${formattedDate} - ${eventTime}</p>
                    </div>
                </div>`;
        } else {
            liveContainer.innerHTML = `
                <div class="coming-soon-container text-center flex flex-col items-center">
                    <div class="w-full">${buildRadioWidget()}</div>
                    <div class="inline-block bg-black rounded-xl px-8 pt-20 pb-12 mt-20">
                        <h2 class="coming-soon-title grifter-font mb-8" style="font-size: 2rem;">STAY TUNED</h2>
                        <p class="next-event-date">${stayTunedMsg}</p>
                    </div>
                </div>`;
        }
    }

    function gestioneArchivio() {
        const archiveGrid = $('#archive-grid');
        const archivePreviewGrid = $('#archive-grid-preview');
        if ((!archiveGrid && !archivePreviewGrid) || typeof streamsData === 'undefined') return;

        let _archiveCardIndex = 0;
        const createArchiveItemHTML = (item) => {
            const loadingAttr = _archiveCardIndex++ < 4 ? 'eager' : 'lazy';
            void loadingAttr; // usato sotto
            const seasonIcons = { spring: 'fas fa-seedling', summer: 'fas fa-sun', autumn: 'fas fa-leaf', winter: 'fas fa-snowflake' };
            const tagsHTML = item.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('');
            const seasonClass = item.season || 'summer';
            const iconClass = seasonIcons[item.season] || 'fas fa-question-circle';
            const iconHTML = `<i class="${iconClass} fa-fw text-xs"></i>`;
            const seasonTagHTML = `<span class="card-tag font-bold border-[var(--accent)] text-[var(--accent)] h-8 w-8 flex items-center justify-center">${iconHTML}</span>`;
            
            const playButtonHTML = (item.soundcloudUrl && item.soundcloudUrl !== '#')
                ? `<a href="${item.soundcloudUrl}" target="_blank" rel="noopener noreferrer" class="card-play-button-link" aria-label="Guarda la diretta su YouTube">
                       <svg class="icon-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
                   </a>`
                : '';

            return `<div class="archive-card rounded-xl overflow-hidden border border-[var(--border-color)] flex flex-col group ${seasonClass}" data-stream-id="${item.id}">
                        <div class="relative">
                            <img src="${item.imageUrl}" alt="${item.title}" class="archive-card-image-wrapper w-full h-full object-cover" loading="${loadingAttr}" decoding="async">
                        </div>
                        <div class="p-4 md:p-5 flex flex-col flex-grow bg-[#0d0d0d]" style="cursor: pointer;">
                            <h3 class="text-lg font-bold text-[var(--accent)]">${item.artist}</h3>
                            <p class="text-sm text-[var(--text-secondary)] mb-3">${item.title}</p>
                            <div class="mt-auto flex justify-between items-end">
                                <div class="flex flex-wrap gap-1">${tagsHTML}</div>
                                
                                <div class="flex items-center gap-2">
                                    ${playButtonHTML}
                                    ${seasonTagHTML}
                                </div>
                                </div>
                        </div>
                    </div>`;
        };

        const renderGrid = (items, container) => {
            if (!container) return;
            container.innerHTML = items.length > 0 ? items.map(createArchiveItemHTML).join('') : '<p class="col-span-full text-center text-[var(--text-secondary)]">Nessun risultato trovato.</p>';
        };

        // Unisci streams + eventi nell'archivio (card identiche)
        function seasonFromDate(dateStr) {
            const d = new Date(dateStr);
            const m = d.getMonth(); // 0-11
            const day = d.getDate();
            const year = d.getFullYear();
            const inizioPrimavera = year === 2026 ? 28 : 21;
            if ((m === 2 && day >= inizioPrimavera) || (m > 2 && m < 5) || (m === 5 && day < 21)) return 'spring';
            if ((m === 5 && day >= 21) || (m > 5 && m < 8) || (m === 8 && day < 21)) return 'summer';
            if ((m === 8 && day >= 21) || (m > 8 && m < 11) || (m === 11 && day < 21)) return 'autumn';
            return 'winter';
        }
        // Merge streams + eventi: per date duplicate, l'EVENTO vince (dati più ricchi)
        // ma prende il soundcloudUrl dallo stream se disponibile
        const allEvents = typeof eventsData !== 'undefined' ? eventsData : [];
        const eventsByDate = new Map();
        for (const ev of allEvents) {
            eventsByDate.set(ev.date, ev);
        }

        const mergedArchive = [];
        const usedEventDates = new Set();

        // Per ogni stream, controlla se esiste un evento con stessa data
        for (const s of streamsData) {
            const matchingEvent = eventsByDate.get(s.date);
            if (matchingEvent) {
                // Evento vince: usa dati evento + soundcloudUrl dallo stream
                usedEventDates.add(s.date);
                mergedArchive.push({
                    id: matchingEvent.id,
                    artist: matchingEvent.title || s.artist,
                    title: matchingEvent.location || s.title,
                    date: matchingEvent.date,
                    timeStart: s.timeStart,
                    timeEnd: s.timeEnd,
                    imageUrl: matchingEvent.mainImage || s.imageUrl,
                    soundcloudUrl: s.soundcloudUrl || null,
                    season: matchingEvent.season || s.season || seasonFromDate(s.date),
                    tags: matchingEvent.tags || s.tags || [],
                    galleryImages: matchingEvent.galleryImages || [],
                    _type: 'event',
                });
            } else {
                mergedArchive.push({ ...s, _type: 'stream' });
            }
        }

        // Aggiungi eventi che NON hanno uno stream corrispondente
        for (const ev of allEvents) {
            if (!usedEventDates.has(ev.date)) {
                mergedArchive.push({
                    id: ev.id,
                    artist: ev.title || 'EVENTO',
                    title: ev.location || 'EVENTO',
                    date: ev.date,
                    imageUrl: ev.mainImage || '',
                    soundcloudUrl: null,
                    season: ev.season || seasonFromDate(ev.date),
                    tags: ev.tags || [],
                    galleryImages: ev.galleryImages || [],
                    _type: 'event',
                });
            }
        }

        const allArchiveItems = mergedArchive;
        window._allArchiveItems = allArchiveItems;
        // Uno stream finisce nell'archivio solo quando la sua fine (timeEnd) è passata.
        // Eventi senza orario: fallback a fine giornata (23:59).
        const nowRef = new Date();
        const pastStreams = allArchiveItems
            .filter(s => itemEndDateTime(s) < nowRef)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (archiveGrid) {
            renderGrid(pastStreams, archiveGrid);
            const filterButtons = $$('#archive-filters .filter-btn');
            filterButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if(button.parentElement.querySelector('.active')) button.parentElement.querySelector('.active').classList.remove('active');
                    button.classList.add('active');
                    const season = button.dataset.season;
                    const filteredData = season === 'all' ? pastStreams : pastStreams.filter(item => item.season === season);
                    _archiveCardIndex = 0;
                    renderGrid(filteredData.sort((a, b) => new Date(b.date) - new Date(a.date)), archiveGrid);
                });
            });
        }

        if (archivePreviewGrid) {
            renderGrid(pastStreams.slice(0, 4), archivePreviewGrid);
        }
    }
    
    function gestioneArtisti() {
        const artistsGrid = $('#artists-grid');
        if (!artistsGrid) return;

        // Fallback hardcoded: usato se Firebase non ha dati o non è raggiungibile
        const fallbackResidents = [
            { name: 'ADAD', image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
            { name: 'ALIUS BENZ', image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
            { name: 'COUNTERCULTURE', image: 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/residents/counterculture.jpg', bio: 'Manuel López (Counterculture) is a Colombian DJ and live act based in Rome, focused on underground techno, modular live performance and hybrid sets combining vinyl, hardware and digital sources. A member of Gate Radio and resident of the Bugs collective, his sound is raw, hypnotic and functional for the dancefloor. He has performed at underground clubs and spaces in Rome such as Brancaleone and Hacienda, as well as independent venues, record stores and alternative organizations.', instagram: 'https://www.instagram.com/counterculturx/', soundcloud: 'https://soundcloud.com/counterculture666', mixcloud: '' },
            { name: 'MRQS', image: 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/residents/mrqs.jpg', bio: 'MRQS brings together two worlds: that of a sound engineer and sound designer, and that of a DJ. This dual expertise is clearly reflected in his sets, which are meticulously crafted, powerful in impact, and surprising in their selections. He moves seamlessly from tribal hardgroove to techno atmospheres, all the way to UK garage grooves, maintaining constant attention to sound quality and the room\'s response. His experience has been shaped on stages such as Acrobax and through numerous events for various collectives. Beyond the decks, he is the founder and driving force behind Gate Radio.', instagram: 'https://www.instagram.com/romarcomani/', soundcloud: 'https://soundcloud.com/marco-romani-308872897', mixcloud: '' },
            { name: 'MERLO', image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
            { name: 'PUG', image: 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/residents/pug.jpg', bio: 'Pug is a sound designer and producer of club and experimental music. His productions stand out for their use of synthesized sounds, creative sample processing, and polyrhythms. In addition to his DJ career, he performs live sets both solo and B2B, with an approach focused on techno and bass music. His track Cast Iron Plate is included in the compilation Nodi 001.', instagram: 'https://www.instagram.com/prod.pug/', soundcloud: 'https://soundcloud.com/user-66581760', mixcloud: '' },
            { name: 'ROBBSS', image: '', bio: '', instagram: '', soundcloud: '', mixcloud: '' },
            { name: 'SOFFICE', image: 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/residents/soffice.jpg', bio: 'A key resident of Freenetica Crew, Soffice is a techno DJ shaped by the Roman underground scene. Her sound moves through percussive grooves and pulsing basslines, drawing inspiration from the energy of \'90s and 2000s dancefloors, reworked through a contemporary and dynamic vision. Evolving toward hypnotic, percussion-driven sounds, she delivers solid, dancefloor-focused sets. She has played at key venues such as Cieloterra, Forte Antenne, Warehouse 303, Gate Milano, and Serendipity with MRC.', instagram: 'https://www.instagram.com/s0ffice/', soundcloud: 'https://soundcloud.com/user-872402408', mixcloud: '' },
        ];

        // Prova a caricare i resident da Firebase; se vuoto o errore → fallback
        const GATE_FB_URL = 'https://studio-kraken-gate-default-rtdb.firebaseio.com';
        fetch(`${GATE_FB_URL}/gateRadio/residents.json`)
            .then(r => r.ok ? r.json() : null)
            .then(obj => {
                let residents;
                if (obj && typeof obj === 'object') {
                    residents = Object.values(obj).sort((a, b) => (a.order || 0) - (b.order || 0));
                    if (residents.length === 0) residents = fallbackResidents;
                } else {
                    residents = fallbackResidents;
                }
                renderResidents(residents);
            })
            .catch(() => renderResidents(fallbackResidents));

        function renderResidents(residents) {
        const gridHTML = residents.map(artist => {
            const socials = [
                artist.instagram ? `<a href="${artist.instagram}" target="_blank" rel="noopener" class="resident-social-link" aria-label="Instagram di ${artist.name}"><i class="fab fa-instagram"></i></a>` : '',
                artist.soundcloud ? `<a href="${artist.soundcloud}" target="_blank" rel="noopener" class="resident-social-link" aria-label="SoundCloud di ${artist.name}"><i class="fab fa-soundcloud"></i></a>` : '',
                artist.mixcloud ? `<a href="${artist.mixcloud}" target="_blank" rel="noopener" class="resident-social-link" aria-label="Mixcloud di ${artist.name}"><i class="fab fa-mixcloud"></i></a>` : '',
            ].filter(Boolean).join('');

            return `
                <div class="artist-card">
                    <div class="artist-card-image-wrapper">
                        <img src="${artist.image || 'assets/resident_placeholder.svg'}" alt="${artist.name}" class="artist-card-image" loading="lazy">
                    </div>
                    <div class="artist-card-content">
                        <h3 class="artist-card-title">${artist.name}</h3>
                        <p class="artist-card-bio">${artist.bio || ''}</p>
                        ${socials ? `<div class="resident-socials">${socials}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        artistsGrid.innerHTML = gridHTML;
        }
    }

    function gestioneEventi() {
        const eventsGrid = $('#events-grid');
        const eventsPreviewGrid = $('#events-grid-preview');
        if ((!eventsGrid && !eventsPreviewGrid) || typeof eventsData === 'undefined') return;

        const createEventCardHTML = (event) => {
            const eventDate = new Date(event.date);
            return `
                <div class="event-card group" data-event-id="${event.id}" style="cursor: pointer;">
                    <div class="event-card-image-wrapper"><img src="${event.mainImage || FALLBACK_IMG}" alt="${event.title}" class="event-card-image" loading="lazy"></div>
                    <div class="event-card-content">
                        <h3 class="event-card-title">${event.title}</h3>
                        <p class="event-card-date">${eventDate.toLocaleDateString(_glLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>`;
        };

        const sortedEvents = [...eventsData].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (eventsGrid) { eventsGrid.innerHTML = sortedEvents.map(createEventCardHTML).join(''); }
        if (eventsPreviewGrid) { eventsPreviewGrid.innerHTML = sortedEvents.slice(0, 3).map(createEventCardHTML).join(''); }

        document.body.addEventListener('click', function(e) {
            const clickedCard = e.target.closest('.event-card');
            if (clickedCard) {
                const ev = eventsData.find(x => x.id == clickedCard.dataset.eventId);
                openEventModal(ev);
            }
        });
    }
    
    function gestioneCalendario() {
        const calendarGrid = $('#calendar-grid');
        if (!calendarGrid) return;

        const monthYearHeader = $('#month-year-header');
        const prevMonthBtn = $('#prev-month-btn');
        const nextMonthBtn = $('#next-month-btn');
        const allEvents = [...(streamsData || []).map(s => ({...s, type: 'stream'})), ...(eventsData || []).map(e => ({...e, type: 'event'}))];
        let currentDate = new Date();

        const renderCalendar = () => {
            monthYearHeader.textContent = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();
            const year = currentDate.getFullYear(), month = currentDate.getMonth();
            const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let gridHTML = Array(firstDayOfWeek).fill('<div class="day-cell other-month"></div>').join('');
            const activeFilter = $('#calendar-filters .filter-btn.active')?.dataset.filter || 'all';

            for (let day = 1; day <= daysInMonth; day++) {
                const dateString = toLocalDateString(new Date(year, month, day));
                const eventsForDay = allEvents.filter(e => e.date === dateString && (activeFilter === 'all' || e.type === activeFilter));
                const typeClasses = eventsForDay.length > 0 ? [...new Set(eventsForDay.map(e => `event-type-${e.type}`))].join(' ') : '';
                gridHTML += `<div class="day-cell ${dateString === toLocalDateString(new Date()) ? 'today' : ''} ${eventsForDay.length ? 'has-event' : ''} ${typeClasses}" ${eventsForDay.length ? `data-events="${encodeURIComponent(JSON.stringify(eventsForDay))}"` : ''}>
                                <div class="day-cell-content"><span class="day-number">${day}</span></div></div>`;
            }
            calendarGrid.innerHTML = gridHTML;
        };

        calendarGrid.addEventListener('click', (e) => {
            const dayCell = e.target.closest('.has-event');
            if (!dayCell) return;
            const firstEvent = JSON.parse(decodeURIComponent(dayCell.dataset.events))[0];
            if (firstEvent.type === 'stream') {
                openArchiveModal(firstEvent.id);
            } else {
                openEventModal(firstEvent);
            }
        });

        renderCalendar();
        prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
        nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

        $$('#calendar-filters .filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                $('#calendar-filters .filter-btn.active').classList.remove('active');
                button.classList.add('active');
                renderCalendar();
            });
        });
    }
    
    function initBookingCalendar() {
        const dateInput = $('#booking-date-input');
        if (!dateInput) return;
        if (!bookingConfig || !bookingConfig.availableDates || bookingConfig.availableDates.length === 0) {
            dateInput.placeholder = "Nessuna data disponibile.";
            dateInput.disabled = true;
            return;
        }
        flatpickr(dateInput, {
            dateFormat: "d-m-Y",
            altInput: true,
            altFormat: "Y-m-d",
            locale: 'it',
            enable: bookingConfig.availableDates,
        });
    }

    

    // --- ESECUZIONE DI TUTTE LE FUNZIONI ---
    gestioneMenuMobile();
    aggiornaAnnoFooter();
    initLivePlayer();
    gestioneArchivio();
    gestioneArtisti();
    gestioneEventi();
    gestioneCalendario();
    initBookingCalendar();
    
    const lightbox = $('#lightbox');
    if (lightbox) {
        const lightboxCloseBtn = lightbox.querySelector('.lightbox-close');
        const closeLightbox = () => lightbox.classList.add('hidden');
        
        lightboxCloseBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // Skeleton: marca immagini come loaded quando pronte (rimuove shimmer)
    document.querySelectorAll('img').forEach(img => {
        if (img.complete && img.naturalWidth > 0) { img.classList.add('loaded'); return; }
        img.addEventListener('load',  () => img.classList.add('loaded'));
        img.addEventListener('error', () => img.classList.add('loaded'));
    });
});