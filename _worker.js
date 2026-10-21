// Worker che serve Coming Soon su gateradiorm.com e il sito normale su workers.dev
// URL pubblico del bucket R2 (dev URL)
const R2_PUBLIC_BASE = 'https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev';

function uploadCorsHeaders(request) {
    const origin = request.headers.get('Origin') || '';
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    };
}

// Chi carica deve essere loggato nel backstage con ruolo admin.
// Il browser manda il "token" di login Firebase; qui lo facciamo verificare
// a Firebase stesso (niente chiavi segrete scritte nel codice pubblico).
const FIREBASE_WEB_API_KEY = 'AIzaSyBtQZkX6r4F2W0BsIo6nsD27dUZHv3e8RU'; // chiave pubblica del progetto, è già nel backstage
const FIREBASE_DB_URL = 'https://studio-kraken-gate-default-rtdb.firebaseio.com';
const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function isAdminToken(idToken) {
    try {
        // 1) il token è valido? Firebase ci dice di chi è
        const lookup = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
        );
        if (!lookup.ok) return false;
        const uid = (await lookup.json()).users?.[0]?.localId;
        if (!uid) return false;
        // 2) quell'utente è admin? (stesso controllo che fa il backstage)
        const roleRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(uid)}/role.json?auth=${encodeURIComponent(idToken)}`);
        if (!roleRes.ok) return false;
        return (await roleRes.json()) === 'admin';
    } catch {
        return false;
    }
}

// Upload immagini su R2. Route gestita qui nel worker perché
// run_worker_first:true scavalca le Pages Functions (functions/api/upload.js morto).
async function handleUpload(request, env) {
    const cors = uploadCorsHeaders(request);
    const json = (body, status) => new Response(JSON.stringify(body), {
        status, headers: { ...cors, 'Content-Type': 'application/json' }
    });

    const idToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!idToken || !(await isAdminToken(idToken))) {
        return json({ error: 'Non autorizzato' }, 401);
    }
    if (!env.R2_BUCKET) {
        return json({ error: 'R2 binding non configurato' }, 500);
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const folder = (formData.get('folder') || 'uploads').replace(/[^a-zA-Z0-9._/-]/g, '_');

        if (!file || !file.name) {
            return json({ error: 'Nessun file ricevuto' }, 400);
        }
        if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
            return json({ error: 'Formato non ammesso: solo immagini JPG, PNG, WebP o GIF' }, 400);
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            return json({ error: 'File troppo grande (massimo 10 MB)' }, 400);
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `${folder}/${timestamp}_${safeName}`;

        await env.R2_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
        });
        // versione piccola per le card del sito (la prepara il backstage), stesso percorso sotto thumbs/
        const thumb = formData.get('thumb');
        if (thumb && thumb.type === 'image/webp' && thumb.size < 2 * 1024 * 1024) {
            await env.R2_BUCKET.put(`thumbs/${key}.webp`, thumb.stream(), {
                httpMetadata: { contentType: 'image/webp' },
            });
        }

        const publicUrl = `${R2_PUBLIC_BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
        return json({ url: publicUrl, key }, 200);
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}

// ─── DATI PUBBLICI DEL SITO (/api/gate-data, /api/residents) ─────────────────
// Il sito legge live, eventi e resident da qui invece che direttamente da Firebase:
// così telefoni, email e note arrivate dal Google Sheet / Open Call restano privati.
// Delle live passa solo ciò che il sito mostra (lista qui sotto).
// FIREBASE_DB_SECRET (facoltativo, `wrangler secret put`) serve quando la lettura
// pubblica di Firebase verrà chiusa.
const PUBLIC_STREAM_FIELDS = ['artist', 'title', 'date', 'timeStart', 'timeEnd', 'season', 'tags',
    'imageUrl', 'soundcloudUrl', 'liveLinks', 'description', 'description_en', 'location',
    'duration', 'source', 'published', 'hidden'];

async function readFirebase(path, env) {
    const auth = env.FIREBASE_DB_SECRET ? `?auth=${encodeURIComponent(env.FIREBASE_DB_SECRET)}` : '';
    const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${auth}`);
    if (!res.ok) throw new Error(`Firebase ${path}: ${res.status}`);
    return res.json();
}

function publicStreams(obj) {
    const out = {};
    for (const [key, s] of Object.entries(obj || {})) {
        if (!s || typeof s !== 'object') continue;
        const clean = {};
        for (const f of PUBLIC_STREAM_FIELDS) if (s[f] !== undefined) clean[f] = s[f];
        out[key] = clean;
    }
    return out;
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

// Copia dei dati nella cache di Cloudflare: le visite arrivano subito (niente
// attesa di Firebase) e, se Firebase non risponde, si serve l'ultima copia buona.
const CACHE_FRESCA_SEC = 60;            // dopo 1 minuto si rilegge Firebase
const CACHE_SCORTA_SEC = 7 * 24 * 3600; // copia di riserva se Firebase è giù

async function conCache(nome, ctx, leggi) {
    const cache = caches.default;
    const fresca = new Request(`https://gate-cache.internal/${nome}`);
    const scorta = new Request(`https://gate-cache.internal/${nome}-scorta`);
    const hit = await cache.match(fresca);
    if (hit) return hit;
    try {
        const body = JSON.stringify(await leggi());
        const mk = (sec) => new Response(body, { headers: {
            'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${sec}` } });
        ctx.waitUntil(Promise.all([cache.put(fresca, mk(CACHE_FRESCA_SEC)), cache.put(scorta, mk(CACHE_SCORTA_SEC))]));
        return mk(CACHE_FRESCA_SEC);
    } catch (err) {
        const vecchia = await cache.match(scorta);
        if (vecchia) return vecchia;
        throw err;
    }
}

async function handleGateData(env, ctx) {
    try {
        const r = await conCache('gate-data', ctx, async () => {
            const [streams, events] = await Promise.all([
                readFirebase('gateRadio/streams', env),
                readFirebase('gateRadio/events', env),
            ]);
            return { streams: publicStreams(streams), events: events || {} };
        });
        return jsonResponse(await r.json());
    } catch (err) {
        return jsonResponse({ error: err.message }, 502);
    }
}

async function handleResidents(env, ctx) {
    try {
        const r = await conCache('residents', ctx, async () => await readFirebase('gateRadio/residents', env) || {});
        return jsonResponse(await r.json());
    } catch (err) {
        return jsonResponse({ error: err.message }, 502);
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const host = url.hostname;

        // Route upload immagini (prima di tutto il resto)
        if (url.pathname === '/api/upload') {
            if (request.method === 'OPTIONS') {
                return new Response(null, { status: 204, headers: uploadCorsHeaders(request) });
            }
            if (request.method === 'POST') {
                return handleUpload(request, env);
            }
        }

        if (url.pathname === '/api/gate-data') return handleGateData(env, ctx);
        if (url.pathname === '/api/residents') return handleResidents(env, ctx);

        // Se il dominio è gateradiorm.com (o www), mostra Coming Soon
        if (host === 'gateradiorm.com' || host === 'www.gateradiorm.com') {
            // Permetti accesso al sito completo con ?preview=true
            if (url.searchParams.get('preview') === 'true') {
                return serveAssets(request, url, env);
            }
            // Servi la pagina Coming Soon per qualsiasi path
            const comingSoonReq = new Request(new URL('/coming-soon.html', url.origin));
            return env.ASSETS.fetch(comingSoonReq);
        }

        // Per workers.dev e tutto il resto, servi normalmente gli assets
        return serveAssets(request, url, env);
    }
};

async function serveAssets(request, url, env) {
    // Prova a servire il file richiesto
    let response = await env.ASSETS.fetch(request);

    // Se 404 e il path non ha estensione, prova con .html
    if (response.status === 404 && !url.pathname.includes('.')) {
        const htmlPath = url.pathname === '/' ? '/index.html' : url.pathname + '.html';
        const htmlReq = new Request(new URL(htmlPath, url.origin), request);
        const htmlRes = await env.ASSETS.fetch(htmlReq);
        if (htmlRes.status === 200) return htmlRes;
    }

    return response;
}
