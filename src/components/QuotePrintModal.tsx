import React, { useState, useEffect, useRef } from 'react';
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
  Share2,
  RotateCw,
  Maximize2,
  Sliders,
  ZoomIn,
  Plus,
  Trash2
} from 'lucide-react';
import { Quote, WorkshopProfile, DamagePhoto } from '../types';
import { formatCurrencyBRL } from '../utils/calculator';
import { generateWhatsAppMessage, openWhatsAppDirect } from '../utils/whatsapp';
import { downloadQuotePdf, sharePdfOrWhatsApp } from '../utils/pdfGenerator';
import { rotateImageDataUrl, compressImage } from '../utils/imageCompressor';

interface QuotePrintModalProps {
  quote: Quote;
  workshop: WorkshopProfile;
  onClose: () => void;
  onUpdateQuote?: (quote: Quote) => void;
}

export const QuotePrintModal: React.FC<QuotePrintModalProps> = ({
  quote,
  workshop,
  onClose,
  onUpdateQuote,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Estados de layout, ajuste e rotação das fotos
  const [photosList, setPhotosList] = useState<DamagePhoto[]>(quote.fotosAvarias || []);
  const [rotatingPhotoId, setRotatingPhotoId] = useState<string | null>(null);
  const [photoLayout, setPhotoLayout] = useState<'4_per_page' | '2_per_page' | '6_per_page'>('4_per_page');
  const [photoFit, setPhotoFit] = useState<'contain' | 'cover'>('contain');
  const [fitScreen, setFitScreen] = useState(true);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar fotos caso a prop mude
  useEffect(() => {
    setPhotosList(quote.fotosAvarias || []);
  }, [quote.fotosAvarias]);

  // Listener para responsividade da visualização do papel A4
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calcular escala para enquadramento perfeito na tela do celular/computador
  const previewScale = React.useMemo(() => {
    if (!fitScreen || screenWidth >= 850) return 1;
    const availableWidth = screenWidth - 24;
    return Math.min(1, Math.max(0.38, availableWidth / 794));
  }, [fitScreen, screenWidth]);

  // Adicionar novas fotos diretamente no laudo
  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFeedbackMsg({ type: 'info', text: 'Otimizando e anexando fotos ao orçamento...' });
    try {
      const newPhotos: DamagePhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await compressImage(file, 1920, 0.92);
        const dataFormatada = new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        newPhotos.push({
          id: `foto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: dataUrl,
          descricao: `Registro de Avaria / Vistoria - ${quote.veiculo.modelo}`,
          dataHora: dataFormatada,
        });
      }

      const updated = [...photosList, ...newPhotos];
      setPhotosList(updated);
      if (onUpdateQuote) {
        onUpdateQuote({
          ...quote,
          fotosAvarias: updated,
        });
      }
      setFeedbackMsg({ type: 'success', text: `${newPhotos.length} foto(s) anexada(s) ao orçamento e PDF!` });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Erro ao adicionar fotos:', err);
      setFeedbackMsg({ type: 'error', text: 'Não foi possível processar as imagens.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remover foto específica do laudo
  const handleRemovePhoto = (photoId: string) => {
    const updated = photosList.filter((p) => p.id !== photoId);
    setPhotosList(updated);
    if (onUpdateQuote) {
      onUpdateQuote({
        ...quote,
        fotosAvarias: updated,
      });
    }
    setFeedbackMsg({ type: 'info', text: 'Foto removida do orçamento.' });
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  // Girar foto em 90 graus no laudo e persistir
  const handleRotatePhoto = async (photoId: string) => {
    const target = photosList.find((p) => p.id === photoId);
    if (!target || rotatingPhotoId) return;

    setRotatingPhotoId(photoId);
    try {
      const rotatedUrl = await rotateImageDataUrl(target.url, 90);
      const updated = photosList.map((p) => (p.id === photoId ? { ...p, url: rotatedUrl } : p));
      setPhotosList(updated);
      if (onUpdateQuote) {
        onUpdateQuote({
          ...quote,
          fotosAvarias: updated,
        });
      }
      setFeedbackMsg({ type: 'success', text: 'Foto girada 90° com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Erro ao girar foto:', err);
      setFeedbackMsg({ type: 'error', text: 'Não foi possível girar a foto.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setRotatingPhotoId(null);
    }
  };

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

  const hasPhotos = photosList && photosList.length > 0;

  // Agrupar fotos em páginas de acordo com a opção selecionada:
  // 4 fotos (2x2 padrão A4), 2 fotos (grandes para laudo detalhado), 6 fotos (compacto)
  const chunkSize = photoLayout === '2_per_page' ? 2 : photoLayout === '6_per_page' ? 6 : 4;
  const photoPages = React.useMemo(() => {
    if (!photosList || photosList.length === 0) return [];
    const pages: DamagePhoto[][] = [];
    for (let i = 0; i < photosList.length; i += chunkSize) {
      pages.push(photosList.slice(i, i + chunkSize));
    }
    return pages;
  }, [photosList, chunkSize]);

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
                {photosList.length} fotos
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

        {/* Barra de Ajuste de Visualização, Layout e Orientação de Fotos (Oculta na Impressão) */}
        <div className="bg-[#0f172a] border-b border-[#1E3349] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-300 print:hidden">
          {/* Input oculto para carregar fotos diretamente */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleAddPhotos}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Ajuste de Enquadramento na Tela (Mobile / Tablet / PC) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFitScreen(!fitScreen)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  fitScreen 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                    : 'bg-[#1e293b] text-slate-300 border-[#334155] hover:bg-[#334155]'
                }`}
                title="Ajusta o documento A4 à tela do celular ou exibe em 100% real"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{fitScreen && previewScale < 1 ? 'Ajustado à Tela' : 'Tamanho 100%'}</span>
              </button>
            </div>

            {/* Botão de Adicionar / Anexar Fotos diretamente */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm border border-emerald-500"
              title="Anexar fotos do veículo ou peças danificadas ao laudo pericial"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Fotos</span>
            </button>

            {hasPhotos && (
              <>
                <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

                {/* Fotos por Folha */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Fotos por folha:</span>
                  <div className="flex rounded-lg bg-[#1e293b] p-0.5 border border-[#334155]">
                    <button
                      type="button"
                      onClick={() => setPhotoLayout('4_per_page')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        photoLayout === '4_per_page' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                      title="4 fotos por folha (2 colunas x 2 linhas) - Enquadramento perfeito A4"
                    >
                      4 fotos (Padrão)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoLayout('2_per_page')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        photoLayout === '2_per_page' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                      title="2 fotos por folha - Fotos grandes com alto nível de detalhe"
                    >
                      2 fotos (Grandes)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoLayout('6_per_page')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        photoLayout === '6_per_page' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                      title="6 fotos por folha - Economiza folhas para muitas fotos"
                    >
                      6 fotos (Compacto)
                    </button>
                  </div>
                </div>

                {/* Enquadramento das fotos (Conter sem cortes vs Preencher) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] font-medium hidden md:inline">Enquadramento:</span>
                  <div className="flex rounded-lg bg-[#1e293b] p-0.5 border border-[#334155]">
                    <button
                      type="button"
                      onClick={() => setPhotoFit('contain')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        photoFit === 'contain' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Foto inteira sem cortar partes do veículo (ideal para vistoria)"
                    >
                      Conter (Foto Inteira)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoFit('cover')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        photoFit === 'cover' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Preenche todo o retângulo"
                    >
                      Preencher
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {hasPhotos && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Girar foto no laudo: clique em</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white border border-white/20 font-semibold text-[10px]">
                <RotateCw className="w-3 h-3 text-blue-400" /> 90°
              </span>
            </div>
          )}
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

        {/* Container responsivo com rolagem suave ou auto-ajuste de escala no celular */}
        <div className="bg-slate-900/40 p-2 sm:p-6 overflow-x-auto flex justify-center print:bg-white print:p-0">
          <div
            style={{
              width: previewScale < 1 ? `${Math.round(794 * previewScale)}px` : '794px',
              transition: 'width 0.2s ease',
            }}
            className="flex flex-col items-center"
          >
            {/* Canvas de Documento Timbrado Imprimível (A4) com ID para html2canvas & jsPDF */}
            <div
              id="printable-quote-content"
              className="text-slate-900 font-sans flex flex-col items-center gap-6 print:gap-0"
              style={{
                width: '794px',
                minWidth: '794px',
                maxWidth: '794px',
                transform: (!isGeneratingPdf && previewScale < 1) ? `scale(${previewScale})` : 'none',
                transformOrigin: 'top center',
                color: '#0f172a',
                fontFamily: 'Arial, Helvetica, sans-serif',
              }}
            >
          {/* PÁGINA 1: ORÇAMENTO TIMBRADO OFICIAL A4 */}
          <div
            className="pdf-page bg-white shadow-2xl rounded-xl space-y-4 print:shadow-none print:m-0 print:rounded-none"
            style={{
              width: '794px',
              minWidth: '794px',
              maxWidth: '794px',
              padding: '36px 40px',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              color: '#0f172a',
            }}
          >
            {/* Cabeçalho da Oficina com Logotipo & Dados Fiscais */}
            <div
              className="flex items-center justify-between gap-4 pb-4 print-avoid-break"
              style={{ borderBottom: '2px solid #0f172a' }}
            >
              <div className="flex items-center gap-4">
                {workshop.logotipoUrl ? (
                  <div
                    className="h-16 max-w-[180px] flex items-center justify-start shrink-0"
                    style={{
                      backgroundImage: `url("${workshop.logotipoUrl}")`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'left center',
                      backgroundRepeat: 'no-repeat',
                      width: '180px',
                      height: '64px',
                    }}
                  >
                    <img
                      src={workshop.logotipoUrl}
                      alt={workshop.nomeOficina}
                      className="h-16 max-w-[180px] object-contain rounded shrink-0 opacity-0 pointer-events-none"
                      loading="eager"
                    />
                  </div>
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex flex-col items-center justify-center font-black shadow-sm shrink-0"
                    style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                  >
                    <span className="text-[11px] uppercase font-bold" style={{ color: '#60a5fa' }}>AUTO</span>
                    <span className="text-sm font-bold" style={{ color: '#facc15' }}>GOLD</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold" style={{ color: '#0f172a', lineHeight: '1.25' }}>
                    {workshop.nomeOficina}
                  </h1>
                  {workshop.razaoSocial && (
                    <p className="text-xs font-medium truncate" style={{ color: '#475569', lineHeight: '1.4' }}>{workshop.razaoSocial}</p>
                  )}
                  {workshop.cnpj && (
                    <p className="text-xs" style={{ color: '#475569', lineHeight: '1.4' }}>CNPJ: {workshop.cnpj}</p>
                  )}
                  <p className="text-xs" style={{ color: '#475569', lineHeight: '1.4' }}>
                    {workshop.endereco} - {workshop.cidadeUf}
                  </p>
                  <p className="text-xs font-bold" style={{ color: '#1e293b', lineHeight: '1.4' }}>
                    WhatsApp: {workshop.telefoneWhatsApp} {workshop.telefoneFixo ? `| Fixo: ${workshop.telefoneFixo}` : ''}
                  </p>
                </div>
              </div>

              {/* Número e Validade do Orçamento */}
              <div
                className="text-right p-3.5 rounded-xl shrink-0"
                style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}
              >
                <span className="block text-[10px] font-bold uppercase" style={{ color: '#64748b', lineHeight: '1.3' }}>
                  {quote.tipoOrcamento === 'polimento_estetica'
                    ? 'Orçamento de Polimento & Estética'
                    : quote.tipoOrcamento === 'misto'
                    ? 'Orçamento de Funilaria & Polimento'
                    : 'Orçamento de Funilaria e Pintura'}
                </span>
                <span className="block text-lg font-black font-mono" style={{ color: '#0f172a', lineHeight: '1.2', marginTop: '2px' }}>
                  {quote.numero}
                </span>
                <div className="mt-1.5 text-xs space-y-0.5" style={{ color: '#475569', lineHeight: '1.4' }}>
                  <p>
                    <strong>Emissão:</strong> {new Date(quote.dataCriacao).toLocaleDateString('pt-BR')}
                  </p>
                  <p>
                    <strong>Validade:</strong> {new Date(quote.dataValidade).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Dados do Cliente e Identificação do Veículo (2 Colunas Fixas) */}
            <div className="grid grid-cols-2 gap-4 print-avoid-break">
              {/* Caixa Cliente */}
              <div
                className="p-3.5 rounded-xl space-y-1.5 text-xs"
                style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
              >
                <div
                  className="font-bold text-xs uppercase block mb-1 pb-1"
                  style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0', lineHeight: '1.4' }}
                >
                  Dados do Cliente
                </div>
                <div style={{ lineHeight: '1.4' }}>
                  <strong style={{ color: '#334155' }}>Nome: </strong>
                  <span className="font-bold text-sm" style={{ color: '#0f172a' }}>{quote.cliente.nome}</span>
                </div>
                <div style={{ lineHeight: '1.4' }}>
                  <strong style={{ color: '#334155' }}>Telefone / WhatsApp: </strong>
                  <span style={{ color: '#1e293b' }}>{quote.cliente.telefone || 'Não informado'}</span>
                </div>
                {quote.cliente.documento && (
                  <div style={{ lineHeight: '1.4' }}>
                    <strong style={{ color: '#334155' }}>CPF / CNPJ: </strong>
                    <span style={{ color: '#1e293b' }}>{quote.cliente.documento}</span>
                  </div>
                )}
              </div>

              {/* Caixa Veículo */}
              <div
                className="p-3.5 rounded-xl space-y-1.5 text-xs"
                style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
              >
                <div
                  className="font-bold text-xs uppercase block mb-1 pb-1"
                  style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0', lineHeight: '1.4' }}
                >
                  Identificação do Veículo
                </div>
                <div style={{ lineHeight: '1.4' }}>
                  <strong style={{ color: '#334155' }}>Veículo / Modelo: </strong>
                  <span className="font-bold text-sm" style={{ color: '#0f172a' }}>
                    {quote.veiculo.marca ? `${quote.veiculo.marca} ` : ''}{quote.veiculo.modelo || 'Veículo'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-0.5" style={{ lineHeight: '1.4' }}>
                  <strong style={{ color: '#334155' }}>Placa Oficial: </strong>
                  <span
                    className="font-mono font-bold px-2.5 py-0.5 rounded text-xs"
                    style={{ backgroundColor: '#e2e8f0', color: '#0f172a', border: '1px solid #94a3b8' }}
                  >
                    {quote.veiculo.placa || 'A DEFINIR'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabela de Serviços: Larguras Fixas Estabilizadas com colgroup e sem sobreposição */}
            <div
              className="rounded-xl overflow-hidden print-avoid-break shadow-sm w-full"
              style={{ border: '1px solid #cbd5e1' }}
            >
              <table className="w-full text-left text-xs border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '42px' }} />
                  <col style={{ width: '350px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '146px' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ width: '42px', padding: '9px 6px', textAlign: 'center' }} className="text-[10px] uppercase font-bold">#</th>
                    <th style={{ width: '350px', padding: '9px 12px' }} className="text-[10px] uppercase font-bold">Peça / Serviço</th>
                    <th style={{ width: '180px', padding: '9px 12px' }} className="text-[10px] uppercase font-bold">Discriminação</th>
                    <th style={{ width: '146px', padding: '9px 12px', textAlign: 'right' }} className="text-[10px] uppercase font-bold whitespace-nowrap">Preço (R$)</th>
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
                        <td style={{ width: '42px', padding: '9px 6px', textAlign: 'center', verticalAlign: 'middle' }} className="font-bold text-xs text-slate-500">
                          {idx + 1}
                        </td>
                        <td style={{ width: '350px', padding: '9px 12px', verticalAlign: 'middle' }}>
                          <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '12px', lineHeight: '1.35' }}>
                            {item.nomePeca}
                          </div>
                          {item.observacoes && (
                            <div style={{ color: '#64748b', fontSize: '10px', lineHeight: '1.3', marginTop: '2px' }}>
                              Obs: {item.observacoes}
                            </div>
                          )}
                        </td>
                        <td style={{ width: '180px', padding: '9px 12px', verticalAlign: 'middle' }}>
                          {isPolishing ? (
                            <span
                              className="inline-block px-2.5 py-1 rounded text-[10px] font-bold"
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fcd34d',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Polimento & Estética
                            </span>
                          ) : (
                            <span
                              className="inline-block px-2.5 py-1 rounded text-[10px] font-bold"
                              style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                border: '1px solid #93c5fd',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Mão de Obra & Pintura
                            </span>
                          )}
                        </td>
                        <td style={{ width: '146px', padding: '9px 12px', textAlign: 'right', verticalAlign: 'middle' }} className="font-black text-sm whitespace-nowrap tabular-nums text-slate-900">
                          {formatCurrencyBRL(item.valorTotalItem)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumo Financeiro com Caixa de Sinal de 50% Pix e Totalizador */}
            <div className="grid grid-cols-12 gap-4 items-start print-avoid-break">
              {/* Esquerda: Caixa de Entrada 50% via Pix (7 colunas) */}
              <div
                className="col-span-7 p-4 rounded-2xl space-y-3"
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: '1px solid #1e293b',
                }}
              >
                <div
                  className="flex items-center justify-between pb-2"
                  style={{ borderBottom: '1px solid #334155' }}
                >
                  <span
                    className="font-bold text-xs uppercase flex items-center gap-1.5"
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
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: '#022c22',
                      border: '1px solid #059669',
                    }}
                  >
                    <span
                      className="block text-[10px] uppercase font-bold"
                      style={{ color: '#6ee7b7' }}
                    >
                      Sinal de Entrada (50%):
                    </span>
                    <span
                      className="text-xl font-black block mt-0.5 tabular-nums"
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
                      className="block text-[10px] uppercase font-bold"
                      style={{ color: '#94a3b8' }}
                    >
                      Saldo na Entrega (50%):
                    </span>
                    <span
                      className="text-xl font-bold block mt-0.5 tabular-nums"
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
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>
                      Chave Pix ({workshop.tipoChavePix}):
                    </span>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span
                        className="font-mono font-bold select-all text-sm px-2.5 py-1 rounded-lg truncate"
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
                    className="flex items-center justify-between gap-1 text-xs pt-2"
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

              {/* Direita: Totalizador (5 colunas) */}
              <div
                className="col-span-5 p-4 rounded-2xl space-y-2.5 text-xs"
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
                  <span className="font-black text-sm uppercase" style={{ color: '#0f172a' }}>
                    VALOR TOTAL:
                  </span>
                  <span className="text-2xl font-black tabular-nums" style={{ color: '#0f172a' }}>
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

          {/* BANNER PARA ANEXAR FOTOS SE O ORÇAMENTO NÃO POSSUIR AINDA */}
          {!hasPhotos && (
            <div className="w-[794px] bg-[#121E2B] border-2 border-dashed border-[#1E3349] hover:border-blue-500/50 rounded-2xl p-6 text-center text-slate-300 space-y-3 print:hidden shadow-xl transition-all">
              <div className="w-12 h-12 mx-auto rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Anexar Fotos ao Laudo do Orçamento</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Deseja incluir fotos de avarias, peças danificadas ou vistoria do veículo?
                  Elas serão inseridas nas próximas folhas do PDF oficial em alta resolução com laudo timbrado.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Selecionar e Anexar Fotos Agora</span>
                </button>
              </div>
            </div>
          )}

          {/* PÁGINAS DO LAUDO FOTOGRÁFICO DE REGISTRO DE AVARIAS (IMPRESSO COM O ORÇAMENTO) */}
          {hasPhotos && photoPages.map((pagePhotos, pageIndex) => {
            const gridColsClass = photoLayout === '2_per_page' 
              ? 'grid-cols-2 gap-5' 
              : photoLayout === '6_per_page' 
              ? 'grid-cols-2 gap-3' 
              : 'grid-cols-2 gap-4';

            const imageHeightClass = photoLayout === '2_per_page' 
              ? 'h-64' 
              : photoLayout === '6_per_page' 
              ? 'h-32' 
              : 'h-44';

            return (
              <div
                key={`photo-page-${pageIndex}`}
                className="pdf-page bg-white shadow-2xl rounded-xl space-y-4 print:shadow-none print:m-0 print:rounded-none print-page-break"
                style={{
                  width: '794px',
                  minWidth: '794px',
                  maxWidth: '794px',
                  padding: '36px 40px',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                }}
              >
                {/* Cabeçalho do Laudo Fotográfico */}
                <div
                  className="pb-3 flex items-center justify-between gap-3"
                  style={{ borderBottom: '2px solid #0f172a' }}
                >
                  <div className="flex items-center gap-2.5">
                    {workshop.logotipoUrl ? (
                      <div
                        className="h-10 max-w-[130px] flex items-center justify-start shrink-0"
                        style={{
                          backgroundImage: `url("${workshop.logotipoUrl}")`,
                          backgroundSize: 'contain',
                          backgroundPosition: 'left center',
                          backgroundRepeat: 'no-repeat',
                          width: '130px',
                          height: '40px',
                        }}
                      >
                        <img
                          src={workshop.logotipoUrl}
                          alt={workshop.nomeOficina}
                          className="h-10 max-w-[130px] object-contain rounded opacity-0 pointer-events-none"
                          loading="eager"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                      >
                        <Camera className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-sm font-bold uppercase" style={{ color: '#0f172a' }}>
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
                      Fotos {pageIndex * chunkSize + 1} a {Math.min((pageIndex + 1) * chunkSize, photosList.length)} de {photosList.length}
                    </p>
                  </div>
                </div>

                {/* Grade de Fotos do Laudo: Configuração de Colunas e Altura Estabilizada */}
                <div className={`grid ${gridColsClass}`}>
                  {pagePhotos.map((foto, index) => {
                    const globalIndex = pageIndex * chunkSize + index;
                    return (
                      <div
                        key={foto.id}
                        className="rounded-xl overflow-hidden flex flex-col shadow-sm"
                        style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                      >
                        {/* Imagem com proporção estabilizada, background-image nativo para html2canvas e enquadramento seguro */}
                        <div
                          className={`relative w-full ${imageHeightClass} overflow-hidden flex items-center justify-center`}
                          style={{
                            backgroundColor: '#0f172a',
                            backgroundImage: `url("${foto.url}")`,
                            backgroundSize: photoFit === 'contain' ? 'contain' : 'cover',
                            backgroundPosition: 'center center',
                            backgroundRepeat: 'no-repeat',
                          }}
                        >
                          <img
                            src={foto.url}
                            alt={foto.descricao || 'Foto de avaria'}
                            className={`w-full h-full block select-none ${
                              photoFit === 'contain' ? 'object-contain' : 'object-cover'
                            }`}
                            loading="eager"
                          />
                          <span
                            className="absolute top-2 left-2 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow"
                            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                          >
                            Registro #{globalIndex + 1}
                          </span>

                          <div className="absolute top-2 right-2 flex items-center gap-1.5 print:hidden">
                            {/* Botão de Girar Foto 90° (Visível no preview, oculto na impressão / PDF) */}
                            <button
                              type="button"
                              onClick={() => handleRotatePhoto(foto.id)}
                              disabled={rotatingPhotoId === foto.id}
                              title="Girar foto 90° no sentido horário"
                              className="p-1.5 rounded-lg bg-black/75 hover:bg-blue-600 text-white transition-colors cursor-pointer shadow-md disabled:opacity-50"
                            >
                              {rotatingPhotoId === foto.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                              ) : (
                                <RotateCw className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Botão de Remover Foto */}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(foto.id)}
                              title="Remover esta foto do laudo"
                              className="p-1.5 rounded-lg bg-black/75 hover:bg-red-600 text-white transition-colors cursor-pointer shadow-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Descrição e Data */}
                        <div
                          className="p-2.5 space-y-1"
                          style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}
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
            );
          })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
