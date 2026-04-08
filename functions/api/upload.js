// functions/api/upload.js — Cloudflare Pages Function
// Carica immagini direttamente su R2 dal form admin del gestionale

const CORS_ORIGINS = [
    'https://studio-kraken-gate.vercel.app',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
];

function corsHeaders(request) {
    const origin = request.headers.get('Origin') || '';
    const allowed = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    };
}

// Gestisce preflight CORS
export async function onRequestOptions(context) {
    return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const headers = corsHeaders(request);

    // Auth check
    const authKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authKey || authKey !== env.UPLOAD_API_KEY) {
        return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
            status: 401, headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }

    // R2 binding check
    if (!env.R2_BUCKET) {
        return new Response(JSON.stringify({ error: 'R2 binding non configurato' }), {
            status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }

    try {
        const formData = await request.formData();
        const file   = formData.get('file');
        const folder = formData.get('folder') || 'uploads';

        if (!file || !file.name) {
            return new Response(JSON.stringify({ error: 'Nessun file ricevuto' }), {
                status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }

        // Genera nome file univoco
        const timestamp = Date.now();
        const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key       = `${folder}/${timestamp}_${safeName}`;

        // Carica su R2
        await env.R2_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        // URL pubblico (usa il dev URL del bucket R2)
        const publicUrl = `https://pub-41e721a087ea4a26b789322b03e6334d.r2.dev/${encodeURIComponent(folder)}/${timestamp}_${encodeURIComponent(safeName)}`;

        return new Response(JSON.stringify({ url: publicUrl, key }), {
            status: 200, headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
        });
    }
}
