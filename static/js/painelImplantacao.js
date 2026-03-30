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

function extrairPercentualEmpresa(item) {
    const obs = (item.observacoes || '').toUpperCase();
    const match = obs.match(/(\d+)%/);
    if (match) return parseInt(match[1]);

    const status = extrairStatus(item);
    if (status.status === 'Concluído') return 100;
    if (status.status === 'Em Processo') return 50;
    if (status.status === 'Em Risco') return 25;
    return 0; // Pendente ou outros
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
            todasOrgs[orgId] = { empresas: [], descricao: item.organizacao_descricao || 'Sem Descrição' };
        }
        todasOrgs[orgId].empresas.push(item);
    });

    baseFiltrada.forEach(item => {
        const orgId = item.organizacao_codigo;
        if (!orgId) return;

        if (!orgsAgrupadas[orgId]) {
            const stats = todasOrgs[orgId];

            // O percentual da organização agora é a média do percentual de todas as suas empresas
            const totalProgresso = stats.empresas.reduce((sum, e) => sum + extrairPercentualEmpresa(e), 0);
            const percentualMedia = stats.empresas.length > 0 ? Math.round(totalProgresso / stats.empresas.length) : 0;

            orgsAgrupadas[orgId] = {
                codigo: orgId,
                descricao: stats.descricao,
                percentual: percentualMedia,
                emImplantacao: [],
                futuraImplantacao: []
            };
        }

        const status = extrairStatus(item);
        const empresaComPercentual = { ...item, percentual: extrairPercentualEmpresa(item) };

        if (status.status === 'Em Processo' || status.status === 'Em Risco') {
            orgsAgrupadas[orgId].emImplantacao.push(empresaComPercentual);
        } else {
            orgsAgrupadas[orgId].futuraImplantacao.push(empresaComPercentual);
        }
    });

    const orgsList = Object.values(orgsAgrupadas).sort((a, b) => b.percentual - a.percentual || a.descricao.localeCompare(b.descricao));

    // Guardar globalmente para o popup
    state.currentPainelOrgs = orgsAgrupadas;

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
        <div class="org-card" id="org-${org.codigo}" onclick="abrirPopupEmpresas('${org.codigo}')">
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
                    <span class="material-icons expand-icon" style="font-size: 20px; color: var(--primary);">visibility</span>
                </div>

                <div class="org-progress-wrapper">
                    <div class="progress-info">
                        <span style="font-size: 0.7rem; color: var(--text-secondary);">PROGRESSO DA ORGANIZAÇÃO</span>
                        <span class="progress-percent">${org.percentual}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${org.percentual}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function abrirPopupEmpresas(orgId) {
    const org = state.currentPainelOrgs ? state.currentPainelOrgs[orgId] : null;
    if (!org) return;

    const modal = document.getElementById('observacoesModal');
    const modalBody = modal.querySelector('.modal-body');
    const modalContent = modal.querySelector('.modal-content');

    modalContent.classList.add('modal-painel');
    modal.querySelector('h3').innerHTML = `<span class="material-icons">business</span> ${org.codigo} - ${org.descricao}`;

    const html = `
        <div class="org-popup-content">
            <div class="popup-header-stats">
                <div class="stat-box">
                    <div class="stat-value">${org.percentual}%</div>
                    <div class="stat-label">Progresso Médio</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${org.emImplantacao.length}</div>
                    <div class="stat-label">Em Implantação</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${org.futuraImplantacao.length}</div>
                    <div class="stat-label">Pendentes</div>
                </div>
            </div>

            ${org.emImplantacao.length > 0 ? `
                <div class="popup-section">
                    <div class="section-title implantacao">
                        <span class="material-icons">sync</span> Em Implantação
                    </div>
                    <div class="popup-companies-grid">
                        ${org.emImplantacao.map(item => renderizarEmpresaCardPopup(item)).join('')}
                    </div>
                </div>
            ` : ''}

            ${org.futuraImplantacao.length > 0 ? `
                <div class="popup-section">
                    <div class="section-title futura">
                        <span class="material-icons">schedule</span> Futura Implantação
                    </div>
                    <div class="popup-companies-grid">
                        ${org.futuraImplantacao.map(item => renderizarEmpresaCardPopup(item)).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

function renderizarEmpresaCardPopup(item) {
    const status = extrairStatus(item);
    let statusClass = 'status-pendente';
    if (status.status === 'Em Processo') statusClass = 'status-em-processo';
    if (status.status === 'Em Risco') statusClass = 'status-risco';

    const sistemas = (item.sistema || '').split('/').map(s => s.trim()).filter(s => ['CLOUD', 'ZAPCRM', 'WEBSITE'].includes(s.toUpperCase()));
    const itemJson = JSON.stringify(item).replace(/"/g, '&quot;').replace(/'/g, "\\'");
    const obsEscaped = (item.observacoes || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ').replace(/\r/g, ' ');

    return `
        <div class="company-card-popup" onclick="event.stopPropagation(); abrirModal('${obsEscaped}', '${itemJson}')">
            <div class="card-header-popup">
                <div class="company-name-popup" title="${item.filial_descricao}">${item.filial_descricao}</div>
                <div class="company-badge-popup ${statusClass}">${status.mensagem}</div>
            </div>

            <div class="card-systems-popup">
                ${sistemas.map(s => renderizarBadgeSistema(s)).join('')}
            </div>

            <div class="card-progress-popup">
                <div class="progress-info-popup">
                    <span>Desenvolvimento</span>
                    <span class="percent-value">${item.percentual}%</span>
                </div>
                <div class="progress-bar-popup">
                    <div class="progress-fill-popup" style="width: ${item.percentual}%"></div>
                </div>
            </div>

            <div class="card-footer-popup">
                <div class="footer-info">
                    <span class="material-icons">calendar_today</span>
                    Venda: ${item.data_venda || 'N/I'}
                </div>
                ${item.data_previsao ? `
                    <div class="footer-info highlight">
                        <span class="material-icons">event_repeat</span>
                        Previsão: ${item.data_previsao}
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
window.abrirPopupEmpresas = abrirPopupEmpresas;
