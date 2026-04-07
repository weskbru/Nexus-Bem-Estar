import { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface EditorComunicadoProps {
  value: string;
  onChange: (value: string) => void;
}

// Mesma lógica usada em NovoEvento.tsx — converte para base64 e embute direto no HTML
function inserirImagemNoEditor(file: File, quillRef: React.RefObject<ReactQuill | null>): void {
  if (file.size > 5 * 1024 * 1024) {
    alert('A imagem deve ter no máximo 5 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor || typeof reader.result !== 'string') return;
    const range = editor.getSelection(true);
    const index = range ? range.index : editor.getLength();
    editor.insertEmbed(index, 'image', reader.result, 'user');
    editor.setSelection(index + 1);
  };
  reader.readAsDataURL(file);
}

function abrirSeletorImagem(quillRef: React.RefObject<ReactQuill | null>): void {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/png,image/jpeg,image/jpg,image/webp,image/gif');
  input.click();
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) inserirImagemNoEditor(file, quillRef);
  };
}

export default function EditorComunicado({ value, onChange }: EditorComunicadoProps) {
  const quillRef = useRef<ReactQuill | null>(null);

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
      handlers: {
        image: () => abrirSeletorImagem(quillRef),
      },
    },
  }), []);

  const formats = [
    'header', 'bold', 'italic', 'underline',
    'color', 'background', 'align',
    'link', 'image',
  ];

  return (
    <div className="editor-comunicado">
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
        Para inserir imagem clique no ícone 🖼️ na barra e selecione o arquivo (PNG, JPG, WEBP — máx. 5 MB).
      </p>
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
