// js/firebase-data.js — Legge streams ed eventi da Firebase Realtime Database
// Usato dal sito Gate Radio (lettura pubblica, nessuna autenticazione richiesta)

const GATE_FIREBASE_URL = 'https://studio-kraken-gate-default-rtdb.firebaseio.com';

// Le live del calendario (Google Sheet) con data, orario e nome sono approvate in
// automatico: si vedono prima (prossima live, calendario) e dopo (archivio, il link
// YouTube si aggiunge quando il video è online). Si nascondono solo con l'occhio
// del backstage, che scrive hidden:true. Stessa regola in js/backstage.js.
function isVisibleStream(s) {
    if (s.hidden === true) return false;
    if (s.published !== false) return true;
    return s.source === 'google-sheets' && !!s.date && !!s.timeStart && !!s.artist;
}

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
                .map(s => s.season ? { ...s, season: String(s.season).toLowerCase() } : s) // "Autumn" → "autumn"
                .filter(isVisibleStream)
            : null;

        // Come per le live: gli eventi con published:false (nascosti dall'admin
        // con l'occhio nel backstage) non vengono mostrati. Quelli senza il campo
        // restano visibili.
        const events = eventsObj && typeof eventsObj === 'object'
            ? Object.entries(eventsObj)
                .map(([key, val]) => ({ ...val, id: key, _fbKey: key }))
                .map(e => e.season ? { ...e, season: String(e.season).toLowerCase() } : e)
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
