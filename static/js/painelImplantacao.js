// ==================== PAINEL INFORMATIVO ====================

function initPainelInformativo() {
    const btn = document.getElementById('painelInformativoBtn');
    if (btn) {
        btn.onclick = (e) => {
            e.preventDefault();
            abrirPainelInformativo();
        };
    }
}

function abrirPainelInformativo() {
    const data = state.globalData || [];

    // 1. Filtrar conforme regras:
    // - Sem data de implantação
    // - Apenas sistemas Cloud, ZapCRM e WebSite
    const sistemasPermitidos = ['CLOUD', 'ZAPCRM', 'WEBSITE'];

    const baseFiltrada = data.filter(item => {
        const temData = item.dataImplantacaoObj || (item.data_implantacao && item.data_implantacao.trim() !== '');
        if (temData) return false;

        const sistema = (item.sistema || '').toUpperCase();
        return sistemasPermitidos.some(s => sistema.includes(s));
    });

    if (baseFiltrada.length === 0) {
        showNotification('Nenhuma organização em implantação encontrada para os critérios selecionados.', 'info');
        return;
    }

    // 2. Agrupar por Organização
    const orgsAgrupadas = {};
    const todasOrgs = {};
    data.forEach(item => {
        const orgId = item.organizacao_codigo;
        if (!orgId) return;

        if (!todasOrgs[orgId]) {
            todasOrgs[orgId] = { total: 0, concluidas: 0, descricao: item.organizacao_descricao || 'Sem Descrição' };
        }
        todasOrgs[orgId].total++;
        if (item.dataImplantacaoObj || (item.data_implantacao && item.data_implantacao.trim() !== '')) {
            todasOrgs[orgId].concluidas++;
        }
    });

    baseFiltrada.forEach(item => {
        const orgId = item.organizacao_codigo;
        if (!orgId) return;

        if (!orgsAgrupadas[orgId]) {
            const stats = todasOrgs[orgId] || { total: 0, concluidas: 0, descricao: item.organizacao_descricao };
            const percentual = stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0;

            orgsAgrupadas[orgId] = {
                codigo: orgId,
                descricao: stats.descricao,
                percentual: percentual,
                emImplantacao: [],
                futuraImplantacao: []
            };
        }

        const status = extrairStatus(item);
        if (status.status === 'Em Processo' || status.status === 'Em Risco') {
            orgsAgrupadas[orgId].emImplantacao.push(item);
        } else {
            orgsAgrupadas[orgId].futuraImplantacao.push(item);
        }
    });

    const orgsList = Object.values(orgsAgrupadas).sort((a, b) => b.percentual - a.percentual || a.descricao.localeCompare(b.descricao));

    // 3. Renderizar na div principal
    const dashboardView = document.getElementById('dashboard-view');
    const painelView = document.getElementById('painel-informativo-view');

    if (!dashboardView || !painelView) return;

    const html = `
        <div class="panel-main-header glass">
            <div style="display: flex; align-items: center; gap: 15px;">
                <button onclick="voltarAoDashboard()" class="action-btn" title="Voltar ao Dashboard">
                    <span class="material-icons">arrow_back</span>
                    <span>Voltar</span>
                </button>
                <div class="panel-title-group">
                    <h2 class="panel-main-title">
                        <span class="material-icons">rocket_launch</span>
                        Painel Informativo
                    </h2>
                    <p class="panel-subtitle">Acompanhamento de organizações com implantações pendentes</p>
                </div>
            </div>
            <div class="panel-stats-summary">
                <span class="stat-badge"><span class="material-icons">business</span> ${orgsList.length} Orgs</span>
                <span class="stat-badge"><span class="material-icons">apartment</span> ${baseFiltrada.length} Empresas</span>
            </div>
        </div>

        <div class="panel-container">
            ${orgsList.map(org => renderizarCardOrganizacao(org)).join('')}
        </div>
    `;

    painelView.innerHTML = html;

    // Switch views
    dashboardView.style.display = 'none';
    painelView.style.display = 'block';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-bind events for expansion
    const headers = painelView.querySelectorAll('.org-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.org-card');

            // Toggle current card
            card.classList.toggle('expanded');

            const icon = header.querySelector('.expand-icon');
            if (icon) icon.textContent = card.classList.contains('expanded') ? 'expand_less' : 'expand_more';

            // Optional: Close others
            /*
            painelView.querySelectorAll('.org-card').forEach(other => {
                if (other !== card && other.classList.contains('expanded')) {
                    other.classList.remove('expanded');
                    const otherIcon = other.querySelector('.expand-icon');
                    if (otherIcon) otherIcon.textContent = 'expand_more';
                }
            });
            */
        });
    });
}

function voltarAoDashboard() {
    const dashboardView = document.getElementById('dashboard-view');
    const painelView = document.getElementById('painel-informativo-view');

    if (dashboardView && painelView) {
        painelView.style.display = 'none';
        dashboardView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderizarCardOrganizacao(org) {
    const totalPendente = org.emImplantacao.length + org.futuraImplantacao.length;

    return `
        <div class="org-card" id="org-${org.codigo}">
            <div class="org-header">
                <div class="org-info-main">
                    <div class="org-icon">
                        <span class="material-icons">business</span>
                    </div>
                    <div>
                        <div class="org-name">${org.codigo} - ${org.descricao}</div>
                    </div>
                </div>

                <div class="org-stats-row">
                    <span>${totalPendente} empresa(s) pendente(s)</span>
                    <span class="material-icons expand-icon" style="font-size: 20px;">expand_more</span>
                </div>

                <div class="org-progress-wrapper">
                    <div class="progress-info">
                        <span style="font-size: 0.7rem; color: var(--text-secondary);">PROGRESSO GERAL</span>
                        <span class="progress-percent">${org.percentual}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${org.percentual}%"></div>
                    </div>
                </div>
            </div>

            <div class="org-content">
                ${org.emImplantacao.length > 0 ? `
                    <div class="section-title implantacao">
                        <span class="material-icons" style="font-size: 14px;">sync</span> Em Implantação
                    </div>
                    <div class="companies-list">
                        ${org.emImplantacao.map(item => renderizarEmpresaItem(item)).join('')}
                    </div>
                ` : ''}

                ${org.futuraImplantacao.length > 0 ? `
                    <div class="section-title futura">
                        <span class="material-icons" style="font-size: 14px;">schedule</span> Futura Implantação
                    </div>
                    <div class="companies-list">
                        ${org.futuraImplantacao.map(item => renderizarEmpresaItem(item)).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderizarEmpresaItem(item) {
    const status = extrairStatus(item);
    let statusClass = 'status-pendente';
    if (status.status === 'Em Processo') statusClass = 'status-em-processo';
    if (status.status === 'Em Risco') statusClass = 'status-risco';

    const sistemas = (item.sistema || '').split('/').map(s => s.trim()).filter(s => ['CLOUD', 'ZAPCRM', 'WEBSITE'].includes(s.toUpperCase()));

    // Escapar aspas duplas do JSON para o atributo onclick
    const itemJson = JSON.stringify(item).replace(/"/g, '&quot;').replace(/'/g, "\\'");

    return `
        <div class="company-item" onclick="event.stopPropagation(); abrirModal('${(item.observacoes || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${itemJson}')">
            <div class="company-header">
                <div class="company-name" title="${item.filial_descricao}">${item.filial_descricao}</div>
                <div class="company-status ${statusClass}">
                    <span class="material-icons" style="font-size: 12px;">${status.icone}</span>
                    <span>${status.mensagem}</span>
                </div>
            </div>

            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 2px;">
                ${sistemas.map(s => renderizarBadgeSistema(s)).join('')}
            </div>

            <div class="company-footer">
                <div class="company-date">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span class="material-icons" style="font-size: 10px;">event</span>
                        Venda: ${item.data_venda || 'N/I'}
                    </div>
                </div>
                ${item.data_previsao ? `
                    <div class="company-date">
                        <div style="display: flex; align-items: center; gap: 4px; color: var(--primary); font-weight: 700;">
                            <span class="material-icons" style="font-size: 10px;">event_repeat</span>
                            Prev: ${item.data_previsao}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Tornar disponível globalmente
window.initPainelInformativo = initPainelInformativo;
window.abrirPainelInformativo = abrirPainelInformativo;
window.voltarAoDashboard = voltarAoDashboard;
