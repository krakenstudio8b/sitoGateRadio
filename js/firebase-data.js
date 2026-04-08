// js/firebase-data.js — Legge streams ed eventi da Firebase Realtime Database
// Usato dal sito Gate Radio (lettura pubblica, nessuna autenticazione richiesta)

const GATE_FIREBASE_URL = 'https://studio-kraken-gate-default-rtdb.firebaseio.com';

window.gateRadioDataPromise = (async function fetchGateRadioData() {
    try {
        const [streamsRes, eventsRes] = await Promise.all([
            fetch(`${GATE_FIREBASE_URL}/gateRadio/streams.json`),
            fetch(`${GATE_FIREBASE_URL}/gateRadio/events.json`)
        ]);

        const streamsObj = await streamsRes.json();
        const eventsObj  = await eventsRes.json();

        // Firebase restituisce oggetti con push key → converti in array
        // Usa la push key come `id` per compatibilità con il codice del sito
        const streams = streamsObj && typeof streamsObj === 'object'
            ? Object.entries(streamsObj).map(([key, val]) => ({ ...val, id: key, _fbKey: key }))
            : null;

        const events = eventsObj && typeof eventsObj === 'object'
            ? Object.entries(eventsObj).map(([key, val]) => ({ ...val, id: key, _fbKey: key }))
            : null;

        if (streams) console.log(`[GateRadio] ${streams.length} stream caricati da Firebase.`);
        if (events)  console.log(`[GateRadio] ${events.length} eventi caricati da Firebase.`);

        return { streams, events };
    } catch (err) {
        console.warn('[GateRadio] Firebase non disponibile, uso dati statici:', err.message);
        return { streams: null, events: null };
    }
})();
