import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface GeneratePdfResult {
  pdf: jsPDF;
  blob: Blob;
  file: File;
  dataUrl: string;
}

/**
 * Gera um arquivo PDF a partir de um elemento HTML (A4 portrait).
 * Suporta detecção de páginas dedicadas (.pdf-page) para garantir que
 * fotos do laudo e tabelas nunca sejam cortadas ao meio ou sofram artefatos visuais.
 */
export async function generateQuotePdf(
  elementId: string,
  filename: string = 'Orcamento.pdf'
): Promise<GeneratePdfResult> {
  const container = document.getElementById(elementId);
  if (!container) {
    throw new Error(`Elemento #${elementId} não encontrado no DOM para geração de PDF.`);
  }

  // Dimensões A4 em mm
  const pdfWidth = 210;
  const pdfHeight = 297;

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Verificar se há páginas demarcadas (.pdf-page)
  const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));

  if (pageElements.length > 0) {
    // Processamento Página por Página: evita cortes no meio de fotos e faixas indesejadas
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2.2, // Alta nitidez
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        windowWidth: 800,
        onclone: (_clonedDoc, clonedEl) => {
          clonedEl.style.width = '794px';
          clonedEl.style.maxWidth = '794px';
          clonedEl.style.minWidth = '794px';
          clonedEl.style.boxSizing = 'border-box';
          clonedEl.style.backgroundColor = '#FFFFFF';
        },
      });

      // 98% de qualidade JPEG para máxima nitidez das fotos e tipografia
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (i > 0) {
        pdf.addPage('a4', 'p');
      }

      if (imgHeight <= pdfHeight) {
        // Renderiza no topo da folha A4 com alta nitidez
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'SLOW');
      } else {
        // Fallback caso uma página individual exceda a altura A4
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'SLOW');
        heightLeft -= pdfHeight;

        while (heightLeft > 5) {
          position = heightLeft - imgHeight;
          pdf.addPage('a4', 'p');
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'SLOW');
          heightLeft -= pdfHeight;
        }
      }
    }
  } else {
    // Fallback padrão se não houver .pdf-page no DOM
    const canvas = await html2canvas(container, {
      scale: 2.2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      windowWidth: 800,
      onclone: (_clonedDoc, clonedEl) => {
        clonedEl.style.width = '794px';
        clonedEl.style.maxWidth = '794px';
        clonedEl.style.minWidth = '794px';
        clonedEl.style.boxSizing = 'border-box';
        clonedEl.style.backgroundColor = '#FFFFFF';
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'SLOW');
    heightLeft -= pdfHeight;

    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage('a4', 'p');
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'SLOW');
      heightLeft -= pdfHeight;
    }
  }

  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const dataUrl = URL.createObjectURL(blob);

  return { pdf, blob, file, dataUrl };
}

/**
 * Faz o download direto do arquivo PDF no navegador
 */
export async function downloadQuotePdf(
  elementId: string,
  filename: string = 'Orcamento.pdf'
): Promise<File> {
  const { pdf, file } = await generateQuotePdf(elementId, filename);
  pdf.save(filename);
  return file;
}

/**
 * Compartilha o PDF diretamente via Web Share API se suportado,
 * ou faz download e abre o WhatsApp com o link/instruções
 */
export async function sharePdfOrWhatsApp(
  elementId: string,
  filename: string,
  whatsappNumber: string,
  textMessage: string
): Promise<{ method: 'share' | 'download_and_redirect'; success: boolean }> {
  try {
    const { file, pdf } = await generateQuotePdf(elementId, filename);

    // 1. Tenta compartilhamento nativo com arquivo (comum em celulares Android e iOS Safari)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
          text: textMessage,
        });
        return { method: 'share', success: true };
      } catch (err: unknown) {
        // Se o usuário cancelou o compartilhamento nativo, não faz nada
        if (err instanceof Error && err.name === 'AbortError') {
          return { method: 'share', success: false };
        }
        console.warn('Falha no navigator.share, fallback para download:', err);
      }
    }

    // 2. Fallback: Baixa o PDF no dispositivo
    pdf.save(filename);

    // 3. Abre o WhatsApp com a mensagem
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const encodedText = encodeURIComponent(
      `${textMessage}\n\n📎 *O arquivo PDF completo do orçamento (${filename}) foi gerado e baixado no seu dispositivo para envio como anexo.*`
    );

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const whatsappUrl = isMobile
      ? `https://api.whatsapp.com/send?phone=${cleanNumber ? (cleanNumber.length <= 11 ? '55' + cleanNumber : cleanNumber) : ''}&text=${encodedText}`
      : `https://web.whatsapp.com/send?phone=${cleanNumber ? (cleanNumber.length <= 11 ? '55' + cleanNumber : cleanNumber) : ''}&text=${encodedText}`;

    window.open(whatsappUrl, '_blank');

    return { method: 'download_and_redirect', success: true };
  } catch (error) {
    console.error('Erro ao gerar/enviar PDF:', error);
    throw error;
  }
}
