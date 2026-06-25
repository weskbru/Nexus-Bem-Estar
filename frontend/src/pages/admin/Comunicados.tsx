import { useEffect, useState } from 'react';
import { Send, Clock, Users, Plus, X, Pencil, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EditorComunicado from '../../components/EditorComunicado';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api';

interface ComunicadoItem {
  id: number;
  assunto: string;
  enviado_por: string;
  enviado_em: string;
  total_destinatarios: number;
}

type Modo = 'novo' | 'editar';

export default function Comunicados() {
  const { token } = useAuth();

  const [historico, setHistorico] = useState<ComunicadoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Formulário
  const [modo, setModo] = useState<Modo>('novo');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [assunto, setAssunto] = useState('');
  const [corpoHtml, setCorpoHtml] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Exclusão
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<number | null>(null);

  useEffect(() => { carregarHistorico(); }, []); // eslint-disable-line

  async function carregarHistorico() {
    setCarregando(true);
    try {
      const res = await fetch(`${API}/admin/comunicados/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistorico(await res.json());
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setModo('novo');
    setEditandoId(null);
    setAssunto('');
    setCorpoHtml('');
    setErro(null);
    setSucesso(null);
    setMostrarForm(true);
  }

  async function abrirEditar(id: number) {
    setErro(null);
    setSucesso(null);
    try {
      const res = await fetch(`${API}/admin/comunicados/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao carregar.');
      setModo('editar');
      setEditandoId(id);
      setAssunto(data.assunto);
      setCorpoHtml(data.corpo_html);
      setMostrarForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSucesso(null);
      setErro(err instanceof Error ? err.message : 'Erro ao carregar comunicado.');
    }
  }

  function fecharForm() {
    setMostrarForm(false);
    setAssunto('');
    setCorpoHtml('');
    setErro(null);
  }

  async function handleEnviar() {
    setErro(null);
    if (!assunto.trim()) { setErro('Preencha o assunto.'); return; }
    if (!corpoHtml.trim() || corpoHtml === '<p><br></p>') { setErro('Escreva o corpo do comunicado.'); return; }

    setEnviando(true);
    try {
      const res = await fetch(`${API}/admin/comunicados/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assunto, corpo_html: corpoHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao enviar.');
      setSucesso(`Comunicado enviado para ${data.total_enviado} colaborador${data.total_enviado !== 1 ? 'es' : ''}.`);
      fecharForm();
      await carregarHistorico();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar comunicado.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleSalvar(reenviar: boolean) {
    if (!editandoId) return;
    setErro(null);
    if (!assunto.trim()) { setErro('Preencha o assunto.'); return; }
    if (!corpoHtml.trim() || corpoHtml === '<p><br></p>') { setErro('Escreva o corpo do comunicado.'); return; }

    setEnviando(true);
    try {
      const res = await fetch(`${API}/admin/comunicados/${editandoId}/`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assunto, corpo_html: corpoHtml, reenviar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao salvar.');

      if (reenviar) {
        setSucesso(`Comunicado reenviado para ${data.total_enviado} colaborador${data.total_enviado !== 1 ? 'es' : ''}.`);
      } else {
        setSucesso('Comunicado atualizado com sucesso.');
      }
      fecharForm();
      await carregarHistorico();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar comunicado.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleExcluir(id: number) {
    setExcluindoId(id);
    try {
      const res = await fetch(`${API}/admin/comunicados/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao excluir.');
      setSucesso('Comunicado excluído.');
      setConfirmExcluir(null);
      await carregarHistorico();
    } catch {
      setErro('Não foi possível excluir o comunicado.');
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Comunicados</h1>
          <p className="text-slate-500 text-sm mt-1">Envie mensagens para todos os colaboradores cadastrados.</p>
        </div>
        <button
          onClick={mostrarForm ? fecharForm : abrirNovo}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm
            ${mostrarForm
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {mostrarForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Novo Comunicado</>}
        </button>
      </div>

      {/* Feedback global */}
      {sucesso && !mostrarForm && (
        <div className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-4 text-sm font-medium">
          <Send className="w-4 h-4 shrink-0 text-emerald-600" />
          {sucesso}
        </div>
      )}

      {/* Formulário (novo ou editar) */}
      {mostrarForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8 animate-in slide-in-from-top-4">
          <h2 className="text-lg font-bold text-slate-900 mb-5">
            {modo === 'editar' ? 'Editar Comunicado' : 'Novo Comunicado'}
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assunto</label>
            <input
              type="text"
              value={assunto}
              onChange={e => setAssunto(e.target.value)}
              placeholder="Ex: Massagem Expressa — Agenda de Abril disponível!"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mensagem</label>
            <p className="text-xs text-slate-400 mb-2">
              Use a barra de ferramentas para formatar texto, adicionar links e inserir imagens por URL.
            </p>
            <EditorComunicado value={corpoHtml} onChange={setCorpoHtml} />
          </div>

          {erro && (
            <div className="flex items-center gap-2 text-sm text-red-600 font-medium mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {modo === 'editar'
                ? '"Salvar" atualiza sem reenviar. "Salvar e Reenviar" atualiza e envia para todos.'
                : 'O comunicado será enviado para todos os colaboradores ativos.'}
            </p>
            <div className="flex gap-2 shrink-0">
              {modo === 'editar' ? (
                <>
                  <button
                    onClick={() => handleSalvar(false)}
                    disabled={enviando}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all shadow-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    {enviando ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => handleSalvar(true)}
                    disabled={enviando}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {enviando ? 'Reenviando...' : 'Salvar e Reenviar'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEnviar}
                  disabled={enviando}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  {enviando ? 'Enviando...' : 'Enviar Comunicado'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Histórico de Envios</h2>
        </div>

        {carregando ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : historico.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            Nenhum comunicado enviado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historico.map(c => (
              <li key={c.id}>
                {/* Modal de confirmação de exclusão */}
                {confirmExcluir === c.id && (
                  <div className="mx-6 my-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-red-800 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Excluir <strong>"{c.assunto}"</strong>? Esta ação não pode ser desfeita.
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmExcluir(null)}
                        className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleExcluir(c.id)}
                        disabled={excluindoId === c.id}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold"
                      >
                        {excluindoId === c.id ? 'Excluindo...' : 'Confirmar Exclusão'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-semibold text-slate-900 truncate">{c.assunto}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> {c.enviado_em}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3.5 h-3.5" /> {c.total_destinatarios} destinatário{c.total_destinatarios !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-slate-400">Por: {c.enviado_por}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => abrirEditar(c.id)}
                      title="Editar / Reenviar"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmExcluir(confirmExcluir === c.id ? null : c.id)}
                      title="Excluir"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
