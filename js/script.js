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
            if (!streamsData) return;
            const stream = streamsData.find(s => s.id == streamId);
            if (!stream) return;

            archiveModal.classList.remove('winter', 'spring', 'summer', 'autumn');
            if (stream.season) {
                archiveModal.classList.add(stream.season);
            }

            const tagsHTML = stream.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('');
            
            const actionButton = stream.soundcloudUrl && stream.soundcloudUrl !== '#' 
                ? `<a href="${stream.soundcloudUrl}" target="_blank" class="btn-primary inline-block px-8 py-2 rounded-lg mt-1 font-bold"><i class="fas fa-play-circle mr-2"></i>GUARDA LA STREAMING</a>`
                : '';

            archiveModalBody.innerHTML = `
                <div class="archive-modal-image-wrapper flex-shrink-0">
                    <img src="${stream.imageUrl}" alt="${stream.title}" loading="lazy">
                </div>
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
    
    function findNextEvent(data) {
        if (!data) return null;
        const now = new Date();
        const futureEvents = data
            .filter(event => new Date(event.date) > now)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
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
        
        if (isLive) {
            liveContainer.innerHTML = `<div class="mb-12"><div class="on-air-indicator">ON AIR</div></div><div style="aspect-ratio: 16/9;" class="w-full rounded-lg overflow-hidden glow-border"><iframe src="https://player.twitch.tv/?channel=${TWITCH_CONFIG.CHANNEL_NAME}&parent=${window.location.hostname}&autoplay=true&muted=true" height="100%" width="100%" allowfullscreen class="w-full h-full"></iframe></div>`;
        } else if (nextStream) {
            const eventDate    = new Date(nextStream.date);
            const formattedDate = eventDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
            const eventTime    = "18:00 -> 21:00";

            // Widget Radio 24/7 — mostra cosa sta girando ora
            let radioWidgetHTML = '';
            if (typeof GateRadio !== 'undefined') {
                const rs = GateRadio.getCurrentState();
                radioWidgetHTML = `
                    <div class="radio-widget-banner">
                        <div class="radio-widget-info">
                            <div class="radio-widget-dot"></div>
                            <div class="radio-widget-texts">
                                <p class="radio-widget-label">GATE RADIO 24/7 — ORA IN ROTAZIONE</p>
                                <p class="radio-widget-artist">${rs.current.artist}</p>
                            </div>
                        </div>
                        <a href="radio.html" class="btn-primary font-bold py-2 px-6 rounded-full text-sm inline-flex items-center gap-2 flex-shrink-0">
                            <i class="fas fa-radio"></i> ASCOLTA ORA
                        </a>
                    </div>`;
            } else {
                radioWidgetHTML = `
                    <div class="radio-widget-banner">
                        <div class="radio-widget-info">
                            <div class="radio-widget-dot"></div>
                            <div class="radio-widget-texts">
                                <p class="radio-widget-label">GATE RADIO 24/7</p>
                                <p class="radio-widget-artist">Set live in rotazione continua</p>
                            </div>
                        </div>
                        <a href="radio.html" class="btn-primary font-bold py-2 px-6 rounded-full text-sm inline-flex items-center gap-2 flex-shrink-0">
                            <i class="fas fa-radio"></i> ASCOLTA ORA
                        </a>
                    </div>`;
            }

            liveContainer.innerHTML = `
                <div class="coming-soon-container text-center">
                    <h2 class="coming-soon-title">COMING SOON</h2>
                    <div class="next-event-card my-8 mx-auto">
                        <img src="${nextStream.imageUrl}" alt="${nextStream.title}" class="w-full h-auto" loading="lazy">
                    </div>
                    <p class="next-event-date">${formattedDate} - ${eventTime}</p>
                    ${radioWidgetHTML}
                </div>`;
        } else {
            liveContainer.innerHTML = `
                <div class="coming-soon-container text-center">
                    <h2 class="coming-soon-title">STAY TUNED</h2>
                    <p class="next-event-date mt-4">Nessun evento in programma.</p>
                    <div class="radio-widget-banner mt-8 max-w-lg mx-auto">
                        <div class="radio-widget-info">
                            <div class="radio-widget-dot"></div>
                            <div class="radio-widget-texts">
                                <p class="radio-widget-label">GATE RADIO 24/7</p>
                                <p class="radio-widget-artist">Set live in rotazione continua</p>
                            </div>
                        </div>
                        <a href="radio.html" class="btn-primary font-bold py-2 px-6 rounded-full text-sm inline-flex items-center gap-2 flex-shrink-0">
                            <i class="fas fa-radio"></i> ASCOLTA ORA
                        </a>
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
                        <div class="p-4 md:p-5 flex flex-col flex-grow bg-[#1a1a1a]" style="cursor: pointer;">
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

        const pastStreams = streamsData.filter(s => new Date(s.date) < new Date()).sort((a, b) => new Date(b.date) - new Date(a.date));
        
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
        if (!artistsGrid || typeof streamsData === 'undefined') return;

        const allArtistInstances = streamsData.flatMap(stream => stream.artist.split(/\s*[,|]\s*/).map(name => name.trim()));
        const uniqueArtistNames = [...new Set(allArtistInstances)].filter(name => name).sort((a, b) => a.localeCompare(b));

        const artistsData = uniqueArtistNames.map(name => {
            const artistStreams = streamsData.filter(stream => new RegExp(`\\b${name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(stream.artist))
                                           .sort((a, b) => new Date(b.date) - new Date(a.date));
            return {
                name: name,
                streams: artistStreams,
                mainImage: artistStreams.length > 0 ? artistStreams[0].imageUrl : 'assets/team_placeholder_1.jpg' 
            };
        });

        const gridHTML = artistsData.map(artist => {
            return `
                <div class="artist-card">
                    <div class="artist-card-content">
                        <h3 class="artist-card-title">${artist.name}</h3>
                        <p class="artist-card-stream-count">${artist.streams.length} ${artist.streams.length === 1 ? 'diretta' : 'dirette'}</p>
                        <div class="artist-card-streams-list">
                            ${artist.streams.slice(0, 3).map(stream => `
                                <a href="#" class="artist-stream-link" data-stream-id="${stream.id}">
                                    <i class="fas fa-play-circle fa-fw"></i>
                                    <span>${new Date(stream.date).toLocaleDateString('it-IT', { year: '2-digit', month: 'short', day: 'numeric' })}</span>
                                </a>
                            `).join('')}
                            ${artist.streams.length > 3 ? `<p class="text-xs text-[var(--text-secondary)] mt-2">...e ${artist.streams.length - 3} altre</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        artistsGrid.innerHTML = gridHTML;
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

        const createEventCardHTML = (event) => {
            const eventDate = new Date(event.date);
            return `
                <div class="event-card group" data-event-id="${event.id}" style="cursor: pointer;">
                    <div class="event-card-image-wrapper"><img src="${event.mainImage}" alt="${event.title}" class="event-card-image" loading="lazy"></div>
                    <div class="event-card-content">
                        <h3 class="event-card-title">${event.title}</h3>
                        <p class="event-card-date">${eventDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>`;
        };
        
        const openModal = (eventId) => {
            const event = eventsData.find(e => e.id == eventId);
            if (!event) return;
            $('#modal-event-title').textContent = event.title;
            $('#modal-event-date').textContent = new Date(event.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            $('#modal-event-location').textContent = event.location;
            $('#modal-event-description').textContent = event.description;
            $('#modal-event-details').textContent = event.details;
            $('#modal-event-tags').innerHTML = event.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('');
            
            if (event.galleryImages.length === 1) {
                modalContent.classList.add('single-image-mode');
                galleryContainer.innerHTML = `<div class="single-image-wrapper"><img src="${event.galleryImages[0]}" alt="Evento: ${event.title}" loading="lazy"></div>`;
            } else {
                modalContent.classList.remove('single-image-mode');
                const posters = event.galleryImages.filter(img => img.toUpperCase().includes('GRAFICA'));
                const posts = event.galleryImages.filter(img => img.toUpperCase().includes('POST'));
                let galleryHTML = '';
                if (posters.length > 0) galleryHTML += `<div class="gallery-row">${posters.map(imgSrc => `<div class="gallery-item"><img src="${imgSrc}" alt="Grafica: ${event.title}" loading="lazy"></div>`).join('')}</div>`;
                if (posts.length > 0) galleryHTML += `<div class="gallery-row posts-row">${posts.map(imgSrc => `<div class="gallery-item"><img src="${imgSrc}" alt="Post: ${event.title}" loading="lazy"></div>`).join('')}</div>`;
                galleryContainer.innerHTML = galleryHTML;
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