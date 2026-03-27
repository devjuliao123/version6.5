// ==================== ETL ====================

function parseObservacoes(observacoes) {
    const resultado = {
        raw: observacoes,
        extracao: [],
        historico: [],
        complexidade: 'MEDIA',
        dias: 0,
        registros: {},
        totalRegistros: 0,
        totalRegistrosExtracao: 0,
        totalRegistrosHistorico: 0,
        valido: false,
        temRegistrosReais: false,
        aguardandoCliente: null,
        emProcesso: null
    };

    if (!observacoes || observacoes.trim() === '') return resultado;

    try {
        const textoOriginal = observacoes.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

        // Função auxiliar para extrair o conteúdo de uma tag, lidando com ou sem colchetes e delimitadores como "|" ou início de outra tag
        const extrairConteudoTag = (tag, texto) => {
            // Regex que procura pela tag e captura tudo até o próximo delimitador ou tag conhecida
            const regex = new RegExp(`${tag}:?\\s*(.*?)(?=\\s*(?:\\||EXTRAÇÃO|HISTÓRICO|REGISTROS|AGUARDANDO CLIENTE|EM PROCESSO|DIAS|COMPLEXIDADE|$))`, 'i');
            const match = texto.match(regex);
            if (!match) return null;

            let conteudo = match[1].trim();

            // Remover colchetes se existirem
            if (conteudo.startsWith('[') && conteudo.endsWith(']')) {
                conteudo = conteudo.substring(1, conteudo.length - 1).trim();
            }

            // Remover pipe final se capturado indevidamente
            if (conteudo.endsWith('|')) {
                conteudo = conteudo.substring(0, conteudo.length - 1).trim();
            }

            return conteudo;
        };

        // 1. EXTRAÇÃO
        const extracaoTexto = extrairConteudoTag('EXTRAÇÃO', textoOriginal);
        if (extracaoTexto) {
            resultado.extracao = extracaoTexto.split(',').map(item => item.trim()).filter(item => item !== '');
        }

        // 2. HISTÓRICO
        const historicoTexto = extrairConteudoTag('HISTÓRICO', textoOriginal);
        if (historicoTexto) {
            resultado.historico = historicoTexto.split(',').map(item => item.trim()).filter(item => item !== '');
        }

        // 3. REGISTROS
        const registrosTexto = extrairConteudoTag('REGISTROS', textoOriginal);
        if (registrosTexto) {
            const pares = registrosTexto.split(',');
            pares.forEach(par => {
                const parts = par.split(':').map(s => s.trim());
                if (parts.length >= 2) {
                    const tipo = parts[0];
                    const valor = parts[1];
                    // Extrair apenas os dígitos (ex: "1.000 (XML)" -> "1000")
                    const apenasNumeros = valor.replace(/\D/g, '');
                    const numero = parseInt(apenasNumeros) || 0;

                    resultado.registros[tipo] = numero;
                    resultado.totalRegistros += numero;

                    if (numero > 0) {
                        resultado.temRegistrosReais = true;
                    }
                }
            });
        }

        // 4. AGUARDANDO CLIENTE
        resultado.aguardandoCliente = extrairConteudoTag('AGUARDANDO CLIENTE', textoOriginal);

        // 5. EM PROCESSO
        resultado.emProcesso = extrairConteudoTag('EM PROCESSO', textoOriginal);

        // 6. DIAS (para complexidade legado)
        const diasTexto = extrairConteudoTag('DIAS', textoOriginal);
        if (diasTexto) {
            resultado.dias = parseInt(diasTexto) || 0;
        }

        // 7. COMPLEXIDADE
        const complexidadeMatch = textoOriginal.match(/COMPLEXIDADE:?\s*\[(.*?)\]/i);
        if (complexidadeMatch) {
            let complexidade = complexidadeMatch[1].split(',')[0].trim().toUpperCase();
            complexidade = complexidade.replace('MÉDIA', 'MEDIA');
            resultado.complexidade = ['BAIXA', 'MEDIA', 'ALTA'].includes(complexidade) ? complexidade : 'MEDIA';
        } else {
            // Lógica automática de complexidade baseada em registros
            if (resultado.totalRegistros > 0) {
                if (resultado.totalRegistros > 500000) {
                    resultado.complexidade = 'ALTA';
                } else if (resultado.totalRegistros > 100000) {
                    resultado.complexidade = 'MEDIA';
                } else {
                    resultado.complexidade = 'BAIXA';
                }
            } else if (resultado.dias > 0) {
                resultado.complexidade = determinarComplexidadePorDias(resultado.dias);
            }
        }

        resultado.valido = resultado.temRegistrosReais || resultado.dias > 0;

    } catch (e) {
        console.warn('Erro ao parsear observações:', e);
    }

    return resultado;
}

function determinarComplexidadePorDias(dias) {
    if (dias > 15) return 'ALTA';
    if (dias > 5) return 'MEDIA';
    return 'BAIXA';
}

function temDadosETL(infoETL) {
    if (!infoETL) return false;
    return infoETL.extracao.length > 0 || infoETL.historico.length > 0 || infoETL.dias > 0;
}

function processarETL() {
    const base = state.filteredData;

    const etlData = {
        complexidade: { BAIXA: 0, MEDIA: 0, ALTA: 0 },
        extracaoTipos: {},
        historicoTipos: {},
        totalProjetos: 0
    };

    base.forEach(d => {
        if (!d.observacoes) return;

        const infoETL = parseObservacoes(d.observacoes);

        if (temDadosETL(infoETL)) {
            etlData.totalProjetos++;

            const comp = infoETL.complexidade || 'MEDIA';
            etlData.complexidade[comp] = (etlData.complexidade[comp] || 0) + 1;

            infoETL.extracao.forEach(tipo => {
                if (tipo && tipo.trim() !== '') {
                    etlData.extracaoTipos[tipo] = (etlData.extracaoTipos[tipo] || 0) + 1;
                }
            });

            infoETL.historico.forEach(tipo => {
                if (tipo && tipo.trim() !== '') {
                    etlData.historicoTipos[tipo] = (etlData.historicoTipos[tipo] || 0) + 1;
                }
            });
        }
    });

    return etlData;
}

function atualizarDashboardETL() {
    const etlData = processarETL();
    const colors = getChartColors();

    const temDados = etlData.totalProjetos > 0;

    const complexidadeEl = document.getElementById('etlComplexidadeChart');
    if (complexidadeEl) {
        if (state.charts.etlComplexidade) state.charts.etlComplexidade.destroy();

        if (temDados) {
            state.charts.etlComplexidade = new Chart(complexidadeEl, {
                type: 'doughnut',
                data: {
                    labels: ['Baixa', 'Média', 'Alta'],
                    datasets: [{
                        data: [
                            etlData.complexidade.BAIXA || 0,
                            etlData.complexidade.MEDIA || 0,
                            etlData.complexidade.ALTA || 0
                        ],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: colors.text, font: { size: 10 } } }
                    },
                    cutout: '60%',
                    onClick: (event, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const complexidades = ['BAIXA', 'MEDIA', 'ALTA'];
                            if (typeof mostrarFiliaisPorComplexidade === 'function') {
                                mostrarFiliaisPorComplexidade(complexidades[index]);
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(complexidadeEl, 'Nenhum projeto com ETL');
        }
    }

    const extracaoEl = document.getElementById('etlExtracaoChart');
    if (extracaoEl) {
        if (state.charts.etlExtracao) state.charts.etlExtracao.destroy();

        const labels = Object.keys(etlData.extracaoTipos);
        const labelsFiltradas = labels.filter(l => etlData.extracaoTipos[l] > 0);
        const dadosFiltrados = labelsFiltradas.map(l => etlData.extracaoTipos[l]);

        if (labelsFiltradas.length > 0) {
            state.charts.etlExtracao = new Chart(extracaoEl, {
                type: 'bar',
                data: {
                    labels: labelsFiltradas.map(l => formatarNomeGrafico(l)),
                    datasets: [{
                        data: dadosFiltrados,
                        backgroundColor: '#8b5cf6',
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (c) => ` ${c.raw} projeto(s)`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: colors.grid },
                            ticks: {
                                color: colors.muted,
                                font: { size: 9 },
                                stepSize: 1,
                                callback: (value) => {
                                    if (value >= 1000) {
                                        return (value / 1000).toFixed(1) + 'k';
                                    }
                                    return value;
                                }
                            }
                        },
                        y: {
                            grid: { display: false },
                            ticks: {
                                color: colors.muted,
                                font: { size: 9 }
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const tipoOriginal = labelsFiltradas[index];
                            if (typeof mostrarFiliaisPorTipoExtracao === 'function') {
                                mostrarFiliaisPorTipoExtracao(tipoOriginal);
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(extracaoEl, 'Nenhum tipo de extração');
        }
    }

    const historicoEl = document.getElementById('etlHistoricoChart');
    if (historicoEl) {
        if (state.charts.etlHistorico) state.charts.etlHistorico.destroy();

        const labels = Object.keys(etlData.historicoTipos);
        const labelsFiltradas = labels.filter(l => etlData.historicoTipos[l] > 0);
        const dadosFiltrados = labelsFiltradas.map(l => etlData.historicoTipos[l]);

        if (labelsFiltradas.length > 0) {
            state.charts.etlHistorico = new Chart(historicoEl, {
                type: 'bar',
                data: {
                    labels: labelsFiltradas.map(l => formatarNomeGrafico(l)),
                    datasets: [{
                        data: dadosFiltrados,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (c) => ` ${c.raw} projeto(s)`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: colors.grid },
                            ticks: {
                                color: colors.muted,
                                font: { size: 9 },
                                stepSize: 1,
                                callback: (value) => {
                                    if (value >= 1000) {
                                        return (value / 1000).toFixed(1) + 'k';
                                    }
                                    return value;
                                }
                            }
                        },
                        y: {
                            grid: { display: false },
                            ticks: {
                                color: colors.muted,
                                font: { size: 9 }
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const tipoOriginal = labelsFiltradas[index];
                            if (typeof mostrarFiliaisPorTipoHistorico === 'function') {
                                mostrarFiliaisPorTipoHistorico(tipoOriginal);
                            }
                        }
                    }
                }
            });
        } else {
            showNoDataMessage(historicoEl, 'Nenhum histórico importado');
        }
    }
}

// ==================== FUNÇÕES PARA MOSTRAR FILIAIS POR ETL ====================

function mostrarFiliaisPorComplexidade(complexidade) {
    const base = state.filteredData;

    const filiais = base.filter(item => {
        if (!item.observacoes) return false;
        const infoETL = parseObservacoes(item.observacoes);
        if (!temDadosETL(infoETL)) return false;
        return infoETL.complexidade === complexidade;
    }).map(item => {
        const info = parseObservacoes(item.itemRaw || item.observacoes);
        return {
            filial: item.filial,
            cliente: item.filial_descricao,
            complexidade: complexidade,
            totalRegistros: info.totalRegistros,
            dias: info.dias,
            extracao: info.extracao,
            historico: info.historico,
            itemRaw: item
        };
    });

    if (filiais.length === 0) {
        showNotification(`Nenhuma filial com complexidade ${complexidade.toLowerCase()} encontrada!`, 'info', 3000);
        return;
    }

    const ordenados = [...filiais].sort((a, b) => b.totalRegistros - a.totalRegistros);

    const titulo = `Filiais com Complexidade ${complexidade}`;
    const cores = {
        'ALTA': { cor: '#ef4444', bg: '#ef444415' },
        'MEDIA': { cor: '#f59e0b', bg: '#f59e0b15' },
        'BAIXA': { cor: '#10b981', bg: '#10b98115' }
    };
    const corAtual = cores[complexidade] || cores['MEDIA'];

    const modal = document.getElementById('observacoesModal');
    const modalBody = modal.querySelector('.modal-body');

    const html = `
        <div>
            <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 2px solid ${corAtual.cor};
            ">
                <span class="material-icons" style="color: ${corAtual.cor}; font-size: 24px;">donut_large</span>
                <h4 style="color: ${corAtual.cor}; margin: 0;">${titulo} (${filiais.length})</h4>
            </div>

            <div style="
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 20px;
            ">
                <div style="
                    background: ${corAtual.bg};
                    padding: 16px;
                    border-radius: 12px;
                    text-align: center;
                    border: 1px solid ${corAtual.cor}30;
                ">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${corAtual.cor};">${filiais.length}</div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase;">Total de Filiais</div>
                </div>
                <div style="
                    background: ${corAtual.bg};
                    padding: 16px;
                    border-radius: 12px;
                    text-align: center;
                    border: 1px solid ${corAtual.cor}30;
                ">
                    <div style="font-size: 1.5rem; font-weight: 700; color: ${corAtual.cor};">${formatNumber(filiais.reduce((sum, f) => sum + f.totalRegistros, 0))}</div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase;">Total de Registros</div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${ordenados.map((f, index) => `
                    <div style="
                        padding: 12px;
                        margin-bottom: 8px;
                        background: var(--surface);
                        border-radius: 10px;
                        border: 1px solid var(--border);
                        border-left: 4px solid ${corAtual.cor};
                        cursor: pointer;
                        transition: transform 0.2s;
                        width: 100%;
                        box-sizing: border-box;
                    "
                        onmouseover="this.style.transform='translateX(5px)'"
                        onmouseout="this.style.transform='translateX(0)'"
                        onclick="abrirModal('${(f.itemRaw.observacoes || '').replace(/'/g, "\\'")}', ${JSON.stringify(f.itemRaw).replace(/'/g, "\\'")})"
                    >
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <div style="flex: 2;">
                                <div style="font-weight: 600; margin-bottom: 2px;">${f.filial}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">${f.cliente}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; color: ${corAtual.cor};">${formatNumber(f.totalRegistros)}</div>
                                <div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase;">registros</div>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--border); padding-top: 6px; margin-top: 4px;">
                            ${f.extracao.length > 0 ? `
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span style="font-size: 0.65rem; font-weight: 700; color: #8b5cf6;">EXT:</span>
                                    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                                        ${f.extracao.map(tag => `<span style="font-size: 0.6rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; padding: 1px 4px; border-radius: 4px;">${tag}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${f.historico.length > 0 ? `
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span style="font-size: 0.65rem; font-weight: 700; color: #3b82f6;">HIST:</span>
                                    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                                        ${f.historico.map(tag => `<span style="font-size: 0.6rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 1px 4px; border-radius: 4px;">${tag}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${f.dias > 0 ? `<div style="font-size: 0.65rem; color: var(--text-secondary);">⏱️ Estimativa: ${f.dias} dias</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
                padding-top: 16px;
                border-top: 1px solid var(--border);
            ">
                <button onclick="document.getElementById('observacoesModal').style.display='none'"
                    class="modal-close-btn"
                >
                    <span class="material-icons" style="font-size: 18px;">close</span>
                    Fechar
                </button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

function mostrarFiliaisPorTipoExtracao(tipo) {
    const base = state.filteredData;

    const filiais = base.filter(item => {
        if (!item.observacoes) return false;
        const infoETL = parseObservacoes(item.observacoes);
        return infoETL.extracao.includes(tipo);
    }).map(item => {
        const info = parseObservacoes(item.observacoes);
        return {
            filial: item.filial,
            cliente: item.filial_descricao,
            tipo: tipo,
            totalRegistros: info.totalRegistros || 0,
            extracao: info.extracao,
            historico: info.historico,
            itemRaw: item
        };
    });

    if (filiais.length === 0) {
        showNotification(`Nenhuma filial com extração do tipo ${formatarTextoETL(tipo)} encontrada!`, 'info', 3000);
        return;
    }

    const ordenados = [...filiais].sort((a, b) => b.totalRegistros - a.totalRegistros);

    const modal = document.getElementById('observacoesModal');
    const modalBody = modal.querySelector('.modal-body');

    const html = `
        <div>
            <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 2px solid #8b5cf6;
            ">
                <span class="material-icons" style="color: #8b5cf6; font-size: 24px;">download</span>
                <h4 style="color: #8b5cf6; margin: 0;">${formatarTextoETL(tipo)} (${filiais.length})</h4>
            </div>

            <div style="
                background: #8b5cf615;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 20px;
                text-align: center;
                border: 1px solid #8b5cf630;
            ">
                <div style="font-size: 1.5rem; font-weight: 700; color: #8b5cf6;">${filiais.length}</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase;">Total de Filiais</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${ordenados.map((f, index) => `
                    <div style="
                        padding: 12px;
                        margin-bottom: 8px;
                        background: var(--surface);
                        border-radius: 10px;
                        border: 1px solid var(--border);
                        border-left: 4px solid #8b5cf6;
                        cursor: pointer;
                        transition: transform 0.2s;
                        width: 100%;
                        box-sizing: border-box;
                    "
                        onmouseover="this.style.transform='translateX(5px)'"
                        onmouseout="this.style.transform='translateX(0)'"
                        onclick="abrirModal('${(f.itemRaw.observacoes || '').replace(/'/g, "\\'")}', ${JSON.stringify(f.itemRaw).replace(/'/g, "\\'")})"
                    >
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <div style="flex: 2;">
                                <div style="font-weight: 600; margin-bottom: 2px;">${f.filial}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">${f.cliente}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; color: #8b5cf6;">${formatNumber(f.totalRegistros)}</div>
                                <div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase;">registros</div>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--border); padding-top: 6px; margin-top: 4px;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 0.65rem; font-weight: 700; color: #8b5cf6;">EXT:</span>
                                <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                                    ${f.extracao.map(tag => `<span style="font-size: 0.6rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; padding: 1px 4px; border-radius: 4px;">${tag}</span>`).join('')}
                                </div>
                            </div>
                            ${f.historico.length > 0 ? `
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span style="font-size: 0.65rem; font-weight: 700; color: #3b82f6;">HIST:</span>
                                    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                                        ${f.historico.map(tag => `<span style="font-size: 0.6rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 1px 4px; border-radius: 4px;">${tag}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
                padding-top: 16px;
                border-top: 1px solid var(--border);
            ">
                <button onclick="document.getElementById('observacoesModal').style.display='none'"
                    class="modal-close-btn"
                >
                    <span class="material-icons" style="font-size: 18px;">close</span>
                    Fechar
                </button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

function mostrarFiliaisPorTipoHistorico(tipo) {
    const base = state.filteredData;

    const filiais = base.filter(item => {
        if (!item.observacoes) return false;
        const infoETL = parseObservacoes(item.observacoes);
        return infoETL.historico.includes(tipo);
    }).map(item => {
        const info = parseObservacoes(item.observacoes);
        return {
            filial: item.filial,
            cliente: item.filial_descricao,
            tipo: tipo,
            totalRegistros: info.totalRegistros || 0,
            extracao: info.extracao,
            historico: info.historico,
            itemRaw: item
        };
    });

    if (filiais.length === 0) {
        showNotification(`Nenhuma filial com histórico do tipo ${formatarTextoETL(tipo)} encontrada!`, 'info', 3000);
        return;
    }

    const ordenados = [...filiais].sort((a, b) => b.totalRegistros - a.totalRegistros);

    const modal = document.getElementById('observacoesModal');
    const modalBody = modal.querySelector('.modal-body');

    const html = `
        <div>
            <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 2px solid #3b82f6;
            ">
                <span class="material-icons" style="color: #3b82f6; font-size: 24px;">history</span>
                <h4 style="color: #3b82f6; margin: 0;">${formatarTextoETL(tipo)} (${filiais.length})</h4>
            </div>

            <div style="
                background: #3b82f615;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 20px;
                text-align: center;
                border: 1px solid #3b82f630;
            ">
                <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">${filiais.length}</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase;">Total de Filiais</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${ordenados.map((f, index) => `
                    <div style="
                        padding: 12px;
                        margin-bottom: 8px;
                        background: var(--surface);
                        border-radius: 10px;
                        border: 1px solid var(--border);
                        border-left: 4px solid #3b82f6;
                        cursor: pointer;
                        transition: transform 0.2s;
                        width: 100%;
                        box-sizing: border-box;
                    "
                        onmouseover="this.style.transform='translateX(5px)'"
                        onmouseout="this.style.transform='translateX(0)'"
                        onclick="abrirModal('${(f.itemRaw.observacoes || '').replace(/'/g, "\\'")}', ${JSON.stringify(f.itemRaw).replace(/'/g, "\\'")})"
                    >
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <div style="flex: 2;">
                                <div style="font-weight: 600; margin-bottom: 2px;">${f.filial}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">${f.cliente}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; color: #3b82f6;">${formatNumber(f.totalRegistros)}</div>
                                <div style="font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase;">registros</div>
                            </div>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--border); padding-top: 6px; margin-top: 4px;">
                            ${f.extracao.length > 0 ? `
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span style="font-size: 0.65rem; font-weight: 700; color: #8b5cf6;">EXT:</span>
                                    <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                                        ${f.extracao.map(tag => `<span style="font-size: 0.6rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; padding: 1px 4px; border-radius: 4px;">${tag}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 0.65rem; font-weight: 700; color: #3b82f6;">HIST:</span>
                                <div style="display: flex; flex-wrap: wrap; gap: 3px;">
                                    ${f.historico.map(tag => `<span style="font-size: 0.6rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 1px 4px; border-radius: 4px;">${tag}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
                padding-top: 16px;
                border-top: 1px solid var(--border);
            ">
                <button onclick="document.getElementById('observacoesModal').style.display='none'"
                    class="modal-close-btn"
                >
                    <span class="material-icons" style="font-size: 18px;">close</span>
                    Fechar
                </button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'block';
}