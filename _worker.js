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

// Upload immagini su R2. Route gestita qui nel worker perché
// run_worker_first:true scavalca le Pages Functions (functions/api/upload.js morto).
async function handleUpload(request, env) {
    const cors = uploadCorsHeaders(request);
    const json = (body, status) => new Response(JSON.stringify(body), {
        status, headers: { ...cors, 'Content-Type': 'application/json' }
    });

    const authKey = (request.headers.get('Authorization') || '').replace('Bearer ', '');
    if (!authKey || authKey !== env.UPLOAD_API_KEY) {
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

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `${folder}/${timestamp}_${safeName}`;

        await env.R2_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        const publicUrl = `${R2_PUBLIC_BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
        return json({ url: publicUrl, key }, 200);
    } catch (err) {
        return json({ error: err.message }, 500);
    }
}

export default {
    async fetch(request, env) {
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
