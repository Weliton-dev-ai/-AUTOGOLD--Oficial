import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Car, 
  User, 
  Check, 
  Clock, 
  DollarSign, 
  Send, 
  Printer, 
  Save, 
  Plus, 
  Layers, 
  Info,
  Calendar,
  Zap,
  CheckCircle2,
  ChevronRight,
  Flame
} from 'lucide-react';
import { 
  ClientInfo, 
  DamagePhoto, 
  PolishingDegree, 
  Quote, 
  QuoteItem, 
  VehicleChecklist, 
  VehicleInfo, 
  VehicleSize, 
  WorkshopProfile 
} from '../types';
import { 
  POLISHING_PACKAGES, 
  POLISHING_ADDONS 
} from '../data/polishingData';
import { formatCurrencyBRL } from '../utils/calculator';
import { DamageInspectionPhotos } from './DamageInspectionPhotos';
import { generateWhatsAppMessage, openWhatsAppDirect } from '../utils/whatsapp';

interface PolishingQuoteTabProps {
  workshop: WorkshopProfile;
  onSaveQuote: (quote: Quote) => void;
  onOpenPrintModal: (quote: Quote) => void;
  onAddToGeneralQuote?: (items: QuoteItem[], photos: DamagePhoto[]) => void;
}

export const PolishingQuoteTab: React.FC<PolishingQuoteTabProps> = ({
  workshop,
  onSaveQuote,
  onOpenPrintModal,
  onAddToGeneralQuote,
}) => {
  // Grau selecionado
  const [selectedDegree, setSelectedDegree] = useState<PolishingDegree>('tecnico');
  // Porte do veículo
  const [selectedSize, setSelectedSize] = useState<VehicleSize>('medio');
  // Addons selecionados
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  
  // Custom price override se o profissional quiser ajustar
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [desconto, setDesconto] = useState<number>(0);
  const [prazoDias, setPrazoDias] = useState<number>(2);

  // Cliente e Veículo
  const [cliente, setCliente] = useState<ClientInfo>({
    nome: '',
    telefone: '',
    email: '',
    documento: '',
  });

  const [veiculo, setVeiculo] = useState<VehicleInfo>({
    placa: '',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear().toString(),
    cor: '',
    tipoPintura: 'metalica',
    km: '',
  });

  // Fotos ilimitadas de avarias e estado da pintura
  const [photos, setPhotos] = useState<DamagePhoto[]>([]);
  // Checklist e vistoria
  const [checklist, setChecklist] = useState<VehicleChecklist>({
    nivelCombustivel: '1/2',
    kmEntrada: '',
    possuiEstepe: true,
    possuiMacacoChave: true,
  });

  const [obsGerais, setObsGerais] = useState<string>('');
  const [feedbackSalvo, setFeedbackSalvo] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  const currentPkg = POLISHING_PACKAGES[selectedDegree];
  const baseServicePrice = customPrice !== null 
    ? customPrice 
    : currentPkg.precosPorPorte[selectedSize];

  // Cálculo dos adicionais
  const addonsTotal = selectedAddons.reduce((acc, addonId) => {
    const addon = POLISHING_ADDONS.find((a) => a.id === addonId);
    return acc + (addon ? addon.precoPadrao : 0);
  }, 0);

  const subtotalGeral = baseServicePrice + addonsTotal;
  const valorFinal = Math.max(0, subtotalGeral - desconto);
  const sinal50 = Math.round((valorFinal / 2) * 100) / 100;
  const saldoEntrega50 = Math.round((valorFinal - sinal50) * 100) / 100;

  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) {
      setSelectedAddons(selectedAddons.filter((a) => a !== id));
    } else {
      setSelectedAddons([...selectedAddons, id]);
    }
  };

  // Montar objeto de Quote compatível com todo o sistema
  const buildQuoteObject = (): Quote => {
    const items: QuoteItem[] = [
      {
        id: `item_polimento_${Date.now()}`,
        pecaId: `polimento_${selectedDegree}`,
        nomePeca: `${currentPkg.nome} (${currentPkg.subtitulo}) - Porte ${selectedSize.toUpperCase()}`,
        avaria: 'media',
        observacoes: `Garantia de ${currentPkg.garantiaMeses} meses. ${currentPkg.tagline}. Insumos: ${currentPkg.insumosUtilizados.map(i => i.nome).join(', ')}`,
        valorMaoDeObraFunilaria: 0,
        valorMaoDeObraPintura: Math.round((baseServicePrice * 0.75) * 100) / 100,
        valorInsumosFracionados: Math.round((baseServicePrice * 0.25) * 100) / 100,
        custoPecaReposicao: 0,
        valorTotalItem: baseServicePrice,
        detalhesInsumos: currentPkg.insumosUtilizados.map((ins) => ({
          materialNome: ins.nome,
          quantidadeGasta: 1,
          unidade: ins.quantidade,
          custoFracionado: Math.round((baseServicePrice * 0.05) * 100) / 100,
        })),
      },
    ];

    // Adicionar serviços complementares como itens
    selectedAddons.forEach((addonId) => {
      const addon = POLISHING_ADDONS.find((a) => a.id === addonId);
      if (addon) {
        items.push({
          id: `item_addon_${addon.id}_${Date.now()}`,
          pecaId: addon.id,
          nomePeca: `Estética: ${addon.nome}`,
          avaria: 'pequena',
          observacoes: addon.descricao,
          valorMaoDeObraFunilaria: 0,
          valorMaoDeObraPintura: addon.precoPadrao * 0.7,
          valorInsumosFracionados: addon.precoPadrao * 0.3,
          custoPecaReposicao: 0,
          valorTotalItem: addon.precoPadrao,
          detalhesInsumos: [],
        });
      }
    });

    const now = new Date();
    const validade = new Date();
    validade.setDate(validade.getDate() + workshop.prazoValidadeDias);

    return {
      id: `orcamento_polimento_${Date.now()}`,
      numero: `POL-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      dataCriacao: now.toISOString(),
      dataValidade: validade.toISOString(),
      status: 'pendente',
      tipoOrcamento: 'polimento_estetica',
      cliente,
      veiculo,
      itens: items,
      fotosAvarias: photos,
      checklistVistoria: checklist,
      subtotalMaoDeObra: Math.round(subtotalGeral * 0.75 * 100) / 100,
      subtotalInsumosFracionados: Math.round(subtotalGeral * 0.25 * 100) / 100,
      subtotalPecasReposicao: 0,
      margemLucroAplicada: workshop.margemLucroPadrao,
      valorLucro: Math.round((subtotalGeral * 0.3) * 100) / 100,
      desconto,
      valorTotal: valorFinal,
      valorSinal50: sinal50,
      valorRestante50: saldoEntrega50,
      prazoExecucaoDias: prazoDias,
      observacoesGerais: obsGerais || `Serviço de ${currentPkg.nome} com garantia de ${currentPkg.garantiaMeses} meses. Condição: 50% de entrada via Pix para agendamento da cabine de estética.`,
    };
  };

  const handleSave = () => {
    setErroMsg('');
    if (!cliente.nome.trim()) {
      setErroMsg('Por favor, informe o nome do cliente.');
      return;
    }
    if (!cliente.telefone.trim()) {
      setErroMsg('Por favor, informe o WhatsApp do cliente.');
      return;
    }

    const quote = buildQuoteObject();
    onSaveQuote(quote);
    setFeedbackSalvo(true);
    setTimeout(() => setFeedbackSalvo(false), 3000);
  };

  const handlePrint = () => {
    setErroMsg('');
    if (!cliente.nome.trim()) {
      setErroMsg('Por favor, informe ao menos o nome do cliente para gerar o PDF.');
      return;
    }
    const quote = buildQuoteObject();
    onOpenPrintModal(quote);
  };

  const handleWhatsApp = () => {
    setErroMsg('');
    if (!cliente.nome.trim() || !cliente.telefone.trim()) {
      setErroMsg('Informe o nome e o telefone do cliente para enviar no WhatsApp.');
      return;
    }
    const quote = buildQuoteObject();
    const msg = generateWhatsAppMessage(quote, workshop);
    openWhatsAppDirect(cliente.telefone, msg);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Banner Principal da Aba de Polimento */}
      <div className="bg-gradient-to-r from-[#101D2B] via-[#16273B] to-[#0D1824] border border-[#1E3349] rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Sparkles className="w-8 h-8 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Orçamento de Polimento & Estética Automotiva
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                  3 Graus Profissionais
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Gere orçamentos rápidos e precisos para Polimento Comercial, Polimento Técnico e Polimento Cristalizado com proteção cerâmica e laudo fotográfico.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seleção dos 3 Graus de Polimento (Cards de Grande Destaque) */}
      <div className="space-y-3">
        <label className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span>Escolha o Grau de Polimento:</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Grau 1: Comercial */}
          <div
            onClick={() => {
              setSelectedDegree('comercial');
              setCustomPrice(null);
            }}
            className={`rounded-2xl p-5 sm:p-6 cursor-pointer transition-all border flex flex-col justify-between relative overflow-hidden ${
              selectedDegree === 'comercial'
                ? 'bg-[#152536] border-blue-500 shadow-xl shadow-blue-900/30 scale-[1.02]'
                : 'bg-[#101A24] border-[#1C2C3D] hover:border-[#2A435C] opacity-90 hover:opacity-100'
            }`}
          >
            {selectedDegree === 'comercial' && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1">
                <Check className="w-3 h-3" /> Selecionado
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Grau 1</span>
                <span className="text-[11px] text-slate-400">• One-Step</span>
              </div>

              <h3 className="text-lg font-black text-white">Polimento Comercial</h3>
              <p className="text-xs font-bold text-blue-300 mt-0.5">Corte Rápido + Cera Protetiva</p>
              
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {POLISHING_PACKAGES.comercial.tagline}. Remoção de névoas de tinta e microrriscos superficiais com brilho imediato.
              </p>

              {/* Etapas Rápidas */}
              <div className="mt-4 pt-3 border-t border-[#1F3347] space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Lavagem detalhada & Desengraxe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Composto Polidor One-Step rápido</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Cera de Carnaúba Premium</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1F3347] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo Médio:</span>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" /> ~4 horas
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">A partir de:</span>
                <span className="text-lg font-black text-white">
                  {formatCurrencyBRL(POLISHING_PACKAGES.comercial.precosPorPorte.compacto)}
                </span>
              </div>
            </div>
          </div>

          {/* Grau 2: Técnico */}
          <div
            onClick={() => {
              setSelectedDegree('tecnico');
              setCustomPrice(null);
            }}
            className={`rounded-2xl p-5 sm:p-6 cursor-pointer transition-all border flex flex-col justify-between relative overflow-hidden ${
              selectedDegree === 'tecnico'
                ? 'bg-[#152536] border-emerald-500 shadow-xl shadow-emerald-900/30 scale-[1.02]'
                : 'bg-[#101A24] border-[#1C2C3D] hover:border-[#2A435C] opacity-90 hover:opacity-100'
            }`}
          >
            {selectedDegree === 'tecnico' && (
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1">
                <Check className="w-3 h-3" /> Mais Pedido
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Grau 2</span>
                <span className="text-[11px] text-slate-400">• Multi-Etapas 85-95%</span>
              </div>

              <h3 className="text-lg font-black text-white">Polimento Técnico</h3>
              <p className="text-xs font-bold text-emerald-300 mt-0.5">Correção de Verniz & Selante SiO2</p>
              
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {POLISHING_PACKAGES.tecnico.tagline}. Descontaminação com Clay Bar, corte, refino e super-lustro anti-holograma.
              </p>

              {/* Etapas Rápidas */}
              <div className="mt-4 pt-3 border-t border-[#1F3347] space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Descontaminação com Clay Bar profunda</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Corte pesado + Refino de precisão</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Lustro Anti-Hologramas & Selante SiO2</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1F3347] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo Médio:</span>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" /> ~10 horas
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">A partir de:</span>
                <span className="text-lg font-black text-white">
                  {formatCurrencyBRL(POLISHING_PACKAGES.tecnico.precosPorPorte.compacto)}
                </span>
              </div>
            </div>
          </div>

          {/* Grau 3: Cristalizado / Vitrificado */}
          <div
            onClick={() => {
              setSelectedDegree('cristalizado');
              setCustomPrice(null);
            }}
            className={`rounded-2xl p-5 sm:p-6 cursor-pointer transition-all border flex flex-col justify-between relative overflow-hidden ${
              selectedDegree === 'cristalizado'
                ? 'bg-[#152536] border-amber-500 shadow-xl shadow-amber-900/40 scale-[1.02]'
                : 'bg-[#101A24] border-[#1C2C3D] hover:border-[#2A435C] opacity-90 hover:opacity-100'
            }`}
          >
            {selectedDegree === 'cristalizado' && (
              <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1">
                <Flame className="w-3 h-3" /> Premium 9H
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Grau 3</span>
                <span className="text-[11px] text-yellow-300">• Vitrificação 9H</span>
              </div>

              <h3 className="text-lg font-black text-white">Polimento Cristalizado</h3>
              <p className="text-xs font-bold text-yellow-300 mt-0.5">Espelhamento & Vitrificação Cerâmica</p>
              
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {POLISHING_PACKAGES.cristalizado.tagline}. Camada líquida de vidro 9H com efeito super hidrofóbico e proteção prolongada.
              </p>

              {/* Etapas Rápidas */}
              <div className="mt-4 pt-3 border-t border-[#1F3347] space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Correção completa de verniz em 3 etapas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Desengordurante IPA (Remoção total de óleos)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Aplicação do Coating Cerâmico / Cristalizador 9H</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1F3347] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo Médio:</span>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> ~16 a 24 horas
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">A partir de:</span>
                <span className="text-lg font-black text-yellow-400">
                  {formatCurrencyBRL(POLISHING_PACKAGES.cristalizado.precosPorPorte.compacto)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Configuração de Porte do Veículo & Valor Base */}
      <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E3349] pb-3">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Porte do Veículo & Valor Sugerido
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            O porte define a área de lataria, tempo de trabalho e quantidade de produto
          </span>
        </div>

        {/* 4 Portes de Veículo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { key: 'compacto', label: 'Compacto / Hatch', desc: 'Ex: Gol, Onix, HB20, Polo' },
              { key: 'medio', label: 'Médio / Sedan', desc: 'Ex: Corolla, Civic, Cruze, Virtus' },
              { key: 'grande', label: 'Grande / SUV / Picape', desc: 'Ex: Hilux, SW4, Compass, Toro' },
              { key: 'especial', label: 'Especial / Van', desc: 'Ex: RAM 1500, Sprinter, Transit' },
            ] as const
          ).map((item) => {
            const preco = currentPkg.precosPorPorte[item.key];
            const isSel = selectedSize === item.key;

            return (
              <div
                key={item.key}
                onClick={() => {
                  setSelectedSize(item.key);
                  setCustomPrice(null);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSel
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                    : 'bg-[#0A0A0C] border-[#1E3349] text-slate-300 hover:border-[#2A435C]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{item.label}</span>
                  {isSel && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                <div className="mt-2 text-sm font-black text-white">
                  {formatCurrencyBRL(preco)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ajuste Manual do Valor (Opcional) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#1E3349]">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-400" />
            <span>Preço base tabelado: <strong>{formatCurrencyBRL(currentPkg.precosPorPorte[selectedSize])}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Personalizar Valor do Polimento: R$
            </label>
            <input
              type="number"
              step="10"
              placeholder={currentPkg.precosPorPorte[selectedSize].toString()}
              value={customPrice ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCustomPrice(isNaN(val) ? null : val);
              }}
              className="w-28 px-2.5 py-1 bg-[#0A0A0C] border border-[#223952] rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Serviços Adicionais de Estética (Addons Opcionais) */}
      <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E3349] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Serviços Complementares de Estética (Opcionais)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Adicione ao orçamento para aumentar o tíquete médio
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {POLISHING_ADDONS.map((addon) => {
            const isChecked = selectedAddons.includes(addon.id);

            return (
              <div
                key={addon.id}
                onClick={() => toggleAddon(addon.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  isChecked
                    ? 'bg-amber-500/15 border-amber-500/80 text-white'
                    : 'bg-[#0A0A0C] border-[#1E3349] text-slate-300 hover:border-[#2A435C]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // tratado no container
                      className="rounded border-[#1E3349] text-amber-500 focus:ring-0"
                    />
                    <span className="text-xs font-bold">{addon.nome}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {addon.descricao}
                  </p>
                </div>
                <span className="text-xs font-black text-amber-400 shrink-0">
                  +{formatCurrencyBRL(addon.precoPadrao)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dados do Cliente e Veículo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Dados do Cliente */}
        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 sm:p-6 space-y-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-[#1E3349] pb-2">
            <User className="w-4 h-4 text-blue-400" />
            Dados do Cliente
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome do Cliente <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Eduardo Silveira"
                value={cliente.nome}
                onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#1E3349] rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  WhatsApp / Telefone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={cliente.telefone}
                  onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#1E3349] rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  CPF / CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cliente.documento || ''}
                  onChange={(e) => setCliente({ ...cliente, documento: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#1E3349] rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dados do Veículo */}
        <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 sm:p-6 space-y-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-[#1E3349] pb-2">
            <Car className="w-4 h-4 text-blue-400" />
            Dados do Veículo
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Placa</label>
              <input
                type="text"
                placeholder="ABC1D23"
                value={veiculo.placa}
                onChange={(e) => setVeiculo({ ...veiculo, placa: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#1E3349] rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Marca / Modelo</label>
              <input
                type="text"
                placeholder="Toyota Corolla XEi"
                value={`${veiculo.marca} ${veiculo.modelo}`.trim()}
                onChange={(e) => {
                  const parts = e.target.value.split(' ');
                  setVeiculo({ ...veiculo, marca: parts[0] || '', modelo: parts.slice(1).join(' ') || '' });
                }}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#1E3349] rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Cor do Veículo</label>
              <input
                type="text"
                placeholder="Preto Eclipse / Prata"
                value={veiculo.cor}
                onChange={(e) => setVeiculo({ ...veiculo, cor: e.target.value })}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#1E3349] rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Ano Fab./Modelo</label>
              <input
                type="text"
                placeholder="2022/2023"
                value={veiculo.ano}
                onChange={(e) => setVeiculo({ ...veiculo, ano: e.target.value })}
                className="w-full px-3 py-2 bg-[#0A0A0C] border border-[#1E3349] rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Upload Ilimitado de Fotos de Avarias e Estado da Pintura */}
      <DamageInspectionPhotos
        photos={photos}
        onChangePhotos={setPhotos}
        checklist={checklist}
        onChangeChecklist={setChecklist}
      />

      {/* Resumo Financeiro & Condição Pix 50% */}
      <div className="bg-gradient-to-br from-[#121E2B] to-[#0A0A0C] border border-[#1E3349] rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E3349] pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Resumo do Orçamento de Polimento</span>
            </h3>
            <p className="text-xs text-slate-400">
              {currentPkg.nome} ({currentPkg.subtitulo}) • Garantia de {currentPkg.garantiaMeses} meses
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">Prazo de Execução (dias):</label>
              <input
                type="number"
                min="1"
                max="30"
                value={prazoDias}
                onChange={(e) => setPrazoDias(parseInt(e.target.value) || 2)}
                className="w-16 px-2 py-1 bg-[#0A0A0C] border border-[#1E3349] rounded-lg text-xs font-bold text-center text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">Desconto (R$):</label>
              <input
                type="number"
                min="0"
                value={desconto}
                onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 bg-[#0A0A0C] border border-[#1E3349] rounded-lg text-xs font-bold text-emerald-400"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Caixa do Sinal 50% (7 colunas) */}
          <div className="md:col-span-7 bg-[#0E1722] border border-blue-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E3349] pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-yellow-400" />
                Sinal Obrigatório de 50% via Pix (Agendamento da Vaga)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Sinal de Entrada (50%):</span>
                <span className="text-2xl font-black text-emerald-400">
                  {formatCurrencyBRL(sinal50)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Saldo na Entrega do Veículo:</span>
                <span className="text-lg font-bold text-slate-200">
                  {formatCurrencyBRL(saldoEntrega50)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#121E2B] rounded-xl text-xs space-y-1">
              <p className="text-slate-400">
                Chave Pix ({workshop.tipoChavePix.toUpperCase()}):{' '}
                <strong className="text-yellow-400 font-mono select-all">{workshop.chavePix}</strong>
              </p>
              <p className="text-[11px] text-slate-400">
                Favorecido: <strong>{workshop.titularPix}</strong>
              </p>
            </div>
          </div>

          {/* Totais (5 colunas) */}
          <div className="md:col-span-5 bg-[#0E1722] border border-[#1E3349] rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Serviço Base ({currentPkg.nome}):</span>
              <span className="font-semibold text-white">{formatCurrencyBRL(baseServicePrice)}</span>
            </div>

            {addonsTotal > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Serviços Complementares ({selectedAddons.length}):</span>
                <span className="font-semibold">+{formatCurrencyBRL(addonsTotal)}</span>
              </div>
            )}

            {desconto > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Desconto Aplicado:</span>
                <span>-{formatCurrencyBRL(desconto)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-[#1E3349] flex justify-between items-baseline">
              <span className="font-black text-white text-sm uppercase">VALOR TOTAL:</span>
              <span className="text-2xl font-black text-emerald-400">
                {formatCurrencyBRL(valorFinal)}
              </span>
            </div>
          </div>

        </div>

        {/* Mensagem de Erro ou Sucesso */}
        {erroMsg && (
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-bold">
            {erroMsg}
          </div>
        )}

        {feedbackSalvo && (
          <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Orçamento de Polimento salvo com sucesso nos Orçamentos Salvos!
          </div>
        )}

        {/* Barra de Ações Rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1E3349]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-[#121E2B] hover:bg-[#1E3349] text-white font-bold text-xs flex items-center gap-2 border border-[#223952] transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-blue-400" />
              <span>Salvar Orçamento</span>
            </button>

            {onAddToGeneralQuote && (
              <button
                type="button"
                onClick={() => {
                  const q = buildQuoteObject();
                  onAddToGeneralQuote(q.itens, photos);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Adicionar ao Orçamento Geral</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar no WhatsApp (1 Clique)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#1A73E8] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Visualizar / Gerar PDF com Fotos</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
