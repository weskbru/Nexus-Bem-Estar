import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface EditorComunicadoProps {
  value: string;
  onChange: (value: string) => void;
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const CURSORS: Record<Handle, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize', se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize',
};

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function handleCSS(h: Handle): React.CSSProperties {
  const off = -5;
  const mid = 'calc(50% - 5px)';
  switch (h) {
    case 'nw': return { top: off, left: off };
    case 'n':  return { top: off, left: mid };
    case 'ne': return { top: off, right: off };
    case 'e':  return { top: mid, right: off };
    case 'se': return { bottom: off, right: off };
    case 's':  return { bottom: off, left: mid };
    case 'sw': return { bottom: off, left: off };
    case 'w':  return { top: mid, left: off };
  }
}

export default function EditorComunicado({ value, onChange }: EditorComunicadoProps) {
  const quillRef  = useRef<ReactQuill | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);

  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    ratio: number;
  } | null>(null);

  // ── Inserir imagem diretamente (sem modal)
  function openPicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';
    input.click();
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { globalThis.alert('A imagem deve ter no máximo 10 MB.'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const editor = quillRef.current?.getEditor();
        if (!editor) return;
        const range = editor.getSelection(true);
        const idx = range ? range.index : editor.getLength();
        editor.insertEmbed(idx, 'image', base64, 'user');
        editor.setSelection(idx + 1);
      };
      reader.readAsDataURL(file);
    };
  }

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: { image: openPicker },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const formats = [
    'header', 'bold', 'italic', 'underline',
    'color', 'background', 'align',
    'link', 'image',
  ];

  // ── Sincroniza o overlay com a imagem selecionada
  const syncOverlay = useCallback((img: HTMLImageElement) => {
    const overlay = overlayRef.current;
    const wrapper = wrapperRef.current;
    if (!overlay || !wrapper) return;
    const wRect = wrapper.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    overlay.style.top    = `${iRect.top  - wRect.top}px`;
    overlay.style.left   = `${iRect.left - wRect.left}px`;
    overlay.style.width  = `${iRect.width}px`;
    overlay.style.height = `${iRect.height}px`;
    overlay.style.display = 'block';
  }, []);

  // ── Detecta clique em imagem
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === 'IMG' && wrapper!.contains(t)) {
        const img = t as HTMLImageElement;
        setSelectedImg(img);
        syncOverlay(img);
      } else if (!overlayRef.current?.contains(t)) {
        setSelectedImg(null);
        if (overlayRef.current) overlayRef.current.style.display = 'none';
      }
    }

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [syncOverlay]);

  // ── Inicia drag
  function onHandleMouseDown(e: React.MouseEvent, handle: Handle) {
    if (!selectedImg) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = selectedImg.getBoundingClientRect();
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      ratio: rect.height / rect.width,
    };
  }

  // ── Drag e mouseup
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current;
      const img = selectedImg;
      if (!drag || !img) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      let newW = drag.startW;

      switch (drag.handle) {
        case 'e': case 'ne': case 'se': newW = drag.startW + dx; break;
        case 'w': case 'nw': case 'sw': newW = drag.startW - dx; break;
        case 's': newW = (drag.startH + dy) / drag.ratio; break;
        case 'n': newW = (drag.startH - dy) / drag.ratio; break;
      }

      newW = Math.max(40, Math.min(newW, 900));
      img.style.width  = `${Math.round(newW)}px`;
      img.style.height = 'auto';
      syncOverlay(img);
    }

    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      if (!selectedImg) return;

      const finalW = Math.round(selectedImg.getBoundingClientRect().width);
      selectedImg.setAttribute('width', String(finalW));
      selectedImg.removeAttribute('height');
      selectedImg.style.removeProperty('width');
      selectedImg.style.removeProperty('height');

      syncOverlay(selectedImg);

      const editor = quillRef.current?.getEditor();
      if (editor) onChange((editor.root as HTMLElement).innerHTML);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [selectedImg, syncOverlay, onChange]);

  return (
    <div ref={wrapperRef} className="relative editor-comunicado">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder="Escreva o comunicado aqui..."
      />
      <p className="text-xs text-slate-400 mt-1.5">
        Para inserir imagem clique no ícone 🖼️ na barra e selecione o arquivo (PNG, JPG, WEBP — máx. 10 MB). Clique numa imagem inserida para redimensioná-la.
      </p>

      {/* Overlay de resize */}
      <div
        ref={overlayRef}
        style={{
          display: 'none',
          position: 'absolute',
          boxSizing: 'border-box',
          border: '2px solid #3b82f6',
          pointerEvents: 'none',
          zIndex: 20,
          borderRadius: 2,
        }}
      >
        {HANDLES.map(h => (
          <div
            key={h}
            onMouseDown={(e) => onHandleMouseDown(e, h)}
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              background: '#ffffff',
              border: '2px solid #3b82f6',
              borderRadius: 2,
              pointerEvents: 'auto',
              cursor: CURSORS[h],
              ...handleCSS(h),
            }}
          />
        ))}
      </div>

      <style>{`
        .editor-comunicado .ql-container {
          min-height: 280px;
          font-size: 14px;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        .editor-comunicado .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background: #f8fafc;
        }
        .editor-comunicado .ql-editor {
          min-height: 280px;
        }
        .editor-comunicado .ql-editor img {
          max-width: 100%;
          border-radius: 6px;
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
}
