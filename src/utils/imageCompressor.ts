/**
 * Utilitário de redimensionamento, compressão e rotação de imagens no cliente
 * Garante que fotos em alta resolução da câmera do celular/computador
 * sejam otimizadas para caber no armazenamento local e renderizar com perfeição no PDF
 */
export async function compressImage(
  file: File,
  maxWidthOrQuality: number = 1280,
  maxHeightOrQuality: number = 1280,
  qualityParam: number = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Normalização inteligente de parâmetros para aceitar tanto:
    // compressImage(file, 1280, 1280, 0.88) quanto compressImage(file, 1280, 0.88)
    let maxWidth = 1280;
    let maxHeight = 1280;
    let quality = 0.88;

    if (maxWidthOrQuality > 1) {
      maxWidth = maxWidthOrQuality;
    } else if (maxWidthOrQuality > 0 && maxWidthOrQuality <= 1) {
      quality = maxWidthOrQuality;
    }

    if (maxHeightOrQuality > 1) {
      maxHeight = maxHeightOrQuality;
      quality = qualityParam;
    } else if (maxHeightOrQuality > 0 && maxHeightOrQuality <= 1) {
      // O chamador passou (file, maxWidth, quality)
      maxHeight = maxWidth;
      quality = maxHeightOrQuality;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error('Falha ao ler arquivo de imagem.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width || 1280;
        let height = img.height || 720;

        // Evitar dimensões menores que 10px ou inválidas
        if (width < 10) width = 800;
        if (height < 10) height = 600;

        // Redimensionar mantendo proporção original sem distorção
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(100, Math.round(width * ratio));
          height = Math.max(100, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        // Configurar interpolação de alta qualidade para fotos nítidas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fundo neutro
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Obter dataURL em formato JPEG com alta fidelidade e tamanho otimizado para localStorage
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => {
        // Fallback: se der erro no Image.onload, retornar o dataURL original
        resolve(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Gira uma imagem (em Base64 Data URL) em 90 graus no sentido horário
 * Recalcula o canvas e reorganiza os pixels para orientação permanente
 */
export async function rotateImageDataUrl(dataUrl: string, degrees = 90): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve('');
      return;
    }
    const img = new Image();
    // Apenas define crossOrigin para URLs externas http/https (não para data: URLs)
    if (!dataUrl.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const is90or270 = degrees === 90 || degrees === 270;
      canvas.width = is90or270 ? img.height : img.width;
      canvas.height = is90or270 ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fundo neutro
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Posicionar no centro e girar
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      try {
        resolve(canvas.toDataURL('image/jpeg', 0.90));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

