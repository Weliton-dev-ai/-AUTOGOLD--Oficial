import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  ZoomIn, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Image as ImageIcon,
  RotateCw,
  Loader2
} from 'lucide-react';
import { DamagePhoto } from '../types';
import { compressImage, rotateImageDataUrl } from '../utils/imageCompressor';

interface DamageInspectionPhotosProps {
  photos: DamagePhoto[];
  onChangePhotos: (photos: DamagePhoto[]) => void;
}

export const DamageInspectionPhotos: React.FC<DamageInspectionPhotosProps> = ({
  photos,
  onChangePhotos,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<DamagePhoto | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  // Girar foto em 90 graus no sentido horário
  const handleRotatePhoto = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const photo = photos.find((p) => p.id === id);
    if (!photo || rotatingId) return;

    setRotatingId(id);
    try {
      const rotatedUrl = await rotateImageDataUrl(photo.url, 90);
      const updated = photos.map((p) => (p.id === id ? { ...p, url: rotatedUrl } : p));
      onChangePhotos(updated);
      if (previewPhoto?.id === id) {
        setPreviewPhoto({ ...previewPhoto, url: rotatedUrl });
      }
    } catch (err) {
      console.error('Erro ao girar imagem:', err);
    } finally {
      setRotatingId(null);
    }
  };

  // Processar arquivos de imagens selecionados
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    const newPhotos: DamagePhoto[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const compressedDataUrl = await compressImage(file, 1280, 1280, 0.85);
        const now = new Date();
        const dataHoraFormatada = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        newPhotos.push({
          id: `foto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          url: compressedDataUrl,
          descricao: `Avaria registrada na entrada - ${file.name.replace(/\.[^/.]+$/, '')}`,
          dataHora: dataHoraFormatada,
        });
      } catch (err) {
        console.error('Erro ao processar imagem:', err);
      }
    }

    onChangePhotos([...photos, ...newPhotos]);
    setIsUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUpdateDescription = (id: string, text: string) => {
    const updated = photos.map((p) => (p.id === id ? { ...p, descricao: text } : p));
    onChangePhotos(updated);
  };

  const handleRemovePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    onChangePhotos(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* Upload Box Principal */}
      <div className="bg-[#121E2B] border border-[#1E3349] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E3349] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Registro Fotográfico de Avarias</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-bold">
                  Fotos Ilimitadas
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tire fotos ou faça upload dos danos para anexar automaticamente ao laudo e PDF do cliente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 bg-[#0A0A0C] px-3 py-1.5 rounded-xl border border-[#223952]">
              {photos.length} {photos.length === 1 ? 'foto registrada' : 'fotos registradas'}
            </span>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
            dragOver
              ? 'border-blue-500 bg-blue-950/30 text-blue-300 scale-[1.01]'
              : 'border-[#2A4360] hover:border-blue-400/80 bg-[#0E1722]/70 hover:bg-[#142232] text-slate-300'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="w-12 h-12 rounded-full bg-[#1A2D40] text-blue-400 flex items-center justify-center shadow-inner">
            {isUploading ? (
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-blue-400" />
            )}
          </div>

          <div>
            <p className="font-bold text-sm text-white">
              {isUploading ? 'Processando e otimizando fotos...' : 'Clique para selecionar fotos ou arraste aqui'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Fotos da câmera do celular, computador ou galeria (PNG, JPG, HEIC, WEBP).
            </p>
          </div>
        </div>

        {/* Grid de Fotos Registradas */}
        {photos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="bg-[#0A0A0C] border border-[#1E3349] rounded-xl overflow-hidden flex flex-col group hover:border-blue-500/50 transition-all shadow-md"
              >
                {/* Imagem com botões flutuantes */}
                <div className="relative aspect-video bg-[#050508] flex items-center justify-center overflow-hidden border-b border-[#1E3349]">
                  <img
                    src={photo.url}
                    alt={photo.descricao}
                    className="w-full h-full object-contain select-none"
                  />
                  <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-white/10">
                    #{index + 1}
                  </span>

                  <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleRotatePhoto(photo.id, e)}
                      disabled={rotatingId === photo.id}
                      title="Girar foto 90°"
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-blue-600 text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {rotatingId === photo.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      ) : (
                        <RotateCw className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photo)}
                      title="Visualizar em tamanho grande"
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-blue-600 text-white transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      title="Remover foto"
                      className="p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Campo de legenda e dados */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Identificação / Legenda da Avaria (Sai no PDF):
                    </label>
                    <input
                      type="text"
                      value={photo.descricao}
                      onChange={(e) => handleUpdateDescription(photo.id, e.target.value)}
                      placeholder="Ex: Parachoque dianteiro - amassado com perda de tinta"
                      className="w-full px-2.5 py-1.5 bg-[#121E2B] border border-[#223952] rounded-lg text-xs text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-[#18283A]">
                    <span>{photo.dataHora}</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Pronta para PDF
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Zoom da Foto */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex flex-col items-center justify-center">
          <div className="relative max-w-4xl w-full bg-[#121E2B] rounded-2xl overflow-hidden border border-[#223952]">
            <div className="p-3 bg-[#0A0A0C] border-b border-[#1E3349] flex items-center justify-between text-white">
              <span className="font-bold text-xs truncate max-w-[60%]">{previewPhoto.descricao}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRotatePhoto(previewPhoto.id)}
                  disabled={rotatingId === previewPhoto.id}
                  className="px-2.5 py-1 rounded-lg bg-[#1A2D40] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {rotatingId === previewPhoto.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCw className="w-3.5 h-3.5" />
                  )}
                  <span>Girar 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="p-1 rounded-lg bg-[#121E2B] text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2 max-h-[75vh] flex items-center justify-center bg-black">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.descricao}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
