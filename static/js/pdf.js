// ==================== PDF ====================

async function gerarPDF() {
    showLoading(true, 'Gerando PDF Profissional...');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const margin = 15;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Cabeçalho Principal
        pdf.setFillColor(14, 165, 233);
        pdf.rect(0, 0, pageWidth, 35, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.text('GESTOR DE IMPLANTAÇÕES', margin, 18);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const dataEmissao = new Date().toLocaleString('pt-BR');
        pdf.text(`Relatório de Desempenho e Status | Gerado em: ${dataEmissao}`, margin, 26);

        let y = 45;

        // Seção de Filtros Ativos
        const filters = getFilterValues();
        const activeFilters = [];
        if (filters.organizacao) activeFilters.push(`Organização: ${filters.organizacao.toUpperCase()}`);
        if (filters.filial) activeFilters.push(`Filial: ${filters.filial.toUpperCase()}`);
        if (filters.sistema) activeFilters.push(`Sistema: ${filters.sistema.toUpperCase()}`);
        if (filters.dataInicio || filters.dataFim) {
            activeFilters.push(`Período: ${filters.dataInicio || 'Início'} até ${filters.dataFim || 'Fim'}`);
        }
        if (filters.ano) activeFilters.push(`Ano: ${filters.ano}`);

        if (activeFilters.length > 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(226, 232, 240);
            pdf.roundedRect(margin, y - 5, pageWidth - (margin * 2), 15, 2, 2, 'FD');
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Filtros Aplicados:', margin + 5, y + 1);
            pdf.setFont('helvetica', 'normal');
            pdf.text(activeFilters.join('  |  '), margin + 5, y + 6);
            y += 25;
        } else {
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(9);
            pdf.text('Filtros: Todos os dados (Visão Global)', margin, y);
            y += 15;
        }

        // Resumo de Indicadores (KPIs)
        pdf.setFillColor(14, 165, 233, 0.05);
        pdf.roundedRect(margin, y, pageWidth - (margin * 2), 30, 3, 3, 'F');

        const kpiY = y + 8;
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RESUMO EXECUTIVO', margin + 5, kpiY);

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);

        const col1 = margin + 5;
        const col2 = margin + 65;
        const col3 = margin + 125;

        const orgs = document.getElementById('uniqueOrgs')?.textContent || '0';
        const filiais = document.getElementById('uniqueFiliais')?.textContent || '0';
        const totalV = document.getElementById('valorTotal')?.textContent || 'R$ 0';
        const comissao = document.getElementById('valorComissao')?.textContent || 'R$ 0';
        const pendentes = document.getElementById('totalPendentes')?.textContent || '0';
        const emRisco = document.getElementById('totalRisco')?.textContent || '0';

        pdf.text(`Organizações: ${orgs}`, col1, kpiY + 8);
        pdf.text(`Filiais: ${filiais}`, col1, kpiY + 14);

        pdf.text(`Valor Total: ${totalV}`, col2, kpiY + 8);
        pdf.text(`Comissão: ${comissao}`, col2, kpiY + 14);

        pdf.text(`Pendentes: ${pendentes}`, col3, kpiY + 8);
        pdf.text(`Em Risco: ${emRisco}`, col3, kpiY + 14);

        y += 45;

        // Captura de Dashboards (Gráficos)
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(14, 165, 233);
        pdf.text('ANÁLISE GRÁFICA', margin, y);
        y += 10;

        const charts = [
            { id: 'sistemaChart', title: 'Distribuição por Sistema' },
            { id: 'bancoChart', title: 'Bancos e Sistemas Anteriores' },
            { id: 'modalidadeChart', title: 'Modalidades de Venda' }
        ];

        for (const chartInfo of charts) {
            const canvas = document.getElementById(chartInfo.id);
            if (canvas) {
                if (y > pageHeight - 80) {
                    pdf.addPage();
                    y = 20;
                }

                try {
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    // Ajustar tamanho mantendo proporção
                    const imgWidth = 85;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    pdf.setFontSize(10);
                    pdf.setTextColor(100, 116, 139);
                    pdf.text(chartInfo.title, margin, y);

                    pdf.addImage(imgData, 'PNG', margin, y + 2, imgWidth, imgHeight);
                    // Adicionar borda leve
                    pdf.setDrawColor(241, 245, 249);
                    pdf.rect(margin, y + 2, imgWidth, imgHeight, 'D');

                    // Se for par, pula pra próxima linha, se for ímpar fica na mesma (layout 2 colunas)
                    // Simplificando para 1 por linha para ser mais "Executivo"
                    y += imgHeight + 15;
                } catch (e) {
                    console.warn(`Erro ao capturar gráfico ${chartInfo.id}: `, e);
                }
            }
        }

        // Nova página para a tabela de dados
        pdf.addPage();
        y = 20;

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(14, 165, 233);
        pdf.text('DETALHAMENTO DAS IMPLANTAÇÕES', margin, y);
        y += 10;

        const tableHeaders = [['Org', 'Filial', 'Modalidade', 'Sistema', 'Valor', 'Status', 'Sist. Ant.']];
        const tableData = state.filteredData.map(item => {
            const statusInfo = extrairStatus(item);
            return [
                item.organizacao_codigo || '-',
                item.filial_descricao || '-',
                item.modalidade || '-',
                item.sistema || '-',
                state.userRole === 'implantação' ? '---' : (item.valor ? formatCurrency(item.valor) : 'R$ 0,00'),
                statusInfo.status,
                item.sistemaAnterior || '-'
            ];
        });

        pdf.autoTable({
            startY: y,
            head: tableHeaders,
            body: tableData,
            styles: {
                fontSize: 7,
                cellPadding: 3,
                valign: 'middle',
                font: 'helvetica'
            },
            headStyles: {
                fillColor: [14, 165, 233],
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 45 },
                4: { cellWidth: 25, halign: 'right' }
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => {
                // Rodapé com numeração de página
                pdf.setFontSize(8);
                pdf.setTextColor(148, 163, 184);
                const str = "Página " + pdf.internal.getNumberOfPages();
                pdf.text(str, pageWidth - margin, pageHeight - 10, { align: 'right' });
                pdf.text("GESTOR DE IMPLANTAÇÕES - Confidencial", margin, pageHeight - 10);
            }
        });

        const fileName = `Relatorio_Implantacoes_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        showNotification('Relatório Executivo gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro PDF:', error);
        showNotification('Erro crítico ao gerar PDF', 'error');
    } finally {
        showLoading(false);
    }
}
