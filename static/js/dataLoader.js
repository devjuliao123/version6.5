// ==================== CARREGAMENTO DE DADOS ====================

async function loadData(isAutoRefresh = false, forceRefresh = false) {
    if (!isAutoRefresh) {
        showLoading(true, forceRefresh ? 'Atualizando dados...' : 'Carregando dados...');
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const url = forceRefresh ? `${CONFIG.API_URL}?force_refresh=true` : CONFIG.API_URL;

        console.log(`📡 Fetching: ${url}`);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.dados || !Array.isArray(data.dados)) {
            throw new Error('Formato de dados inválido');
        }

        // Processar dados
        state.globalData = data.dados.map(item => {
            const dataVenda = parseDate(item.data_venda);
            const dataImplantacao = parseDate(item.data_implantacao);
            const dataPrevisao = parseDate(item.data_previsao);

            return {
                filial_codigo: item.filial_codigo || '',
                organizacao_codigo: item.organizacao_codigo || '',
                organizacao_descricao: item.organizacao_descricao || '',
                filial_descricao: item.filial_descricao || '',
                marca: item.marca || '',
                sistema: item.sistema || '',
                data_venda: item.data_venda || '',
                dataImplantacao: item.data_implantacao || '',
                dataPrevisao: item.data_previsao || '',

                valor: parseCurrency(item.total_geral),
                valor_comissao: parseCurrency(item.valor_comissao),
                total_erp: parseCurrency(item.total_erp),
                total_agregado: parseCurrency(item.total_agregado),
                total_geral: parseCurrency(item.total_geral),

                modalidade: item.modalidade || '',
                sistemaExtracao: item.sistema_extracao || '',
                sistemaAnterior: item.sistema_anterior || '',
                bancoAnterior: item.banco_anterior || '',
                observacoes: item.observacoes || '',

                organizacao: `${item.organizacao_codigo || ''} - ${item.organizacao_descricao || ''}`.trim(),
                filial: `${item.filial_codigo || ''} - ${item.filial_descricao || ''}`.trim(),

                organizacao_codigo_busca: (item.organizacao_codigo || '').toLowerCase(),
                organizacao_descricao_busca: (item.organizacao_descricao || '').toLowerCase(),
                filial_codigo_busca: (item.filial_codigo || '').toLowerCase(),
                filial_descricao_busca: (item.filial_descricao || '').toLowerCase(),

                dataObj: dataImplantacao,
                dataVendaObj: dataVenda,
                dataImplantacaoObj: dataImplantacao,
                dataPrevisaoObj: dataPrevisao,

                pendente: !dataImplantacao,
                temETL: false
            };
        });

        // Processar ETL
        if (typeof parseObservacoes === 'function' && typeof temDadosETL === 'function') {
            state.globalData = state.globalData.map(item => {
                const infoETL = parseObservacoes(item.observacoes);
                item.temETL = temDadosETL(infoETL);
                return item;
            });
        }

        state.lastLoadTime = new Date();
        state.dataTimestamp = data.timestamp;

        // Atualizar interface
        if (typeof applyFilters === 'function') {
            applyFilters();
        } else {
            state.filteredData = [...state.globalData];
            state.currentPage = 1;
            if (typeof updateKPIs === 'function') updateKPIs();
            if (typeof renderTable === 'function') renderTable();
            if (typeof updatePagination === 'function') updatePagination();
            if (typeof criarGraficos === 'function') criarGraficos();
        }

        // Notificar apenas em atualizações manuais (forceRefresh) para evitar duplicação no início
        if (forceRefresh) {
            showNotification(`Dados atualizados com sucesso!`, 'success', 3000);
        }

    } catch (error) {
        console.error('❌ Erro:', error);
        showNotification(`Erro ao carregar dados: ${error.message}`, 'error', 5000);
    } finally {
        if (!isAutoRefresh) {
            showLoading(false);
        }
    }
}
