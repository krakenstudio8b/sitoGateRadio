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
    
    // --- GESTIONE GLOBALE MODALE ARCHIVIO ---
    const archiveModal = $('#archive-modal');
    let openArchiveModal; 

    if (archiveModal) {
        const archiveModalBody = $('#archive-modal-body');
        const archiveModalCloseBtn = $('#archive-modal-close-btn');

        openArchiveModal = (streamId) => {
            // Cerca sia in streams che in eventi normalizzati per archivio
            const stream = (window._allArchiveItems || streamsData || []).find(s => s.id == streamId);
            if (!stream) return;

            archiveModal.classList.remove('winter', 'spring', 'summer', 'autumn');
            if (stream.season) {
                archiveModal.classList.add(stream.season);
            }

            const tagsHTML = stream.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('');
            
            const actionButton = stream.soundcloudUrl && stream.soundcloudUrl !== '#' 
                ? `<a href="${stream.soundcloudUrl}" target="_blank" class="btn-primary inline-block px-8 py-2 rounded-lg mt-1 font-bold"><i class="fas fa-play-circle mr-2"></i>GUARDA LA STREAMING</a>`
                : '';

            // Gallery intelligente: layout diverso in base al numero di immagini
            const images = stream.galleryImages && stream.galleryImages.length > 0
                ? stream.galleryImages
                : [stream.imageUrl];
            const count = images.length;

            const modalContent = document.getElementById('archive-modal-content');
            // Allarga il modale se ci sono più immagini
            modalContent.className = modalContent.className.replace(/max-w-\S+/g, '');
            modalContent.classList.add(count > 1 ? 'max-w-3xl' : 'max-w-sm');

            let imagesHTML = '';
            if (count === 1) {
                imagesHTML = `<div class="archive-modal-image-wrapper flex-shrink-0">
                    <img src="${images[0]}" alt="${stream.title}" loading="lazy" class="w-full h-auto rounded-t-xl object-contain max-h-[60vh]">
                </div>`;
            } else if (count === 2) {
                imagesHTML = `<div class="grid grid-cols-2 gap-1 rounded-t-xl overflow-hidden">
                    ${images.map(img => `<img src="${img}" alt="${stream.title}" loading="lazy" class="w-full h-full object-cover aspect-square">`).join('')}
                </div>`;
            } else if (count === 3) {
                imagesHTML = `<div class="grid grid-cols-2 gap-1 rounded-t-xl overflow-hidden" style="grid-template-rows: 1fr 1fr;">
                    <img src="${images[0]}" alt="${stream.title}" loading="lazy" class="w-full h-full object-cover row-span-2">
                    <img src="${images[1]}" alt="${stream.title}" loading="lazy" class="w-full h-full object-cover">
                    <img src="${images[2]}" alt="${stream.title}" loading="lazy" class="w-full h-full object-cover">
                </div>`;
            } else {
                // 4+ immagini: griglia 2 colonne
                imagesHTML = `<div class="grid grid-cols-2 gap-1 rounded-t-xl overflow-hidden">
                    ${images.map(img => `<img src="${img}" alt="${stream.title}" loading="lazy" class="w-full aspect-square object-cover">`).join('')}
                </div>`;
            }

            archiveModalBody.innerHTML = `
                ${imagesHTML}
                <div class="p-6 text-center overflow-y-auto">
                    <h3 class="text-2xl font-bold text-[var(--accent)] mb-1">${stream.artist}</h3>
                    <p class="text-md text-[var(--text-secondary)] mb-4">${stream.title}</p>
                    <div class="flex flex-wrap gap-2 justify-center mb-6">${tagsHTML}</div>
                    ${actionButton}
                </div>
            `;
            archiveModal.classList.remove('hidden');
            archiveModal.classList.add('flex');
        };

        const closeArchiveModal = () => {
            if(archiveModal) {
                archiveModal.classList.add('hidden');
                archiveModal.classList.remove('flex');
                setTimeout(() => {
                    archiveModal.classList.remove('winter', 'spring', 'summer', 'autumn');
                }, 300);
            }
        };

        archiveModalCloseBtn.addEventListener('click', closeArchiveModal);
        archiveModal.addEventListener('click', (e) => {
            if (e.target === archiveModal) closeArchiveModal();
        });
    }

    // LISTENER GLOBALE PER I CLICK CHE APRONO IL MODALE ARCHIVIO
    document.body.addEventListener('click', function(event) {
        // Se il click avviene sul bottone/link play, non aprire il modale
        if (event.target.closest('.card-play-button-link')) {
            return;
        }

        const archiveCard = event.target.closest('.archive-card[data-stream-id]');
        const artistStreamLink = event.target.closest('.artist-stream-link');

        if (archiveCard && typeof openArchiveModal === 'function') {
            openArchiveModal(archiveCard.dataset.streamId);
        } 
        else if (artistStreamLink && typeof openArchiveModal === 'function') {
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
        // "Prossimo" = start time non ancora passato (include live che iniziano oggi)
        const futureEvents = data
            .filter(event => itemStartDateTime(event) > now)
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

        const nextStream = findNextEvent(typeof streamsData !== 'undefined' ? streamsData : []);
        
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

        const modal = $('#event-gallery-modal');
        if (!modal) return;
        
        const modalContent = modal.querySelector('.event-modal-content');
        const modalCloseBtn = $('#event-modal-close');
        const galleryContainer = $('#gallery-container');
        const lightbox = $('#lightbox');
        const lightboxImg = $('#lightbox-image');

        const _evtLang = () => window.GateI18n ? window.GateI18n.getLang() : 'it';
        const _evtLocale = () => _evtLang() === 'en' ? 'en-GB' : 'it-IT';

        const createEventCardHTML = (event) => {
            const eventDate = new Date(event.date);
            return `
                <div class="event-card group" data-event-id="${event.id}" style="cursor: pointer;">
                    <div class="event-card-image-wrapper"><img src="${event.mainImage || 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/logoverticaleconscritta.png'}" alt="${event.title}" class="event-card-image" loading="lazy"></div>
                    <div class="event-card-content">
                        <h3 class="event-card-title">${event.title}</h3>
                        <p class="event-card-date">${eventDate.toLocaleDateString(_evtLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>`;
        };

        const openModal = (eventId) => {
            const event = eventsData.find(e => e.id == eventId);
            if (!event) return;
            const lang = _evtLang();
            const locale = _evtLocale();
            $('#modal-event-title').textContent = (lang === 'en' && event.title_en) ? event.title_en : event.title;
            $('#modal-event-date').textContent = new Date(event.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            $('#modal-event-location').textContent = event.location;
            $('#modal-event-description').textContent = (lang === 'en' && event.description_en) ? event.description_en : event.description;
            $('#modal-event-details').textContent = (lang === 'en' && event.details_en) ? event.details_en : event.details;
            $('#modal-event-tags').innerHTML = event.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('');
            
            const fallbackImg = 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/logoverticaleconscritta.png';
            const rawImgs = event.galleryImages && event.galleryImages.length > 0 ? event.galleryImages : (event.mainImage ? [event.mainImage] : [fallbackImg]);
            const imgs = rawImgs;
            modalContent.classList.remove('single-image-mode');
            if (imgs.length === 1) {
                modalContent.classList.add('single-image-mode');
                galleryContainer.innerHTML = `<div class="single-image-wrapper"><img src="${imgs[0]}" alt="${event.title}" loading="lazy"></div>`;
            } else if (imgs.length === 2) {
                galleryContainer.innerHTML = `<div class="gallery-grid gallery-grid-2">${imgs.map(src => `<div class="gallery-item"><img src="${src}" alt="${event.title}" loading="lazy"></div>`).join('')}</div>`;
            } else if (imgs.length === 3) {
                galleryContainer.innerHTML = `<div class="gallery-grid gallery-grid-3"><div class="gallery-item gallery-item-big"><img src="${imgs[0]}" alt="${event.title}" loading="lazy"></div><div class="gallery-item"><img src="${imgs[1]}" alt="${event.title}" loading="lazy"></div><div class="gallery-item"><img src="${imgs[2]}" alt="${event.title}" loading="lazy"></div></div>`;
            } else if (imgs.length >= 4) {
                // Prima riga: immagini più grandi, seconda riga: più piccole
                const half = Math.ceil(imgs.length / 2);
                const row1 = imgs.slice(0, half);
                const row2 = imgs.slice(half);
                galleryContainer.innerHTML = `
                    <div class="gallery-row">${row1.map(src => `<div class="gallery-item"><img src="${src}" alt="${event.title}" loading="lazy"></div>`).join('')}</div>
                    <div class="gallery-row posts-row">${row2.map(src => `<div class="gallery-item"><img src="${src}" alt="${event.title}" loading="lazy"></div>`).join('')}</div>`;
            } else {
                galleryContainer.innerHTML = '';
            }
            
            $$('.gallery-item img, .single-image-wrapper img').forEach(img => {
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    lightboxImg.src = img.src;
                    lightbox.classList.remove('hidden');
                });
            });
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        };
        const closeModal = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        };
        
        const sortedEvents = [...eventsData].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (eventsGrid) { eventsGrid.innerHTML = sortedEvents.map(createEventCardHTML).join(''); }
        if (eventsPreviewGrid) { eventsPreviewGrid.innerHTML = sortedEvents.slice(0, 3).map(createEventCardHTML).join(''); }
        
        document.body.addEventListener('click', function(event) {
            const clickedCard = event.target.closest('.event-card');
            if(clickedCard) { openModal(clickedCard.dataset.eventId); }
        });
        
        modalCloseBtn.addEventListener('click', closeModal);
        $('.event-modal-backdrop')?.addEventListener('click', closeModal);
    }
    
    function gestioneCalendario() {
        const calendarGrid = $('#calendar-grid');
        if (!calendarGrid) return; 

        const monthYearHeader = $('#month-year-header');
        const prevMonthBtn = $('#prev-month-btn');
        const nextMonthBtn = $('#next-month-btn');
        const modal = $('#event-modal');
        const modalBody = $('#modal-body');
        const modalCloseBtn = $('#modal-close-btn');
        const allEvents = [...(streamsData || []).map(s => ({...s, type: 'stream'})), ...(eventsData || []).map(e => ({...e, type: 'event'}))];
        let currentDate = new Date();
        
        const openInfoModal = (event) => {
            const isFuture = new Date(event.date) >= new Date(new Date().setHours(0,0,0,0));
            let contentHTML = '';
            
            if (event.type === 'stream') {
                const buttonHTML = isFuture ? `<p class="text-sm text-[var(--text-secondary)] mt-4">Resta sintonizzato.</p>` : `<button data-stream-id="${event.id}" class="btn-primary inline-block px-8 py-2 rounded-lg mt-4 font-bold open-archive-from-calendar"><i class="fas fa-play-circle mr-2"></i>GUARDA LA STREAMING</button>`;
                contentHTML = `<div class="w-full bg-black rounded-t-xl overflow-hidden"><img src="${event.imageUrl}" alt="${event.artist}" class="w-full h-auto block" loading="lazy"></div><div class="p-4 text-center"><span class="card-tag bg-[var(--accent)] !text-black mb-2">${isFuture ? 'PROSSIMA DIRETTA' : 'DIRETTA ARCHIVIATA'}</span><h3 class="text-2xl font-bold mt-2">${event.artist}</h3>${!isFuture ? `<p class="text-md text-[var(--text-secondary)] mb-4">${event.title}</p>` : ''}${buttonHTML}</div>`;
            } else {
                contentHTML = `<div class="w-full bg-black rounded-t-xl overflow-hidden"><img src="${event.mainImage}" alt="${event.title}" class="w-full h-auto block" loading="lazy"></div><div class="p-4 text-center"><span class="card-tag bg-[var(--accent-event)] !text-white mb-2">${isFuture ? 'PROSSIMO EVENTO' : 'EVENTO PASSATO'}</span><h3 class="text-2xl font-bold mt-2">${event.title}</h3><p class="text-sm text-[var(--text-secondary)] mb-4"><i class="fas fa-map-marker-alt mr-1"></i> ${event.location}</p><p class="text-sm">${event.description}</p></div>`;
            }
            modalBody.innerHTML = contentHTML;
            modal.classList.add('is-open');
        };

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
            if (dayCell) {
                const firstEvent = JSON.parse(decodeURIComponent(dayCell.dataset.events))[0];
                const isPastStream = firstEvent.type === 'stream' && new Date(firstEvent.date) < new Date(new Date().setHours(0,0,0,0));
                
                if (isPastStream) {
                    if(typeof openArchiveModal === 'function') openArchiveModal(firstEvent.id);
                } else {
                    openInfoModal(firstEvent);
                }
            }
        });
        
        modal.addEventListener('click', function(event) {
            const calendarButton = event.target.closest('.open-archive-from-calendar');
            if (calendarButton) {
                const streamId = calendarButton.dataset.streamId;
                if (streamId && typeof openArchiveModal === 'function') {
                    modal.classList.remove('is-open');
                    setTimeout(() => openArchiveModal(streamId), 150);
                }
            }
        });

        renderCalendar();
        prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
        nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
        modalCloseBtn.addEventListener('click', () => modal.classList.remove('is-open'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('is-open'); });
        
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