// ==================== UTILITÁRIOS ====================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function parseCurrency(valor) {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    try {
        const valorLimpo = String(valor).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const numero = parseFloat(valorLimpo);
        return isNaN(numero) ? 0 : numero;
    } catch (e) { return 0; }
}

function parseDate(dataStr) {
    if (!dataStr) return null;
    if (dataStr instanceof Date) return dataStr;
    try {
        const str = String(dataStr).trim();
        if (str === '') return null;
        if (!isNaN(str) && str.length > 4) {
            const timestamp = parseInt(str);
            if (!isNaN(timestamp) && timestamp > 0) return new Date(timestamp);
        }
        if (str.includes('/')) {
            const partes = str.split('/');
            if (partes.length === 3) {
                const dia = parseInt(partes[0]), mes = parseInt(partes[1]) - 1, ano = parseInt(partes[2]);
                if (ano > 1900 && ano < 2100 && dia > 0 && dia <= 31 && mes >= 0 && mes < 12) {
                    const date = new Date(ano, mes, dia);
                    if (!isNaN(date.getTime())) return date;
                }
            }
        }
        if (str.includes('-')) {
            const partes = str.split('-');
            if (partes.length === 3) {
                const ano = parseInt(partes[0]), mes = parseInt(partes[1]) - 1, dia = parseInt(partes[2]);
                if (ano > 1900 && ano < 2100 && dia > 0 && dia <= 31 && mes >= 0 && mes < 12) {
                    const date = new Date(ano, mes, dia);
                    if (!isNaN(date.getTime())) return date;
                }
            }
        }
        const date = new Date(str);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) return date;
    } catch (e) { console.warn('Erro ao parsear data:', dataStr, e); }
    return null;
}

function calcularDiasEntreDatas(dataInicio, dataFim = null) {
    if (!dataInicio) return 0;
    const inicio = new Date(dataInicio);
    if (isNaN(inicio.getTime())) return 0;
    const fim = dataFim ? new Date(dataFim) : new Date();
    if (isNaN(fim.getTime())) return 0;
    return Math.ceil(Math.abs(fim - inicio) / (1000 * 60 * 60 * 24));
}

function formatNumber(value) {
    if (!value && value !== 0) return '0';
    if (isNaN(value)) return '0';
    return value.toLocaleString('pt-BR');
}

function isAnonymized() {
    return state.userRole === 'implantação';
}

function formatCurrency(value, forceVisible = false) {
    if (!value && value !== 0) value = 0;
    if (isNaN(value)) value = 0;

    const formatted = value.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL',
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });

    if (isAnonymized() && !forceVisible) {
        return `<span class="anonymized-blur" title="Valor restrito">${formatted}</span>`;
    }
    return formatted;
}

function formatarTextoETL(texto) {
    const mapa = {
        'cadastro_pessoas': 'Cadastro de Pessoas', 'cadastro_veiculosdocliente': 'Cadastro de Veículos',
        'cadastro_mercadorias': 'Cadastro de Mercadorias', 'inventario_estoque': 'Inventário',
        'contas_pagar': 'Contas a Pagar', 'contas_receber': 'Contas a Receber', 'cartões': 'Cartões',
        'adiantamento_cliente': 'Adiant. Cliente', 'adiantamento_fornecedor': 'Adiant. Fornecedor',
        'notas_fiscais': 'Notas Fiscais', 'ordens_servico': 'Ordens de Serviço'
    };
    return mapa[texto] || texto.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

function showLoading(show = true, message = 'Carregando...', isManualRefresh = false) {
    if (isManualRefresh) return;
    state.isLoading = show;
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    const loadingText = overlay.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = message;
    overlay.style.display = show ? 'flex' : 'none';
}

function showFilterLoading(show = true) {
    state.isFiltering = show;
    const existing = document.querySelector('.mini-loading');
    if (existing) existing.remove();
    if (show) {
        const statusEl = document.getElementById('filtersStatus');
        if (statusEl) {
            const miniLoading = document.createElement('div');
            miniLoading.className = 'mini-loading';
            miniLoading.innerHTML = '<div class="mini-spinner"></div><span>Atualizando...</span>';
            statusEl.appendChild(miniLoading);
        }
    }
}

function showNotification(message, type = 'info', duration = 3000) {
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${type}`;
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };

    // Remover emojis e contagens extras conforme pedido
    let cleanMessage = message.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    if (cleanMessage.includes('registros')) {
        cleanMessage = 'Dados atualizados com sucesso!';
    }

    snackbar.innerHTML = `
        <span class="material-icons snackbar-icon">${icons[type] || 'info'}</span>
        <span class="snackbar-message">${cleanMessage}</span>
        <div class="snackbar-progress" style="animation-duration: ${duration}ms"></div>
    `;

    document.body.appendChild(snackbar);
    setTimeout(() => snackbar.classList.add('show'), 10);

    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => snackbar.remove(), 500);
    }, duration);
}

function extrairStatus(item) {
    const dataImplantacao = item.dataImplantacao || item.data_implantacao;
    if (dataImplantacao && dataImplantacao.trim() !== '') return { status: 'Concluído', mensagem: 'Concluída', cor: 'var(--success)', icone: 'check' };
    const observacao = (item.observacoes || '').toUpperCase();
    if (observacao.includes('EM PROCESSO')) return { status: 'Em Processo', mensagem: 'Em Processo', cor: 'var(--info)', icone: 'sync' };
    if (observacao.includes('RISCO')) return { status: 'Em Risco', mensagem: 'Em Risco', cor: 'var(--danger)', icone: 'warning' };
    return { status: 'Pendente', mensagem: 'Pendente', cor: 'var(--warning)', icone: 'pending_actions' };
}

function formatarNomeGrafico(nome) {
    if (!nome) return '';
    return formatarTextoETL(nome);
}

function renderizarBadgeSistema(sistema) {
    if (!sistema) return '';
    const s = String(sistema).toUpperCase();
    let config = { class: '', icon: null, label: formatarTextoETL(sistema) };

    if (s.includes('WEBSITE')) {
        config = { class: 'website', icon: 'public', label: 'Website' };
    } else if (s.includes('CLOUD')) {
        config = { class: 'cloud', icon: 'cloud', label: 'Cloud' };
    } else if (s.includes('FISCAL') || s.includes('CONTABIL') || s.includes('CONTÁBIL')) {
        config = { class: 'fiscal-contabil', icon: 'autorenew', label: formatarTextoETL(sistema) };
    } else if (s.includes('ZAPCRM')) {
        config = { class: 'zapcrm', icon: 'send', label: 'ZapCRM' };
    } else if (s.includes('WEBPAV')) {
        config = { class: 'webpav', icon: 'public', label: 'WEBPAV' };
    }

    return `
        <span class="badge ${config.class}">
            ${config.icon ? `<span class="material-icons">${config.icon}</span>` : ''}
            ${config.label}
        </span>
    `;
}

// ==================== LÓGICA DE NEGÓCIO CENTRALIZADA ====================

function getValorBacklog(item, systemFilter = null) {
    if (!item) return 0;
    const s = (item.sistema || '').toUpperCase();
    const f = (systemFilter || '').toUpperCase();

    // Se houver um filtro de sistema específico (ex: no modal)
    if (f === 'CLOUD') return item.total_erp || 0;
    if (f === 'ZAPCRM' || f === 'FISCAL' || f === 'CONTÁBIL' || f === 'WEBPAV') {
        return item.total_agregado || 0;
    }

    // Lógica para quando não há filtro específico (ex: KPI principal ou 'TODOS')
    // Se tiver ZAPCRM ou agregados, prioriza agregado. Se tiver CLOUD e ZAPCRM, usa Total Geral.
    const isAgregado = s.includes('ZAPCRM') || s.includes('FISCAL') || s.includes('CONTÁBIL') || s.includes('WEBPAV');
    const isERP = s.includes('CLOUD');

    if (isAgregado && isERP) return item.total_geral || 0;
    if (isAgregado) return item.total_agregado || 0;
    if (isERP) return item.total_erp || 0;

    return item.total_geral || 0;
}

function filtrarBacklogPendentes(data) {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(d => {
        const s = (d.sistema || '').toUpperCase();
        const isCloudOrZap = s.includes('CLOUD') || s.includes('ZAPCRM');
        return !d.dataImplantacaoObj && isCloudOrZap;
    });
}

function filtrarBacklogEmProcesso(data) {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(item => {
        const s = (item.sistema || '').toUpperCase();
        const isCloudOrZap = s.includes('CLOUD') || s.includes('ZAPCRM');
        const obsEmProcesso = (item.observacoes || '').toUpperCase().includes('EM PROCESSO');
        return !item.dataImplantacaoObj && obsEmProcesso && isCloudOrZap;
    });
}
