// ==================== MODAIS ====================

function criarModal() {
    if (!document.getElementById('observacoesModal')) {
        const modalHTML = `
            <div id="observacoesModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><span class="material-icons">info</span> Detalhes do Registro</h3>
                        <span class="close-modal material-icons" aria-label="Fechar modal" title="Fechar (ESC)">close</span>
                    </div>
                    <div class="modal-body"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const modal = document.getElementById('observacoesModal');
    const closeBtn = modal?.querySelector('.close-modal');

    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}


function abrirModal(observacoes, dadosRegistro) {
    const modal = document.getElementById('observacoesModal');
    const modalBody = modal.querySelector('.modal-body');
    const isImplRole = (typeof isAnonymized === 'function') ? isAnonymized() : false;

    const infoETL = typeof parseObservacoes === 'function' ? parseObservacoes(observacoes) : { valido: false };
    const temETLReal = typeof temDadosETL === 'function' ? temDadosETL(infoETL) : false;

    let textoAdicional = observacoes || '';

    // Gerar visualização de tags ETL se existirem
    let etlTagsHTML = '';

    // Novas Tags Dinâmicas
    let statusTagsHTML = '';
    if (infoETL.aguardandoCliente) {
        statusTagsHTML += `
            <div style="background: rgba(239, 68, 68, 0.05); border: 1.5px solid var(--danger); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; gap: 12px; align-items: flex-start;">
                <span class="material-icons" style="color: var(--danger); font-size: 24px;">priority_high</span>
                <div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--danger); text-transform: uppercase; margin-bottom: 4px;">Aguardando Cliente</div>
                    <div style="font-size: 0.9rem; color: var(--text); line-height: 1.5;">${infoETL.aguardandoCliente}</div>
                </div>
            </div>
        `;
    }

    // Cálculo de Cumprimento de Prazo
    if (dadosRegistro.dataImplantacaoObj && dadosRegistro.dataPrevisaoObj) {
        const di = new Date(dadosRegistro.dataImplantacaoObj);
        const dp = new Date(dadosRegistro.dataPrevisaoObj);

        // Resetar horas para comparação justa
        di.setHours(0,0,0,0);
        dp.setHours(0,0,0,0);

        const diffTime = dp - di;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            statusTagsHTML += `
                <div style="background: rgba(16, 185, 129, 0.05); border: 1.5px solid var(--success); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; gap: 12px; align-items: flex-start;">
                    <span class="material-icons" style="color: var(--success); font-size: 24px;">task_alt</span>
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--success); text-transform: uppercase; margin-bottom: 4px;">Concluído Antes do Prazo</div>
                        <div style="font-size: 0.9rem; color: var(--text); font-weight: 600;">Implantado ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} antes do prazo previsto.</div>
                    </div>
                </div>
            `;
        } else if (diffDays < 0) {
            const atraso = Math.abs(diffDays);
            statusTagsHTML += `
                <div style="background: rgba(239, 68, 68, 0.05); border: 1.5px solid var(--danger); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; gap: 12px; align-items: flex-start;">
                    <span class="material-icons" style="color: var(--danger); font-size: 24px;">report_problem</span>
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--danger); text-transform: uppercase; margin-bottom: 4px;">Concluído Fora do Prazo</div>
                        <div style="font-size: 1rem; color: var(--text); font-weight: 600;">Atraso de ${atraso} ${atraso === 1 ? 'dia' : 'dias'} com relação à previsão.</div>
                    </div>
                </div>
            `;
        } else {
            statusTagsHTML += `
                <div style="background: rgba(14, 165, 233, 0.05); border: 1.5px solid var(--info); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; gap: 12px; align-items: flex-start;">
                    <span class="material-icons" style="color: var(--info); font-size: 24px;">event_available</span>
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--info); text-transform: uppercase; margin-bottom: 4px;">Concluído no Prazo</div>
                        <div style="font-size: 0.9rem; color: var(--text); font-weight: 600;">Implantado exatamente na data prevista.</div>
                    </div>
                </div>
            `;
        }
    }

    if (infoETL.emProcesso) {
        statusTagsHTML += `
            <div style="background: rgba(14, 165, 233, 0.05); border: 1.5px solid var(--info); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; gap: 12px; align-items: flex-start;">
                <span class="material-icons" style="color: var(--info); font-size: 24px;">sync</span>
                <div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: var(--info); text-transform: uppercase; margin-bottom: 4px;">Em Processo</div>
                    <div style="font-size: 0.9rem; color: var(--text); line-height: 1.5;">${infoETL.emProcesso}</div>
                </div>
            </div>
        `;
    }

    if (temETLReal) {
        etlTagsHTML = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 0.8rem; font-weight: 700; color: #8b5cf6; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <span class="material-icons" style="font-size: 18px;">auto_awesome</span> Detalhes do Processo ETL
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${infoETL.extracao.length > 0 ? `
                        <div style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px; padding: 12px;">
                            <div style="font-size: 0.7rem; font-weight: 700; color: #8b5cf6; margin-bottom: 8px;">EXTRAÇÃO</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${infoETL.extracao.map(tag => renderizarBadgeSistema(tag)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${infoETL.historico.length > 0 ? `
                        <div style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 12px;">
                            <div style="font-size: 0.7rem; font-weight: 700; color: #3b82f6; margin-bottom: 8px;">HISTÓRICO</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${infoETL.historico.map(tag => renderizarBadgeSistema(tag)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${Object.keys(infoETL.registros).length > 0 ? `
                        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px;">
                            <div style="font-size: 0.7rem; font-weight: 700; color: #10b981; margin-bottom: 8px;">CONTAGEM DE REGISTROS</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${Object.entries(infoETL.registros).map(([tipo, valor]) => `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: none; font-size: 0.65rem;">${formatarTextoETL(tipo)}: ${formatNumber(valor)}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Limpar o texto adicional removendo TODAS as tags conhecidas, mas manter EM PROCESSO se solicitado
    const temEmProcesso = textoAdicional.toUpperCase().includes('EM PROCESSO');

    textoAdicional = textoAdicional
        .replace(/EXTRAÇÃO:?\s*(?:\[.*?\]|.*?)(?=\s*(?:\||HISTÓRICO|REGISTROS|AGUARDANDO CLIENTE|EM PROCESSO|DIAS|COMPLEXIDADE|$))/i, '')
        .replace(/HISTÓRICO:?\s*(?:\[.*?\]|.*?)(?=\s*(?:\||EXTRAÇÃO|REGISTROS|AGUARDANDO CLIENTE|EM PROCESSO|DIAS|COMPLEXIDADE|$))/i, '')
        .replace(/REGISTROS:?\s*(?:\[.*?\]|.*?)(?=\s*(?:\||EXTRAÇÃO|HISTÓRICO|AGUARDANDO CLIENTE|EM PROCESSO|DIAS|COMPLEXIDADE|$))/i, '')
        .replace(/AGUARDANDO CLIENTE:?\s*(.*?)(?=\s*(?:\||EXTRAÇÃO|HISTÓRICO|REGISTROS|EM PROCESSO|$))/i, '')
        .replace(/EM PROCESSO:?\s*(.*?)(?=\s*(?:\||EXTRAÇÃO|HISTÓRICO|REGISTROS|AGUARDANDO CLIENTE|$))/i, '')
        .replace(/DIAS:?\s*\[.*?\]/i, '')
        .replace(/COMPLEXIDADE:?\s*\[.*?\]/i, '')
        .replace(/\|/g, '')
        .trim();

    if (temEmProcesso && !textoAdicional.toUpperCase().includes('EM PROCESSO')) {
        textoAdicional = `EM PROCESSO. ${textoAdicional}`.trim();
    }

    const infoHTML = `
        <div>
            <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; gap: 8px;">
                    <span style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 40px; font-size: 0.7rem; font-weight: 600;">Filial ${dadosRegistro.filial_codigo || 'N/I'}</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: var(--bg); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Filial</div><div style="font-weight: 600;">${dadosRegistro.filial || 'N/I'}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Descrição</div><div style="font-weight: 600;">${dadosRegistro.filial_descricao || 'N/I'}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Valor Total</div><div style="font-weight: 600; color: var(--success);">${formatCurrency(dadosRegistro.valor)}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Valor Comissão</div><div style="font-weight: 600; color: var(--warning);">${formatCurrency(dadosRegistro.valor_comissao)}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Sistema</div><div style="font-weight: 600; display: flex; flex-wrap: wrap; gap: 4px;">${(dadosRegistro.sistema || '').split('/').map(s => renderizarBadgeSistema(s.trim())).join('') || 'N/I'}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Sistema Anterior</div><div style="font-weight: 600;">${dadosRegistro.sistemaAnterior || 'N/I'}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Sistema Extração</div><div style="font-weight: 600;">${dadosRegistro.sistemaExtracao || 'N/I'}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Data Venda</div><div style="font-weight: 600;">${dadosRegistro.data_venda || 'N/I'}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Data Previsão</div><div style="font-weight: 600; color: var(--primary);">${dadosRegistro.data_previsao || dadosRegistro.dataPrevisao || 'N/I'}</div></div>
                <div><div style="color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Data Implantação</div><div style="font-weight: 600; color: var(--success);">${dadosRegistro.dataImplantacao || 'N/I'}</div></div>
            </div>

            ${statusTagsHTML}
            ${etlTagsHTML}
            ${textoAdicional ? `<div style="margin-top: 20px; padding: 16px; background: var(--bg); border-left: 4px solid var(--primary); border-radius: 8px;"><div style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px;">Observações Complementares</div><div>${textoAdicional}</div></div>` : ''}
        </div>
    `;

    modalBody.innerHTML = infoHTML;
    modal.style.display = 'block';
}

function criarModalMelhorado(titulo, icone, cor, dados, config) {
    const modal = document.getElementById('observacoesModal');
    const modalBody = modal.querySelector('.modal-body');

    // Para o modal de valor, usar busca estrita em certas tags e incluir tags virtuais (ERP/AGREGADO)
    const strictTags = config.tipo === 'valor' ? ['CONTÁBIL', 'FISCAL'] : [];
    const includeVirtual = config.tipo === 'valor';
    let sistemasAgrupados = (typeof agruparSistemasNormalizados === 'function') ? agruparSistemasNormalizados(dados, strictTags, includeVirtual) : {};

    // Calcular total inicial respeitando a lógica de backlog
    let totalGeral = 0;
    if (config.usarAgregadoParaBacklog) {
        totalGeral = dados.reduce((sum, item) => sum + getValorBacklog(item), 0);
    } else {
        totalGeral = dados.reduce((sum, item) => sum + (item.total_geral || 0), 0);
    }

    // Filtrar sistemas agrupados se houver whitelist no config
    if (config.allowedTags && Array.isArray(config.allowedTags)) {
        const filtrados = {};
        config.allowedTags.forEach(tag => {
            if (sistemasAgrupados[tag]) {
                filtrados[tag] = sistemasAgrupados[tag];
            }
        });
        sistemasAgrupados = filtrados;
    }

    // Obter sistemas únicos para as tags de filtro
    const sistemasUnicos = Object.keys(sistemasAgrupados).sort();

    // Barra de progresso para previsões ou Marcas Agrupadas
    let forecastProgressHTML = '';
    if (config.tipo === 'outras_marcas' && dados.length > 0) {
        const porMarca = {};
        dados.forEach(d => {
            if (d.marca) {
                if (!porMarca[d.marca]) porMarca[d.marca] = 0;
                porMarca[d.marca]++;
            }
        });

        const marcasOrdenadas = Object.entries(porMarca).sort((a, b) => b[1] - a[1]);
        const maxVal = Math.max(...Object.values(porMarca));

        forecastProgressHTML = `
            <div style="margin-bottom: 20px; background: var(--bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                <div style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <span class="material-icons" style="font-size: 18px;">branding_watermark</span> Marcas em OUTRAS MARCAS (Clique p/ filtrar)
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${marcasOrdenadas.map(([marca, count]) => {
                        const labelFilial = count === 1 ? 'filial' : 'filiais';
                        return `
                        <div class="brand-filter-bar" data-brand="${marca}" style="display: flex; flex-direction: column; gap: 4px; cursor: pointer; padding: 4px; border-radius: 6px; transition: background 0.2s;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 600; color: var(--text-secondary);">
                                <span>${marca}</span>
                                <span style="color: var(--text);">${count} ${labelFilial}</span>
                            </div>
                            <div style="height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;">
                                <div style="height: 100%; width: ${(count / maxVal * 100).toFixed(0)}%; background: var(--primary); border-radius: 3px;"></div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;
    } else if (config.tipo === 'previsao' && dados.length > 0) {
        const porMes = {};
        dados.forEach(d => {
            if (d.dataPrevisaoObj) {
                const label = d.dataPrevisaoObj.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
                if (!porMes[label]) {
                    porMes[label] = {
                        valor: 0,
                        mesRef: new Date(d.dataPrevisaoObj.getFullYear(), d.dataPrevisaoObj.getMonth(), 1)
                    };
                }
                porMes[label].valor += (d.total_geral || 0);
            }
        });

        const mesesOrdenados = Object.entries(porMes).sort((a, b) => a[1].mesRef - b[1].mesRef);
        const maxVal = Math.max(...Object.values(porMes).map(m => m.valor));

        forecastProgressHTML = `
            <div style="margin-bottom: 20px; background: var(--bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border);">
                <div style="font-size: 0.75rem; font-weight: 700; color: var(--success); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <span class="material-icons" style="font-size: 18px;">analytics</span> Projeção Financeira por Mês (Clique p/ filtrar)
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${mesesOrdenados.map(([mes, info]) => {
                        const monthKey = `${info.mesRef.getFullYear()}-${info.mesRef.getMonth()}`;
                        return `
                        <div class="forecast-bar" data-month="${monthKey}" style="display: flex; flex-direction: column; gap: 4px; cursor: pointer; padding: 4px; border-radius: 6px; transition: background 0.2s;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: 600; color: var(--text-secondary);">
                                <span>${mes.toUpperCase()}</span>
                                <span style="color: var(--text);">${formatCurrency(info.valor)}</span>
                            </div>
                            <div style="height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;">
                                <div style="height: 100%; width: ${(info.valor / maxVal * 100).toFixed(0)}%; background: var(--success); border-radius: 3px;"></div>
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;
    }

    const html = `
        <div class="modal-melhorado">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid ${cor};">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="material-icons" style="color: ${cor}; font-size: 24px;">${icone}</span>
                    <h3 style="color: ${cor}; margin: 0; font-size: 1.2rem;">${titulo}</h3>
                </div>
                <div id="modalSummaryStats" style="background: var(--bg); padding: 0.4rem 0.8rem; border-radius: 40px; font-size: 0.8rem; font-weight: 600; border: 1px solid var(--border);">
                    <span id="modalFilialCount">${dados.length}</span> ${dados.length === 1 ? 'Filial' : 'Filiais'} | <span id="modalTotalValue" style="color: ${cor};">${formatCurrency(totalGeral)}</span>
                </div>
            </div>

            ${forecastProgressHTML}

            <!-- Tags de Filtro -->
            <div class="modal-filter-tags" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1.5rem; padding: 10px; background: var(--bg); border-radius: 12px; border: 1px solid var(--border);">
                <button class="modal-tag active" data-filter="TODOS" style="padding: 6px 14px; border-radius: 20px; border: 1.5px solid ${cor}; background: ${cor}; color: white; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                    TODOS (${dados.length})
                </button>
                ${(config.customFilters || []).map(cf => {
                    const count = dados.filter(d => {
                        if (cf.id === 'ANTECIPADO') return d.dataImplantacaoObj < d.dataPrevisaoObj;
                        if (cf.id === 'EXATO') return d.dataImplantacaoObj?.getTime() === d.dataPrevisaoObj?.getTime();
                        return true;
                    }).length;
                    return `
                        <button class="modal-tag custom-tag" data-filter="${cf.id}" data-custom-color="${cf.color}" style="padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--border); background: var(--surface); color: var(--text-secondary); font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                            ${cf.label} (${count})
                        </button>
                    `;
                }).join('')}
                ${sistemasUnicos.map(sistema => {
                    const isVirtual = sistema === 'ERP' || sistema === 'AGREGADO';
                    const weight = isVirtual ? '700' : '600';
                    const borderColor = isVirtual ? `${cor}40` : 'var(--border)';

                    return `
                        <button class="modal-tag" data-filter="${sistema}" style="padding: 6px 14px; border-radius: 20px; border: 1.5px solid ${borderColor}; background: var(--surface); color: var(--text-secondary); font-size: 0.75rem; font-weight: ${weight}; cursor: pointer; transition: all 0.2s;">
                            ${sistema} (${sistemasAgrupados[sistema].quantidade})
                        </button>
                    `;
                }).join('')}
            </div>

            <div id="listaFiliaisContainer" style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${renderizarListaFiliaisModal(dados, cor, config, null)}
            </div>

            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                <button onclick="document.getElementById('observacoesModal').style.display='none'" class="action-btn">Fechar</button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'block';

    // Adicionar eventos para as tags
    const tags = modalBody.querySelectorAll('.modal-tag');
    const forecastBars = modalBody.querySelectorAll('.forecast-bar');
    const brandBars = modalBody.querySelectorAll('.brand-filter-bar');

    const resetForecastBars = () => {
        forecastBars.forEach(b => {
            b.style.background = 'transparent';
            b.style.boxShadow = 'none';
        });
        brandBars.forEach(b => {
            b.style.background = 'transparent';
            b.style.boxShadow = 'none';
        });
    };

    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            const filter = tag.getAttribute('data-filter');
            resetForecastBars();

            // Atualizar UI das tags
            tags.forEach(t => {
                t.classList.remove('active');
                t.style.background = 'var(--surface)';
                t.style.color = 'var(--text-secondary)';
                t.style.borderColor = 'var(--border)';
            });
            tag.classList.add('active');
            tag.style.color = 'white';

            // Filtrar dados
            let dadosFiltrados = dados;
            let activeColor = cor;

            if (filter === 'ANTECIPADO') {
                dadosFiltrados = dados.filter(d => d.dataImplantacaoObj < d.dataPrevisaoObj);
                activeColor = tag.getAttribute('data-custom-color') || cor;
            } else if (filter === 'EXATO') {
                dadosFiltrados = dados.filter(d => d.dataImplantacaoObj?.getTime() === d.dataPrevisaoObj?.getTime());
                activeColor = tag.getAttribute('data-custom-color') || cor;
            } else if (filter !== 'TODOS') {
                dadosFiltrados = sistemasAgrupados[filter] ? sistemasAgrupados[filter].itens : [];
            }

            tag.style.background = activeColor;
            tag.style.borderColor = activeColor;

            // Atualizar lista e contadores
            const container = document.getElementById('listaFiliaisContainer');
            const systemFilter = filter === 'TODOS' ? null : filter;
            container.innerHTML = renderizarListaFiliaisModal(dadosFiltrados, cor, config, systemFilter);

            const filialCountEl = document.getElementById('modalFilialCount');
            const totalValueEl = document.getElementById('modalTotalValue');

            // Recalcular total usando lógica de backlog se necessário
            let totalFiltrado = 0;
            if (config.usarAgregadoParaBacklog) {
                totalFiltrado = dadosFiltrados.reduce((sum, item) => sum + getValorBacklog(item, systemFilter), 0);
            } else if (config.tipo === 'valor') {
                // Lógica de valor para the modal principal
                if (filter === 'ERP') {
                    totalFiltrado = dadosFiltrados.reduce((sum, item) => sum + (item.total_erp || 0), 0);
                } else if (filter === 'AGREGADO') {
                    totalFiltrado = dadosFiltrados.reduce((sum, item) => sum + (item.total_agregado || 0), 0);
                } else {
                    totalFiltrado = dadosFiltrados.reduce((sum, item) => sum + (item.total_geral || 0), 0);
                }
            } else {
                totalFiltrado = dadosFiltrados.reduce((sum, item) => sum + (item.total_geral || 0), 0);
            }

            if (filialCountEl) filialCountEl.textContent = dadosFiltrados.length;
            if (totalValueEl) totalValueEl.innerHTML = formatCurrency(totalFiltrado);
        });
    });

    brandBars.forEach(bar => {
        bar.addEventListener('click', () => {
            const brand = bar.getAttribute('data-brand');
            resetForecastBars();
            bar.style.background = 'var(--surface)';
            bar.style.boxShadow = 'inset 0 0 0 1px var(--primary)';

            tags.forEach(t => {
                const isTodos = t.getAttribute('data-filter') === 'TODOS';
                t.classList.toggle('active', isTodos);
                t.style.background = isTodos ? cor : 'var(--surface)';
                t.style.color = isTodos ? 'white' : 'var(--text-secondary)';
                t.style.borderColor = isTodos ? cor : 'var(--border)';
            });

            const dadosFiltrados = dados.filter(d => d.marca === brand);
            const container = document.getElementById('listaFiliaisContainer');
            container.innerHTML = renderizarListaFiliaisModal(dadosFiltrados, cor, config, null);

            const filialCountEl = document.getElementById('modalFilialCount');
            const totalValueEl = document.getElementById('modalTotalValue');
            const totalFiltrado = dadosFiltrados.reduce((sum, item) => sum + (item.total_geral || 0), 0);

            if (filialCountEl) filialCountEl.textContent = dadosFiltrados.length;
            if (totalValueEl) totalValueEl.innerHTML = formatCurrency(totalFiltrado);
        });
    });

    forecastBars.forEach(bar => {
        bar.addEventListener('click', () => {
            const monthKey = bar.getAttribute('data-month'); // YYYY-M

            resetForecastBars();
            bar.style.background = 'var(--surface)';
            bar.style.boxShadow = 'inset 0 0 0 1px var(--success)';

            // Reset tags UI para 'TODOS' (pois o filtro de mês é soberano ou adicional)
            tags.forEach(t => {
                const isTodos = t.getAttribute('data-filter') === 'TODOS';
                t.classList.toggle('active', isTodos);
                t.style.background = isTodos ? cor : 'var(--surface)';
                t.style.color = isTodos ? 'white' : 'var(--text-secondary)';
                t.style.borderColor = isTodos ? cor : 'var(--border)';
            });

            // Filtrar dados por mês
            const [ano, mes] = monthKey.split('-').map(Number);
            const dadosFiltrados = dados.filter(d => {
                if (!d.dataPrevisaoObj) return false;
                return d.dataPrevisaoObj.getFullYear() === ano && d.dataPrevisaoObj.getMonth() === mes;
            });

            // Atualizar lista
            const container = document.getElementById('listaFiliaisContainer');
            container.innerHTML = renderizarListaFiliaisModal(dadosFiltrados, cor, config, null);

            // Atualizar contadores
            const filialCountEl = document.getElementById('modalFilialCount');
            const totalValueEl = document.getElementById('modalTotalValue');
            const totalFiltrado = dadosFiltrados.reduce((sum, item) => sum + (item.total_geral || 0), 0);

            if (filialCountEl) filialCountEl.textContent = dadosFiltrados.length;
            if (totalValueEl) totalValueEl.innerHTML = formatCurrency(totalFiltrado);
        });
    });
}

function renderizarListaFiliaisModal(dados, cor, config = {}, systemFilter = null) {
    if (dados.length === 0) {
        return `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Nenhuma filial encontrada para este filtro.</div>`;
    }

    return dados.map(item => {
        let extraInfo = '';
        if (item.pendente && item.dataVendaObj && !item.dataImplantacaoObj) {
            const dias = calcularDiasEntreDatas(item.dataVendaObj);
            extraInfo = `
                <div style="font-size: 0.7rem; color: var(--danger); font-weight: 600; margin-top: 4px;">⚠️ ${dias} dias desde a venda</div>
                ${item.observacoes ? `<div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; font-style: italic;" title="${item.observacoes}">${item.observacoes}</div>` : ''}
            `;
        }

        // Lógica de valor para o modal
        let valorExibicao = item.total_geral;
        if (config.usarAgregadoParaBacklog) {
            valorExibicao = getValorBacklog(item, systemFilter);
        } else if (config.tipo === 'valor') {
            if (systemFilter === 'ERP') valorExibicao = item.total_erp || 0;
            else if (systemFilter === 'AGREGADO') valorExibicao = item.total_agregado || 0;
        }

        const infoPrevisao = config.tipo === 'previsao' ? `
            <div style="font-size: 0.75rem; color: var(--success); font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                <span class="material-icons" style="font-size: 14px;">event</span> Previsão: ${item.data_previsao || item.dataPrevisao || 'N/I'}
            </div>
        ` : '';

        const isAtraso = config.tipo === 'foradoprazo' || (item.dataImplantacaoObj && item.dataPrevisaoObj && item.dataImplantacaoObj > item.dataPrevisaoObj);
        const obsAtraso = (isAtraso && item.observacoes) ? `
            <div style="margin-top: 8px; padding: 10px; background: rgba(239, 68, 68, 0.05); border-left: 3px solid var(--danger); border-radius: 6px; font-size: 0.75rem; color: var(--text);">
                <b style="color: var(--danger); text-transform: uppercase; font-size: 0.65rem; display: block; margin-bottom: 2px;">Observações (Status):</b>
                ${item.observacoes}
            </div>
        ` : '';

        let complianceHTML = '';
        if (item.dataImplantacaoObj && item.dataPrevisaoObj) {
            const di = new Date(item.dataImplantacaoObj);
            const dp = new Date(item.dataPrevisaoObj);
            di.setHours(0,0,0,0); dp.setHours(0,0,0,0);
            const diff = Math.ceil((dp - di) / (1000 * 60 * 60 * 24));

            if (diff > 0) {
                complianceHTML = `<div style="font-size: 0.75rem; color: var(--success); font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px;"><span class="material-icons" style="font-size: 14px;">task_alt</span> Concluído ${diff}d antes do prazo</div>`;
            } else if (diff < 0) {
                complianceHTML = `<div style="font-size: 0.75rem; color: var(--danger); font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px;"><span class="material-icons" style="font-size: 14px;">report_problem</span> Concluído ${Math.abs(diff)}d após o prazo</div>`;
            } else {
                complianceHTML = `<div style="font-size: 0.75rem; color: var(--info); font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px;"><span class="material-icons" style="font-size: 14px;">event_available</span> Concluído no prazo</div>`;
            }
        }

        const infoDatas = `
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px; display: flex; flex-wrap: wrap; gap: 16px; border-top: 1px solid var(--border); padding-top: 8px;">
                <span><b style="color: var(--text);">Venda:</b> ${item.data_venda || 'N/I'}</span>
                <span><b style="color: var(--text);">Implantação:</b> ${item.data_implantacao || item.dataImplantacao || 'N/I'}</span>
                <span><b style="color: var(--text);">Previsão:</b> ${item.data_previsao || item.dataPrevisao || 'N/I'}</span>
            </div>
        `;

        return `
            <div class="detalhe-item" style="background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; padding: 1.2rem; transition: all 0.2s; cursor: pointer; box-shadow: var(--shadow-sm);"
                onmouseover="this.style.borderColor='${cor}'; this.style.transform='translateX(5px)'; this.style.boxShadow='var(--shadow)';"
                onmouseout="this.style.borderColor='var(--border)'; this.style.transform='translateX(0)'; this.style.boxShadow='var(--shadow-sm)';"
                onclick="abrirModal('${(item.observacoes || '').replace(/'/g, "\\'")}', ${JSON.stringify(item).replace(/'/g, "\\'")})">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="font-weight: 700; font-size: 1rem; color: var(--text);">${item.filial || 'N/I'}</div>
                    <div style="font-weight: 800; color: ${cor}; font-size: 1.1rem;">${formatCurrency(valorExibicao)}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">${item.organizacao_descricao || 'N/I'}</div>
                        ${extraInfo}
                        ${infoPrevisao}
                        ${complianceHTML}
                        ${obsAtraso}
                        ${infoDatas}
                    </div>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end;">
                        ${(item.sistema || '').split('/').map(s => s.trim()).filter(s => s).map(s => renderizarBadgeSistema(s)).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function mostrarDetalhesValorTotal() { criarModalMelhorado('Detalhamento de Valores', 'payments', 'var(--primary)', state.filteredData, { tipo: 'valor' }); }

function mostrarDetalhesComissao() {
    const modal = document.getElementById('observacoesModal');
    const modalBody = modal.querySelector('.modal-body');
    const isImplRole = (typeof isAnonymized === 'function') ? isAnonymized() : false;
    const data = [...(state.filteredData || [])].sort((a, b) => {
        const da = a.dataImplantacaoObj || new Date(0);
        const db = b.dataImplantacaoObj || new Date(0);
        return db - da; // Novo para velho
    });

    const baseTotal = data.reduce((sum, item) => sum + (item.valor_comissao || 0), 0);
    const comissaoTotal = baseTotal * 0.03;
    const porAnalista = comissaoTotal / 3;

    const html = `
        <div class="modal-melhorado">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--warning);">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="material-icons" style="color: var(--warning); font-size: 24px;">monetization_on</span>
                    <h3 style="color: var(--warning); margin: 0; font-size: 1.2rem;">Detalhamento de Comissão (3%)</h3>
                </div>
                <div style="background: var(--bg); padding: 0.4rem 0.8rem; border-radius: 40px; font-size: 0.8rem; font-weight: 600; border: 1px solid var(--border);">
                    Filtro Atual: ${data.length} ${data.length === 1 ? 'Filial' : 'Filiais'}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: var(--surface); border: 1.5px solid var(--border); padding: 16px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Base Comissão</div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: var(--text);">${formatCurrency(baseTotal, false)}</div>
                </div>
                <div style="background: var(--surface); border: 1.5px solid var(--warning); padding: 16px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--warning); text-transform: uppercase; margin-bottom: 4px;">Comissão Total (3%)</div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: var(--warning);">${formatCurrency(comissaoTotal, false)}</div>
                </div>
            </div>

            <div style="background: linear-gradient(135deg, var(--warning), #f59e0b); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
                <div style="font-size: 0.85rem; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; opacity: 0.9;">Valor por Analista (1/3)</div>
                <div style="font-size: 2.2rem; font-weight: 800;">${formatCurrency(porAnalista, true)}</div>
                <div style="font-size: 0.75rem; margin-top: 8px; font-weight: 500; opacity: 0.9;">${data.length} ${data.length === 1 ? 'filial' : 'filiais'} no período filtrado</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${data.map(f => `
                    <div style="background: var(--surface); border: 1px solid var(--border); padding: 10px 14px; border-radius: 10px; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text);">${f.filial}</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${f.organizacao_descricao || ''}</div>
                            </div>
                            <div style="font-weight: 700; color: var(--success); font-size: 0.9rem;">${formatCurrency(f.valor_comissao, false)}</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                ${(f.sistema || '').split('/').map(s => s.trim()).filter(s => s).map(s => renderizarBadgeSistema(s)).join('')}
                            </div>
                            <div style="font-size: 0.65rem; color: var(--text-secondary); background: var(--bg); padding: 2px 8px; border-radius: 4px; font-weight: 600; display: flex; gap: 8px;">
                                <span>Venda: ${f.data_venda}</span>
                                <span>Implantação: ${f.data_implantacao || f.dataImplantacao}</span>
                            </div>
                        </div>
                    </div>
                `).join('') || '<div style="text-align: center; padding: 10px; color: var(--text-secondary);">Nenhuma implantação no filtro atual.</div>'}
            </div>

            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                <button onclick="document.getElementById('observacoesModal').style.display='none'" class="action-btn">Fechar</button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

function mostrarEmRisco() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const emRisco = (state.globalData || state.filteredData).filter(item => item.pendente && item.dataVendaObj && !item.dataImplantacaoObj && (hoje - item.dataVendaObj) > 90 * 24 * 60 * 60 * 1000);
    criarModalMelhorado('Filiais em Risco (>90 dias)', 'warning', 'var(--danger)', emRisco, { tipo: 'risco' });
}
function mostrarPrevisaoFutura() {
    const futuro = (state.globalData || state.filteredData).filter(item => !item.dataImplantacaoObj && item.dataPrevisao);
    criarModalMelhorado('Previsões de Implantação', 'date_range', 'var(--success)', futuro, { tipo: 'previsao', allowedTags: ['CLOUD', 'ZAPCRM'] });
}
function mostrarEmProcesso() {
    const data = state.globalData || state.filteredData;
    const emProcesso = filtrarBacklogEmProcesso(data);
    criarModalMelhorado('Filiais em Processo', 'sync', 'var(--info)', emProcesso, { tipo: 'processo', usarAgregadoParaBacklog: true, allowedTags: ['CLOUD', 'ZAPCRM'] });
}
function mostrarPendencias() {
    const data = state.globalData || state.filteredData;
    const pendentes = filtrarBacklogPendentes(data);
    criarModalMelhorado('Filiais Pendentes', 'pending_actions', 'var(--warning)', pendentes, { tipo: 'pendente', usarAgregadoParaBacklog: true, allowedTags: ['CLOUD', 'ZAPCRM'] });
}
function mostrarFiliaisPorMarca(marca) { criarModalMelhorado(`Filiais da Marca: ${marca}`, 'branding_watermark', 'var(--primary)', state.filteredData.filter(item => item.marca === marca), { tipo: 'marca' }); }

function mostrarOutrasMarcas(marcas) {
    const dados = state.filteredData.filter(item => marcas.includes(item.marca));
    criarModalMelhorado('OUTRAS MARCAS', 'branding_watermark', 'var(--primary)', dados, { tipo: 'outras_marcas' });
}
function mostrarFiliaisPorSistema(sistema) { criarModalMelhorado(`Filiais com ${sistema}`, 'computer', 'var(--primary)', state.filteredData.filter(item => item.sistema && item.sistema.includes(sistema)), { tipo: 'sistema' }); }
function mostrarFiliaisPorModalidade(modalidade) { criarModalMelhorado(`Modalidade: ${modalidade}`, 'category', 'var(--primary)', state.filteredData.filter(item => item.modalidade === modalidade), { tipo: 'modalidade' }); }
function mostrarFiliaisPorAno(ano) { criarModalMelhorado(`Ano ${ano}`, 'calendar_today', 'var(--primary)', state.filteredData.filter(item => item.dataObj && item.dataObj.getFullYear() === parseInt(ano)), { tipo: 'ano' }); }
function mostrarFiliaisPorCategoria(categoria) {
    const dados = state.filteredData.filter(item => {
        const sistema = (item.sistemaAnterior || '').trim();
        const banco = (item.bancoAnterior || '').trim();

        let label = '';
        if (sistema && banco) label = `${sistema} - ${banco}`;
        else if (sistema) label = sistema;
        else if (banco) label = banco;

        return label.trim() === categoria.trim();
    });
    criarModalMelhorado(`Sistema/Banco: ${categoria}`, 'storage', 'var(--primary)', dados, { tipo: 'categoria' });
}

function mostrarNoPrazo() {
    const noPrazo = state.filteredData.filter(item => item.dataImplantacaoObj && item.dataPrevisaoObj && item.dataImplantacaoObj <= item.dataPrevisaoObj);

    // Configurações de tags customizadas para the modal "No Prazo"
    const customFilters = [
        { id: 'ANTECIPADO', label: 'ANTES DO PRAZO', color: 'var(--success)' },
        { id: 'EXATO', label: 'NO PRAZO', color: 'var(--info)' }
    ];

    criarModalMelhorado('Implantações No Prazo', 'task_alt', 'var(--success)', noPrazo, {
        tipo: 'noprazo',
        customFilters: customFilters
    });
}

function mostrarAntesDoPrazo() {
    const antesDoPrazo = state.filteredData.filter(item => {
        if (!item.dataImplantacaoObj || !item.dataPrevisaoObj) return false;
        const di = new Date(item.dataImplantacaoObj);
        const dp = new Date(item.dataPrevisaoObj);
        di.setHours(0,0,0,0); dp.setHours(0,0,0,0);
        return di < dp;
    });
    criarModalMelhorado('Implantações Antes do Prazo', 'task_alt', 'var(--success)', antesDoPrazo, { tipo: 'antesdoprazo' });
}

function mostrarNoPrazoExato() {
    const noPrazo = state.filteredData.filter(item => {
        if (!item.dataImplantacaoObj || !item.dataPrevisaoObj) return false;
        const di = new Date(item.dataImplantacaoObj);
        const dp = new Date(item.dataPrevisaoObj);
        di.setHours(0,0,0,0); dp.setHours(0,0,0,0);
        return di.getTime() === dp.getTime();
    });
    criarModalMelhorado('Implantações Exatamente no Prazo', 'event_available', 'var(--info)', noPrazo, { tipo: 'noprazoexato' });
}

function mostrarForaDoPrazo() {
    const foraDoPrazo = state.filteredData.filter(item => {
        if (!item.dataImplantacaoObj || !item.dataPrevisaoObj) return false;
        const di = new Date(item.dataImplantacaoObj);
        const dp = new Date(item.dataPrevisaoObj);
        di.setHours(0,0,0,0); dp.setHours(0,0,0,0);
        return di > dp;
    });
    criarModalMelhorado('Implantações Após Prazo', 'report_problem', 'var(--danger)', foraDoPrazo, { tipo: 'foradoprazo' });
}

function mostrarFiliaisPorTipoValor(tipo) {
    const dados = state.filteredData.filter(item => {
        if (tipo === 'erp') return item.modalidade === 'ERP';
        if (tipo === 'agregado') return item.modalidade === 'AGREGADO';
        return true;
    });
    criarModalMelhorado(`Filiais - Modalidade ${tipo.toUpperCase()}`, 'payments', 'var(--primary)', dados, { tipo: 'valor_tipo' });
}
