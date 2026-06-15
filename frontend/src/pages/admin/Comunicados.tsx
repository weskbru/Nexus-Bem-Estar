import { useEffect, useState } from 'react';
import { Send, Clock, Users, Plus, X, Pencil, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EditorComunicado from '../../components/EditorComunicado';

const API = import.meta.env.VITE_API_URL ?? '/api';
const AGENDAMENTO_MINIMO_MINUTOS = 5;

interface ComunicadoItem {
  id: number;
  assunto: string;
  corpo_html?: string;
  enviado_por: string;
  status: 'agendado' | 'enviando' | 'enviado' | 'falhou' | 'cancelado';
  status_label: string;
  agendado_para: string | null;
  agendado_para_formatado: string | null;
  enviado_em: string | null;
  cancelado_em: string | null;
  total_destinatarios: number;
  tentativas_envio: number;
  erro_envio: string;
}

type Modo = 'novo' | 'editar';
type ModoEnvio = 'imediato' | 'agendado';

const statusClasses: Record<ComunicadoItem['status'], string> = {
  agendado: 'bg-blue-50 text-blue-700 border-blue-200',
  enviando: 'bg-amber-50 text-amber-700 border-amber-200',
  enviado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  falhou: 'bg-red-50 text-red-700 border-red-200',
  cancelado: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function Comunicados() {
  const { token } = useAuth();

  const [historico, setHistorico] = useState<ComunicadoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modo, setModo] = useState<Modo>('novo');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [assunto, setAssunto] = useState('');
  const [corpoHtml, setCorpoHtml] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [modalEnvio, setModalEnvio] = useState(false);
  const [modoEnvio, setModoEnvio] = useState<ModoEnvio>('agendado');
  const [dataEnvio, setDataEnvio] = useState('');
  const [horaEnvio, setHoraEnvio] = useState('08:00');

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

  function hojeInput() {
    const dt = new Date();
    const ano = dt.getFullYear();
    const mes = String(dt.getMonth() + 1).padStart(2, '0');
    const dia = String(dt.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function dataInputLocal(value: string | null) {
    if (!value) return hojeInput();
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return hojeInput();
    const ano = dt.getFullYear();
    const mes = String(dt.getMonth() + 1).padStart(2, '0');
    const dia = String(dt.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function horaInputLocal(value: string | null) {
    if (!value) return '08:00';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '08:00';
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }

  function abrirNovo() {
    setModo('novo');
    setEditandoId(null);
    setAssunto('');
    setCorpoHtml('');
    setErro(null);
    setSucesso(null);
    setDataEnvio(hojeInput());
    setHoraEnvio('08:00');
    setMostrarForm(true);
  }

  async function abrirEditar(id: number) {
    setErro(null);
    setSucesso(null);
    try {
      const res = await fetch(`${API}/admin/comunicados/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ComunicadoItem = await res.json();
      if (!res.ok) throw new Error((data as unknown as { erro?: string }).erro ?? 'Erro ao carregar.');

      setAssunto(data.assunto);
      setCorpoHtml(data.corpo_html ?? '');
      setDataEnvio(dataInputLocal(data.agendado_para));
      setHoraEnvio(horaInputLocal(data.agendado_para));

      if (data.status === 'enviado') {
        setModo('novo');
        setEditandoId(null);
        setSucesso('Conteudo carregado como base para um novo agendamento.');
      } else {
        setModo('editar');
        setEditandoId(id);
      }

      setMostrarForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSucesso(null);
      setErro(err instanceof Error ? err.message : 'Erro ao carregar comunicado.');
    }
  }

  function fecharForm() {
    setMostrarForm(false);
    setModalEnvio(false);
    setAssunto('');
    setCorpoHtml('');
    setErro(null);
  }

  function validarFormulario() {
    setErro(null);
    if (!assunto.trim()) { setErro('Preencha o assunto.'); return false; }
    if (!corpoHtml.trim() || corpoHtml === '<p><br></p>') { setErro('Escreva o corpo do comunicado.'); return false; }
    return true;
  }

  function abrirModalEnvio(modoSelecionado: ModoEnvio) {
    if (!validarFormulario()) return;
    setModoEnvio(modoSelecionado);
    setModalEnvio(true);
  }

  function dataHoraAgendada() {
    if (!dataEnvio || !horaEnvio) return null;
    return new Date(`${dataEnvio}T${horaEnvio}:00`);
  }

  function agendamentoValido() {
    const agendado = dataHoraAgendada();
    if (!agendado || Number.isNaN(agendado.getTime())) return false;
    const minimo = Date.now() + AGENDAMENTO_MINIMO_MINUTOS * 60 * 1000;
    return agendado.getTime() >= minimo;
  }

  async function salvarComunicado() {
    if (!validarFormulario()) return;
    if (modoEnvio === 'agendado' && !agendamentoValido()) {
      setErro(`Agende o envio para pelo menos ${AGENDAMENTO_MINIMO_MINUTOS} minutos no futuro.`);
      return;
    }

    const agendado = dataHoraAgendada();
    const payload = {
      assunto,
      corpo_html: corpoHtml,
      modo_envio: modoEnvio,
      agendado_para: modoEnvio === 'agendado' && agendado ? agendado.toISOString() : undefined,
    };

    setEnviando(true);
    setErro(null);

    try {
      const url = modo === 'editar' && editandoId
        ? `${API}/admin/comunicados/${editandoId}/`
        : `${API}/admin/comunicados/`;
      const res = await fetch(url, {
        method: modo === 'editar' && editandoId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao salvar comunicado.');

      if (modoEnvio === 'agendado') {
        setSucesso(`Comunicado agendado para ${data.agendado_para_formatado}.`);
      } else {
        setSucesso(`Comunicado enviado para ${data.total_enviado} destinatario${data.total_enviado !== 1 ? 's' : ''}.`);
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
      const cancelado = res.status !== 204;
      setSucesso(cancelado ? 'Agendamento cancelado.' : 'Comunicado excluido.');
      setConfirmExcluir(null);
      await carregarHistorico();
    } catch {
      setErro('Nao foi possivel concluir a acao.');
    } finally {
      setExcluindoId(null);
    }
  }

  function referenciaData(c: ComunicadoItem) {
    if (c.status === 'agendado') return c.agendado_para_formatado ?? '-';
    if (c.status === 'cancelado') return c.cancelado_em ?? '-';
    return c.enviado_em ?? c.agendado_para_formatado ?? '-';
  }

  function textoConfirmacaoExclusao(c: ComunicadoItem) {
    if (c.status === 'agendado') return `Cancelar o agendamento de "${c.assunto}"?`;
    return `Excluir "${c.assunto}"? Esta acao nao pode ser desfeita.`;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Comunicados</h1>
          <p className="text-slate-500 text-sm mt-1">Envie ou agende mensagens para os destinatarios configurados.</p>
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

      {sucesso && !mostrarForm && (
        <div className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-4 text-sm font-medium">
          <Send className="w-4 h-4 shrink-0 text-emerald-600" />
          {sucesso}
        </div>
      )}

      {mostrarForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-8 animate-in slide-in-from-top-4">
          <h2 className="text-lg font-bold text-slate-900 mb-5">
            {modo === 'editar' ? 'Editar Agendamento' : 'Novo Comunicado'}
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assunto</label>
            <input
              type="text"
              value={assunto}
              onChange={e => setAssunto(e.target.value)}
              placeholder="Ex: Massagem Expressa - agenda disponivel"
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
              O disparo sera unico. Para outro envio, crie ou reutilize um comunicado.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => abrirModalEnvio('imediato')}
                disabled={enviando}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-60 text-blue-700 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
                Enviar agora
              </button>
              <button
                onClick={() => abrirModalEnvio('agendado')}
                disabled={enviando}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <Clock className="w-4 h-4" />
                Agendar envio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Historico de Comunicados</h2>
        </div>

        {carregando ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : historico.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            Nenhum comunicado criado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historico.map(c => (
              <li key={c.id}>
                {confirmExcluir === c.id && (
                  <div className="mx-6 my-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-red-800 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{textoConfirmacaoExclusao(c)}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setConfirmExcluir(null)}
                        className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => handleExcluir(c.id)}
                        disabled={excluindoId === c.id}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold"
                      >
                        {excluindoId === c.id ? 'Processando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 truncate">{c.assunto}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold uppercase ${statusClasses[c.status]}`}>
                        {c.status_label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" /> {referenciaData(c)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3.5 h-3.5" /> {c.total_destinatarios} destinatario{c.total_destinatarios !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-slate-400">Por: {c.enviado_por}</span>
                    </div>
                    {c.status === 'falhou' && c.erro_envio && (
                      <p className="text-xs text-red-600 mt-1 truncate">{c.erro_envio}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => abrirEditar(c.id)}
                      title={c.status === 'enviado' ? 'Usar como base' : 'Editar'}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {c.status === 'enviado' ? <RefreshCw className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setConfirmExcluir(confirmExcluir === c.id ? null : c.id)}
                      title={c.status === 'agendado' ? 'Cancelar agendamento' : 'Excluir'}
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

      {modalEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Fechar modal"
            onClick={() => setModalEnvio(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900">Definir envio</h3>
              <button onClick={() => setModalEnvio(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModoEnvio('imediato')}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-colors ${modoEnvio === 'imediato' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Enviar agora
                </button>
                <button
                  type="button"
                  onClick={() => setModoEnvio('agendado')}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-colors ${modoEnvio === 'agendado' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Agendar envio
                </button>
              </div>

              {modoEnvio === 'agendado' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Data</label>
                    <input
                      type="date"
                      min={hojeInput()}
                      value={dataEnvio}
                      onChange={e => setDataEnvio(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Horario</label>
                    <input
                      type="time"
                      value={horaEnvio}
                      onChange={e => setHoraEnvio(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {modoEnvio === 'agendado' && !agendamentoValido() && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Escolha uma data e horario pelo menos {AGENDAMENTO_MINIMO_MINUTOS} minutos no futuro.
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalEnvio(false)}
                  disabled={enviando}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm disabled:opacity-60"
                >
                  Voltar
                </button>
                <button
                  onClick={salvarComunicado}
                  disabled={enviando || (modoEnvio === 'agendado' && !agendamentoValido())}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm"
                >
                  <Send className="w-4 h-4" />
                  {enviando ? 'Processando...' : (modoEnvio === 'agendado' ? 'Agendar comunicado' : 'Enviar agora')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
