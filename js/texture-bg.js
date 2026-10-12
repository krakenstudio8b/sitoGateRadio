/* ============================================================
   GATE RADIO — Texture animata di sfondo (SOLO ANTEPRIMA)
   Sostituisce lo sfondo statico (body::before) con un canvas
   animato dietro ai contenuti. Mini-selettore in basso a destra.
   Il colore segue var(--accent) → cambia con la stagione.
   ============================================================ */
(function () {
    'use strict';

    /* --- Nelle pagine -texture i link interni restano nella versione di prova --- */
    var PAGES = ['index', 'radio', 'archive', 'artists', 'events', 'programmazione', 'about', 'contact'];
    function rewriteLinks() {
        document.querySelectorAll('a[href]').forEach(function (a) {
            var href = a.getAttribute('href');
            if (href === '/' || href === '/index.html') { a.setAttribute('href', 'index-texture.html'); return; }
            var m = href && href.match(/^([^#?]*\/)?([a-z]+)\.html([#?].*)?$/i);
            if (m && PAGES.indexOf(m[2].toLowerCase()) !== -1) {
                a.setAttribute('href', (m[1] || '') + m[2] + '-texture.html' + (m[3] || ''));
            }
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', rewriteLinks);
    } else { rewriteLinks(); }

    /* --- Spegne lo sfondo statico e prepara canvas + selettore --- */
    var style = document.createElement('style');
    style.textContent =
        'body::before{display:none!important}' +
        '#gate-tex{position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none}' +
        '#gate-tex-ui{position:fixed;bottom:14px;right:14px;z-index:99999;display:flex;gap:5px;align-items:center;flex-wrap:wrap;max-width:92vw;justify-content:flex-end;' +
        'background:rgba(8,8,8,.92);border:1px solid #2a2a2a;border-radius:18px;padding:6px 10px;font:600 10px/1 system-ui}' +
        '#gate-tex-ui button{background:transparent;color:#999;border:1px solid #333;border-radius:999px;padding:5px 9px;cursor:pointer;font:inherit;letter-spacing:.05em}' +
        '#gate-tex-ui button.on{background:var(--accent,#3DFF6E);border-color:var(--accent,#3DFF6E);color:#000}' +
        '#gate-tex-ui input{width:64px;accent-color:var(--accent,#3DFF6E)}';
    document.head.appendChild(style);

    var cv = document.createElement('canvas');
    cv.id = 'gate-tex';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W, H;

    var variant = localStorage.getItem('gateTexVariant') || 'radar';
    var alpha = parseInt(localStorage.getItem('gateTexAlpha') || '45', 10);

    /* --- Colore: legge var(--accent) della pagina (segue la stagione) --- */
    var ACC = [61, 255, 110];
    function readAccent() {
        var probe = document.createElement('span');
        probe.style.color = 'var(--accent, #3DFF6E)';
        probe.style.display = 'none';
        document.body.appendChild(probe);
        var m = getComputedStyle(probe).color.match(/(\d+)[, ]+(\d+)[, ]+(\d+)/);
        document.body.removeChild(probe);
        if (m) ACC = [+m[1], +m[2], +m[3]];
    }
    function acc(a) { return 'rgba(' + ACC[0] + ',' + ACC[1] + ',' + ACC[2] + ',' + a + ')'; }

    function field(x, y, t) {
        return Math.sin(x * 1.7 + t * 0.8) + Math.sin(y * 2.3 - t * 0.6) + Math.sin((x + y) * 1.1 + t * 0.35);
    }

    var t = 0;

    /* ============ FUMO — volute luminose ============ */
    var puffs = [];
    function initFumo() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        puffs.length = 0;
        for (var i = 0; i < 55; i++) {
            puffs.push({ x: Math.random() * W, y: Math.random() * H, r: 60 + Math.random() * 100 });
        }
        for (var k = 0; k < 120; k++) { t += 0.016; stepFumo(); }
    }
    function stepFumo() {
        ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < puffs.length; i++) {
            var p = puffs[i];
            var a = field(p.x / 240, p.y / 240, t) * 1.25;
            p.x += Math.cos(a) * 0.9;
            p.y += Math.sin(a) * 0.9 - 0.3;
            if (p.x < -p.r) p.x = W + p.r; if (p.x > W + p.r) p.x = -p.r;
            if (p.y < -p.r) { p.y = H + p.r; p.x = Math.random() * W; }
            var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
            g.addColorStop(0, acc(0.016));
            g.addColorStop(0.5, 'rgba(210,255,225,0.007)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    /* ============ PUNTI — onda halftone ============ */
    function initPuntini() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    function stepPuntini() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        var s = 20;
        for (var y = s / 2; y < H + s; y += s) {
            for (var x = s / 2; x < W + s; x += s) {
                var f = field(x / 150, y / 150, t * 0.9);
                var r = Math.max(0, (f + 3) / 6) * s * 0.42;
                if (r < 0.4) continue;
                if (f > 2.05) {
                    ctx.fillStyle = acc(0.7);
                } else {
                    ctx.fillStyle = 'rgba(235,235,235,' + (0.08 + (r / (s * 0.42)) * 0.35).toFixed(2) + ')';
                }
                ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
            }
        }
    }

    /* ============ GRANA — statico TV + scanline + glitch ============ */
    var buf, bctx, bimg;
    function initStatico() {
        buf = document.createElement('canvas');
        buf.width = 200; buf.height = Math.max(2, Math.round(200 * H / W));
        bctx = buf.getContext('2d');
        bimg = bctx.createImageData(buf.width, buf.height);
    }
    function stepStatico() {
        var d = bimg.data;
        for (var i = 0; i < d.length; i += 4) {
            var v = (Math.random() * 255) | 0;
            var dark = v * 0.20;
            d[i] = dark; d[i + 1] = dark * 1.15; d[i + 2] = dark; d[i + 3] = 255;
        }
        bctx.putImageData(bimg, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(buf, 0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (var y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
        if (Math.random() < 0.06) {
            var gy = Math.random() * H, gh = 3 + Math.random() * 26;
            var off = (Math.random() - 0.5) * 60;
            ctx.drawImage(cv, 0, gy * DPR, cv.width, gh * DPR, off, gy, W, gh);
            ctx.fillStyle = acc(0.10);
            ctx.fillRect(0, gy, W, gh);
        }
    }

    /* ============ RADAR — impulsi broadcast da piccole antenne ============ */
    var rings = [], emitters = [];
    function initRadar() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        rings.length = 0; emitters.length = 0;
        for (var i = 0; i < 3; i++) {
            emitters.push({
                x: (0.15 + 0.7 * Math.random()) * W,
                y: (0.15 + 0.7 * Math.random()) * H,
                next: Math.random() * 60
            });
        }
    }
    function stepRadar() {
        ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(0, 0, W, H);
        for (var j = 0; j < emitters.length; j++) {
            var e = emitters[j];
            e.next -= 1;
            if (e.next <= 0) {
                rings.push({ x: e.x, y: e.y, r: 2, max: 180 + Math.random() * 240, g: Math.random() < 0.3 });
                e.next = 55 + Math.random() * 75;
            }
            ctx.fillStyle = acc(0.8);
            ctx.beginPath(); ctx.arc(e.x, e.y, 2, 0, 6.2832); ctx.fill();
        }
        for (var i = rings.length - 1; i >= 0; i--) {
            var r = rings[i];
            r.r += 1.1;
            var k = 1 - r.r / r.max;
            if (k <= 0) { rings.splice(i, 1); continue; }
            ctx.strokeStyle = r.g ? acc((0.4 * k).toFixed(3)) : 'rgba(255,255,255,' + (0.22 * k).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832); ctx.stroke();
        }
    }

    /* ============ ONDA — oscilloscopio con battito ============ */
    function initScope() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    function stepScope() {
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(0, 0, W, H);
        var beat = Math.pow(Math.max(0, Math.sin(t * 2.1)), 12);   // "colpo" periodico
        var lines = [
            { y: 0.30, amp: 26, sp: 1.0, col: acc(0.55), w: 1.6 },
            { y: 0.55, amp: 34, sp: 0.7, col: 'rgba(255,255,255,0.18)', w: 1.2 },
            { y: 0.78, amp: 20, sp: 1.3, col: acc(0.25), w: 1.2 }
        ];
        for (var li = 0; li < lines.length; li++) {
            var L = lines[li];
            var amp = L.amp * (1 + beat * 1.6);
            ctx.strokeStyle = L.col; ctx.lineWidth = L.w;
            ctx.beginPath();
            for (var x = 0; x <= W; x += 6) {
                var y = H * L.y
                    + Math.sin(x * 0.012 + t * 2.2 * L.sp) * amp * 0.5
                    + Math.sin(x * 0.029 - t * 1.4 * L.sp) * amp * 0.3
                    + Math.sin(x * 0.005 + t * 0.7 * L.sp + li * 2) * amp * 0.6;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    /* ============ PIOGGIA — glifi GATE che cadono ============ */
    var cols = [], GLYPHS = 'GATE10·•×';
    function initRain() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        cols.length = 0;
        var n = Math.floor(W / 22);
        for (var i = 0; i < n; i++) {
            cols.push({ x: i * 22 + 6, y: Math.random() * H, v: 0.8 + Math.random() * 1.6 });
        }
    }
    function stepRain() {
        ctx.fillStyle = 'rgba(0,0,0,0.09)'; ctx.fillRect(0, 0, W, H);
        ctx.font = '11px monospace';
        for (var i = 0; i < cols.length; i++) {
            var c = cols[i];
            var ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
            ctx.fillStyle = Math.random() < 0.12 ? 'rgba(255,255,255,0.55)' : acc(0.55);
            ctx.fillText(ch, c.x, c.y);
            c.y += c.v * 2.4;
            if (c.y > H + 20) { c.y = -10 - Math.random() * 300; c.v = 0.8 + Math.random() * 1.6; }
        }
    }

    /* ============ LASER — fasci da club che spazzano nel buio ============ */
    var beams = [];
    function initLaser() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        beams.length = 0;
        var rigs = [W * 0.25, W * 0.75];
        for (var ri = 0; ri < rigs.length; ri++) {
            for (var j = 0; j < 3; j++) {
                beams.push({ x: rigs[ri], sp: 0.25 + Math.random() * 0.35, ph: Math.random() * 6.28, range: 0.5 + Math.random() * 0.35, g: (ri + j) % 2 === 0 });
            }
        }
    }
    function stepLaser() {
        ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < beams.length; i++) {
            var b = beams[i];
            var ang = Math.PI / 2 + Math.sin(t * b.sp * 2 + b.ph) * b.range;
            var x2 = b.x + Math.cos(ang) * H * 1.7;
            var y2 = -10 + Math.sin(ang) * H * 1.7;
            var g = ctx.createLinearGradient(b.x, -10, x2, y2);
            g.addColorStop(0, b.g ? acc(0.30) : 'rgba(255,255,255,0.22)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 7; ctx.globalAlpha = 0.35;
            ctx.beginPath(); ctx.moveTo(b.x, -10); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.lineWidth = 1.8; ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.moveTo(b.x, -10); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    /* ============ VINILE — solchi che girano con riflesso ============ */
    function initVinile() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    function stepVinile() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        var cx = W * 0.78, cy = H * 0.22, maxR = Math.max(W, H) * 0.95;
        for (var r = 18; r < maxR; r += 13) {
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.030 + 0.025 * Math.sin(r * 0.35)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke();
        }
        ctx.strokeStyle = acc(0.35); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, 18 + ((t * 18) % maxR), 0, 6.2832); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        for (var s = 0; s < 2; s++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(t * 0.18 + s * Math.PI);
            var g = ctx.createLinearGradient(0, 0, maxR, 0);
            g.addColorStop(0, 'rgba(255,255,255,0.10)');
            g.addColorStop(0.5, 'rgba(255,255,255,0.03)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.arc(0, 0, maxR, -0.13, 0.13); ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = acc(0.8);
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.2832); ctx.fill();
    }

    /* ============ TUNNEL — rettangoli concentrici ipnotici ============ */
    function initTunnel() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    function stepTunnel() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        var N = 14, tt = (t * 0.22) % 1;
        var cx = W / 2 + Math.sin(t * 0.3) * W * 0.04;
        var cy = H / 2 + Math.cos(t * 0.23) * H * 0.04;
        for (var i = N; i >= 0; i--) {
            var k = ((i + tt) % (N + 1)) / N;
            var s = Math.pow(k, 2.4);
            var w = W * 1.15 * s, h = H * 1.15 * s;
            var a = 0.05 + 0.22 * (1 - k);
            ctx.strokeStyle = (i % 4 === 0) ? acc(a.toFixed(3)) : 'rgba(255,255,255,' + a.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
        }
    }

    /* ============ EQ — spettro audio sul bordo basso ============ */
    var peaks = [];
    function initEq() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        peaks = new Array(Math.floor(W / 14) + 1).fill(0);
    }
    function stepEq() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        var n = Math.floor(W / 14), maxH = H * 0.26;
        for (var i = 0; i <= n; i++) {
            var f = (field(i * 0.33, 0, t * 2.1) + 3) / 6;
            var h = maxH * (0.06 + 0.94 * Math.pow(f, 2.2));
            peaks[i] = Math.max((peaks[i] || 0) - 1.4, h);
            ctx.fillStyle = acc(0.22);
            ctx.fillRect(i * 14, H - h, 10, h);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(i * 14, H - peaks[i] - 3, 10, 2);
        }
    }

    /* ============ PULSAR — linee impilate alla Unknown Pleasures ============ */
    function initPulsar() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    function stepPulsar() {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        var nL = 22, top = H * 0.2, span = H * 0.62;
        for (var li = 0; li < nL; li++) {
            var yBase = top + (li / (nL - 1)) * span;
            ctx.beginPath();
            ctx.moveTo(0, yBase);
            for (var x = 0; x <= W; x += 7) {
                var env = Math.exp(-Math.pow((x - W / 2) / (W * 0.16), 2));
                var n = Math.sin(x * 0.05 + t * 1.3 + li * 1.7) + Math.sin(x * 0.013 - t * 0.7 + li * 0.9) + Math.sin(x * 0.031 + t * 2.0 + li * 3.1);
                var y = yBase - Math.abs(n) * 26 * env - env * 8;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H + 2); ctx.lineTo(0, H + 2); ctx.closePath();
            ctx.fillStyle = '#000'; ctx.fill();
            ctx.strokeStyle = (li === Math.floor(nL / 2)) ? acc(0.5) : 'rgba(255,255,255,0.30)';
            ctx.lineWidth = 1.1;
            ctx.stroke();
        }
    }

    var init = { fumo: initFumo, puntini: initPuntini, statico: initStatico, radar: initRadar, scope: initScope, rain: initRain, laser: initLaser, vinile: initVinile, tunnel: initTunnel, eq: initEq, pulsar: initPulsar };
    var step = { fumo: stepFumo, puntini: stepPuntini, statico: stepStatico, radar: stepRadar, scope: stepScope, rain: stepRain, laser: stepLaser, vinile: stepVinile, tunnel: stepTunnel, eq: stepEq, pulsar: stepPulsar };

    function resize() {
        W = window.innerWidth; H = window.innerHeight;
        cv.width = W * DPR; cv.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        init[variant]();
    }
    window.addEventListener('resize', resize);

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
    function frame() {
        t += 0.016;
        step[variant]();
        if (!reduced && !saveData) requestAnimationFrame(frame);
    }

    /* --- Mini-selettore --- */
    var ui = document.createElement('div');
    ui.id = 'gate-tex-ui';
    ui.innerHTML =
        '<button data-v="laser">LASER</button>' +
        '<button data-v="vinile">VINILE</button>' +
        '<button data-v="tunnel">TUNNEL</button>' +
        '<button data-v="eq">EQ</button>' +
        '<button data-v="pulsar">PULSAR</button>' +
        '<button data-v="radar">RADAR</button>' +
        '<button data-v="scope">ONDA</button>' +
        '<button data-v="rain">PIOGGIA</button>' +
        '<button data-v="puntini">PUNTI</button>' +
        '<button data-v="fumo">FUMO</button>' +
        '<button data-v="statico">GRANA</button>' +
        '<input type="range" min="10" max="100" value="' + alpha + '" title="intensità">';
    document.body.appendChild(ui);

    function setVariant(v) {
        if (!init[v]) v = 'radar';
        variant = v;
        localStorage.setItem('gateTexVariant', v);
        ui.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
        init[variant]();
        if (reduced || saveData) { t += 1; step[variant](); }
    }
    ui.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { setVariant(b.dataset.v); });
    });
    ui.querySelector('input').addEventListener('input', function (e) {
        cv.style.opacity = e.target.value / 100;
        localStorage.setItem('gateTexAlpha', e.target.value);
    });

    cv.style.opacity = alpha / 100;
    readAccent();
    resize();
    setVariant(variant);
    frame();
})();
