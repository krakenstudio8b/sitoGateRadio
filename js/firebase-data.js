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
        // Prima la strada sicura: il Worker di Cloudflare (/api/gate-data) che toglie
        // telefoni ed email. Se non risponde (es. anteprima in locale) si legge
        // Firebase direttamente, finché la sua lettura pubblica resta aperta.
        let streamsObj, eventsObj;
        // fino a 3 tentativi, ognuno con un tempo massimo: una rete lenta o un
        // intoppo momentaneo non devono lasciare le pagine vuote
        const tentativo = async (ms) => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), ms);
            try {
                const r = await fetch('/api/gate-data', { signal: ctrl.signal });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const d = await r.json();
                if (!d || !d.streams) throw new Error('risposta vuota');
                return d;
            } finally { clearTimeout(timer); }
        };
        try {
            let d = null, ultimoErrore = null;
            for (const [ms, pausa] of [[8000, 0], [10000, 800], [15000, 2000]]) {
                if (pausa) await new Promise(r => setTimeout(r, pausa));
                try { d = await tentativo(ms); break; } catch (e) { ultimoErrore = e; }
            }
            if (!d) throw ultimoErrore || new Error('dati non arrivati');
            streamsObj = d.streams;
            eventsObj  = d.events;
        } catch (apiErr) {
            const [streamsRes, eventsRes] = await Promise.all([
                fetch(`${GATE_FIREBASE_URL}/gateRadio/streams.json`),
                fetch(`${GATE_FIREBASE_URL}/gateRadio/events.json`)
            ]);
            streamsObj = await streamsRes.json();
            eventsObj  = await eventsRes.json();
        }

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
        window.gateDataError = true;   // le pagine mostrano "riprova" invece di "nessun risultato"
        return { streams: null, events: null };
    }
})();
