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
        // Mostra solo le live approvate: quelle senza il campo `published`
        // (vecchie o create a mano nel backstage) restano visibili; quelle
        // sincronizzate dal Google Sheet arrivano con published:false e
        // compaiono solo dopo l'approvazione dell'admin dal backstage.
        const streams = streamsObj && typeof streamsObj === 'object'
            ? Object.entries(streamsObj)
                .map(([key, val]) => ({ ...val, id: key, _fbKey: key }))
                .filter(s => s.published !== false)
            : null;

        // Come per le live: gli eventi con published:false (nascosti dall'admin
        // con l'occhio nel backstage) non vengono mostrati. Quelli senza il campo
        // restano visibili.
        const events = eventsObj && typeof eventsObj === 'object'
            ? Object.entries(eventsObj)
                .map(([key, val]) => ({ ...val, id: key, _fbKey: key }))
                .filter(e => e.published !== false)
            : null;

        if (streams) console.log(`[GateRadio] ${streams.length} stream caricati da Firebase.`);
        if (events)  console.log(`[GateRadio] ${events.length} eventi caricati da Firebase.`);

        return { streams, events };
    } catch (err) {
        console.warn('[GateRadio] Firebase non disponibile, uso dati statici:', err.message);
        return { streams: null, events: null };
    }
})();
