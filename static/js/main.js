// ==================== INICIALIZAÇÃO ====================

function initEventListeners() {
    const orgInput = document.getElementById('orgInput');
    if (orgInput) orgInput.addEventListener('input', applyFiltersDebounced);

    const filialInput = document.getElementById('filialInput');
    if (filialInput) filialInput.addEventListener('input', applyFiltersDebounced);

    const sistemaInput = document.getElementById('sistemaInput');
    if (sistemaInput) sistemaInput.addEventListener('input', applyFiltersDebounced);

    const validarDatas = () => {
        const di = document.getElementById('dataInicio')?.value;
        const df = document.getElementById('dataFim')?.value;

        // Só validar se as duas datas existirem e o ano final estiver completo (ex: > 999)
        // Isso evita disparar o erro enquanto o usuário digita manualmente (ex: 1 p/ 2026)
        if (di && df) {
            const anoFinal = parseInt(df.split('-')[0]);
            if (anoFinal > 999 && di > df) {
                if (typeof showNotification === 'function') {
                    showNotification('A data final não pode ser menor que a data inicial.', 'error');
                }
                document.getElementById('dataFim').value = '';
                return false;
            }
        }
        return true;
    };

    const dataInicio = document.getElementById('dataInicio');
    if (dataInicio) {
        dataInicio.addEventListener('change', () => { if(validarDatas()) applyFilters(); });
        dataInicio.addEventListener('input', () => { if(validarDatas()) applyFiltersDebounced(); });
    }

    const dataFim = document.getElementById('dataFim');
    if (dataFim) {
        dataFim.addEventListener('change', () => { if(validarDatas()) applyFilters(); });
        dataFim.addEventListener('input', () => { if(validarDatas()) applyFiltersDebounced(); });
    }

    const anoFiltro = document.getElementById('anoFiltro');
    if (anoFiltro) {
        anoFiltro.addEventListener('change', applyFilters);
        anoFiltro.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
            applyFiltersDebounced();
        });
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadData(false, true));

    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMore);

    const pendingCard = document.getElementById('pendingCard');
    if (pendingCard) pendingCard.addEventListener('click', mostrarPendencias);

    const inProgressCard = document.getElementById('inProgressCard');
    if (inProgressCard) inProgressCard.addEventListener('click', mostrarEmProcesso);

    const riskCard = document.getElementById('riskCard');
    if (riskCard) riskCard.addEventListener('click', mostrarEmRisco);

    const futureCard = document.getElementById('futureCard');
    if (futureCard) futureCard.addEventListener('click', mostrarPrevisaoFutura);

    const valorTotalCard = document.getElementById('valorTotalCard');
    if (valorTotalCard) valorTotalCard.addEventListener('click', mostrarDetalhesValorTotal);

    const comissaoCard = document.getElementById('comissaoCard');
    if (comissaoCard) comissaoCard.addEventListener('click', mostrarDetalhesComissao);

    document.querySelectorAll('.valor-tag[data-tipo="erp"]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarFiliaisPorTipoValor('erp');
        });
    });

    document.querySelectorAll('.valor-tag[data-tipo="agregado"]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarFiliaisPorTipoValor('agregado');
        });
    });
}

function initFilterMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const filtersContainer = document.getElementById('filtersContainer');
    const menuOverlay = document.getElementById('menuOverlay');

    if (!menuToggle || !filtersContainer || !menuOverlay) return;

    const toggleMenu = (forceClose = null) => {
        const isOpen = forceClose === null ? !filtersContainer.classList.contains('open') : !forceClose;

        if (isOpen) {
            filtersContainer.classList.add('open');
            menuOverlay.classList.add('show');
            if (window.innerWidth <= 768) document.body.style.overflow = 'hidden';

            // On mobile, text label is shown only when menu is open or in its specific button
            menuToggle.classList.add('active');
        } else {
            filtersContainer.classList.remove('open');
            menuOverlay.classList.remove('show');
            document.body.style.overflow = '';
            menuToggle.classList.remove('active');
        }

        const icon = menuToggle.querySelector('.material-icons');
        if (icon) icon.textContent = filtersContainer.classList.contains('open') ? 'close' : 'filter_list';
    };

    menuToggle.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toggleMenu(); };
    menuOverlay.onclick = () => toggleMenu(true);

    document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
        if (window.innerWidth <= 768) setTimeout(() => toggleMenu(true), 500);
    });
}

async function init() {
    initTheme();
    initFilterMenu();
    initPainelImplantacao();
    criarModal();

    // 1. Carregar usuário primeiro (Crítico para role-based security)
    if (typeof loadUserInfo === 'function') {
        await loadUserInfo();
    }

    // 2. Carregar filtros salvos ou definir ano padrão
    if (typeof loadFiltersFromStorage === 'function') {
        const loaded = loadFiltersFromStorage();
        if (!loaded) {
            const anoFiltro = document.getElementById('anoFiltro');
            if (anoFiltro) anoFiltro.value = CONFIG.ANO_PADRAO;
        }
    }

    // 3. Carregar dados e inicializar interface (Apenas uma vez)
    await loadData(false, false);

    // 4. Inicializar listeners após os dados estarem prontos
    initEventListeners();

    setInterval(() => { if (!state.isLoading) loadData(true, false); }, CONFIG.AUTO_REFRESH_INTERVAL);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});
