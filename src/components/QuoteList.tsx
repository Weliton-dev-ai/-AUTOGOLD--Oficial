import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  Printer, 
  Edit3, 
  Trash2, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Car, 
  User, 
  Layers,
  ArrowUpDown,
  Camera,
  Sparkles
} from 'lucide-react';
import { Quote, QuoteStatus, WorkshopProfile } from '../types';
import { formatCurrencyBRL } from '../utils/calculator';
import { generateWhatsAppMessage, openWhatsAppDirect } from '../utils/whatsapp';

interface QuoteListProps {
  quotes: Quote[];
  workshop: WorkshopProfile;
  onEditQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: QuoteStatus) => void;
  onOpenPrintModal: (quote: Quote) => void;
  onNewQuoteClick: () => void;
}

export const QuoteList: React.FC<QuoteListProps> = ({
  quotes,
  workshop,
  onEditQuote,
  onDeleteQuote,
  onUpdateStatus,
  onOpenPrintModal,
  onNewQuoteClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Filter quotes
  const filteredQuotes = quotes.filter((q) => {
    const matchSearch =
      q.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.veiculo.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.veiculo.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.numero.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'todos' || q.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // Calculate statistics
  const totalVolume = quotes.reduce((acc, q) => acc + q.valorTotal, 0);
  const totalSinal50 = quotes.reduce((acc, q) => acc + q.valorSinal50, 0);
  const aprovadosCount = quotes.filter((q) => q.status === 'aprovado' || q.status === 'em_servico' || q.status === 'finalizado').length;

  const handleSendWhatsApp = (quote: Quote) => {
    const message = generateWhatsAppMessage(quote, workshop);
    openWhatsAppDirect(quote.cliente.telefone, message);
  };

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'aprovado':
        return {
          label: 'Aprovado (Sinal 50% Confirmado)',
          cls: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        };
      case 'em_servico':
        return {
          label: 'Em Funilaria / Pintura',
          cls: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
        };
      case 'finalizado':
        return {
          label: 'Finalizado / Pronto p/ Entrega',
          cls: 'bg-teal-950/80 text-teal-200 border-teal-500/40',
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          cls: 'bg-red-950/80 text-red-300 border-red-500/40',
        };
      case 'pendente':
      default:
        return {
          label: 'Aguardando Sinal / Aprovação',
          cls: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
        };
    }
  };

  return (
    <div id="quote-list-container" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
            Total em Orçamentos
          </span>
          <div className="text-2xl font-black text-white">
            {formatCurrencyBRL(totalVolume)}
          </div>
          <span className="text-[11px] text-blue-400 font-medium">
            {quotes.length} orçamentos cadastrados
          </span>
        </div>

        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
            Sinais 50% Previstos (Pix)
          </span>
          <div className="text-2xl font-black text-emerald-400">
            {formatCurrencyBRL(totalSinal50)}
          </div>
          <span className="text-[11px] text-emerald-500 font-medium">
            Entrada mínima para início de serviços
          </span>
        </div>

        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
            Serviços Confirmados
          </span>
          <div className="text-2xl font-black text-blue-400">
            {aprovadosCount}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Aprovados ou em execução na oficina
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-4 shadow-xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            id="input-busca-orcamentos"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por placa, cliente, modelo ou nº..."
            className="w-full pl-10 pr-4 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-[#0066FF]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'pendente', label: 'Pendente' },
            { id: 'aprovado', label: 'Aprovado' },
            { id: 'em_servico', label: 'Em Serviço' },
            { id: 'finalizado', label: 'Finalizado' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/30'
                  : 'bg-[#0A0A0C] text-slate-400 hover:text-white border border-[#1E3349]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quote Cards List */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-600" />
          <p className="font-bold text-slate-300">Nenhum orçamento encontrado.</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? 'Tente ajustar os termos de busca ou filtros de status.'
              : 'Clique no botão abaixo para criar seu primeiro orçamento de funilaria e pintura.'}
          </p>
          <button
            onClick={onNewQuoteClick}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-blue-600/30"
          >
            <Car className="w-4 h-4" />
            <span>Criar Orçamento Agora</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => {
            const statusInfo = getStatusBadge(quote.status);

            return (
              <div
                key={quote.id}
                className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 shadow-xl hover:border-blue-500/40 transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E3349] pb-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono font-bold text-sm text-blue-400 bg-[#0A0A0C] px-2.5 py-1 rounded-lg border border-[#1E3349]">
                      {quote.numero}
                    </span>

                    {quote.tipoOrcamento === 'polimento_estetica' ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400/20 text-yellow-300 border border-yellow-400/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                        Polimento
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30">
                        Funilaria & Pintura
                      </span>
                    )}

                    {quote.fotosAvarias && quote.fotosAvarias.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Camera className="w-3 h-3 text-emerald-400" />
                        {quote.fotosAvarias.length} {quote.fotosAvarias.length === 1 ? 'foto' : 'fotos'}
                      </span>
                    )}

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(quote.dataCriacao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Status:</span>
                    <select
                      value={quote.status}
                      onChange={(e) => onUpdateStatus(quote.id, e.target.value as QuoteStatus)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${statusInfo.cls}`}
                    >
                      <option value="pendente">Pendente (Aguardando Sinal)</option>
                      <option value="aprovado">Aprovado (Sinal 50% Pago)</option>
                      <option value="em_servico">Em Serviço (Oficina)</option>
                      <option value="finalizado">Finalizado (Pronto)</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Client Info */}
                  <div className="space-y-1 bg-[#0A0A0C] p-3 rounded-xl border border-[#1E3349]">
                    <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Cliente:</span>
                    </div>
                    <p className="font-bold text-slate-100 text-sm">{quote.cliente.nome}</p>
                    <p className="text-slate-400">WhatsApp: {quote.cliente.telefone}</p>
                    {quote.cliente.documento && (
                      <p className="text-slate-500 text-[11px]">Doc: {quote.cliente.documento}</p>
                    )}
                  </div>

                  {/* Vehicle Info */}
                  <div className="space-y-1 bg-[#0A0A0C] p-3 rounded-xl border border-[#1E3349]">
                    <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                      <Car className="w-3.5 h-3.5 text-blue-400" />
                      <span>Veículo:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-blue-950/80 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">
                        {quote.veiculo.placa}
                      </span>
                      <span className="font-bold text-slate-100 truncate">
                        {quote.veiculo.marca} {quote.veiculo.modelo}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      Cor: {quote.veiculo.cor || 'Não informada'} ({quote.veiculo.tipoPintura})
                    </p>
                  </div>

                  {/* Financial & 50% Signal */}
                  <div className="space-y-1 bg-gradient-to-br from-[#0e1b27] to-[#122131] p-3 rounded-xl border border-blue-500/30">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Valor Total:</span>
                      <span className="font-black text-sm text-white">{formatCurrencyBRL(quote.valorTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400 font-medium">
                      <span>Sinal 50% Pix:</span>
                      <span className="font-black">{formatCurrencyBRL(quote.valorSinal50)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-700/50">
                      <span>Prazo de Execução:</span>
                      <span className="font-bold text-slate-200">{quote.prazoExecucaoDias} dias</span>
                    </div>
                  </div>
                </div>

                {/* Items Summary Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-400" /> {quote.itens.length} peça(s):
                  </span>
                  {quote.itens.map((it, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-[#0A0A0C] border border-[#1E3349] text-[11px] text-slate-300"
                    >
                      {it.nomePeca} ({it.avaria})
                    </span>
                  ))}
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1E3349]">
                  <div className="flex items-center gap-2">
                    {/* WhatsApp button */}
                    <button
                      onClick={() => handleSendWhatsApp(quote)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-700/20 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {/* Print / PDF button */}
                    <button
                      onClick={() => onOpenPrintModal(quote)}
                      className="px-3.5 py-2 rounded-xl bg-[#0066FF] hover:bg-[#1A73E8] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir / PDF</span>
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => onEditQuote(quote)}
                      className="px-3 py-2 rounded-xl bg-[#0A0A0C] hover:bg-[#162536] text-blue-300 hover:text-white border border-[#223952] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => {
                      if (window.confirm(`Deseja excluir permanentemente o orçamento ${quote.numero}?`)) {
                        onDeleteQuote(quote.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-[#0A0A0C] hover:bg-red-950/50 text-slate-500 hover:text-red-400 border border-[#1E3349] transition-colors cursor-pointer"
                    title="Excluir orçamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
