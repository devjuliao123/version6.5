// ==================== PAINEL DE IMPLANTAÇÃO ====================

function initPainelImplantacao() {
    const btn = document.getElementById('painelImplantacaoBtn');
    if (btn) {
        btn.addEventListener('click', abrirPainelImplantacao);
    }
}

function abrirPainelImplantacao() {
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

    // Precisamos de todas as empresas da organização para calcular o percentual de progresso
    const todasOrgs = {};
    data.forEach(item => {
        const orgId = item.organizacao_codigo;
        if (!orgId) return;

        if (!todasOrgs[orgId]) {
            todasOrgs[orgId] = {
                total: 0,
                concluidas: 0,
                descricao: item.organizacao_descricao || 'Sem Descrição'
            };
        }

        todasOrgs[orgId].total++;
        const temData = item.dataImplantacaoObj || (item.data_implantacao && item.data_implantacao.trim() !== '');
        if (temData) {
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

    // Converter para array e ordenar por percentual (menor para maior) ou nome
    const orgsList = Object.values(orgsAgrupadas).sort((a, b) => b.percentual - a.percentual || a.descricao.localeCompare(b.descricao));

    // 3. Criar Modal
    const modal = document.getElementById('observacoesModal');
    const modalBody = modal.querySelector('.modal-body');
    const modalContent = modal.querySelector('.modal-content');

    // Ajustar largura do modal
    modalContent.classList.add('modal-painel');

    const html = `
        <div class="panel-container">
            <div style="margin-bottom: 1.5rem; text-align: center;">
                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                    Acompanhamento de organizações com implantações pendentes (Cloud, ZapCRM e WebSite).
                </p>
            </div>

            ${orgsList.map(org => renderizarCardOrganizacao(org)).join('')}
        </div>
    `;

    modal.querySelector('h3').innerHTML = '<span class="material-icons">rocket_launch</span> Painel de Implantação';
    modalBody.innerHTML = html;
    modal.style.display = 'block';

    // Adicionar eventos de toggle
    const headers = modalBody.querySelectorAll('.org-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.org-card');
            card.classList.toggle('expanded');

            const icon = header.querySelector('.expand-icon');
            if (icon) {
                icon.textContent = card.classList.contains('expanded') ? 'expand_less' : 'expand_more';
            }
        });
    });
}

function renderizarCardOrganizacao(org) {
    return `
        <div class="org-card" id="org-${org.codigo}">
            <div class="org-header">
                <div class="org-info">
                    <div class="org-icon">
                        <span class="material-icons">business</span>
                    </div>
                    <div>
                        <div class="org-name">${org.codigo} - ${org.descricao}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">
                            ${org.emImplantacao.length + org.futuraImplantacao.length} empresa(s) pendente(s)
                        </div>
                    </div>
                </div>

                <div class="org-progress-wrapper">
                    <div class="progress-bar-container" title="${org.percentual}% concluído">
                        <div class="progress-bar-fill" style="width: ${org.percentual}%"></div>
                    </div>
                    <div class="progress-percent">${org.percentual}%</div>
                    <span class="material-icons expand-icon" style="color: var(--text-secondary);">expand_more</span>
                </div>
            </div>

            <div class="org-content">
                ${org.emImplantacao.length > 0 ? `
                    <div class="section-title implantacao">
                        <span class="material-icons" style="font-size: 16px;">sync</span> Em Implantação
                    </div>
                    <div class="companies-grid">
                        ${org.emImplantacao.map(item => renderizarEmpresaItem(item)).join('')}
                    </div>
                ` : ''}

                ${org.futuraImplantacao.length > 0 ? `
                    <div class="section-title futura">
                        <span class="material-icons" style="font-size: 16px;">schedule</span> Futura Implantação
                    </div>
                    <div class="companies-grid">
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

    return `
        <div class="company-item" onclick="event.stopPropagation(); abrirModal('${(item.observacoes || '').replace(/'/g, "\\'")}', ${JSON.stringify(item).replace(/'/g, "\\'")})">
            <div class="company-header">
                <div class="company-name">${item.filial_descricao}</div>
                <div class="company-system">
                    ${(item.sistema || '').split('/').map(s => renderizarBadgeSistema(s.trim())).join('')}
                </div>
            </div>

            <div class="company-status ${statusClass}">
                <span class="material-icons" style="font-size: 14px;">${status.icone}</span>
                <span>${status.mensagem}</span>
            </div>

            <div class="company-footer">
                <div class="company-date">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span class="material-icons" style="font-size: 12px;">event</span>
                        Venda: ${item.data_venda || 'N/I'}
                    </div>
                </div>
                ${item.data_previsao ? `
                    <div class="company-date">
                        <div style="display: flex; align-items: center; gap: 4px; color: var(--primary); font-weight: 600;">
                            <span class="material-icons" style="font-size: 12px;">event_repeat</span>
                            Prev: ${item.data_previsao}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Tornar disponível globalmente
window.initPainelImplantacao = initPainelImplantacao;
window.abrirPainelImplantacao = abrirPainelImplantacao;
