// js/style-toggle.js — Attiva la grafica nuova per tutti (ottobre 2026).
//
// Il confronto vecchia/nuova è finito: la grafica nuova è quella ufficiale.
// Questo file resta perché le pagine lo caricano subito dopo css/gate-refresh.css:
// tiene acceso lo stile nuovo e carica le modifiche di struttura (js/gate-nuova.js).
// Gli indirizzi con ?confronto=... continuano a funzionare (il parametro viene ignorato).
(function () {
    'use strict';
    const sheet = document.getElementById('gate-refresh-css');
    if (sheet) sheet.disabled = false;
    document.documentElement.classList.add('gate-nuova');

    // La pagina resta invisibile finché js/gate-nuova.js non ha rifatto menu, home e
    // footer: niente "lampo" della grafica vecchia a ogni caricamento. Paracadute:
    // dopo 1,5 secondi si mostra comunque, anche se qualcosa va storto.
    document.documentElement.classList.add('gn-attesa');
    const st = document.createElement('style');
    st.textContent = 'html.gn-attesa body{opacity:0}body{transition:opacity .15s ease-out}';
    document.head.appendChild(st);
    setTimeout(() => document.documentElement.classList.remove('gn-attesa'), 1500);

    // pulizia della memoria lasciata dal vecchio pulsante di confronto
    try { localStorage.removeItem('gateConfronto'); localStorage.removeItem('gateGrafica'); } catch (e) { /* niente */ }

    const s = document.createElement('script');
    s.src = 'js/gate-nuova.js';
    s.defer = true;
    document.head.appendChild(s);
})();
