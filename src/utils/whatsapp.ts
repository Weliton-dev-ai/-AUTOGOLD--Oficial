import { Quote, WorkshopProfile } from '../types';
import { formatCurrencyBRL, getDamageLevelLabel } from './calculator';

export function generateWhatsAppMessage(quote: Quote, workshop: WorkshopProfile): string {
  let itensTexto = '';
  quote.itens.forEach((item, index) => {
    const isPolishing = item.pecaId.startsWith('polimento_') || item.pecaId.startsWith('addon_');
    const avariaInfo = getDamageLevelLabel(item.avaria);

    itensTexto += `\n*${index + 1}. ${item.nomePeca}*\n`;
    if (isPolishing) {
      itensTexto += `   ✨ *Informação do Polimento:* ${item.observacoes || 'Polimento automotivo profissional'}\n`;
      itensTexto += `   💵 *Valor do Serviço:* ${formatCurrencyBRL(item.valorTotalItem)}\n`;
    } else {
      itensTexto += `   🔨 *Mão de Obra:* Funilaria & Pintura (${avariaInfo.label})\n`;
      if (item.observacoes) {
        itensTexto += `   📝 *Detalhes:* ${item.observacoes}\n`;
      }
      itensTexto += `   💵 *Mão de Obra:* ${formatCurrencyBRL(item.valorTotalItem)}\n`;
    }
  });

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
• Total Mão de Obra & Serviços: ${formatCurrencyBRL(quote.subtotalMaoDeObra + quote.subtotalInsumosFracionados + quote.subtotalPecasReposicao + quote.valorLucro)}
${quote.desconto > 0 ? `• Desconto Especial: -${formatCurrencyBRL(quote.desconto)}\n` : ''}• *VALOR TOTAL DO SERVIÇO: ${formatCurrencyBRL(quote.valorTotal)}*

💳 *CONDIÇÕES DE PAGAMENTO (SINAL 50%):*
• *Sinal de Entrada (50%):* ${formatCurrencyBRL(quote.valorSinal50)}
• *Saldo Restante na Entrega:* ${formatCurrencyBRL(quote.valorRestante50)}
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
