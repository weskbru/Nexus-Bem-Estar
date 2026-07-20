import { useEffect, useRef, useState } from 'react';
import { X, ImageIcon } from 'lucide-react';

interface ImagemRedimensionarModalProps {
  file: File;
  onConfirmar: (base64: string) => void;
  onCancelar: () => void;
}

function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImagemRedimensionarModal({
  file,
  onConfirmar,
  onCancelar,
}: ImagemRedimensionarModalProps) {
  const [larguraPct, setLarguraPct] = useState(100);
  const [dimensoesOriginais, setDimensoesOriginais] = useState<{ w: number; h: number } | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string>('');
  const [tamanhoEstimado, setTamanhoEstimado] = useState<number>(file.size);
  const [processando, setProcessando] = useState(false);
  const objectUrlRef = useRef<string>('');

  // Carrega dimensões originais e base64 inicial
  useEffect(() => {
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const img = new Image();
    img.onload = () => {
      setDimensoesOriginais({ w: img.naturalWidth, h: img.naturalHeight });
      // Gera preview inicial em 100%
      renderizar(img, 100);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  function renderizar(img: HTMLImageElement, pct: number) {
    const novaLargura = Math.round(img.naturalWidth * (pct / 100));
    const novaAltura = Math.round(img.naturalHeight * (pct / 100));
    const canvas = document.createElement('canvas');
    canvas.width = novaLargura;
    canvas.height = novaAltura;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, novaLargura, novaAltura);
    const b64 = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewBase64(b64);
    // Estima tamanho: base64 length * 0.75 aprox bytes
    setTamanhoEstimado(Math.round((b64.length - b64.indexOf(',') - 1) * 0.75));
  }

  // Re-renderiza ao mudar o slider (debounce leve)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSlider(pct: number) {
    setLarguraPct(pct);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const img = new Image();
      img.onload = () => renderizar(img, pct);
      img.src = objectUrlRef.current;
    }, 120);
  }

  async function handleConfirmar() {
    setProcessando(true);
    // previewBase64 já está com o tamanho correto
    onConfirmar(previewBase64);
  }

  const larguraPx = dimensoesOriginais
    ? Math.round(dimensoesOriginais.w * (larguraPct / 100))
    : null;
  const alturaPx = dimensoesOriginais
    ? Math.round(dimensoesOriginais.h * (larguraPct / 100))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-5">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Ajustar tamanho da imagem</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            className="p-2 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ minHeight: 180, maxHeight: 300 }}>
          {previewBase64
            ? <img
                src={previewBase64}
                alt="preview"
                className="object-contain max-h-72 rounded-lg"
                style={{ maxWidth: '100%' }}
              />
            : <div className="text-slate-400 text-sm">Carregando...</div>
          }
        </div>

        {/* Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Largura da imagem</span>
            <span className="text-sm font-bold text-blue-600">{larguraPct}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={larguraPct}
            onChange={e => handleSlider(Number(e.target.value))}
            className="w-full h-2 appearance-none rounded-full bg-slate-200 accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Info de dimensões e tamanho */}
        {dimensoesOriginais && larguraPx && alturaPx && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] text-slate-400 mb-1">Dimensões</p>
              <p className="text-sm font-bold text-slate-700">{larguraPx} × {alturaPx}px</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] text-slate-400 mb-1">Tamanho</p>
              <p className="text-sm font-bold text-slate-700">{formatarBytes(tamanhoEstimado)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[11px] text-slate-400 mb-1">Original</p>
              <p className="text-sm font-bold text-slate-500">{formatarBytes(file.size)}</p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!previewBase64 || processando}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Inserir imagem
          </button>
        </div>
      </div>
    </div>
  );
}
