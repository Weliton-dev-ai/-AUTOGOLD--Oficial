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
    <div id="modal-impressao-orcamento" className="fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0C]/90 backdrop-blur-md p-2 sm:p-6 flex justify-center items-start print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4 print:border-none print:shadow-none print:m-0 print:rounded-none print:w-full print:max-w-none">
        
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="p-4 bg-[#121E2B] border-b border-[#1E3349] text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-blue-400">Orçamento & PDF Oficial</span>
            <span className="text-xs text-slate-400 font-mono font-bold">({quote.numero})</span>
            {hasPhotos && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                {quote.fotosAvarias?.length} fotos
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Opção Principal: Gerar e Enviar PDF no WhatsApp */}
            <button
              id="btn-enviar-pdf-whatsapp"
              onClick={handleSendWhatsAppWithPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-700/30 cursor-pointer transition-all disabled:opacity-50"
              title="Gera o arquivo PDF e abre o WhatsApp do cliente para envio"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Gerar / Enviar PDF no WhatsApp</span>
            </button>

            {/* Opção Baixar Arquivo PDF */}
            <button
              id="btn-baixar-arquivo-pdf"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#1A73E8] text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all disabled:opacity-50"
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
              className="px-3 py-1.5 rounded-xl bg-[#0A0A0C] hover:bg-[#162536] text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-[#223952] cursor-pointer transition-all"
              title="Abre a caixa de impressão do navegador"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            {/* Copiar Texto Formatado */}
            <button
              onClick={handleCopyFormattedText}
              className="px-3 py-1.5 rounded-xl bg-[#0A0A0C] hover:bg-[#162536] text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-[#223952] cursor-pointer transition-all"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#0A0A0C] hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-[#223952] transition-colors cursor-pointer ml-1"
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
        <div id="printable-quote-content" className="text-slate-900 font-sans bg-white">
          
          {/* PÁGINA 1: ORÇAMENTO TIMBRADO OFICIAL */}
          <div className="pdf-page p-6 sm:p-10 space-y-5 bg-white print:p-2">
          
          {/* Cabeçalho da Oficina com Logotipo & Dados Fiscais */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-5 print-avoid-break">
            <div className="flex items-center gap-4">
              {workshop.logotipoUrl ? (
                <img
                  src={workshop.logotipoUrl}
                  alt={workshop.nomeOficina}
                  className="h-16 max-w-[180px] object-contain rounded"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-black">
                  <span className="text-xs uppercase tracking-wider text-blue-400">AUTO</span>
                  <span className="text-sm text-yellow-400">GOLD</span>
                </div>
              )}

              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {workshop.nomeOficina}
                </h1>
                {workshop.razaoSocial && (
                  <p className="text-xs text-slate-600 font-medium">{workshop.razaoSocial}</p>
                )}
                {workshop.cnpj && (
                  <p className="text-xs text-slate-600">CNPJ: {workshop.cnpj}</p>
                )}
                <p className="text-xs text-slate-600">
                  {workshop.endereco} - {workshop.cidadeUf}
                </p>
                <p className="text-xs font-bold text-slate-800">
                  WhatsApp: {workshop.telefoneWhatsApp} {workshop.telefoneFixo ? `| Fixo: ${workshop.telefoneFixo}` : ''}
                </p>
              </div>
            </div>

            {/* Número e Validade do Orçamento */}
            <div className="text-right bg-slate-100 p-3.5 rounded-xl border border-slate-300">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {quote.tipoOrcamento === 'polimento_estetica' 
                  ? 'Orçamento de Polimento & Estética' 
                  : quote.tipoOrcamento === 'misto'
                  ? 'Orçamento de Funilaria & Polimento'
                  : 'Orçamento de Funilaria e Pintura'}
              </span>
              <span className="block text-lg font-black text-slate-900 font-mono">
                {quote.numero}
              </span>
              <div className="mt-1.5 text-xs text-slate-600 space-y-0.5">
                <p>
                  <strong>Emissão:</strong> {new Date(quote.dataCriacao).toLocaleDateString('pt-BR')}
                </p>
                <p>
                  <strong>Validade:</strong> {new Date(quote.dataValidade).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Dados do Cliente e Identificação do Veículo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print-avoid-break">
            {/* Caixa Cliente */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-1 text-xs">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block mb-1 border-b border-slate-200 pb-1">
                Dados do Cliente
              </span>
              <p>
                <strong className="text-slate-700">Nome:</strong>{' '}
                <span className="font-bold text-slate-900 text-sm">{quote.cliente.nome}</span>
              </p>
              <p>
                <strong className="text-slate-700">Telefone / WhatsApp:</strong> {quote.cliente.telefone || 'Não informado'}
              </p>
              {quote.cliente.documento && (
                <p>
                  <strong className="text-slate-700">CPF / CNPJ:</strong> {quote.cliente.documento}
                </p>
              )}
            </div>

            {/* Caixa Veículo */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-1 text-xs">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block mb-1 border-b border-slate-200 pb-1">
                Identificação do Veículo
              </span>
              <p>
                <strong className="text-slate-700">Veículo / Marca:</strong>{' '}
                <span className="font-bold text-slate-900 text-sm">
                  {quote.veiculo.marca ? `${quote.veiculo.marca} ` : ''}{quote.veiculo.modelo || 'Veículo'}
                </span>
              </p>
              <p>
                <strong className="text-slate-700">Placa:</strong>{' '}
                <span className="font-mono font-bold px-2 py-0.5 bg-slate-200 rounded text-slate-900 text-sm">
                  {quote.veiculo.placa || 'A DEFINIR'}
                </span>
              </p>
            </div>
          </div>

          {/* Tabela de Serviços: APENAS MÃO DE OBRA E POLIMENTO COM PREÇO (SEM DETALHES DE EXECUÇÃO) */}
          <div className="border border-slate-300 rounded-xl overflow-hidden print-avoid-break">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">Item</th>
                  <th className="py-2.5 px-3">Peça / Serviço</th>
                  <th className="py-2.5 px-3 w-44">Discriminação</th>
                  <th className="py-2.5 px-3 text-right w-36">Preço (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itensComMargemEmbutida.map((item, idx) => {
                  const isPolishing = item.pecaId.startsWith('polimento_') || item.pecaId.startsWith('addon_');

                  return (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block text-xs sm:text-[13px]">{item.nomePeca}</span>
                      </td>
                      <td className="py-3 px-3">
                        {isPolishing ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Polimento
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                            Mão de Obra & Pintura
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                        {formatCurrencyBRL(item.valorTotalItem)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Resumo Financeiro com Caixa de Sinal de 50% e QR Code Pix Real */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start print-avoid-break">
            
            {/* Esquerda: Caixa de Entrada 50% via Pix (7 colunas) */}
            <div className="md:col-span-7 bg-slate-900 text-white p-4 sm:p-5 rounded-2xl space-y-3 print:bg-slate-900 print:text-white">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" />
                  Condição de Entrada: Sinal de 50% via Pix
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Reserva & Agendamento
                </span>
              </div>

              {/* Valores Divididos (50% Entrada e 50% Entrega) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-950 p-3 rounded-xl border border-emerald-500/40">
                  <span className="block text-[10px] uppercase font-bold text-emerald-300">
                    Sinal de Entrada (50%):
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    {formatCurrencyBRL(sinal50Final)}
                  </span>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    Saldo Restante na Entrega (50%):
                  </span>
                  <span className="text-xl font-bold text-slate-200">
                    {formatCurrencyBRL(restante50Final)}
                  </span>
                </div>
              </div>

              {/* Dados do Pix em Destaque: Chave e Favorecido */}
              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-slate-300 text-xs font-semibold">
                    Chave Pix ({workshop.tipoChavePix}):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-yellow-400 font-bold select-all text-sm tracking-wide bg-slate-900/80 px-2.5 py-1 rounded-lg border border-yellow-500/20">
                      {workshop.chavePix}
                    </span>
                    <button
                      onClick={handleCopyPix}
                      type="button"
                      className="print:hidden p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
                      title="Copiar Chave Pix"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs pt-2 border-t border-slate-700/60">
                  <span className="text-slate-400">Favorecido / Titular:</span>
                  <span className="text-slate-100 font-semibold">{workshop.titularPix}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                * O início da execução dos serviços e agendamento inicia-se após a confirmação do sinal de 50%.
              </p>
            </div>

            {/* Direita: Totalizador (5 colunas) */}
            <div className="md:col-span-5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-300 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Mão de Obra & Serviços:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrencyBRL(totalServicosExibido)}
                </span>
              </div>

              {quote.desconto > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Desconto Especial:</span>
                  <span>-{formatCurrencyBRL(quote.desconto)}</span>
                </div>
              )}

              <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline">
                <span className="font-black text-slate-900 text-sm uppercase">VALOR TOTAL:</span>
                <span className="text-2xl font-black text-slate-900">
                  {formatCurrencyBRL(valorTotalFinal)}
                </span>
              </div>

              <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong>Prazo de Execução:</strong> {quote.prazoExecucaoDias} dias úteis
                </p>
                <p>
                  <strong>Garantia do Serviço:</strong> {workshop.textoGarantia}
                </p>
              </div>
            </div>

          </div>

          {/* Observações Gerais e Assinaturas */}
          <div className="pt-2 border-t border-slate-200 text-xs space-y-4 print-avoid-break">
            {quote.observacoesGerais && (
              <div>
                <strong className="text-slate-800">Observações Gerais e Termos:</strong>
                <p className="text-slate-600 mt-0.5">{quote.observacoesGerais}</p>
              </div>
            )}

            {/* Linhas de Assinatura */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs text-slate-700">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold">{workshop.nomeOficina}</p>
                <p className="text-[10px] text-slate-500">Responsável Técnico / Funilaria & Pintura</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold">{quote.cliente.nome}</p>
                <p className="text-[10px] text-slate-500">Aceite do Cliente e Aprovação do Orçamento</p>
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
          >
            {/* Cabeçalho do Laudo Fotográfico */}
            <div className="border-b-2 border-slate-900 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {workshop.logotipoUrl ? (
                  <img
                    src={workshop.logotipoUrl}
                    alt={workshop.nomeOficina}
                    className="h-10 max-w-[130px] object-contain rounded"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Camera className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Laudo Fotográfico de Registro de Avarias & Vistoria
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    Anexo Oficial do Orçamento Nº <strong className="text-slate-900">{quote.numero}</strong> • Veículo:{' '}
                    <strong className="text-slate-900">{quote.veiculo.marca} {quote.veiculo.modelo} ({quote.veiculo.placa})</strong>
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-500 font-semibold">
                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-mono text-xs">
                  Página {pageIndex + 2} de {photoPages.length + 1}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
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
                    className="border border-slate-300 rounded-xl overflow-hidden bg-white flex flex-col"
                  >
                    {/* Imagem em alta definição sem fundo cinza e com proporção estabilizada */}
                    <div className="relative w-full h-48 sm:h-52 bg-white overflow-hidden flex items-center justify-center">
                      <img
                        src={foto.url}
                        alt={foto.descricao}
                        className="w-full h-full object-cover block"
                        crossOrigin="anonymous"
                      />
                      <span className="absolute top-2 left-2 bg-slate-900/90 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow">
                        Registro #{globalIndex + 1}
                      </span>
                    </div>

                    {/* Descrição e Data */}
                    <div className="p-2.5 space-y-1 bg-slate-50 border-t border-slate-200">
                      <p className="font-bold text-slate-900 text-[11px] leading-tight line-clamp-2">
                        {foto.descricao || `Avaria documentada #${globalIndex + 1}`}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
                        <span>Data do Registro: {foto.dataHora}</span>
                        <span className="font-semibold text-blue-700">AutoGold Inspeção</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rodapé do Laudo */}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
              <span>Documento fotográfico autenticado pela oficina {workshop.nomeOficina}</span>
              <span>{quote.numero}</span>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};
