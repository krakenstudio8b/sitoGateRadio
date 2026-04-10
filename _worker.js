// Worker che serve Coming Soon su gateradiorm.com e il sito normale su workers.dev
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const host = url.hostname;

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
