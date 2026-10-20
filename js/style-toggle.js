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

    // pulizia della memoria lasciata dal vecchio pulsante di confronto
    try { localStorage.removeItem('gateConfronto'); localStorage.removeItem('gateGrafica'); } catch (e) { /* niente */ }

    const s = document.createElement('script');
    s.src = 'js/gate-nuova.js';
    s.defer = true;
    document.head.appendChild(s);
})();
