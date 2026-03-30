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
        mostrarEmptyState();
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
    state.currentPainelOrgs = orgsAgrupadas;

    // 3. Renderizar na div principal
    const dashboardView = document.getElementById('dashboard-view');
    const painelView = document.getElementById('painel-informativo-view');

    if (!dashboardView || !painelView) return;

    const html = `
        <div class="panel-main-header">
            <div style="display: flex; align-items: center; gap: 20px;">
                <button onclick="voltarAoDashboard()" class="action-btn secondary" title="Voltar ao Dashboard" style="border-radius: 12px; padding: 12px;">
                    <span class="material-icons">arrow_back</span>
                </button>
                <div class="panel-title-group">
                    <h2 class="panel-main-title">
                        <span class="material-icons">rocket_launch</span>
                        Painel Informativo
                    </h2>
                    <p class="panel-subtitle">Acompanhamento estratégico de implantações pendentes</p>
                </div>
            </div>
            <div class="panel-stats-summary">
                <div class="stat-badge"><span class="material-icons">business</span> ${orgsList.length} Orgs</div>
                <div class="stat-badge"><span class="material-icons">apartment</span> ${baseFiltrada.length} Empresas</div>
            </div>
        </div>

        <div class="panel-container">
            ${orgsList.map((org, index) => renderizarCardOrganizacao(org, index)).join('')}
        </div>
    `;

    painelView.innerHTML = html;
    dashboardView.style.display = 'none';
    painelView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarEmptyState() {
    const dashboardView = document.getElementById('dashboard-view');
    const painelView = document.getElementById('painel-informativo-view');
    if (!dashboardView || !painelView) return;

    painelView.innerHTML = `
        <div class="panel-main-header">
            <button onclick="voltarAoDashboard()" class="action-btn secondary"><span class="material-icons">arrow_back</span> Voltar</button>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 2rem; text-align: center; background: var(--surface); border-radius: var(--border-radius-lg); border: 1px dashed var(--border);">
            <span class="material-icons" style="font-size: 5rem; color: var(--border); margin-bottom: 1.5rem;">auto_awesome_motion</span>
            <h2 style="color: var(--text);">Tudo em ordem!</h2>
            <p style="color: var(--text-secondary); max-width: 400px; margin-top: 0.5rem;">Nenhuma organização com implantações pendentes nos sistemas Cloud, ZapCRM ou WebSite no momento.</p>
        </div>
    `;
    dashboardView.style.display = 'none';
    painelView.style.display = 'block';
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

function renderizarCardOrganizacao(org, index) {
    const totalPendente = org.emImplantacao.length + org.futuraImplantacao.length;
    const delay = (index * 0.05).toFixed(2);

    return `
        <div class="org-card" id="org-${org.codigo}" onclick="abrirPopupEmpresas('${org.codigo}')" style="animation-delay: ${delay}s">
            <div class="org-header">
                <div class="org-info-main">
                    <div class="org-icon">
                        <span class="material-icons">business</span>
                    </div>
                    <div class="org-name-wrapper">
                        <div class="org-name">${org.codigo} - ${org.descricao}</div>
                    </div>
                </div>

                <div class="org-stats-row">
                    <span>${totalPendente} empresa(s) pendente(s)</span>
                    <span class="material-icons" style="font-size: 20px; color: var(--primary);">chevron_right</span>
                </div>

                <div class="org-progress-wrapper">
                    <div class="progress-info">
                        <span class="progress-label">Progresso Geral</span>
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
    modal.querySelector('h3').innerHTML = `<span class="material-icons" style="color: var(--primary); font-size: 24px;">business</span> ${org.codigo} - ${org.descricao}`;

    const html = `
        <div class="org-popup-content">
            <div class="popup-header-stats">
                <div class="stat-box">
                    <div class="stat-value">${org.percentual}%</div>
                    <div class="stat-label">Desenvolvimento</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" style="color: var(--info);">${org.emImplantacao.length}</div>
                    <div class="stat-label">Em Implantação</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" style="color: var(--warning);">${org.futuraImplantacao.length}</div>
                    <div class="stat-label">Futuras</div>
                </div>
            </div>

            ${org.emImplantacao.length > 0 ? `
                <div class="popup-section">
                    <div class="section-title implantacao">
                        <span class="material-icons">sync</span> Unidades em Implantação
                    </div>
                    <div class="popup-companies-grid">
                        ${org.emImplantacao.map(item => renderizarEmpresaCardPopup(item)).join('')}
                    </div>
                </div>
            ` : ''}

            ${org.futuraImplantacao.length > 0 ? `
                <div class="popup-section">
                    <div class="section-title futura">
                        <span class="material-icons">schedule</span> Próximas Unidades
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
                    <span>Progresso</span>
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
                        Prev: ${item.data_previsao}
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
