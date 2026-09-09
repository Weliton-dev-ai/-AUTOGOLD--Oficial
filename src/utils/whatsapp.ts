import { Quote, WorkshopProfile } from '../types';
import { formatCurrencyBRL, getDamageLevelLabel } from './calculator';

export function generateWhatsAppMessage(quote: Quote, workshop: WorkshopProfile): string {
  // Garante que o preço de cada peça na lista some exatamente o total de serviços,
  // com a margem de lucro da oficina já embutida de forma imperceptível para o cliente
  const somaItens = quote.itens.reduce((acc, it) => acc + (it.valorTotalItem || 0), 0);
  const subtotalEsperado = (quote.subtotalMaoDeObra || 0) + 
    (quote.subtotalInsumosFracionados || 0) + 
    (quote.subtotalPecasReposicao || 0) + 
    (quote.valorLucro || 0);

  const fator = (somaItens > 0 && Math.abs(somaItens - subtotalEsperado) > 0.05 && subtotalEsperado > somaItens)
    ? subtotalEsperado / somaItens
    : 1;

  let itensTexto = '';
  let totalPecasCalculado = 0;

  quote.itens.forEach((item) => {
    const isPolishing = item.pecaId.startsWith('polimento_') || item.pecaId.startsWith('addon_');
    const precoItem = Math.round((item.valorTotalItem * fator) * 100) / 100;
    totalPecasCalculado += precoItem;

    if (isPolishing) {
      itensTexto += `\n• *${item.nomePeca}* (Polimento): ${formatCurrencyBRL(precoItem)}`;
    } else {
      itensTexto += `\n• *${item.nomePeca}* (Mão de Obra & Pintura): ${formatCurrencyBRL(precoItem)}`;
    }
  });

  const totalServicos = Math.round(totalPecasCalculado * 100) / 100;
  const valorTotalFinal = Math.max(0, Math.round((totalServicos - (quote.desconto || 0)) * 100) / 100);
  const sinal50 = Math.round((valorTotalFinal / 2) * 100) / 100;
  const restante50 = Math.round((valorTotalFinal - sinal50) * 100) / 100;

  const tipoTitulo = quote.tipoOrcamento === 'polimento_estetica'
    ? 'ORÇAMENTO DE POLIMENTO & ESTÉTICA'
    : quote.tipoOrcamento === 'misto'
    ? 'ORÇAMENTO DE FUNILARIA & POLIMENTO'
    : 'ORÇAMENTO DE FUNILARIA & PINTURA';

  const message = `*${tipoTitulo} - ${workshop.nomeOficina.toUpperCase()}*
📄 *Orçamento Nº:* ${quote.numero}
📅 *Data:* ${new Date(quote.dataCriacao).toLocaleDateString('pt-BR')}
⏳ *Validade:* ${new Date(quote.dataValidade).toLocaleDateString('pt-BR')}

👤 *CLIENTE:* ${quote.cliente.nome}
📱 *Telefone:* ${quote.cliente.telefone}

🚗 *DADOS DO VEÍCULO:*
• *Modelo:* ${quote.veiculo.marca ? `${quote.veiculo.marca} ` : ''}${quote.veiculo.modelo}
• *Placa:* ${quote.veiculo.placa}

🛠️ *DISCRIMINAÇÃO DOS SERVIÇOS:*${itensTexto}

💰 *RESUMO FINANCEIRO:*
• Total Mão de Obra & Serviços: ${formatCurrencyBRL(totalServicos)}
${quote.desconto > 0 ? `• Desconto Especial: -${formatCurrencyBRL(quote.desconto)}\n` : ''}• *VALOR TOTAL DO SERVIÇO: ${formatCurrencyBRL(valorTotalFinal)}*

💳 *CONDIÇÕES DE PAGAMENTO (SINAL 50%):*
• *Sinal de Entrada (50%):* ${formatCurrencyBRL(sinal50)}
• *Saldo Restante na Entrega:* ${formatCurrencyBRL(restante50)}
• *Prazo Estimado de Execução:* ${quote.prazoExecucaoDias} dias úteis

🔑 *CHAVE PIX PARA O SINAL (50%):*
• *Chave:* \`${workshop.chavePix}\` (${workshop.tipoChavePix.toUpperCase()})
• *Favorecido:* ${workshop.titularPix}

🛡️ *Garantia:* ${workshop.textoGarantia}

📍 *Local:* ${workshop.endereco} - ${workshop.cidadeUf}
📞 *Atendimento:* ${workshop.telefoneWhatsApp}

_Para confirmar e agendar a execução do serviço, basta responder a esta mensagem e efetuar o sinal via Pix._`;

  return message;
}

export function openWhatsAppDirect(phone: string, text: string): void {
  // Limpa caracteres especiais do telefone
  const cleanPhone = phone.replace(/\D/g, '');
  const internationalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${internationalPhone}?text=${encodedText}`;
  window.open(url, '_blank');
}
