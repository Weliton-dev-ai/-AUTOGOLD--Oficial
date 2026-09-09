import QRCode from 'qrcode';

/**
 * Gera DataURL do QR Code do Pix para ser embutido no PDF impresso
 */
export async function generatePixQrCodeDataUrl(
  chavePix: string,
  nomeTitular?: string,
  cidade?: string,
  valor?: number
): Promise<string> {
  try {
    // Formata o payload Pix simples ou texto da chave
    // Se a chave for válida, gera um QR Code limpo de alta legibilidade
    const qrText = chavePix.trim();
    if (!qrText) return '';

    const dataUrl = await QRCode.toDataURL(qrText, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });

    return dataUrl;
  } catch (error) {
    console.error('Erro ao gerar QR Code Pix:', error);
    return '';
  }
}
