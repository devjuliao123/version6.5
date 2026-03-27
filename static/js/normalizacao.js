// ==================== NORMALIZAÇÃO DE SISTEMAS ====================

function normalizarSistemas(sistemasStr) {
    if (!sistemasStr) return ['OUTROS'];

    // Mapeamento de sistemas principais
    const sistemaMap = {
        'CLOUD': 'CLOUD',
        'WEBSITE': 'WEBSITE',
        'FISCO': 'FISCAL',
        'CONTÁBIL': 'CONTÁBIL',
        'FISCAL': 'FISCAL',
        'ZAPCRM': 'ZAPCRM',
        'WEBPAV': 'WEBPAV',
        'FOLHA': 'FOLHA',
        'ADICION': 'ADICION'
    };

    // Dividir por '/' e limpar
    const sistemas = sistemasStr.split('/').map(s => s.trim().toUpperCase());

    // Extrair sistemas únicos que existem no mapa
    const sistemasUnicos = [...new Set(
        sistemas
            .map(s => {
                // Verificar correspondência exata primeiro
                if (sistemaMap[s]) return sistemaMap[s];

                // Verificar correspondência parcial
                for (let [key, value] of Object.entries(sistemaMap)) {
                    if (s.includes(key)) return value;
                }
                return null;
            })
            .filter(s => s !== null)
    )];

    return sistemasUnicos.length > 0 ? sistemasUnicos : ['OUTROS'];
}

function agruparSistemasNormalizados(dados, strictTags = [], includeVirtual = false) {
    const sistemasAgrupados = {};

    dados.forEach(item => {
        const sistemasNorm = item.sistema ? normalizarSistemas(item.sistema) : [];
        const valorGeral = item.total_geral || 0;

        // Processar sistemas normais
        sistemasNorm.forEach(sistema => {
            // Lógica de busca estrita para tags específicas (ex: CONTÁBIL, FISCAL)
            if (strictTags.includes(sistema)) {
                // Apenas incluir se for o ÚNICO sistema no registro
                if (sistemasNorm.length !== 1 || sistemasNorm[0] !== sistema) {
                    return;
                }
            }

            if (!sistemasAgrupados[sistema]) {
                sistemasAgrupados[sistema] = { quantidade: 0, valor: 0, original: sistema, itens: [] };
            }
            sistemasAgrupados[sistema].quantidade++;
            sistemasAgrupados[sistema].valor += valorGeral;
            sistemasAgrupados[sistema].itens.push(item);
        });

        // Só adicionar tags virtuais (ERP/AGREGADO) se explicitamente solicitado
        if (includeVirtual) {
            // Caso especial: ERP (Baseado na coluna Total ERP)
            if (item.total_erp && item.total_erp > 0) {
                const tag = 'ERP';
                if (!sistemasAgrupados[tag]) {
                    sistemasAgrupados[tag] = { quantidade: 0, valor: 0, original: tag, itens: [] };
                }
                sistemasAgrupados[tag].quantidade++;
                sistemasAgrupados[tag].valor += item.total_erp;
                sistemasAgrupados[tag].itens.push(item);
            }

            // Caso especial: AGREGADO (Baseado na coluna Total Agregado)
            if (item.total_agregado && item.total_agregado > 0) {
                const tag = 'AGREGADO';
                if (!sistemasAgrupados[tag]) {
                    sistemasAgrupados[tag] = { quantidade: 0, valor: 0, original: tag, itens: [] };
                }
                sistemasAgrupados[tag].quantidade++;
                sistemasAgrupados[tag].valor += item.total_agregado;
                sistemasAgrupados[tag].itens.push(item);
            }
        }
    });

    return sistemasAgrupados;
}
