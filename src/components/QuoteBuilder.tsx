import React, { useState } from 'react';
import { 
  Car, 
  User, 
  Plus, 
  Trash2, 
  Send, 
  Printer, 
  Save, 
  RotateCcw, 
  Check, 
  Clock, 
  DollarSign, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Percent,
  Layers,
  Wrench,
  Paintbrush,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { 
  BodyPartItem, 
  ClientInfo, 
  DamageLevel, 
  DamagePhoto,
  MaterialInsumo, 
  PaintType, 
  PolishingDegree,
  Quote, 
  QuoteItem, 
  VehicleChecklist,
  VehicleInfo, 
  VehicleSize,
  WorkshopProfile 
} from '../types';
import { 
  calculateQuoteItem, 
  calculateQuoteTotals, 
  formatCurrencyBRL, 
  getDamageLevelLabel, 
  getPaintTypeMultiplier,
  recalculateQuoteItemsWithMargin
} from '../utils/calculator';
import { DEFAULT_BODY_PARTS } from '../data/defaultData';
import { POLISHING_PACKAGES, POLISHING_ADDONS } from '../data/polishingData';
import { generateWhatsAppMessage, openWhatsAppDirect } from '../utils/whatsapp';
import { DamageInspectionPhotos } from './DamageInspectionPhotos';

interface QuoteBuilderProps {
  workshop: WorkshopProfile;
  materials: MaterialInsumo[];
  onSaveQuote: (quote: Quote) => void;
  onOpenPrintModal: (quote: Quote) => void;
  editingQuote?: Quote | null;
  onCancelEdit?: () => void;
  onNavigateToList?: () => void;
}

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({
  workshop,
  materials,
  onSaveQuote,
  onOpenPrintModal,
  editingQuote,
  onCancelEdit,
  onNavigateToList,
}) => {
  // Client Info State
  const [cliente, setCliente] = useState<ClientInfo>(
    editingQuote?.cliente || {
      nome: '',
      telefone: '',
      email: '',
      documento: '',
    }
  );

  // Vehicle Info State
  const [veiculo, setVeiculo] = useState<VehicleInfo>(
    editingQuote?.veiculo || {
      placa: '',
      marca: '',
      modelo: '',
      ano: new Date().getFullYear().toString(),
      cor: '',
      tipoPintura: 'metalica',
      km: '',
    }
  );

  // Financial settings for this quote
  const [margemLucro, setMargemLucro] = useState<number>(
    editingQuote?.margemLucroAplicada ?? workshop.margemLucroPadrao
  );

  // Items State (garante itens recalculados com margem de lucro por peça)
  const [itens, setItens] = useState<QuoteItem[]>(() => {
    if (!editingQuote?.itens) return [];
    const margem = editingQuote.margemLucroAplicada ?? workshop.margemLucroPadrao;
    return recalculateQuoteItemsWithMargin(editingQuote.itens, margem);
  });

  // Atualiza margem e recalcula instantaneamente o preço de venda de cada peça
  const handleMargemLucroChange = (newMargin: number) => {
    const val = isNaN(newMargin) ? 0 : Math.max(0, newMargin);
    setMargemLucro(val);
    setItens((prev) => recalculateQuoteItemsWithMargin(prev, val));
  };

  // Photos of damages and inspection checklist
  const [fotosAvarias, setFotosAvarias] = useState<DamagePhoto[]>(editingQuote?.fotosAvarias || []);
  const [checklistVistoria, setChecklistVistoria] = useState<VehicleChecklist>(
    editingQuote?.checklistVistoria || {
      nivelCombustivel: '1/2',
      kmEntrada: '',
      possuiEstepe: true,
      possuiMacacoChave: true,
    }
  );

  // Sub-aba no construtor de orçamento: Funilaria & Pintura vs Polimento & Estética
  const [serviceTab, setServiceTab] = useState<'funilaria' | 'polimento'>('funilaria');

  // Selected piece to add (Funilaria)
  const [selectedPartId, setSelectedPartId] = useState<string>(DEFAULT_BODY_PARTS[0].id);
  const [selectedDamage, setSelectedDamage] = useState<DamageLevel>('media');
  const [itemObs, setItemObs] = useState<string>('');
  const [customPartCost, setCustomPartCost] = useState<number>(0);

  // Polishing State (3 Graus e Porte)
  const [polishingDegree, setPolishingDegree] = useState<PolishingDegree>('tecnico');
  const [polishingVehicleSize, setPolishingVehicleSize] = useState<VehicleSize>('medio');
  const [customPolishingPrice, setCustomPolishingPrice] = useState<number>(
    () => POLISHING_PACKAGES.tecnico.precosPorPorte.medio
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [desconto, setDesconto] = useState<number>(editingQuote?.desconto || 0);
  const [prazoDias, setPrazoDias] = useState<number>(editingQuote?.prazoExecucaoDias || 3);
  const [obsGerais, setObsGerais] = useState<string>(
    editingQuote?.observacoesGerais || 'Veículo com verniz e peças originais. Serviço com garantia padrão da oficina.'
  );

  // UI state
  const [expandedItemDetails, setExpandedItemDetails] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  // Calculate live quote totals
  const totals = calculateQuoteTotals(itens, margemLucro, desconto);

  // Quick helper to add item (já com a margem de lucro embutida no valor da peça)
  const handleAddItem = () => {
    setErrorMsg('');
    const bodyPart = DEFAULT_BODY_PARTS.find((p) => p.id === selectedPartId);
    if (!bodyPart) return;

    const newItem = calculateQuoteItem({
      bodyPart,
      damageLevel: selectedDamage,
      paintType: veiculo.tipoPintura,
      materials,
      valorHoraFunilaria: workshop.valorHoraFunilaria,
      valorHoraPintura: workshop.valorHoraPintura,
      custoPecaReposicao: Number(customPartCost) || 0,
      observacoes: itemObs.trim(),
      margemLucroPercentual: margemLucro,
    });

    setItens([...itens, newItem]);
    setItemObs('');
    setCustomPartCost(0);
  };

  const handleSelectPolishingDegree = (deg: PolishingDegree) => {
    setPolishingDegree(deg);
    setCustomPolishingPrice(POLISHING_PACKAGES[deg].precosPorPorte[polishingVehicleSize]);
  };

  const handleSelectVehicleSize = (size: VehicleSize) => {
    setPolishingVehicleSize(size);
    setCustomPolishingPrice(POLISHING_PACKAGES[polishingDegree].precosPorPorte[size]);
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleAddPolishingItem = () => {
    setErrorMsg('');
    const pkg = POLISHING_PACKAGES[polishingDegree];
    const precoBase = Number(customPolishingPrice) > 0 ? Number(customPolishingPrice) : pkg.precosPorPorte[polishingVehicleSize];
    const custoInsumos = pkg.custoInsumosPorPorte[polishingVehicleSize];
    const valorMaoDeObra = Math.max(0, precoBase - custoInsumos);

    const getPorteNome = (porte: VehicleSize) => {
      switch (porte) {
        case 'compacto': return 'Hatch / Compacto';
        case 'medio': return 'Sedan / Médio';
        case 'grande': return 'SUV / Picape';
        case 'especial': return 'Grande / Especial';
      }
    };

    const newPolishingItem: QuoteItem = {
      id: `polimento_${polishingDegree}_${Date.now()}`,
      pecaId: `polimento_${polishingDegree}`,
      nomePeca: `${pkg.nome} (${getPorteNome(polishingVehicleSize)})`,
      avaria: 'apenas_pintura',
      observacoes: `${pkg.subtitulo}. Garantia: ${pkg.garantiaMeses} meses. Duração estimada: ${pkg.duracaoEstimadaHoras}h. Etapas: ${pkg.etapas.slice(0, 3).join(' • ')}`,
      valorMaoDeObraFunilaria: 0,
      valorMaoDeObraPintura: valorMaoDeObra,
      valorInsumosFracionados: custoInsumos,
      custoPecaReposicao: 0,
      custoBaseItem: precoBase,
      margemLucroItem: 0,
      valorLucroItem: 0,
      valorTotalItem: precoBase,
      detalhesInsumos: pkg.insumosUtilizados.map((ins) => ({
        materialNome: ins.nome,
        quantidadeGasta: 1,
        unidade: ins.quantidade,
        custoFracionado: custoInsumos / pkg.insumosUtilizados.length,
      })),
    };

    const addonItems: QuoteItem[] = selectedAddonIds.map((addonId) => {
      const addon = POLISHING_ADDONS.find((a) => a.id === addonId);
      if (!addon) return null;
      return {
        id: `addon_${addon.id}_${Date.now()}`,
        pecaId: addon.id,
        nomePeca: `Estética: ${addon.nome}`,
        avaria: 'apenas_pintura',
        observacoes: addon.descricao,
        valorMaoDeObraFunilaria: 0,
        valorMaoDeObraPintura: Math.round(addon.precoPadrao * 0.7),
        valorInsumosFracionados: Math.round(addon.precoPadrao * 0.3),
        custoPecaReposicao: 0,
        custoBaseItem: addon.precoPadrao,
        margemLucroItem: 0,
        valorLucroItem: 0,
        valorTotalItem: addon.precoPadrao,
        detalhesInsumos: [],
      };
    }).filter((x): x is QuoteItem => x !== null);

    setItens([...itens, newPolishingItem, ...addonItems]);
    setSelectedAddonIds([]);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleRemoveItem = (id: string) => {
    setItens(itens.filter((item) => item.id !== id));
  };

  const toggleItemExpansion = (id: string) => {
    setExpandedItemDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const buildQuoteObject = (): Quote | null => {
    if (!cliente.nome.trim()) {
      setErrorMsg('Informe o nome do cliente para gerar ou salvar o orçamento.');
      const el = document.getElementById('input-cliente-nome');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return null;
    }
    if (itens.length === 0) {
      setErrorMsg('Adicione pelo menos 1 serviço ou peça ao orçamento antes de salvar ou gerar o PDF.');
      return null;
    }

    const placaFinal = veiculo.placa.trim() ? veiculo.placa.trim().toUpperCase() : 'A DEFINIR';
    const finalVeiculo = {
      ...veiculo,
      placa: placaFinal,
    };

    const hasPolishing = itens.some((it) => it.pecaId.startsWith('polimento_') || it.pecaId.startsWith('addon_'));
    const hasFunilaria = itens.some((it) => !it.pecaId.startsWith('polimento_') && !it.pecaId.startsWith('addon_'));
    const tipoOrcamento = (hasPolishing && hasFunilaria) ? 'misto' : (hasPolishing ? 'polimento_estetica' : 'funilaria_pintura');

    const quoteId = editingQuote?.id || `quote_${Date.now()}`;
    const quoteNumber = editingQuote?.numero || `ORC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dataCriacao = editingQuote?.dataCriacao || new Date().toISOString();
    const dataValidade = new Date(Date.now() + workshop.prazoValidadeDias * 86400000).toISOString();

    const quote: Quote = {
      id: quoteId,
      numero: quoteNumber,
      dataCriacao,
      dataValidade,
      status: editingQuote?.status || 'pendente',
      cliente,
      veiculo: finalVeiculo,
      itens,
      fotosAvarias,
      tipoOrcamento,
      subtotalMaoDeObra: totals.subtotalMaoDeObra,
      subtotalInsumosFracionados: totals.subtotalInsumosFracionados,
      subtotalPecasReposicao: totals.subtotalPecasReposicao,
      margemLucroAplicada: margemLucro,
      valorLucro: totals.valorLucro,
      desconto,
      valorTotal: totals.valorTotal,
      valorSinal50: totals.valorSinal50,
      valorRestante50: totals.valorRestante50,
      prazoExecucaoDias: prazoDias,
      observacoesGerais: obsGerais,
    };

    return quote;
  };

  const handleSave = () => {
    setErrorMsg('');
    const quote = buildQuoteObject();
    if (!quote) return;

    onSaveQuote(quote);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 5000);
  };

  const handleOpenPdfAndWhatsApp = () => {
    setErrorMsg('');
    const quote = buildQuoteObject();
    if (!quote) return;

    onSaveQuote(quote);
    onOpenPrintModal(quote);
  };

  const handleSendWhatsApp = () => {
    setErrorMsg('');
    const quote = buildQuoteObject();
    if (!quote) return;

    if (!cliente.telefone) {
      setErrorMsg('Informe o número de WhatsApp do cliente com DDD.');
      const el = document.getElementById('input-cliente-telefone');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const message = generateWhatsAppMessage(quote, workshop);
    openWhatsAppDirect(cliente.telefone, message);
    onSaveQuote(quote);
  };

  const handlePrint = () => {
    setErrorMsg('');
    const quote = buildQuoteObject();
    if (!quote) return;

    onOpenPrintModal(quote);
  };

  const handleReset = () => {
    if (window.confirm('Deseja realmente limpar todos os campos do orçamento atual?')) {
      setCliente({ nome: '', telefone: '', email: '', documento: '' });
      setVeiculo({
        placa: '',
        marca: '',
        modelo: '',
        ano: new Date().getFullYear().toString(),
        cor: '',
        tipoPintura: 'metalica',
        km: '',
      });
      setItens([]);
      setFotosAvarias([]);
      setChecklistVistoria({
        nivelCombustivel: '1/2',
        kmEntrada: '',
        possuiEstepe: true,
        possuiMacacoChave: true,
      });
      setDesconto(0);
      setItemObs('');
      setCustomPartCost(0);
    }
  };

  return (
    <div id="quote-builder-container" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Alert Error Header */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-between text-red-200 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-white text-xs font-bold px-2 py-1">
            Fechar
          </button>
        </div>
      )}

      {savedFeedback && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 flex items-center gap-2.5 text-emerald-200 text-sm font-medium animate-in fade-in">
          <Check className="w-5 h-5 text-emerald-400" />
          <span>Orçamento salvo com sucesso na aba de orçamentos!</span>
        </div>
      )}

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Client, Vehicle, and Piece Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Client & Vehicle Card */}
          <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E3349] pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider">
                <User className="w-4 h-4" />
                <span>1. Dados do Cliente e Veículo</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0A0A0C] text-slate-400 border border-[#1E3349]">
                {editingQuote ? `Editando ${editingQuote.numero}` : 'Novo Atendimento'}
              </span>
            </div>

            {/* Client Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo do Cliente *
                </label>
                <input
                  id="input-cliente-nome"
                  type="text"
                  required
                  value={cliente.nome}
                  onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                  placeholder="ex: João Silva"
                  className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp / Celular com DDD *
                </label>
                <input
                  id="input-cliente-telefone"
                  type="text"
                  required
                  value={cliente.telefone}
                  onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>
            </div>

            {/* Vehicle Inputs - Somente Placa e Marca/Modelo conforme solicitado */}
            <div className="pt-2 border-t border-[#162536] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Placa Mercosul Badge Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-400" />
                  Placa do Veículo *
                </label>
                <input
                  id="input-veiculo-placa"
                  type="text"
                  maxLength={8}
                  required
                  value={veiculo.placa}
                  onChange={(e) => setVeiculo({ ...veiculo, placa: e.target.value.toUpperCase() })}
                  placeholder="ABC1D23"
                  className="w-full pl-3 pr-2 py-2.5 bg-[#0A0A0C] border-2 border-blue-500/40 rounded-xl text-slate-100 font-mono font-bold tracking-widest text-sm focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              {/* Marca / Modelo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Marca / Modelo do Veículo *
                </label>
                <input
                  id="input-veiculo-modelo"
                  type="text"
                  required
                  value={veiculo.modelo}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parts = val.trim().split(' ');
                    const marca = parts.length > 1 ? parts[0] : (veiculo.marca || val);
                    setVeiculo({ ...veiculo, modelo: val, marca });
                  }}
                  placeholder="ex: Toyota Corolla, VW Gol, Fiat Toro"
                  className="w-full px-3.5 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>

          {/* Sub-Aba: Alternar entre Funilaria & Pintura OU Polimento (3 Graus) */}
          <div className="bg-[#0A0A0C] border border-[#1E3349] p-1.5 rounded-2xl flex gap-2 shadow-lg">
            <button
              id="subtab-btn-funilaria"
              type="button"
              onClick={() => setServiceTab('funilaria')}
              className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                serviceTab === 'funilaria'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#121E2B]'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Funilaria & Pintura (Peças)</span>
            </button>

            <button
              id="subtab-btn-polimento"
              type="button"
              onClick={() => setServiceTab('polimento')}
              className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                serviceTab === 'polimento'
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#121E2B]'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${serviceTab === 'polimento' ? 'text-slate-950' : 'text-yellow-400'}`} />
              <span>Polimento (3 Graus)</span>
            </button>
          </div>

          {/* Section 2 (Funilaria): Piece & Damage Selector */}
          {serviceTab === 'funilaria' && (
            <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E3349] pb-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider">
                  <Wrench className="w-4 h-4" />
                  <span>2. Seleção de Peça e Nível de Avaria</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Cálculo Fracionado Ativo
                </span>
              </div>

              {/* Body Part Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Escolha a Peça / Painel do Veículo
                </label>
                <select
                  id="select-peca-veiculo"
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full px-3.5 py-3 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 font-semibold text-sm focus:outline-none focus:border-[#0066FF] cursor-pointer"
                >
                  {DEFAULT_BODY_PARTS.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.nome} (Área: {part.areaRelativa}x)
                    </option>
                  ))}
                </select>
              </div>

              {/* Damage Level Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Nível de Avaria / Tipo de Trabalho
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      'pequena',
                      'media',
                      'grande',
                      'troca',
                      'apenas_pintura',
                      'apenas_funilaria',
                    ] as DamageLevel[]
                  ).map((lvl) => {
                    const info = getDamageLevelLabel(lvl);
                    const isSelected = selectedDamage === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedDamage(lvl)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-[#0066FF] text-white shadow-md shadow-blue-600/20 ring-1 ring-[#0066FF]'
                            : 'bg-[#0A0A0C] border-[#1E3349] text-slate-300 hover:bg-[#152332] hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{info.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#0066FF]" />}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                          {info.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extra Options: New Part Cost & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Custo de Peça Nova de Reposição (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-bold">R$</span>
                    <input
                      id="input-custo-peca-nova"
                      type="number"
                      min="0"
                      step="10"
                      value={customPartCost || ''}
                      onChange={(e) => setCustomPartCost(Number(e.target.value))}
                      placeholder="0,00 (deixe 0 se apenas recuperação)"
                      className="w-full pl-10 pr-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Se a oficina comprar a peça bruta</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Observações da Avaria (Opcional)
                  </label>
                  <input
                    id="input-obs-avaria"
                    type="text"
                    value={itemObs}
                    onChange={(e) => setItemObs(e.target.value)}
                    placeholder="ex: recuperação no vinco inferior"
                    className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>

              {/* Button Add Item */}
              <button
                id="btn-adicionar-peca-orcamento"
                type="button"
                onClick={handleAddItem}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#0066FF] to-[#004DB3] hover:from-[#1A73E8] hover:to-[#0066FF] text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Peça com Cálculo Fracionado</span>
              </button>
            </div>
          )}

          {/* Section 2 (Polimento): Seleção de Grau e Porte do Veículo */}
          {serviceTab === 'polimento' && (
            <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 shadow-xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#1E3349] pb-3">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>2. Orçamento de Polimento Automotivo</span>
                </div>
                <span className="text-xs text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  3 Graus Profissionais
                </span>
              </div>

              {/* Grau Selection: 3 Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Selecione o Grau de Polimento Desejado:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['comercial', 'tecnico', 'cristalizado'] as PolishingDegree[]).map((deg) => {
                    const pkg = POLISHING_PACKAGES[deg];
                    const isSelected = polishingDegree === deg;
                    const precoPorte = pkg.precosPorPorte[polishingVehicleSize];

                    return (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => handleSelectPolishingDegree(deg)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-b from-amber-500/20 to-[#0A0A0C] border-yellow-500 ring-1 ring-yellow-500 text-white shadow-lg shadow-yellow-500/10'
                            : 'bg-[#0A0A0C] border-[#1E3349] text-slate-300 hover:bg-[#152332] hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-black text-xs sm:text-sm ${isSelected ? 'text-yellow-400' : 'text-slate-100'}`}>
                              {pkg.nome}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mb-2 leading-tight">
                            {pkg.subtitulo}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#1E3349]/80 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-500">Sugerido:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatCurrencyBRL(precoPorte)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Porte do Veículo Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Porte da Carroceria do Veículo:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'compacto', label: 'Hatch / Compacto', desc: 'Onix, Gol, HB20, Polo' },
                      { id: 'medio', label: 'Sedan / Médio', desc: 'Corolla, Civic, Cruze, Compass' },
                      { id: 'grande', label: 'SUV / Picape', desc: 'Hilux, Ranger, SW4, Commander' },
                      { id: 'especial', label: 'Grande / Especial', desc: 'RAM, Vans, Blindados' },
                    ] as { id: VehicleSize; label: string; desc: string }[]
                  ).map((porte) => {
                    const isSelected = polishingVehicleSize === porte.id;
                    const preco = POLISHING_PACKAGES[polishingDegree].precosPorPorte[porte.id];

                    return (
                      <button
                        key={porte.id}
                        type="button"
                        onClick={() => handleSelectVehicleSize(porte.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0066FF]/20 border-[#0066FF] text-white ring-1 ring-[#0066FF]'
                            : 'bg-[#0A0A0C] border-[#1E3349] text-slate-300 hover:bg-[#152332]'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-100">{porte.label}</div>
                        <div className="text-[10px] text-slate-400 truncate mb-1">{porte.desc}</div>
                        <div className="text-[11px] font-mono font-bold text-emerald-400">
                          {formatCurrencyBRL(preco)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Valor Editável do Serviço & Informações do Pacote */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1E3349]">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço do Polimento a Cobrar (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-bold">R$</span>
                    <input
                      id="input-preco-polimento"
                      type="number"
                      min="0"
                      step="50"
                      value={customPolishingPrice || ''}
                      onChange={(e) => setCustomPolishingPrice(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Preço sugerido de mercado. Você pode alterar livremente.
                  </p>
                </div>

                <div className="p-3 bg-[#0A0A0C] border border-[#1E3349] rounded-xl flex flex-col justify-center text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Garantia Técnica:</span>
                    <span className="font-bold text-yellow-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {POLISHING_PACKAGES[polishingDegree].garantiaMeses} meses
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Duração Estimada:</span>
                    <span className="font-bold text-slate-200">
                      {POLISHING_PACKAGES[polishingDegree].duracaoEstimadaHoras} horas
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Insumos Embutidos:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {formatCurrencyBRL(POLISHING_PACKAGES[polishingDegree].custoInsumosPorPorte[polishingVehicleSize])}
                    </span>
                  </div>
                </div>
              </div>

              {/* Serviços Adicionais Opcionais */}
              <div className="space-y-2 pt-2 border-t border-[#1E3349]">
                <label className="block text-xs font-semibold text-slate-300">
                  Adicionais de Estética Automotiva (Opcionais):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POLISHING_ADDONS.map((addon) => {
                    const isChecked = selectedAddonIds.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => toggleAddon(addon.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                            : 'bg-[#0A0A0C] border-[#1E3349] text-slate-400 hover:bg-[#152332]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={`font-bold text-xs ${isChecked ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {addon.nome}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{addon.descricao}</div>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                          +{formatCurrencyBRL(addon.precoPadrao)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botão de Adicionar Polimento ao Orçamento */}
              <button
                id="btn-adicionar-polimento-orcamento"
                type="button"
                onClick={handleAddPolishingItem}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>
                  Adicionar {POLISHING_PACKAGES[polishingDegree].nome} ao Orçamento (+{formatCurrencyBRL(customPolishingPrice || POLISHING_PACKAGES[polishingDegree].precosPorPorte[polishingVehicleSize])})
                </span>
              </button>
            </div>
          )}

          {/* Section 3: List of Added Items with Material Breakdown */}
          <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E3349] pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>3. Peças e Serviços no Orçamento ({itens.length})</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Funilaria e Polimento em um só PDF
              </span>
            </div>

            {itens.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-dashed border-[#1E3349] rounded-xl">
                <Car className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                <p className="text-xs font-semibold text-slate-400">Nenhum serviço ou peça adicionada ainda.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecione acima na aba "Funilaria & Pintura" ou "Polimento (3 Graus)" e adicione ao orçamento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {itens.map((item, index) => {
                  const isPolishing = item.pecaId.startsWith('polimento_') || item.pecaId.startsWith('addon_');
                  const avariaInfo = getDamageLevelLabel(item.avaria);
                  const isExpanded = expandedItemDetails[item.id];

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl overflow-hidden shadow-sm ${
                        isPolishing
                          ? 'bg-[#0f171d] border-amber-500/30'
                          : 'bg-[#0A0A0C] border-[#1E3349]'
                      }`}
                    >
                      {/* Item Main Summary Row */}
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                              isPolishing
                                ? 'bg-amber-500/30 border border-amber-500/60 text-yellow-300'
                                : 'bg-blue-600/30 border border-blue-500/40 text-blue-300'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-100 truncate">
                              {item.nomePeca}
                            </span>
                            {isPolishing ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-yellow-300 font-bold border border-amber-500/40 shrink-0 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-yellow-400" />
                                Estética / Polimento
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#162536] text-blue-300 font-medium border border-blue-500/20 shrink-0">
                                {avariaInfo.label}
                              </span>
                            )}
                          </div>

                          {item.observacoes && (
                            <p className="text-xs text-slate-400 mt-1 ml-7">
                              Obs: {item.observacoes}
                            </p>
                          )}

                          {/* Mini Cost Breakdown Pills */}
                          <div className="flex flex-wrap items-center gap-2 mt-2 ml-7 text-[11px] text-slate-400">
                            <span>
                              Mão de Obra:{' '}
                              <strong className="text-slate-200">
                                {formatCurrencyBRL(item.valorMaoDeObraFunilaria + item.valorMaoDeObraPintura)}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Insumos Fracionados:{' '}
                              <strong className="text-emerald-400">
                                {formatCurrencyBRL(item.valorInsumosFracionados)}
                              </strong>
                            </span>
                            {item.custoPecaReposicao > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  Peça Nova:{' '}
                                  <strong className="text-amber-300">
                                    {formatCurrencyBRL(item.custoPecaReposicao)}
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right: Total Price & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block text-[10px] uppercase">
                              Subtotal
                            </span>
                            <span className="font-black text-sm text-white">
                              {formatCurrencyBRL(item.valorTotalItem)}
                            </span>
                          </div>

                          {item.detalhesInsumos && item.detalhesInsumos.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleItemExpansion(item.id)}
                              title="Ver detalhes dos insumos"
                              className="p-1.5 rounded-lg bg-[#162536] text-slate-400 hover:text-white border border-[#223952] transition-colors cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Remover item"
                            className="p-1.5 rounded-lg bg-red-950/60 text-red-400 hover:text-red-300 border border-red-800/80 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Material Details */}
                      {isExpanded && item.detalhesInsumos && item.detalhesInsumos.length > 0 && (
                        <div className="p-3.5 bg-[#0e1722] border-t border-[#1E3349] text-xs space-y-2 animate-in fade-in">
                          <p className="font-semibold text-blue-300 text-[11px] flex items-center gap-1">
                            <Paintbrush className="w-3 h-3" /> Detalhes dos Insumos / Produtos:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {item.detalhesInsumos.map((det, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-[#0A0A0C] border border-[#1a2c3f] flex items-center justify-between"
                              >
                                <div className="truncate mr-2">
                                  <span className="text-slate-300 font-medium block truncate">
                                    {det.materialNome}
                                  </span>
                                  <span className="text-slate-500 text-[10px]">
                                    Consumo: {det.quantidadeGasta} {det.unidade}
                                  </span>
                                </div>
                                <span className="font-mono text-emerald-400 font-semibold shrink-0">
                                  {formatCurrencyBRL(det.custoFracionado)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. REGISTRO FOTOGRÁFICO DE AVARIAS & CHECK-IN (FOTOS ILIMITADAS PARA O PDF) */}
          <DamageInspectionPhotos
            photos={fotosAvarias}
            onChangePhotos={setFotosAvarias}
          />
        </div>

        {/* RIGHT COLUMN: Financial Summary, Signal 50%, Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Financial Card */}
          <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 shadow-2xl space-y-5 sticky top-24">
            <div className="flex items-center justify-between border-b border-[#1E3349] pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm uppercase tracking-wider">
                <DollarSign className="w-4 h-4" />
                <span>4. Fechamento Financeiro</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <Sparkles className="w-3 h-3" />
                <span>Sinal 50% Pix</span>
              </div>
            </div>

            {/* Direct Cost Subtotals */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Mão de Obra Total (Funilaria + Pintura):</span>
                <span className="font-semibold text-slate-200">{formatCurrencyBRL(totals.subtotalMaoDeObra)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Insumos Fracionados (ml/g exatos):</span>
                <span className="font-semibold text-emerald-400">{formatCurrencyBRL(totals.subtotalInsumosFracionados)}</span>
              </div>

              {totals.subtotalPecasReposicao > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Peças Novas de Reposição:</span>
                  <span className="font-semibold text-amber-300">{formatCurrencyBRL(totals.subtotalPecasReposicao)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#1E3349] flex justify-between text-slate-300 font-medium">
                <span>Custo Direto Base (MDO + Insumos):</span>
                <span>{formatCurrencyBRL(totals.baseCustoDireto)}</span>
              </div>

              <div className="flex justify-between text-blue-400 font-semibold pt-1">
                <span>Lucro da Oficina ({margemLucro}% embutido nas peças):</span>
                <span>+{formatCurrencyBRL(totals.valorLucro)}</span>
              </div>

              <div className="flex justify-between text-slate-100 font-bold pt-1.5 border-t border-[#1E3349]">
                <span>Subtotal Serviços (Somatória das Peças):</span>
                <span>{formatCurrencyBRL(totals.subtotalServicos)}</span>
              </div>
            </div>

            {/* Profit Margin & Discount Controls */}
            <div className="p-3.5 rounded-xl bg-[#0A0A0C] border border-[#1E3349] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-blue-400" /> Margem de Lucro da Oficina:
                  </label>
                  <p className="text-[10px] text-slate-500">Calculada diretamente no orçamento das peças</p>
                </div>
                <div className="flex items-center gap-1 w-24">
                  <input
                    id="input-margem-lucro"
                    type="number"
                    min="0"
                    max="100"
                    value={margemLucro}
                    onChange={(e) => handleMargemLucroChange(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-[#121E2B] border border-[#223952] rounded-lg text-slate-100 text-right font-bold text-xs focus:outline-none focus:border-[#0066FF]"
                  />
                  <span className="text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Desconto Comercial (R$):
                </label>
                <div className="flex items-center gap-1 w-28">
                  <span className="text-xs text-slate-400">R$</span>
                  <input
                    id="input-desconto"
                    type="number"
                    min="0"
                    value={desconto || ''}
                    onChange={(e) => setDesconto(Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full px-2 py-1 bg-[#121E2B] border border-[#223952] rounded-lg text-slate-100 text-right font-bold text-xs focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>
            </div>

            {/* Grand Total Highlight Box */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0F1B27] via-[#16293D] to-[#0F1B27] border-2 border-blue-500/40 shadow-xl space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                  VALOR TOTAL DO SERVIÇO
                </span>
                <span className="text-2xl font-black text-white tracking-tight">
                  {formatCurrencyBRL(totals.valorTotal)}
                </span>
              </div>

              {/* 50% Signal Condition Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-500/30 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40">
                  <span className="block text-[10px] font-bold text-emerald-300 uppercase">
                    Sinal 50% (Entrada)
                  </span>
                  <span className="text-sm font-black text-emerald-100">
                    {formatCurrencyBRL(totals.valorSinal50)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0A0A0C]/90 border border-slate-700">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">
                    Saldo Restante (Entrega)
                  </span>
                  <span className="text-sm font-bold text-slate-200">
                    {formatCurrencyBRL(totals.valorRestante50)}
                  </span>
                </div>
              </div>

              {/* Chave Pix Quick Reference */}
              <div className="pt-2 text-[11px] text-slate-300 flex items-center justify-between border-t border-blue-500/20">
                <span className="text-slate-400">Chave Pix da Oficina:</span>
                <span className="font-mono text-yellow-400 font-bold truncate max-w-[180px]">
                  {workshop.chavePix}
                </span>
              </div>
            </div>

            {/* Execution Days & General Notes */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Prazo Estimado de Entrega:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="input-prazo-dias"
                    type="number"
                    min="1"
                    max="60"
                    value={prazoDias}
                    onChange={(e) => setPrazoDias(Number(e.target.value))}
                    className="w-14 px-2 py-1 bg-[#0A0A0C] border border-[#223952] rounded-lg text-slate-100 text-center font-bold"
                  />
                  <span className="text-slate-400">dias úteis</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Observações e Termos de Garantia
                </label>
                <textarea
                  id="textarea-obs-gerais"
                  rows={2}
                  value={obsGerais}
                  onChange={(e) => setObsGerais(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#223952] rounded-xl text-slate-200 text-xs focus:outline-none focus:border-[#0066FF] resize-none"
                />
              </div>
            </div>

            {/* Inline Error and Success Feedbacks right above action buttons */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-950/90 border border-red-700 text-red-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg('')}
                  className="text-red-400 hover:text-white text-[11px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {savedFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Orçamento salvo com sucesso no sistema!</span>
                </div>
                {onNavigateToList && (
                  <button
                    type="button"
                    onClick={onNavigateToList}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] cursor-pointer shadow"
                  >
                    Ver Salvos
                  </button>
                )}
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-2">
              {/* Opção Principal: Gerar e Enviar PDF no WhatsApp */}
              <button
                id="btn-gerar-enviar-pdf-whatsapp"
                type="button"
                onClick={handleOpenPdfAndWhatsApp}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.99]"
              >
                <Send className="w-4 h-4" />
                <span>Gerar / Enviar PDF no WhatsApp</span>
              </button>

              {/* Visualizar / Baixar PDF Timbrado */}
              <button
                id="btn-imprimir-pdf"
                type="button"
                onClick={handlePrint}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#0066FF] to-[#004DB3] hover:from-[#1A73E8] hover:to-[#0066FF] text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Visualizar / Baixar Arquivo PDF</span>
              </button>

              {/* Botões de Salvar e Limpar */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  id="btn-salvar-orcamento"
                  type="button"
                  onClick={handleSave}
                  className="py-3 px-3 bg-[#122131] hover:bg-[#1a2f45] text-blue-300 hover:text-white border border-[#234567] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Orçamento</span>
                </button>

                <button
                  id="btn-limpar-campos"
                  type="button"
                  onClick={editingQuote ? onCancelEdit : handleReset}
                  className="py-3 px-3 bg-[#0A0A0C] hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-[#223952] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{editingQuote ? 'Cancelar Edição' : 'Limpar Tudo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
