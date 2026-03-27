// ==================== GRÁFICOS ====================

function getChartColors() {
    const isDark = document.body.classList.contains('dark');
    return {
        primary: isDark ? '#38bdf8' : '#0ea5e9',
        text: getComputedStyle(document.body).getPropertyValue('--text').trim(),
        muted: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim(),
        grid: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        etl: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        website: '#F07A2B',
        cloud: '#2F5FBF',
        fisco: '#3A4C7A',
        zapcrm: '#39A96B',
        info: '#0ea5e9'
    };
}

function getSistemaColor(sistema) {
    const sistemaUpper = sistema.toUpperCase();
    if (sistemaUpper.includes('WEBSITE')) return '#F07A2B';
    if (sistemaUpper.includes('CLOUD')) return '#2F5FBF';
    if (sistemaUpper.includes('FISCO')) return '#3A4C7A';
    if (sistemaUpper.includes('ZAPCRM')) return '#39A96B';
    if (sistemaUpper.includes('CONTÁBIL')) return '#6366f1';
    if (sistemaUpper.includes('FISCAL')) return '#8b5cf6';
    if (sistemaUpper.includes('WEBPAV')) return '#ec4899';
    if (sistemaUpper.includes('FOLHA')) return '#14b8a6';
    if (sistemaUpper.includes('ADICION')) return '#f97316';
    return '#64748b';
}

function destroyCharts() {
    Object.values(state.charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    state.charts = {};
}

// ==================== PROCESSAMENTO DE DADOS PARA GRÁFICOS ====================

function processarSistemas(base) {
    const sistemas = {};
    base.forEach(item => {
        if (item.sistema) {
            item.sistema.split('/').forEach(s => {
                const sistema = s.trim();
                if (sistema) sistemas[sistema] = (sistemas[sistema] || 0) + 1;
            });
        }
    });
    return sistemas;
}

function processarBancosESistemas(base) {
    const combinados = {};

    base.forEach(item => {
        const sistema = (item.sistemaAnterior || '').trim();
        const banco = (item.bancoAnterior || '').trim();

        let label = '';
        if (sistema && banco) label = `${sistema} - ${banco}`;
        else if (sistema) label = sistema;
        else if (banco) label = banco;

        if (label) {
            combinados[label] = (combinados[label] || 0) + 1;
        }
    });

    return combinados;
}

function processarModalidades(base) {
    const modalidades = {};
    base.forEach(item => {
        if (item.modalidade) {
            const mod = item.modalidade.trim();
            if (mod) modalidades[mod] = (modalidades[mod] || 0) + 1;
        }
    });
    return modalidades;
}

function processarMarcas(base) {
    const marcas = {};
    base.forEach(item => {
        if (item.marca) {
            const marca = item.marca.trim();
            if (marca) marcas[marca] = (marcas[marca] || 0) + 1;
        }
    });
    return marcas;
}

function processarValorPorAno(base) {
    const valores = {};
    base.forEach(item => {
        if (item.dataObj && item.valor) {
            const ano = item.dataObj.getFullYear();
            valores[ano] = (valores[ano] || 0) + item.valor;
        }
    });
    return valores;
}

function processarCrescimento(base) {
    const crescimento = {};
    const filters = typeof getFilterValues === 'function' ? getFilterValues() : {};
    const isMonthly = !!(filters.dataInicio || filters.dataFim);

    base.forEach(item => {
        if (item.dataObj) {
            let key, label;
            if (isMonthly) {
                key = `${item.dataObj.getFullYear()}-${String(item.dataObj.getMonth() + 1).padStart(2, '0')}`;
                label = item.dataObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase();
            } else {
                key = item.dataObj.getFullYear();
                label = key.toString();
            }

            if (!crescimento[key]) {
                crescimento[key] = { label, valor: 0 };
            }
            crescimento[key].valor++;
        }
    });
    return crescimento;
}

function processarPrazo(base) {
    const prazos = { 'Antes do Prazo': 0, 'No Prazo': 0, 'Após Prazo': 0 };
    base.forEach(item => {
        if (item.dataImplantacaoObj && item.dataPrevisaoObj) {
            const di = new Date(item.dataImplantacaoObj);
            const dp = new Date(item.dataPrevisaoObj);
            di.setHours(0,0,0,0);
            dp.setHours(0,0,0,0);

            if (di < dp) {
                prazos['Antes do Prazo']++;
            } else if (di.getTime() === dp.getTime()) {
                prazos['No Prazo']++;
            } else {
                prazos['Após Prazo']++;
            }
        }
    });
    return prazos;
}

function processarComissaoMensal(base) {
    const comissoes = {};
    base.forEach(item => {
        if (item.dataImplantacaoObj && item.valor_comissao) {
            const data = item.dataImplantacaoObj;
            const label = data.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
            const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

            if (!comissoes[key]) {
                comissoes[key] = { label: label.toUpperCase(), valor: 0, items: [] };
            }
            // 3% de comissão
            comissoes[key].valor += (item.valor_comissao * 0.03);
            comissoes[key].items.push(item);
        }
    });
    return comissoes;
}

// ==================== CRIAÇÃO DOS GRÁFICOS ====================

function criarGraficos() {
    destroyCharts();

    const base = state.filteredData;
    const colors = getChartColors();
    const isImplRole = state.userRole === 'implantação';

    const sistemas = processarSistemas(base);
    const bancosSistemas = processarBancosESistemas(base);
    const modalidades = processarModalidades(base);
    const marcas = processarMarcas(base);
    const valorPorAno = processarValorPorAno(base);
    const crescimento = processarCrescimento(base);
    const comissaoMensal = processarComissaoMensal(base);
    const prazos = processarPrazo(base);

    // ==================== GRÁFICO DE SISTEMAS ====================
    const sistemaCanvas = document.getElementById('sistemaChart');
    if (sistemaCanvas) {
        if (Object.keys(sistemas).length > 0) {
            const sorted = Object.entries(sistemas).sort((a, b) => b[1] - a[1]).slice(0, 10);
            const backgroundColors = sorted.map(([sistema]) => getSistemaColor(sistema));

            state.charts.sistema = new Chart(sistemaCanvas, {
                type: 'bar',
                data: {
                    labels: sorted.map(([s]) => s),
                    datasets: [{
                        data: sorted.map(([_, v]) => v),
                        backgroundColor: backgroundColors,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.raw} implantação(ões)`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { color: colors.grid }, ticks: { color: colors.muted } },
                        y: { grid: { display: false }, ticks: { color: colors.muted, font: { size: 11 } } }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const label = sorted[index][0];
                            if (typeof mostrarFiliaisPorSistema === 'function') {
                                mostrarFiliaisPorSistema(label);
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(sistemaCanvas, 'Sem dados de sistemas');
        }
    }

    // ==================== GRÁFICO DE BANCOS E SISTEMAS ANTERIORES ====================
    const bancoCanvas = document.getElementById('bancoChart');
    if (bancoCanvas) {
        const sortedEntries = Object.entries(bancosSistemas).sort((a, b) => b[1] - a[1]);
        const labels = sortedEntries.map(e => e[0]);
        const data = sortedEntries.map(e => e[1]);
        const combinedColors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16'];

        if (labels.length > 0) {
            state.charts.banco = new Chart(bancoCanvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: combinedColors.slice(0, labels.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: colors.text, font: { size: 10 } } },
                        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} ocorrência(s)` } }
                    },
                    cutout: '60%',
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const label = labels[index];
                            if (typeof mostrarFiliaisPorCategoria === 'function') {
                                mostrarFiliaisPorCategoria(label);
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(bancoCanvas, 'Sem dados');
        }
    }

    // ==================== GRÁFICO DE VALOR POR ANO (RESTRICTED) ====================
    const valorCanvas = document.getElementById('valorAnoChart');
    if (valorCanvas) {
        if (isImplRole) {
            showNoDataMessage(valorCanvas, 'Dados de valores restritos para este perfil');
        } else if (Object.keys(valorPorAno).length > 0) {
            const anos = Object.keys(valorPorAno).sort();
            state.charts.valorAno = new Chart(valorCanvas, {
                type: 'bar',
                data: {
                    labels: anos,
                    datasets: [{
                        label: 'Valor Implantado',
                        data: anos.map(a => valorPorAno[a]),
                        backgroundColor: colors.primary,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (ctx) => ' ' + formatCurrency(ctx.raw) } }
                    },
                    scales: {
                        y: { ticks: { callback: (v) => 'R$ ' + (v / 1000).toFixed(0) + 'k' } }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const ano = anos[index];
                            if (typeof mostrarFiliaisPorAno === 'function') {
                                mostrarFiliaisPorAno(ano);
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(valorCanvas, 'Sem dados');
        }
    }

    // ==================== GRÁFICO DE CRESCIMENTO ====================
    const crescimentoCanvas = document.getElementById('crescimentoChart');
    const crescimentoContainer = crescimentoCanvas?.closest('.chart-box');
    const anoFiltro = document.getElementById('anoFiltro')?.value;

    if (crescimentoCanvas) {
        if (anoFiltro && !Object.keys(crescimento).some(k => k.includes('-'))) {
             if (crescimentoContainer) crescimentoContainer.style.display = 'none';
        } else {
            if (crescimentoContainer) crescimentoContainer.style.display = 'flex';
            if (Object.keys(crescimento).length > 0) {
                const sortedKeys = Object.keys(crescimento).sort();
                const labels = sortedKeys.map(k => crescimento[k].label);
                const data = sortedKeys.map(k => crescimento[k].valor);

                state.charts.crescimento = new Chart(crescimentoCanvas, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            borderColor: colors.primary,
                            backgroundColor: colors.primary + '20',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} implantação(ões)` } }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: colors.muted, font: { size: 9 } } },
                            y: { grid: { color: colors.grid }, ticks: { color: colors.muted } }
                        },
                        onClick: (event, elements) => {
                            if (elements.length > 0) {
                                const index = elements[0].index;
                                const key = sortedKeys[index];
                                const label = crescimento[key].label;

                                if (key.includes('-')) {
                                    // Clique em mês
                                    const items = base.filter(item => {
                                        if (!item.dataObj) return false;
                                        const itemKey = `${item.dataObj.getFullYear()}-${String(item.dataObj.getMonth() + 1).padStart(2, '0')}`;
                                        return itemKey === key;
                                    });
                                    if (typeof criarModalMelhorado === 'function') {
                                        criarModalMelhorado(`Crescimento: ${label}`, 'trending_up', colors.primary, items, { tipo: 'crescimento_mes' });
                                    }
                                } else {
                                    // Clique em ano
                                    if (typeof mostrarFiliaisPorAno === 'function') {
                                        mostrarFiliaisPorAno(key);
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                showNoDataMessage(crescimentoCanvas, 'Sem dados');
            }
        }
    }

    // ==================== GRÁFICO DE MODALIDADES ====================
    const modalidadeCanvas = document.getElementById('modalidadeChart');
    if (modalidadeCanvas) {
        const modalidadesFiltradas = { ...modalidades };
        delete modalidadesFiltradas[''];
        if (Object.keys(modalidadesFiltradas).length > 0) {
            const labels = Object.keys(modalidadesFiltradas).sort();
            state.charts.modalidade = new Chart(modalidadeCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: labels.map(l => modalidadesFiltradas[l]),
                        backgroundColor: colors.primary,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} filial(is)` } }
                    },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const label = labels[index];
                            if (typeof mostrarFiliaisPorModalidade === 'function') {
                                mostrarFiliaisPorModalidade(label);
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(modalidadeCanvas, 'Sem dados');
        }
    }

    // ==================== GRÁFICO DE MARCAS (PIZZA) ====================
    const marcaCanvas = document.getElementById('marcaChart');
    if (marcaCanvas) {
        if (Object.keys(marcas).length > 0) {
            let sorted = Object.entries(marcas).sort((a, b) => b[1] - a[1]);

            let labelsFinal = [];
            let dataFinal = [];
            let marcasAgrupadas = null;

            if (sorted.length > 10) {
                const top = sorted.slice(0, 9);
                const others = sorted.slice(9);
                const otherTotal = others.reduce((sum, [_, v]) => sum + v, 0);

                labelsFinal = [...top.map(([m]) => m), 'OUTRAS MARCAS'];
                dataFinal = [...top.map(([_, v]) => v), otherTotal];
                marcasAgrupadas = others.map(([m]) => m);
            } else {
                labelsFinal = sorted.map(([m]) => m);
                dataFinal = sorted.map(([_, v]) => v);
            }

            const total = dataFinal.reduce((sum, v) => sum + v, 0);
            const palette = [
                '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#f43f5e',
                '#84cc16', '#06b6d4', '#d946ef', '#1e293b', '#64748b'
            ];

            const brandColors = labelsFinal.map((_, i) => palette[i % palette.length]);

            state.charts.marca = new Chart(marcaCanvas, {
                type: 'pie',
                data: {
                    labels: labelsFinal,
                    datasets: [{
                        data: dataFinal,
                        backgroundColor: brandColors,
                        borderWidth: 1,
                        borderColor: colors.text === '#f8fafc' ? '#1e293b' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: colors.text,
                                font: { size: 9 },
                                boxWidth: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const percent = ((ctx.raw / total) * 100).toFixed(1);
                                    const labelFilial = ctx.raw === 1 ? 'filial' : 'filiais';
                                    return ` ${ctx.label}: ${ctx.raw} ${labelFilial} (${percent}%)`;
                                }
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const label = labelsFinal[index];

                            if (label === 'OUTRAS MARCAS' && marcasAgrupadas) {
                                if (typeof mostrarOutrasMarcas === 'function') {
                                    mostrarOutrasMarcas(marcasAgrupadas);
                                }
                            } else {
                                if (typeof mostrarFiliaisPorMarca === 'function') {
                                    mostrarFiliaisPorMarca(label);
                                }
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(marcaCanvas, 'Sem dados de marcas');
        }
    }

    // ==================== GRÁFICO DE CUMPRIMENTO DE PRAZO ====================
    const prazoCanvas = document.getElementById('prazoChart');
    if (prazoCanvas) {
        if (prazos['Antes do Prazo'] > 0 || prazos['No Prazo'] > 0 || prazos['Após Prazo'] > 0) {
            state.charts.prazo = new Chart(prazoCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Antes do Prazo', 'No Prazo', 'Após Prazo'],
                    datasets: [{
                        data: [prazos['Antes do Prazo'], prazos['No Prazo'], prazos['Após Prazo']],
                        backgroundColor: [colors.success, colors.info, colors.danger],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: colors.text, font: { size: 10 } } },
                        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} implantação(ões)` } }
                    },
                    cutout: '60%',
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            if (index === 0) {
                                if (typeof mostrarAntesDoPrazo === 'function') mostrarAntesDoPrazo();
                            } else if (index === 1) {
                                if (typeof mostrarNoPrazoExato === 'function') mostrarNoPrazoExato();
                            } else {
                                if (typeof mostrarForaDoPrazo === 'function') mostrarForaDoPrazo();
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(prazoCanvas, 'Sem dados de prazo');
        }
    }

    // ==================== GRÁFICO DE COMISSÃO MENSAL ====================
    const comissaoCanvas = document.getElementById('comissaoMensalChart');
    if (comissaoCanvas) {
        if (isImplRole) {
            showNoDataMessage(comissaoCanvas, 'Dados restritos');
        } else if (Object.keys(comissaoMensal).length > 0) {
            const sortedKeys = Object.keys(comissaoMensal).sort();
            const labels = sortedKeys.map(k => comissaoMensal[k].label);
            const data = sortedKeys.map(k => comissaoMensal[k].valor);

            state.charts.comissaoMensal = new Chart(comissaoCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Comissão (3%)',
                        data: data,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (ctx) => ' Comissão: ' + formatCurrency(ctx.raw) } }
                    },
                    scales: {
                        x: { ticks: { color: colors.muted, font: { size: 9 } } },
                        y: {
                            ticks: {
                                color: colors.muted,
                                callback: (v) => 'R$ ' + (v / 1000).toFixed(1) + 'k'
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const key = sortedKeys[index];
                            const label = comissaoMensal[key].label;
                            const items = comissaoMensal[key].items;

                            if (typeof criarModalMelhorado === 'function') {
                                criarModalMelhorado(`Comissões: ${label}`, 'monetization_on', '#f59e0b', items, { tipo: 'comissao_mes' });
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(comissaoCanvas, 'Sem dados de comissão');
        }
    }

    ajustarLarguraBarras();
}

function showNoDataMessage(canvas, message) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Poppins';
    ctx.fillStyle = getChartColors().muted;
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function ajustarLarguraBarras() {
    const barCharts = ['sistema', 'valorAno', 'modalidade', 'marca'];
    barCharts.forEach(key => {
        const chart = state.charts[key];
        if (chart && chart.config.type === 'bar') {
            const numBars = chart.data.labels.length;
            if (numBars <= 3) {
                chart.options.barPercentage = 0.3;
                chart.options.categoryPercentage = 0.5;
            } else {
                chart.options.barPercentage = 0.7;
                chart.options.categoryPercentage = 0.9;
            }
            chart.update();
        }
    });
}
