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
  // Margens físicas do documento PDF (em mm) para garantir respiro profissional
  const marginX = 8;
  const marginY = 8;
  const printableWidth = pdfWidth - (marginX * 2); // 194mm
  const printableHeight = pdfHeight - (marginY * 2); // 281mm

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Salvar estilos originais para restaurar após a geração
  const originalTransform = container.style.transform;
  const originalTransformOrigin = container.style.transformOrigin;
  const originalWidth = container.style.width;

  const parent = container.parentElement;
  const originalParentTransform = parent ? parent.style.transform : '';
  const originalParentWidth = parent ? parent.style.width : '';

  // Forçar o elemento e seu pai para 794px sem qualquer CSS transform ou transition
  // Isso impede que escalas de visualização mobile distorçam a rasterização das fontes no canvas
  const originalParentTransition = parent ? parent.style.transition : '';
  const originalContainerTransition = container.style.transition;

  if (parent) {
    parent.style.transform = 'none';
    parent.style.transition = 'none';
    parent.style.width = '794px';
  }
  container.style.transform = 'none';
  container.style.transition = 'none';
  container.style.transformOrigin = 'top left';
  container.style.width = '794px';
  container.style.maxWidth = '794px';
  container.style.minWidth = '794px';

  // Espera adequada para o motor de layout do navegador atualizar o DOM em 794px reais
  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    // 1. Garantir que todas as imagens no container estejam carregadas e prontas
    const allImages = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
    await Promise.all(
      allImages.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
        return new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 1200);
        });
      })
    );

    // Verificar se há páginas demarcadas (.pdf-page)
    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.pdf-page'));

    if (pageElements.length > 0) {
      // Processamento Página por Página: cada .pdf-page corresponde a 1 folha A4 exata
      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];

        // Certificar que todas as imagens desta página estão prontas
        const pageImgs = Array.from(pageEl.querySelectorAll<HTMLImageElement>('img'));
        await Promise.all(
          pageImgs.map((img) => {
            if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
            return new Promise((resolve) => {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false);
              setTimeout(() => resolve(false), 800);
            });
          })
        );

        const canvas = await html2canvas(pageEl, {
          scale: 2, // 2x exato para nitidez cristalina
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: '#FFFFFF',
          width: 794,
          windowWidth: 1024, // Largura desktop para garantir media queries desktop e sem reflow mobile
          scrollX: 0,
          scrollY: 0,
          imageTimeout: 15000,
          onclone: (clonedDoc, clonedEl) => {
            // Isolamento da página no topo esquerdo do documento clonado
            clonedDoc.documentElement.style.width = '794px';
            clonedDoc.documentElement.style.margin = '0';
            clonedDoc.documentElement.style.padding = '0';
            clonedDoc.documentElement.style.backgroundColor = '#FFFFFF';

            clonedDoc.body.innerHTML = '';
            clonedDoc.body.style.width = '794px';
            clonedDoc.body.style.maxWidth = '794px';
            clonedDoc.body.style.minWidth = '794px';
            clonedDoc.body.style.margin = '0';
            clonedDoc.body.style.padding = '0';
            clonedDoc.body.style.backgroundColor = '#FFFFFF';
            clonedDoc.body.style.overflow = 'visible';

            // Posição estritamente em (0, 0) sem '0 auto' para não haver deslocamento horizontal
            clonedEl.style.transform = 'none';
            clonedEl.style.webkitTransform = 'none';
            clonedEl.style.margin = '0';
            clonedEl.style.position = 'relative';
            clonedEl.style.top = '0';
            clonedEl.style.left = '0';
            clonedEl.style.width = '794px';
            clonedEl.style.maxWidth = '794px';
            clonedEl.style.minWidth = '794px';
            clonedEl.style.boxSizing = 'border-box';
            clonedEl.style.backgroundColor = '#FFFFFF';

            clonedDoc.body.appendChild(clonedEl);

            // Garantir que imagens e canvas permaneçam 100% visíveis
            const clonedImgs = Array.from(clonedEl.querySelectorAll<HTMLImageElement>('img'));
            clonedImgs.forEach((img) => {
              img.style.opacity = '1';
              img.style.visibility = 'visible';
            });

            // Folha de estilo refinada:
            // NÃO usar text-rendering: geometricPrecision nem letter-spacing: 0px (causadores de letras sobrepostas)
            // Preservar fontes mono nos números de orçamento e placas
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              * {
                box-sizing: border-box !important;
                -webkit-font-smoothing: antialiased !important;
              }
              body, .pdf-page {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                text-rendering: auto !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
                color: #0f172a !important;
                background-color: #ffffff !important;
              }
              .pdf-page {
                width: 794px !important;
                min-width: 794px !important;
                max-width: 794px !important;
                margin: 0 !important;
                padding: 36px 40px !important;
                box-sizing: border-box !important;
              }
              .font-mono, [class*="font-mono"] {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
              }
              table {
                table-layout: fixed !important;
                width: 714px !important;
                border-collapse: collapse !important;
              }
              th, td {
                word-break: normal !important;
                letter-spacing: normal !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          },
        });

        // 98% de qualidade JPEG para máxima nitidez das fotos e tipografia
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const imgHeight = (canvas.height * printableWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage('a4', 'p');
        }

        if (imgHeight <= printableHeight) {
          // Renderiza centralizado com margens reais na folha A4
          pdf.addImage(imgData, 'JPEG', marginX, marginY, printableWidth, imgHeight, undefined, 'SLOW');
        } else {
          // Se a página for um pouco maior que a altura da folha A4, escala proporcionalmente
          // para caber 100% em 1 única folha sem cortar assinaturas nem fotos ao meio
          const scale = printableHeight / imgHeight;
          const scaledWidth = printableWidth * scale;
          const centeredX = marginX + (printableWidth - scaledWidth) / 2;
          pdf.addImage(imgData, 'JPEG', centeredX, marginY, scaledWidth, printableHeight, undefined, 'SLOW');
        }
      }
    } else {
      // Fallback padrão se não houver .pdf-page no DOM
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#FFFFFF',
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 15000,
        onclone: (clonedDoc, clonedEl) => {
          let curr: HTMLElement | null = clonedEl;
          while (curr) {
            curr.style.transform = 'none';
            curr.style.webkitTransform = 'none';
            curr.style.margin = '0 auto';
            curr = curr.parentElement;
          }

          clonedEl.style.width = '794px';
          clonedEl.style.maxWidth = '794px';
          clonedEl.style.minWidth = '794px';
          clonedEl.style.boxSizing = 'border-box';
          clonedEl.style.backgroundColor = '#FFFFFF';
          clonedEl.style.margin = '0 auto';
          clonedEl.style.transform = 'none';

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              box-sizing: border-box !important;
              -webkit-font-smoothing: antialiased !important;
            }
            body, .pdf-page {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              text-rendering: auto !important;
              letter-spacing: normal !important;
              word-spacing: normal !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      if (imgHeight <= printableHeight) {
        pdf.addImage(imgData, 'JPEG', marginX, marginY, printableWidth, imgHeight, undefined, 'SLOW');
      } else {
        const scale = printableHeight / imgHeight;
        const scaledWidth = printableWidth * scale;
        const centeredX = marginX + (printableWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', centeredX, marginY, scaledWidth, printableHeight, undefined, 'SLOW');
      }
    }
  } finally {
    // Restaurar estilos originais do container e pai
    container.style.transform = originalTransform;
    container.style.transformOrigin = originalTransformOrigin;
    container.style.width = originalWidth;
    container.style.transition = originalContainerTransition;
    if (parent) {
      parent.style.transform = originalParentTransform;
      parent.style.width = originalParentWidth;
      parent.style.transition = originalParentTransition;
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
