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
 * Calcula os custos fracionados exatos de materiais e mão de obra para um item
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

  const valorTotalItem =
    valorMaoDeObraFunilaria +
    valorMaoDeObraPintura +
    valorInsumosFracionados +
    custoPecaReposicao;

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
    valorTotalItem: Math.round(valorTotalItem * 100) / 100,
    detalhesInsumos,
  };
}

/**
 * Calcula o consolidado geral do orçamento com margem de lucro e condição de 50% de sinal
 */
export function calculateQuoteTotals(
  itens: QuoteItem[],
  margemLucroPercentual: number,
  desconto: number = 0
) {
  let subtotalMaoDeObra = 0;
  let subtotalInsumosFracionados = 0;
  let subtotalPecasReposicao = 0;

  itens.forEach((item) => {
    subtotalMaoDeObra += item.valorMaoDeObraFunilaria + item.valorMaoDeObraPintura;
    subtotalInsumosFracionados += item.valorInsumosFracionados;
    subtotalPecasReposicao += item.custoPecaReposicao;
  });

  const baseCustoDireto = subtotalMaoDeObra + subtotalInsumosFracionados + subtotalPecasReposicao;
  const valorLucro = baseCustoDireto * (margemLucroPercentual / 100);
  const valorSemDesconto = baseCustoDireto + valorLucro;
  const valorTotal = Math.max(0, valorSemDesconto - desconto);

  const valorSinal50 = Math.round((valorTotal / 2) * 100) / 100;
  const valorRestante50 = Math.round((valorTotal - valorSinal50) * 100) / 100;

  return {
    subtotalMaoDeObra: Math.round(subtotalMaoDeObra * 100) / 100,
    subtotalInsumosFracionados: Math.round(subtotalInsumosFracionados * 100) / 100,
    subtotalPecasReposicao: Math.round(subtotalPecasReposicao * 100) / 100,
    baseCustoDireto: Math.round(baseCustoDireto * 100) / 100,
    valorLucro: Math.round(valorLucro * 100) / 100,
    desconto: Math.round(desconto * 100) / 100,
    valorTotal: Math.round(valorTotal * 100) / 100,
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
