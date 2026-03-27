// ==================== KPI ====================

function updateKPIs() {
    const data = state.filteredData || [];
    const isImplRole = (typeof isAnonymized === 'function') ? isAnonymized() : false;

    // Add anonymization class to KPI cards for global styling control
    document.querySelectorAll('.kpi-card').forEach(card => {
        if (isImplRole) card.classList.add('anonymized');
        else card.classList.remove('anonymized');
    });

    const uniqueOrgs = new Set(data.map(d => d.organizacao_codigo).filter(Boolean)).size;
    const uniqueFiliais = new Set(data.map(d => d.filial_codigo).filter(Boolean)).size;

    const totalGeral = data.reduce((sum, d) => sum + (d.total_geral || 0), 0);
    const totalERP = data.reduce((sum, d) => sum + (d.total_erp || 0), 0);
    const totalAgregado = data.reduce((sum, d) => sum + (d.total_agregado || 0), 0);

    // Atualizar título para mostrar filtros ativos e dados principais
    const uniqueOrgsFiltered = new Set(data.map(d => d.organizacao_codigo).filter(Boolean)).size;
    const uniqueFiliaisFiltered = new Set(data.map(d => d.filial_codigo).filter(Boolean)).size;
    const h2 = document.querySelector('.table-header-main h2');
    if (h2) {
        h2.textContent = `Implantações - ${formatNumber(uniqueOrgsFiltered)} organizações, ${formatNumber(uniqueFiliaisFiltered)} filiais`;
    }

    // Dados Globais para Backlog
    const globalData = state.globalData || data;

    // Pendentes: Filtrar apenas CLOUD e ZAPCRM conforme pedido (Remover Fiscal/Contábil)
    const pendentes = filtrarBacklogPendentes(globalData);
    const totalPendentes = pendentes.length;
    const valorPendente = pendentes.reduce((sum, d) => sum + getValorBacklog(d), 0);

    // Em Processo: Filtrar apenas CLOUD e ZAPCRM conforme pedido (Remover Fiscal/Contábil)
    const emProcesso = filtrarBacklogEmProcesso(globalData);
    const totalEmProcesso = emProcesso.length;
    const valorEmProcesso = emProcesso.reduce((sum, d) => sum + getValorBacklog(d), 0);

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const emRisco = globalData.filter(item => item.pendente && item.dataVendaObj && !item.dataImplantacaoObj && (hoje - item.dataVendaObj) > 90 * 24 * 60 * 60 * 1000);
    const totalRisco = emRisco.length;
    const valorRisco = emRisco.reduce((sum, d) => sum + (d.total_geral || 0), 0);

    const futuro = globalData.filter(item => !item.dataImplantacaoObj && item.dataPrevisaoObj);
    const totalFuturo = futuro.length;
    const valorFuturo = futuro.reduce((sum, d) => sum + (d.total_geral || 0), 0);

    // Cálculo Automático de Comissão (3% sobre Valor Comissão)
    const baseComissao = data.reduce((sum, d) => sum + (d.valor_comissao || 0), 0);
    const comissaoTotal = baseComissao * 0.03;
    const comissaoExibicao = isImplRole ? comissaoTotal / 3 : comissaoTotal;

    // Values (will be blurred if 'implantação')
    const updateEl = (id, val, force = false) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = formatCurrency(val, force);
    };

    updateEl('valorTotal', totalGeral);
    updateEl('valorERP', totalERP);
    updateEl('valorAgregado', totalAgregado);

    // Comissão Automática
    const comissaoEl = document.getElementById('valorComissao');
    if (comissaoEl) {
        comissaoEl.innerHTML = formatCurrency(comissaoExibicao, isImplRole);
    }

    updateEl('valorPendente', valorPendente);
    updateEl('valorEmProcesso', valorEmProcesso);
    updateEl('valorRisco', valorRisco);
    updateEl('valorFuturo', valorFuturo);

    // Commission Specifics
    const comissaoTotalEl = document.getElementById('comissaoTotal');
    if (comissaoTotalEl) {
        comissaoTotalEl.textContent = isImplRole ? 'Sua parte (1/3)' : 'Total (3%)';
    }

    // Quantities (Always visible)
    const updateQty = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatNumber(val);
    };

    updateQty('totalPendentes', totalPendentes);
    updateQty('totalEmProcesso', totalEmProcesso);
    updateQty('totalRisco', totalRisco);
    updateQty('totalFuturo', totalFuturo);

    // Detalhes extras para os cards (Projeção futura)
    const futuroSmall = document.getElementById('valorFuturo');
    if (futuroSmall) {
        futuroSmall.innerHTML = `${formatCurrency(valorFuturo)} <br> <span style="font-size: 0.7rem; color: var(--success);">Projeção futura</span>`;
    }
    updateQty('uniqueOrgs', uniqueOrgs);
    updateQty('uniqueFiliais', uniqueFiliais);

    const counterEl = document.getElementById('tableCounter');
    if (counterEl) counterEl.textContent = `${data.length} registros`;
}
