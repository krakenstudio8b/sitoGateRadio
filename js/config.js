const TWITCH_CONFIG = {
    CLIENT_ID: 'r9zmd4q5jr62v5ffuau3t0xsk6vckx',
    CLIENT_SECRET: 'n3l3hpf5vyy9d0ljnsnmj3sq9w5pdt',
    CHANNEL_NAME: 'gate radio',
    TEST_MODE: true,
    FORCE_LIVE_STATE: false
};

const RADIO_CONFIG = {
    // ─── YouTube Data API v3 ───────────────────────────────────────────────────
    // Ottieni la tua chiave gratuita su https://console.cloud.google.com
    // → Crea progetto → Abilita "YouTube Data API v3" → Credenziali → API Key
    YOUTUBE_API_KEY: 'AIzaSyAYatFMuL6LUCx8KppZNQtd_s8H4Q_WZto',

    YOUTUBE_PLAYLIST_ID: 'PLRYxalHwo1YmJrp13_ytZWc8R6G5BBWPq',

    // ─── Cache locale ──────────────────────────────────────────────────────────
    // Durata della cache durate in ore (non serve ricaricare spesso)
    CACHE_TTL_HOURS: 24
};