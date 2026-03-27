// ==================== CONFIGURAÇÕES GLOBAIS ====================

const CONFIG = {
    API_URL: '/dados',
    ITEMS_PER_PAGE: 20,
    DEBOUNCE_DELAY: 300,
    AUTO_REFRESH_INTERVAL: 300000,
    LOADING_TIMEOUT: 30000,
    RETRY_DELAY: 2000,
    MAX_RETRIES: 2,
    ANO_PADRAO: 2026
};

// Estado da aplicação
const state = {
    globalData: [],
    filteredData: [],
    currentPage: 1,
    charts: {},
    isLoading: false,
    isFiltering: false,
    loadingTimeout: null,
    retryCount: 0,
    lastLoadTime: null,
    filterTimeout: null,
    dataTimestamp: null,
    lastRefreshTime: null
};

// Tornar disponível globalmente
window.CONFIG = CONFIG;
window.state = state;