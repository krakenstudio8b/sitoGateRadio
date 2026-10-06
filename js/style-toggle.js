// js/style-toggle.js — Confronto grafica VECCHIA / NUOVA (css/gate-refresh.css)
//
// I visitatori normali vedono la grafica vecchia: nulla cambia per loro.
// Aprendo il sito con ?confronto compare un pulsante in basso a sinistra
// per passare da una versione all'altra; la scelta resta su tutte le pagine.
// ?confronto=off spegne il pulsante e torna alla grafica vecchia.
//
// Quando la grafica nuova è approvata: togliere questo script dalle pagine
// e lasciare solo il <link> a gate-refresh.css.
(function () {
    const KEY_ON = 'gateConfronto';
    const KEY_MODE = 'gateGrafica';
    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* niente */ } },
        del(k) { try { localStorage.removeItem(k); } catch (e) { /* niente */ } },
    };

    const param = new URLSearchParams(location.search).get('confronto');
    if (param === 'off') { store.del(KEY_ON); store.del(KEY_MODE); }
    else if (param !== null) { store.set(KEY_ON, '1'); }

    const confronto = store.get(KEY_ON) === '1';
    let mode = confronto ? (store.get(KEY_MODE) || 'nuova') : 'vecchia';

    const sheet = document.getElementById('gate-refresh-css');
    const apply = () => { if (sheet) sheet.disabled = (mode === 'vecchia'); };
    apply(); // subito, prima che la pagina si disegni: niente "lampo"

    if (!confronto) return;

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Cambia versione grafica');
        btn.style.cssText = [
            'position:fixed', 'left:16px', 'bottom:16px', 'z-index:99999',
            'font:700 12px/1 "Roboto Mono",monospace', 'letter-spacing:.08em',
            'text-transform:uppercase', 'padding:12px 16px', 'cursor:pointer',
            'background:#000', 'color:#fff', 'border:1px solid #fff',
        ].join(';');
        const label = () => {
            btn.innerHTML = mode === 'nuova'
                ? 'Grafica: <b style="color:#000;background:#fff;padding:2px 6px">NUOVA</b> · passa alla vecchia ⇄'
                : 'Grafica: <b style="color:#000;background:#fff;padding:2px 6px">VECCHIA</b> · passa alla nuova ⇄';
        };
        btn.addEventListener('click', () => {
            mode = mode === 'nuova' ? 'vecchia' : 'nuova';
            store.set(KEY_MODE, mode);
            apply();
            label();
        });
        label();
        document.body.appendChild(btn);
    });
})();
