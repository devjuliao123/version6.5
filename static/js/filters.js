// ==================== FILTROS ====================

function getFilterValues() {
    return {
        organizacao: document.getElementById('orgInput')?.value.trim().toLowerCase() || '',
        filial: document.getElementById('filialInput')?.value.trim().toLowerCase() || '',
        sistema: document.getElementById('sistemaInput')?.value.trim().toLowerCase() || '',
        dataInicio: document.getElementById('dataInicio')?.value || '',
        dataFim: document.getElementById('dataFim')?.value || '',
        ano: document.getElementById('anoFiltro')?.value || ''
    };
}

const applyFiltersDebounced = debounce(() => {
    applyFilters();
}, CONFIG.DEBOUNCE_DELAY);

function saveFiltersToStorage() {
    const filters = getFilterValues();
    localStorage.setItem('dashboard_filters', JSON.stringify(filters));
}

function loadFiltersFromStorage() {
    try {
        const saved = localStorage.getItem('dashboard_filters');
        if (!saved) return false;

        const filters = JSON.parse(saved);
        if (filters.organizacao) document.getElementById('orgInput').value = filters.organizacao;
        if (filters.filial) document.getElementById('filialInput').value = filters.filial;
        if (filters.sistema) document.getElementById('sistemaInput').value = filters.sistema;
        if (filters.dataInicio) document.getElementById('dataInicio').value = filters.dataInicio;
        if (filters.dataFim) document.getElementById('dataFim').value = filters.dataFim;

        // Sempre forçar o ano padrão conforme solicitado pelo usuário
        document.getElementById('anoFiltro').value = CONFIG.ANO_PADRAO;

        return true;
    } catch (e) {
        console.warn('Erro ao carregar filtros do storage:', e);
        return false;
    }
}

function applyFilters() {
    if (state.filterTimeout) clearTimeout(state.filterTimeout);

    if (typeof showFilterLoading === 'function') showFilterLoading(true);

    state.filterTimeout = setTimeout(() => {
        const f = getFilterValues();
        saveFiltersToStorage();

        state.filteredData = state.globalData.filter(item => {
            if (f.organizacao && !item.organizacao_codigo_busca.includes(f.organizacao) && !item.organizacao_descricao_busca.includes(f.organizacao)) return false;
            if (f.filial && !item.filial_codigo_busca.includes(f.filial) && !item.filial_descricao_busca.includes(f.filial)) return false;
            if (f.sistema && !(item.sistema || '').toLowerCase().includes(f.sistema)) return false;

            // Usar estritamente data de implantação para os filtros de data e ano
            const db = item.dataImplantacaoObj;

            if (f.ano && (!db || db.getFullYear() !== parseInt(f.ano))) return false;

            if (f.dataInicio) {
                const di = new Date(f.dataInicio + 'T00:00:00');
                if (!db || db < di) return false;
            }
            if (f.dataFim) {
                const df = new Date(f.dataFim + 'T23:59:59');
                if (!db || db > df) return false;
            }

            return true;
        });

        state.currentPage = 1;
        if (typeof updateKPIs === 'function') updateKPIs();
        if (typeof renderTable === 'function') renderTable();
        if (typeof updatePagination === 'function') updatePagination();
        if (typeof criarGraficos === 'function') criarGraficos();
        if (typeof atualizarDashboardETL === 'function') atualizarDashboardETL();
        updateFilterInfo(f);

        if (typeof showFilterLoading === 'function') showFilterLoading(false);
        state.filterTimeout = null;
    }, 300);
}

function updateFilterInfo(f) {
    const infoEl = document.getElementById('activeFiltersInfo');
    if (!infoEl) return;

    const active = [];
    if (f.organizacao) active.push(`Org: ${f.organizacao}`);
    if (f.filial) active.push(`Filial: ${f.filial}`);
    if (f.sistema) active.push(`Sistema: ${f.sistema}`);
    if (f.ano) active.push(`Ano: ${f.ano}`);
    if (f.dataInicio || f.dataFim) {
        const inicio = f.dataInicio ? f.dataInicio.split('-').reverse().join('/') : '...';
        const fim = f.dataFim ? f.dataFim.split('-').reverse().join('/') : '...';
        active.push(`Implantação: ${inicio} a ${fim}`);
    }

    if (active.length > 0) {
        infoEl.innerHTML = ` <span style="color: var(--text-secondary); margin: 0 8px;">|</span> <span style="font-weight: 600; color: var(--primary);">Filtros: ${active.join(', ')}</span>`;
    } else {
        infoEl.innerHTML = '';
    }
}

function clearFilters() {
    ['orgInput', 'filialInput', 'sistemaInput', 'dataInicio', 'dataFim', 'anoFiltro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    localStorage.removeItem('dashboard_filters');
    applyFilters();
}

function initFilters() {
    const inputs = ['orgInput', 'filialInput', 'sistemaInput', 'anoFiltro'];
    inputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', applyFiltersDebounced);
    });

    ['dataInicio', 'dataFim'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            const di = document.getElementById('dataInicio').value;
            const df = document.getElementById('dataFim').value;
            if (di && df && di > df) {
                showNotification('A data final não pode ser menor que a data inicial.', 'error');
                document.getElementById('dataFim').value = '';
                return;
            }
            applyFilters();
        });
    });

    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
    const toggleSidebar = () => {
        const container = document.getElementById('filtersContainer');
        const overlay = document.getElementById('menuOverlay');
        const open = container?.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show', open);
        document.body.style.overflow = open ? 'hidden' : '';
    };

    document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('closeSidebarBtn')?.addEventListener('click', toggleSidebar);
    document.getElementById('menuOverlay')?.addEventListener('click', toggleSidebar);
}
