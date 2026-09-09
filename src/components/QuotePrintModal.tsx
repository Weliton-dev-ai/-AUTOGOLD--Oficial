import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Send, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  Camera,
  Download,
  Loader2,
  FileText,
  Share2
} from 'lucide-react';
import { Quote, WorkshopProfile } from '../types';
import { formatCurrencyBRL } from '../utils/calculator';
import { generateWhatsAppMessage, openWhatsAppDirect } from '../utils/whatsapp';
import { downloadQuotePdf, sharePdfOrWhatsApp } from '../utils/pdfGenerator';

interface QuotePrintModalProps {
  quote: Quote;
  workshop: WorkshopProfile;
  onClose: () => void;
}

export const QuotePrintModal: React.FC<QuotePrintModalProps> = ({
  quote,
  workshop,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Garante que o preço de cada peça na lista some exatamente o total de serviços,
  // com a margem de lucro da oficina já embutida de forma imperceptível para o cliente
  const itensComMargemEmbutida = React.useMemo(() => {
    const somaItens = quote.itens.reduce((acc, it) => acc + (it.valorTotalItem || 0), 0);
    const subtotalEsperado = (quote.subtotalMaoDeObra || 0) + 
      (quote.subtotalInsumosFracionados || 0) + 
      (quote.subtotalPecasReposicao || 0) + 
      (quote.valorLucro || 0);

    // Se for orçamento antigo onde a margem estava somada no rodapé e não nos itens
    if (somaItens > 0 && Math.abs(somaItens - subtotalEsperado) > 0.05 && subtotalEsperado > somaItens) {
      const fator = subtotalEsperado / somaItens;
      return quote.itens.map((it) => ({
        ...it,
        valorTotalItem: Math.round(it.valorTotalItem * fator * 100) / 100,
      }));
    }

    return quote.itens;
  }, [quote.itens, quote.subtotalMaoDeObra, quote.subtotalInsumosFracionados, quote.subtotalPecasReposicao, quote.valorLucro]);

  const totalServicosExibido = React.useMemo(() => {
    return itensComMargemEmbutida.reduce((acc, it) => acc + (it.valorTotalItem || 0), 0);
  }, [itensComMargemEmbutida]);

  const valorTotalFinal = Math.max(0, Math.round((totalServicosExibido - (quote.desconto || 0)) * 100) / 100);
  const sinal50Final = Math.round((valorTotalFinal / 2) * 100) / 100;
  const restante50Final = Math.round((valorTotalFinal - sinal50Final) * 100) / 100;

  // Download direto do arquivo .PDF
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setFeedbackMsg({ type: 'info', text: 'Gerando arquivo PDF em alta definição...' });

    try {
      const filename = `Orcamento_${quote.numero}_${quote.cliente.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      await downloadQuotePdf('printable-quote-content', filename);
      setFeedbackMsg({ type: 'success', text: 'PDF baixado com sucesso no seu dispositivo!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      setFeedbackMsg({ type: 'error', text: 'Não foi possível gerar o PDF. Use o botão Imprimir como alternativa.' });
      setTimeout(() => setFeedbackMsg(null), 5000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Gerar e Enviar PDF no WhatsApp
  const handleSendWhatsAppWithPdf = async () => {
    setIsGeneratingPdf(true);
    setFeedbackMsg({ type: 'info', text: 'Gerando PDF e preparando envio no WhatsApp...' });

    try {
      const filename = `Orcamento_${quote.numero}.pdf`;
      const textMessage = generateWhatsAppMessage(quote, workshop);

      const result = await sharePdfOrWhatsApp(
        'printable-quote-content',
        filename,
        quote.cliente.telefone,
        textMessage
      );

      if (result.method === 'share') {
        setFeedbackMsg({ type: 'success', text: 'Janela de compartilhamento aberta!' });
      } else {
        setFeedbackMsg({
          type: 'success',
          text: 'PDF baixado! A conversa do WhatsApp foi aberta. Basta anexar o PDF na conversa.',
        });
      }
      setTimeout(() => setFeedbackMsg(null), 6000);
    } catch (error) {
      console.error('Erro ao gerar/enviar PDF:', error);
      // Fallback padrão: abrir WhatsApp com texto
      handleSendWhatsAppTextOnly();
      setFeedbackMsg({ type: 'info', text: 'WhatsApp aberto com a mensagem formatada.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Fallback de impressão nativa
  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(workshop.chavePix);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyFormattedText = () => {
    const text = generateWhatsAppMessage(quote, workshop);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleSendWhatsAppTextOnly = () => {
    const text = generateWhatsAppMessage(quote, workshop);
    openWhatsAppDirect(quote.cliente.telefone, text);
  };

  const hasPhotos = quote.fotosAvarias && quote.fotosAvarias.length > 0;

  // Agrupar fotos em páginas de até 4 fotos por página (2 colunas x 2 linhas)
  // para garantir enquadramento perfeito, sem cortar fotos ao meio nem gerar faixas no PDF
  const photoPages = React.useMemo(() => {
    if (!quote.fotosAvarias || quote.fotosAvarias.length === 0) return [];
    const pages: (typeof quote.fotosAvarias)[] = [];
    const chunkSize = 4;
    for (let i = 0; i < quote.fotosAvarias.length; i += chunkSize) {
      pages.push(quote.fotosAvarias.slice(i, i + chunkSize));
    }
    return pages;
  }, [quote.fotosAvarias]);

  return (
    <div id="modal-impressao-orcamento" className="fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0C]/90 backdrop-blur-md p-1.5 sm:p-6 flex justify-center items-start print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-2 sm:my-4 print:border-none print:shadow-none print:m-0 print:rounded-none print:w-full print:max-w-none">
        
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="p-3 sm:p-4 bg-[#121E2B] border-b border-[#1E3349] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-blue-400">Orçamento Oficial</span>
              <span className="text-xs text-slate-400 font-mono font-bold">({quote.numero})</span>
            </div>
            {hasPhotos && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                {quote.fotosAvarias?.length} fotos
              </span>
            )}
            {/* Fechar botão no mobile no canto direito */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-xl bg-[#0A0A0C] hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-[#223952] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Opção Principal: Gerar e Enviar PDF no WhatsApp */}
            <button
              id="btn-enviar-pdf-whatsapp"
              onClick={handleSendWhatsAppWithPdf}
              disabled={isGeneratingPdf}
              className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/30 cursor-pointer transition-all disabled:opacity-50 min-h-[38px] sm:min-h-0"
              title="Gera o arquivo PDF e abre o WhatsApp do cliente para envio"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Enviar PDF WhatsApp</span>
            </button>

            {/* Opção Baixar Arquivo PDF */}
            <button
              id="btn-baixar-arquivo-pdf"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3 py-2 sm:py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#1A73E8] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all disabled:opacity-50 min-h-[38px] sm:min-h-0"
              title="Baixa o documento PDF timbrado diretamente no seu aparelho"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Baixar PDF</span>
            </button>

            {/* Opção Imprimir na Impressora */}
            <button
              id="btn-imprimir-impressora"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-[#0A0A0C] hover:bg-[#162536] text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#223952] cursor-pointer transition-all min-h-[38px] sm:min-h-0"
              title="Abre a caixa de impressão do navegador"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Copiar Texto Formatado */}
            <button
              onClick={handleCopyFormattedText}
              className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-[#0A0A0C] hover:bg-[#162536] text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#223952] cursor-pointer transition-all min-h-[38px] sm:min-h-0"
              title="Copiar resumo em texto"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={onClose}
              className="hidden sm:flex p-1.5 rounded-xl bg-[#0A0A0C] hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-[#223952] transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback visual flutuante */}
        {feedbackMsg && (
          <div className={`p-3 text-xs font-bold text-center border-b flex items-center justify-center gap-2 print:hidden ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
              : feedbackMsg.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-800'
              : 'bg-blue-950 text-blue-200 border-blue-800'
          }`}>
            {feedbackMsg.type === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
            {feedbackMsg.type === 'info' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Canvas de Documento Timbrado Imprimível (A4) com ID para html2canvas & jsPDF */}
        <div
          id="printable-quote-content"
          className="text-slate-900 font-sans bg-white overflow-x-auto"
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          {/* PÁGINA 1: ORÇAMENTO TIMBRADO OFICIAL */}
          <div
            className="pdf-page p-3.5 sm:p-8 md:p-10 space-y-4 bg-white print:p-2"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {/* Cabeçalho da Oficina com Logotipo & Dados Fiscais */}
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 print-avoid-break"
              style={{ borderBottom: '2px solid #0f172a' }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {workshop.logotipoUrl ? (
                  <img
                    src={workshop.logotipoUrl}
                    alt={workshop.nomeOficina}
                    className="h-14 sm:h-16 max-w-[150px] sm:max-w-[180px] object-contain rounded shrink-0"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center font-black shadow-sm shrink-0"
                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                  >
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider" style={{ color: '#60a5fa' }}>AUTO</span>
                    <span className="text-xs sm:text-sm" style={{ color: '#facc15' }}>GOLD</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight" style={{ color: '#0f172a' }}>
                    {workshop.nomeOficina}
                  </h1>
                  {workshop.razaoSocial && (
                    <p className="text-xs font-medium truncate" style={{ color: '#475569' }}>{workshop.razaoSocial}</p>
                  )}
                  {workshop.cnpj && (
                    <p className="text-xs" style={{ color: '#475569' }}>CNPJ: {workshop.cnpj}</p>
                  )}
                  <p className="text-xs" style={{ color: '#475569' }}>
                    {workshop.endereco} - {workshop.cidadeUf}
                  </p>
                  <p className="text-xs font-bold" style={{ color: '#1e293b' }}>
                    WhatsApp: {workshop.telefoneWhatsApp} {workshop.telefoneFixo ? `| Fixo: ${workshop.telefoneFixo}` : ''}
                  </p>
                </div>
              </div>

              {/* Número e Validade do Orçamento */}
              <div
                className="w-full sm:w-auto text-left sm:text-right p-3 sm:p-3.5 rounded-xl shrink-0"
                style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
                  {quote.tipoOrcamento === 'polimento_estetica'
                    ? 'Orçamento de Polimento & Estética'
                    : quote.tipoOrcamento === 'misto'
                    ? 'Orçamento de Funilaria & Polimento'
                    : 'Orçamento de Funilaria e Pintura'}
                </span>
                <span className="block text-base sm:text-lg font-black font-mono" style={{ color: '#0f172a' }}>
                  {quote.numero}
                </span>
                <div className="mt-1 sm:mt-1.5 text-xs space-y-0.5" style={{ color: '#475569' }}>
                  <p>
                    <strong>Emissão:</strong> {new Date(quote.dataCriacao).toLocaleDateString('pt-BR')}
                  </p>
                  <p>
                    <strong>Validade:</strong> {new Date(quote.dataValidade).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Dados do Cliente e Identificação do Veículo (Responsivo 1 ou 2 Colunas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 print-avoid-break">
              {/* Caixa Cliente */}
              <div
                className="p-3 sm:p-3.5 rounded-xl space-y-1 text-xs"
                style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
              >
                <span
                  className="font-bold text-xs uppercase tracking-wider block mb-1 pb-1"
                  style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}
                >
                  Dados do Cliente
                </span>
                <p>
                  <strong style={{ color: '#334155' }}>Nome:</strong>{' '}
                  <span className="font-bold text-sm" style={{ color: '#0f172a' }}>{quote.cliente.nome}</span>
                </p>
                <p>
                  <strong style={{ color: '#334155' }}>Telefone / WhatsApp:</strong>{' '}
                  <span style={{ color: '#1e293b' }}>{quote.cliente.telefone || 'Não informado'}</span>
                </p>
                {quote.cliente.documento && (
                  <p>
                    <strong style={{ color: '#334155' }}>CPF / CNPJ:</strong>{' '}
                    <span style={{ color: '#1e293b' }}>{quote.cliente.documento}</span>
                  </p>
                )}
              </div>

              {/* Caixa Veículo */}
              <div
                className="p-3 sm:p-3.5 rounded-xl space-y-1 text-xs"
                style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
              >
                <span
                  className="font-bold text-xs uppercase tracking-wider block mb-1 pb-1"
                  style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}
                >
                  Identificação do Veículo
                </span>
                <p>
                  <strong style={{ color: '#334155' }}>Veículo / Modelo:</strong>{' '}
                  <span className="font-bold text-sm" style={{ color: '#0f172a' }}>
                    {quote.veiculo.marca ? `${quote.veiculo.marca} ` : ''}{quote.veiculo.modelo || 'Veículo'}
                  </span>
                </p>
                <p className="flex items-center gap-2 pt-0.5">
                  <strong style={{ color: '#334155' }}>Placa Oficial:</strong>{' '}
                  <span
                    className="font-mono font-black px-2.5 py-0.5 rounded text-xs tracking-wider"
                    style={{ backgroundColor: '#e2e8f0', color: '#0f172a', border: '1px solid #94a3b8' }}
                  >
                    {quote.veiculo.placa || 'A DEFINIR'}
                  </span>
                </p>
              </div>
            </div>

            {/* Tabela de Serviços: Mão de Obra e Polimento com Enquadramento Responsivo e Preço Claro */}
            <div
              className="rounded-xl overflow-hidden print-avoid-break shadow-sm w-full"
              style={{ border: '1px solid #cbd5e1' }}
            >
              <table className="w-full text-left text-xs border-collapse table-auto sm:table-fixed">
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th className="py-2.5 px-2 sm:px-3 w-9 sm:w-12 text-center text-[10px] uppercase font-bold tracking-wider">#</th>
                    <th className="py-2.5 px-2.5 sm:px-3 text-[10px] uppercase font-bold tracking-wider">Peça / Serviço</th>
                    <th className="hidden sm:table-cell py-2.5 px-3 w-40 text-[10px] uppercase font-bold tracking-wider">Discriminação</th>
                    <th className="py-2.5 px-2.5 sm:px-4 text-right w-28 sm:w-36 text-[10px] uppercase font-bold tracking-wider whitespace-nowrap">Preço (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {itensComMargemEmbutida.map((item, idx) => {
                    const isPolishing = item.pecaId.startsWith('polimento_') || item.pecaId.startsWith('addon_');

                    return (
                      <tr
                        key={item.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <td className="py-2.5 px-2 sm:px-3 text-center font-bold text-xs" style={{ color: '#475569' }}>
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2.5 sm:px-3">
                          <span className="font-bold block text-xs sm:text-sm leading-snug break-words" style={{ color: '#0f172a' }}>
                            {item.nomePeca}
                          </span>
                          {/* Tag de Discriminação no Mobile (abaixo do nome para não espremer colunas) */}
                          <div className="sm:hidden mt-1">
                            {isPolishing ? (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #fcd34d',
                                }}
                              >
                                Polimento & Estética
                              </span>
                            ) : (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                                style={{
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  border: '1px solid #93c5fd',
                                }}
                              >
                                Mão de Obra & Pintura
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell py-2.5 px-3">
                          {isPolishing ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fcd34d',
                              }}
                            >
                              Polimento & Estética
                            </span>
                          ) : (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                border: '1px solid #93c5fd',
                              }}
                            >
                              Mão de Obra & Pintura
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 sm:px-4 text-right font-black text-xs sm:text-sm whitespace-nowrap tabular-nums" style={{ color: '#0f172a' }}>
                          {formatCurrencyBRL(item.valorTotalItem)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumo Financeiro com Caixa de Sinal de 50% Pix e Totalizador (Responsivo Celular e Computador) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-start print-avoid-break">
              {/* Esquerda: Caixa de Entrada 50% via Pix (7 colunas no desktop, 100% no mobile) */}
              <div
                className="col-span-1 md:col-span-7 p-3.5 sm:p-4 rounded-2xl space-y-3"
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: '1px solid #1e293b',
                }}
              >
                <div
                  className="flex flex-wrap items-center justify-between gap-1.5 pb-2"
                  style={{ borderBottom: '1px solid #334155' }}
                >
                  <span
                    className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: '#facc15' }}
                  >
                    <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" />
                    Condição de Entrada: Sinal de 50% no Pix
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-semibold"
                    style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}
                  >
                    Reserva & Início
                  </span>
                </div>

                {/* Valores Divididos (50% Entrada e 50% Entrega) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: '#022c22',
                      border: '1px solid #059669',
                    }}
                  >
                    <span
                      className="block text-[10px] uppercase font-bold tracking-wider"
                      style={{ color: '#6ee7b7' }}
                    >
                      Sinal de Entrada (50%):
                    </span>
                    <span
                      className="text-lg sm:text-xl font-black block mt-0.5 tabular-nums"
                      style={{ color: '#34d399' }}
                    >
                      {formatCurrencyBRL(sinal50Final)}
                    </span>
                  </div>

                  <div
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                    }}
                  >
                    <span
                      className="block text-[10px] uppercase font-bold tracking-wider"
                      style={{ color: '#94a3b8' }}
                    >
                      Saldo na Entrega (50%):
                    </span>
                    <span
                      className="text-lg sm:text-xl font-bold block mt-0.5 tabular-nums"
                      style={{ color: '#f8fafc' }}
                    >
                      {formatCurrencyBRL(restante50Final)}
                    </span>
                  </div>
                </div>

                {/* Dados do Pix em Destaque: Chave e Favorecido */}
                <div
                  className="p-3 rounded-xl space-y-2"
                  style={{
                    backgroundColor: '#020617',
                    border: '1px solid #334155',
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>
                      Chave Pix ({workshop.tipoChavePix}):
                    </span>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span
                        className="font-mono font-bold select-all text-xs sm:text-sm tracking-wider px-2 sm:px-2.5 py-1 rounded-lg truncate"
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#facc15',
                          border: '1px solid #854d0e',
                        }}
                      >
                        {workshop.chavePix}
                      </span>
                      <button
                        onClick={handleCopyPix}
                        type="button"
                        className="print:hidden p-1.5 rounded-lg text-slate-200 transition-colors cursor-pointer shrink-0"
                        style={{ backgroundColor: '#334155' }}
                        title="Copiar Chave Pix"
                      >
                        {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div
                    className="flex flex-wrap items-center justify-between gap-1 text-xs pt-2"
                    style={{ borderTop: '1px solid #1e293b' }}
                  >
                    <span style={{ color: '#94a3b8' }}>Favorecido / Titular:</span>
                    <span className="font-semibold" style={{ color: '#f8fafc' }}>
                      {workshop.titularPix}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] leading-tight" style={{ color: '#94a3b8' }}>
                  * O início da execução dos serviços e agendamento inicia-se após a confirmação do sinal de 50%.
                </p>
              </div>

              {/* Direita: Totalizador (5 colunas no desktop, 100% no mobile) */}
              <div
                className="col-span-1 md:col-span-5 p-3.5 sm:p-4 rounded-2xl space-y-2.5 text-xs"
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                }}
              >
                <div className="flex justify-between" style={{ color: '#475569' }}>
                  <span>Total Serviços & MDO:</span>
                  <span className="font-bold tabular-nums" style={{ color: '#0f172a' }}>
                    {formatCurrencyBRL(totalServicosExibido)}
                  </span>
                </div>

                {quote.desconto > 0 && (
                  <div className="flex justify-between font-bold" style={{ color: '#059669' }}>
                    <span>Desconto Aplicado:</span>
                    <span className="tabular-nums">-{formatCurrencyBRL(quote.desconto)}</span>
                  </div>
                )}

                <div
                  className="pt-2 flex justify-between items-baseline"
                  style={{ borderTop: '2px solid #0f172a' }}
                >
                  <span className="font-black text-xs sm:text-sm uppercase" style={{ color: '#0f172a' }}>
                    VALOR TOTAL:
                  </span>
                  <span className="text-xl sm:text-2xl font-black tabular-nums" style={{ color: '#0f172a' }}>
                    {formatCurrencyBRL(valorTotalFinal)}
                  </span>
                </div>

                <div className="pt-2 text-[11px] space-y-1" style={{ color: '#475569' }}>
                  <p>
                    <strong style={{ color: '#0f172a' }}>Prazo de Execução:</strong> {quote.prazoExecucaoDias} dias úteis
                  </p>
                  <p>
                    <strong style={{ color: '#0f172a' }}>Garantia dos Serviços:</strong> {workshop.textoGarantia}
                  </p>
                </div>
              </div>
            </div>

            {/* Observações Gerais e Assinaturas */}
            <div
              className="pt-3 text-xs space-y-4 print-avoid-break"
              style={{ borderTop: '1px solid #e2e8f0' }}
            >
              {quote.observacoesGerais && (
                <div>
                  <strong style={{ color: '#1e293b' }}>Observações Gerais e Termos:</strong>
                  <p className="mt-0.5" style={{ color: '#475569' }}>{quote.observacoesGerais}</p>
                </div>
              )}

              {/* Linhas de Assinatura */}
              <div className="grid grid-cols-2 gap-8 pt-5 text-center text-xs" style={{ color: '#334155' }}>
                <div className="pt-2" style={{ borderTop: '1px solid #94a3b8' }}>
                  <p className="font-bold" style={{ color: '#0f172a' }}>{workshop.nomeOficina}</p>
                  <p className="text-[10px]" style={{ color: '#64748b' }}>Responsável Técnico / Funilaria & Pintura</p>
                </div>
                <div className="pt-2" style={{ borderTop: '1px solid #94a3b8' }}>
                  <p className="font-bold" style={{ color: '#0f172a' }}>{quote.cliente.nome}</p>
                  <p className="text-[10px]" style={{ color: '#64748b' }}>Aceite do Cliente e Aprovação do Orçamento</p>
                </div>
              </div>
            </div>

            {/* FIM DA PÁGINA 1 */}
          </div>

          {/* PÁGINAS DO LAUDO FOTOGRÁFICO DE REGISTRO DE AVARIAS (IMPRESSO COM O ORÇAMENTO) */}
          {hasPhotos && photoPages.map((pagePhotos, pageIndex) => (
            <div
              key={`photo-page-${pageIndex}`}
              className="pdf-page p-6 sm:p-10 space-y-4 bg-white border-t-4 border-dashed border-slate-200 print:border-none print:p-2 print-page-break"
              style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              {/* Cabeçalho do Laudo Fotográfico */}
              <div
                className="pb-3 flex items-center justify-between gap-3"
                style={{ borderBottom: '2px solid #0f172a' }}
              >
                <div className="flex items-center gap-2.5">
                  {workshop.logotipoUrl ? (
                    <img
                      src={workshop.logotipoUrl}
                      alt={workshop.nomeOficina}
                      className="h-10 max-w-[130px] object-contain rounded"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                    >
                      <Camera className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: '#0f172a' }}>
                      Laudo Fotográfico de Registro de Avarias & Vistoria
                    </h2>
                    <p className="text-[11px]" style={{ color: '#475569' }}>
                      Anexo Oficial do Orçamento Nº <strong style={{ color: '#0f172a' }}>{quote.numero}</strong> • Veículo:{' '}
                      <strong style={{ color: '#0f172a' }}>{quote.veiculo.marca} {quote.veiculo.modelo} ({quote.veiculo.placa})</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] font-semibold" style={{ color: '#64748b' }}>
                  <span
                    className="px-2 py-0.5 rounded font-mono text-xs"
                    style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a' }}
                  >
                    Página {pageIndex + 2} de {photoPages.length + 1}
                  </span>
                  <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>
                    Fotos {pageIndex * 4 + 1} a {Math.min((pageIndex + 1) * 4, quote.fotosAvarias!.length)} de {quote.fotosAvarias!.length}
                  </p>
                </div>
              </div>

              {/* Grade de Fotos do Laudo: 2 Colunas x até 2 Linhas por página para enquadramento perfeito */}
              <div className="grid grid-cols-2 gap-4">
                {pagePhotos.map((foto, index) => {
                  const globalIndex = pageIndex * 4 + index;
                  return (
                    <div
                      key={foto.id}
                      className="rounded-xl overflow-hidden flex flex-col shadow-sm"
                      style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                    >
                      {/* Imagem com proporção estabilizada */}
                      <div className="relative w-full h-48 sm:h-52 bg-white overflow-hidden flex items-center justify-center">
                        <img
                          src={foto.url}
                          alt={foto.descricao}
                          className="w-full h-full object-cover block"
                          crossOrigin="anonymous"
                        />
                        <span
                          className="absolute top-2 left-2 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow"
                          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                        >
                          Registro #{globalIndex + 1}
                        </span>
                      </div>

                      {/* Descrição e Data */}
                      <div
                        className="p-2.5 space-y-1"
                        style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}
                      >
                        <p className="font-bold text-[11px] leading-tight line-clamp-2" style={{ color: '#0f172a' }}>
                          {foto.descricao || `Avaria documentada #${globalIndex + 1}`}
                        </p>
                        <div className="flex items-center justify-between text-[9px] pt-0.5" style={{ color: '#64748b' }}>
                          <span>Data do Registro: {foto.dataHora}</span>
                          <span className="font-bold" style={{ color: '#1d4ed8' }}>AutoGold Inspeção</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rodapé do Laudo */}
              <div
                className="pt-3 flex justify-between items-center text-[10px]"
                style={{ borderTop: '1px solid #e2e8f0', color: '#64748b' }}
              >
                <span>Documento fotográfico autenticado pela oficina {workshop.nomeOficina}</span>
                <span className="font-mono font-bold">{quote.numero}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
