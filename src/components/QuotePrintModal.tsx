import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Send, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  Camera
} from 'lucide-react';
import { Quote, WorkshopProfile } from '../types';
import { formatCurrencyBRL, getDamageLevelLabel } from '../utils/calculator';
import { generateWhatsAppMessage, openWhatsAppDirect } from '../utils/whatsapp';
import { generatePixQrCodeDataUrl } from '../utils/pixQrCode';

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Gerar QR Code do Pix real para exibição no PDF e na tela
  useEffect(() => {
    let isMounted = true;
    generatePixQrCodeDataUrl(
      workshop.chavePix,
      workshop.titularPix,
      workshop.cidadeUf,
      quote.valorSinal50
    ).then((url) => {
      if (isMounted) {
        setQrCodeDataUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [workshop.chavePix, workshop.titularPix, workshop.cidadeUf, quote.valorSinal50]);

  const handlePrint = () => {
    // Garante foco antes de chamar print para evitar problemas no iframe
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

  const handleSendWhatsApp = () => {
    const text = generateWhatsAppMessage(quote, workshop);
    openWhatsAppDirect(quote.cliente.telefone, text);
  };

  const hasPhotos = quote.fotosAvarias && quote.fotosAvarias.length > 0;

  return (
    <div id="modal-impressao-orcamento" className="fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0C]/90 backdrop-blur-md p-2 sm:p-6 flex justify-center items-start print:p-0 print:bg-white print:static print:inset-auto">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4 print:border-none print:shadow-none print:m-0 print:rounded-none print:w-full print:max-w-none">
        
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="p-4 bg-[#121E2B] border-b border-[#1E3349] text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-blue-400">Visualização de Orçamento / PDF</span>
            <span className="text-xs text-slate-400">({quote.numero})</span>
            {hasPhotos && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                {quote.fotosAvarias?.length} fotos anexadas
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#1A73E8] text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Gerar PDF</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyFormattedText}
              className="px-3 py-1.5 rounded-xl bg-[#0A0A0C] hover:bg-[#162536] text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-[#223952] cursor-pointer transition-all"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#0A0A0C] hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-[#223952] transition-colors cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas de Documento Timbrado Imprimível (A4) */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 font-sans print:p-2 print:space-y-4">
          
          {/* Cabeçalho da Oficina com Logotipo & Dados Fiscais */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-5 print-avoid-break">
            <div className="flex items-center gap-4">
              {workshop.logotipoUrl ? (
                <img
                  src={workshop.logotipoUrl}
                  alt={workshop.nomeOficina}
                  className="h-16 max-w-[180px] object-contain rounded"
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
                <strong className="text-slate-700">Telefone / WhatsApp:</strong> {quote.cliente.telefone}
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
                  {quote.veiculo.marca ? `${quote.veiculo.marca} ` : ''}{quote.veiculo.modelo}
                </span>
              </p>
              <p>
                <strong className="text-slate-700">Placa:</strong>{' '}
                <span className="font-mono font-bold px-2 py-0.5 bg-slate-200 rounded text-slate-900 text-sm">
                  {quote.veiculo.placa}
                </span>
              </p>
            </div>
          </div>

          {/* Tabela de Serviços e Itens: APENAS MÃO DE OBRA E INFORMAÇÃO DO POLIMENTO */}
          <div className="border border-slate-300 rounded-xl overflow-hidden print-avoid-break">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">Item</th>
                  <th className="py-2.5 px-3 w-1/3">Peça / Serviço</th>
                  <th className="py-2.5 px-3">Discriminação (Mão de Obra / Polimento)</th>
                  <th className="py-2.5 px-3 text-right w-32">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quote.itens.map((item, idx) => {
                  const isPolishing = item.pecaId.startsWith('polimento_') || item.pecaId.startsWith('addon_');
                  const avariaInfo = getDamageLevelLabel(item.avaria);

                  return (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block text-xs sm:text-[13px]">{item.nomePeca}</span>
                        {isPolishing ? (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Polimento / Estética
                          </span>
                        ) : (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                            Funilaria & Pintura
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isPolishing ? (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 block text-xs">
                              Informação do Polimento:
                            </span>
                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {item.observacoes || 'Polimento automotivo técnico com remoção de microrriscos e proteção de verniz.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block text-xs">
                              Mão de Obra de Funilaria e Pintura ({avariaInfo.label})
                            </span>
                            {item.observacoes && (
                              <p className="text-slate-500 text-[11px] italic">
                                Detalhes: {item.observacoes}
                              </p>
                            )}
                          </div>
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
                <span className="text-[11px] text-slate-300">Reserva de Box</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Sinal de Entrada (50%):</span>
                  <span className="text-2xl font-black text-emerald-400">
                    {formatCurrencyBRL(quote.valorSinal50)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Saldo na Entrega (50%):</span>
                  <span className="text-lg font-bold text-slate-200">
                    {formatCurrencyBRL(quote.valorRestante50)}
                  </span>
                </div>
              </div>

              {/* Informações Pix + QR Code Dinâmico Real */}
              <div className="p-3 bg-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">
                      Chave Pix ({workshop.tipoChavePix.toUpperCase()}):
                    </span>
                    <button
                      onClick={handleCopyPix}
                      className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-bold text-white cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Copiado!' : 'Copiar Pix'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-yellow-400 font-bold text-xs sm:text-sm select-all break-all">
                    {workshop.chavePix}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Favorecido: <strong>{workshop.titularPix}</strong>
                  </p>
                </div>

                {/* QR Code Real Gerado para Impressão */}
                {qrCodeDataUrl && (
                  <div className="bg-white p-1 rounded-lg shrink-0 flex flex-col items-center">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code Pix"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                    />
                    <span className="text-[8px] font-bold text-slate-800 uppercase tracking-tight text-center mt-0.5">
                      Pague com Pix
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                * O início da execução dos serviços e agendamento inicia-se após a confirmação do sinal.
              </p>
            </div>

            {/* Direita: Totais Finais (5 colunas) */}
            <div className="md:col-span-5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-300 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Mão de Obra & Serviços:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrencyBRL(quote.subtotalMaoDeObra + quote.subtotalInsumosFracionados + quote.subtotalPecasReposicao + quote.valorLucro)}
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
                  {formatCurrencyBRL(quote.valorTotal)}
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

          {/* LAUDO FOTOGRÁFICO DE REGISTRO DE AVARIAS (IMPRESSO COM O ORÇAMENTO) */}
          {hasPhotos && (
            <div className="print-page-break pt-6 space-y-4">
              
              {/* Cabeçalho do Laudo Fotográfico */}
              <div className="border-b-2 border-slate-900 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Camera className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Laudo Fotográfico de Registro de Avarias & Vistoria
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      Anexo Oficial do Orçamento Nº {quote.numero} • Veículo: {quote.veiculo.marca} {quote.veiculo.modelo} ({quote.veiculo.placa})
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500 font-semibold">
                  Total de Fotos Registradas: {quote.fotosAvarias?.length}
                </div>
              </div>

              {/* Grade de Fotos do Laudo */}
              <div className="grid grid-cols-2 gap-4">
                {quote.fotosAvarias?.map((foto, index) => (
                  <div
                    key={foto.id}
                    className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 print-avoid-break flex flex-col shadow-sm"
                  >
                    {/* Imagem em alta definição */}
                    <div className="aspect-[4/3] bg-slate-200 relative flex items-center justify-center overflow-hidden">
                      <img
                        src={foto.url}
                        alt={foto.descricao}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-slate-900 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                        Registro #{index + 1}
                      </span>
                    </div>

                    {/* Descrição e Data */}
                    <div className="p-2.5 space-y-1 bg-white border-t border-slate-200">
                      <p className="font-bold text-slate-900 text-[11px] leading-tight">
                        {foto.descricao || `Avaria documentada #${index + 1}`}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
                        <span>Data do Registro: {foto.dataHora}</span>
                        <span className="font-semibold text-blue-700">AutoGold Inspeção</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rodapé do Laudo */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 print-avoid-break">
                <span>Documento fotográfico autenticado pela oficina {workshop.nomeOficina}</span>
                <span>Página Anexa de Vistoria Fotográfica</span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
