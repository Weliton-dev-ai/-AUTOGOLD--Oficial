import { BodyPartItem, DamageLevel, MaterialInsumo, PaintType, QuoteItem } from '../types';

export interface CalculationParams {
  bodyPart: BodyPartItem;
  damageLevel: DamageLevel;
  paintType: PaintType;
  materials: MaterialInsumo[];
  valorHoraFunilaria: number;
  valorHoraPintura: number;
  custoPecaReposicao?: number;
  observacoes?: string;
  margemLucroPercentual?: number;
}

export function getPaintTypeMultiplier(paintType: PaintType): { costMultiplier: number; label: string } {
  switch (paintType) {
    case 'solida':
      return { costMultiplier: 1.0, label: 'Sólida / Lisa' };
    case 'metalica':
      return { costMultiplier: 1.15, label: 'Metálica (+15% tinta)' };
    case 'perolizada':
      return { costMultiplier: 1.30, label: 'Perolizada (+30% camadas)' };
    case 'tricote_especial':
      return { costMultiplier: 1.50, label: 'Tricote / Especial (+50% base/verniz)' };
    default:
      return { costMultiplier: 1.0, label: 'Padrão' };
  }
}

export function getDamageLevelLabel(damage: DamageLevel): { label: string; desc: string } {
  switch (damage) {
    case 'pequena':
      return { label: 'Pequena Avaria', desc: 'Arranhões leves, retoques rápidos, pequenos vincos' };
    case 'media':
      return { label: 'Média Avaria', desc: 'Amassados moderados, raspagens com necessidade de primer e lixamento' };
    case 'grande':
      return { label: 'Grande Avaria', desc: 'Deformações estruturais, repuxamento pesado, manta/massa profunda' };
    case 'troca':
      return { label: 'Troca de Peça Nova', desc: 'Instalação e pintura completa interna/externa de componente novo' };
    case 'apenas_pintura':
      return { label: 'Apenas Pintura', desc: 'Sem necessidade de funilaria, pintura total da peça' };
    case 'apenas_funilaria':
      return { label: 'Apenas Funilaria / Martelinho', desc: 'Recuperação de lata sem pintura / PDR' };
    default:
      return { label: 'Padrão', desc: '' };
  }
}

/**
 * Calcula os custos fracionados exatos de materiais e mão de obra para um item,
 * aplicando a margem de lucro da oficina diretamente no preço da peça.
 */
export function calculateQuoteItem(params: CalculationParams): QuoteItem {
  const {
    bodyPart,
    damageLevel,
    paintType,
    materials,
    valorHoraFunilaria,
    valorHoraPintura,
    custoPecaReposicao = 0,
    observacoes = '',
    margemLucroPercentual = 0,
  } = params;

  const paintInfo = getPaintTypeMultiplier(paintType);
  const areaMultiplier = bodyPart.areaRelativa;

  // 1. Mão de obra
  const horasFunilaria = bodyPart.horasFunilariaPadrao[damageLevel] || 0;
  const horasPintura = bodyPart.horasPinturaPadrao[damageLevel] || 0;

  const valorMaoDeObraFunilaria = horasFunilaria * valorHoraFunilaria;
  const valorMaoDeObraPintura = horasPintura * valorHoraPintura;

  // 2. Materiais fracionados
  const detalhesInsumos: QuoteItem['detalhesInsumos'] = [];
  let valorInsumosFracionados = 0;

  materials.forEach((mat) => {
    const baseConsumo = mat.consumoPadraoPorPeca[damageLevel] || 0;
    if (baseConsumo <= 0) return;

    // Ajusta consumo pela área da peça
    let consumoAjustado = baseConsumo * areaMultiplier;

    // Se for tinta ou verniz e a pintura for especial/perolizada, ajusta insumo de cor
    if ((mat.categoria === 'pintura' || mat.id === 'mat_tinta') && paintInfo.costMultiplier > 1) {
      consumoAjustado = consumoAjustado * paintInfo.costMultiplier;
    }

    // Custo unitário fracionado
    const custoUnitario = mat.precoEmbalagem / (mat.quantidadeEmbalagem || 1);
    const custoTotalMaterial = consumoAjustado * custoUnitario;

    valorInsumosFracionados += custoTotalMaterial;

    detalhesInsumos.push({
      materialNome: mat.nome,
      quantidadeGasta: Math.round(consumoAjustado * 10) / 10,
      unidade: mat.unidadeBase,
      custoFracionado: Math.round(custoTotalMaterial * 100) / 100,
    });
  });

  const custoBaseItem =
    valorMaoDeObraFunilaria +
    valorMaoDeObraPintura +
    valorInsumosFracionados +
    custoPecaReposicao;

  // Margem de lucro da oficina calculada diretamente em cima da peça
  const valorLucroItem = Math.round(custoBaseItem * (margemLucroPercentual / 100) * 100) / 100;
  const valorTotalItem = Math.round((custoBaseItem + valorLucroItem) * 100) / 100;

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    pecaId: bodyPart.id,
    nomePeca: bodyPart.nome,
    avaria: damageLevel,
    observacoes,
    valorMaoDeObraFunilaria: Math.round(valorMaoDeObraFunilaria * 100) / 100,
    valorMaoDeObraPintura: Math.round(valorMaoDeObraPintura * 100) / 100,
    valorInsumosFracionados: Math.round(valorInsumosFracionados * 100) / 100,
    custoPecaReposicao: Math.round(custoPecaReposicao * 100) / 100,
    custoBaseItem: Math.round(custoBaseItem * 100) / 100,
    margemLucroItem: margemLucroPercentual,
    valorLucroItem,
    valorTotalItem,
    detalhesInsumos,
  };
}

/**
 * Recalcula a margem de lucro de uma lista de itens em cima de cada peça,
 * garantindo que a somatória das peças coincida perfeitamente com o total final.
 */
export function recalculateQuoteItemsWithMargin(
  itens: QuoteItem[],
  novaMargemLucro: number
): QuoteItem[] {
  return itens.map((item) => {
    // Serviços de polimento tabelado ou estética já têm preço fechado de venda
    const isPolishing = item.pecaId.startsWith('polimento_') || item.pecaId.startsWith('addon_');
    if (isPolishing) {
      return item;
    }

    const custoBase = item.custoBaseItem !== undefined
      ? item.custoBaseItem
      : (
          item.valorMaoDeObraFunilaria +
          item.valorMaoDeObraPintura +
          item.valorInsumosFracionados +
          item.custoPecaReposicao
        );

    const valorLucroItem = Math.round(custoBase * (novaMargemLucro / 100) * 100) / 100;
    const valorTotalItem = Math.round((custoBase + valorLucroItem) * 100) / 100;

    return {
      ...item,
      custoBaseItem: Math.round(custoBase * 100) / 100,
      margemLucroItem: novaMargemLucro,
      valorLucroItem,
      valorTotalItem,
    };
  });
}

/**
 * Calcula o consolidado geral do orçamento com base na somatória exata das peças já precificadas,
 * garantindo que a soma dos itens no PDF e no WhatsApp coincida perfeitamente com o total geral.
 */
export function calculateQuoteTotals(
  itens: QuoteItem[],
  margemLucroPercentual: number,
  desconto: number = 0
) {
  let subtotalMaoDeObra = 0;
  let subtotalInsumosFracionados = 0;
  let subtotalPecasReposicao = 0;
  let subtotalServicos = 0;
  let valorLucroTotal = 0;

  itens.forEach((item) => {
    subtotalMaoDeObra += item.valorMaoDeObraFunilaria + item.valorMaoDeObraPintura;
    subtotalInsumosFracionados += item.valorInsumosFracionados;
    subtotalPecasReposicao += item.custoPecaReposicao;
    subtotalServicos += item.valorTotalItem;
    if (item.valorLucroItem !== undefined) {
      valorLucroTotal += item.valorLucroItem;
    }
  });

  const baseCustoDireto = subtotalMaoDeObra + subtotalInsumosFracionados + subtotalPecasReposicao;
  
  // Se o item não tiver lucro explicitado individualmente (ex: legado ou serviço estético)
  const valorLucro = valorLucroTotal > 0
    ? valorLucroTotal
    : Math.max(0, subtotalServicos - baseCustoDireto);

  const valorSemDesconto = Math.round(subtotalServicos * 100) / 100;
  const valorTotal = Math.max(0, Math.round((valorSemDesconto - desconto) * 100) / 100);

  const valorSinal50 = Math.round((valorTotal / 2) * 100) / 100;
  const valorRestante50 = Math.round((valorTotal - valorSinal50) * 100) / 100;

  return {
    subtotalMaoDeObra: Math.round(subtotalMaoDeObra * 100) / 100,
    subtotalInsumosFracionados: Math.round(subtotalInsumosFracionados * 100) / 100,
    subtotalPecasReposicao: Math.round(subtotalPecasReposicao * 100) / 100,
    baseCustoDireto: Math.round(baseCustoDireto * 100) / 100,
    valorLucro: Math.round(valorLucro * 100) / 100,
    subtotalServicos: valorSemDesconto,
    desconto: Math.round(desconto * 100) / 100,
    valorTotal,
    valorSinal50,
    valorRestante50,
  };
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}
