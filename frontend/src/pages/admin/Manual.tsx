import {
  BookOpen,
  LayoutDashboard,
  Calendar,
  Users,
  Megaphone,
  ShieldCheck,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  ListOrdered,
  Bell,
  LogIn,
  PlusCircle,
  Edit3,
  Trash2,
  Send,
  ClipboardList,
  HelpCircle,
  Info,
  ChevronRight,
} from 'lucide-react';

type SecaoProps = {
  id: string;
  icon: React.ElementType;
  titulo: string;
  cor: string;
  children: React.ReactNode;
};

function Secao({ id, icon: Icon, titulo, cor, children }: SecaoProps) {
  return (
    <section id={id} className="mb-12 scroll-mt-8">
      <div className={`flex items-center gap-3 mb-6 pb-3 border-b-2 ${cor}`}>
        <div className={`p-2 rounded-xl ${cor.replace('border-', 'bg-').replace('-400', '-100').replace('-500', '-100')}`}>
          <Icon className={`w-5 h-5 ${cor.replace('border-', 'text-').replace('-400', '-600').replace('-500', '-600')}`} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function Card({ icon: Icon, titulo, descricao, cor = 'blue' }: { icon: React.ElementType; titulo: string; descricao: string; cor?: string }) {
  const cores: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
    red: 'bg-red-50 border-red-100 text-red-600',
    slate: 'bg-slate-50 border-slate-100 text-slate-600',
  };
  const [bg, border, text] = (cores[cor] ?? cores.blue).split(' ');
  return (
    <div className={`${bg} border ${border} rounded-xl p-4 flex gap-3`}>
      <div className={`shrink-0 mt-0.5 ${text}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-semibold text-slate-800 text-sm">{titulo}</p>
        <p className="text-slate-600 text-sm mt-0.5">{descricao}</p>
      </div>
    </div>
  );
}

function Passo({ numero, titulo, descricao }: { numero: number; titulo: string; descricao: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
        {numero}
      </div>
      <div className="pb-6 border-l-2 border-slate-200 pl-4 -ml-[17px]">
        <p className="font-semibold text-slate-800">{titulo}</p>
        <p className="text-sm text-slate-500 mt-0.5">{descricao}</p>
      </div>
    </div>
  );
}

function Badge({ texto, cor }: { texto: string; cor: 'green' | 'blue' | 'red' | 'orange' | 'slate' }) {
  const cores = {
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${cores[cor]}`}>
      {texto}
    </span>
  );
}

const sumario = [
  { id: 'visao-geral', label: 'Visão Geral do Sistema' },
  { id: 'perfis', label: 'Perfis de Acesso' },
  { id: 'fluxo', label: 'Fluxo Completo' },
  { id: 'admin-dashboard', label: 'Dashboard' },
  { id: 'admin-eventos', label: 'Gerenciar Eventos' },
  { id: 'admin-comunicados', label: 'Comunicados' },
  { id: 'admin-usuarios', label: 'Gestão de Usuários' },
  { id: 'colaborador', label: 'Acesso do Colaborador' },
  { id: 'lista-espera', label: 'Lista de Espera' },
  { id: 'status', label: 'Status dos Eventos' },
  { id: 'faq', label: 'Perguntas Frequentes' },
];

export default function Manual() {
  function irPara(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-500">

      {/* Cabeçalho */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-blue-600 rounded-2xl">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Manual do Sistema</h1>
            <p className="text-slate-500 text-sm mt-0.5">Agenda Bem-Estar — Guia completo de utilização</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Este manual descreve todas as funcionalidades do sistema <strong>Agenda Bem-Estar</strong> da AEB.
            Ele é destinado tanto para administradores quanto para novos usuários que precisam entender como o sistema funciona.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">

        {/* Sumário lateral */}
        <aside className="lg:w-56 shrink-0">
          <div className="sticky top-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sumário</p>
            <nav className="space-y-1">
              {sumario.map((item) => (
                <button
                  key={item.id}
                  onClick={() => irPara(item.id)}
                  className="w-full text-left flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">

          {/* ── Visão Geral ── */}
          <Secao id="visao-geral" icon={BookOpen} titulo="Visão Geral do Sistema" cor="border-blue-400">
            <p className="text-slate-600 mb-4">
              O <strong>Agenda Bem-Estar</strong> é o sistema de agendamento de serviços de bem-estar da AEB.
              Ele permite que administradores criem eventos (sessões de massagem, consultas, atividades físicas etc.)
              e que colaboradores se inscrevam nesses eventos de forma simples e organizada.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card icon={Calendar} titulo="Agendamento online" descricao="Colaboradores reservam horários diretamente pelo link enviado por e-mail." cor="blue" />
              <Card icon={ListOrdered} titulo="Lista de espera" descricao="Quando as vagas esgotam, o colaborador entra na fila e é notificado automaticamente se abrir vaga." cor="orange" />
              <Card icon={Mail} titulo="Notificações por e-mail" descricao="O sistema envia convites e confirmações automaticamente para a lista de distribuição." cor="green" />
              <Card icon={ShieldCheck} titulo="Controle de acesso" descricao="Apenas colaboradores cadastrados no Active Directory da AEB podem acessar o sistema." cor="purple" />
            </div>
          </Secao>

          {/* ── Perfis de Acesso ── */}
          <Secao id="perfis" icon={Users} titulo="Perfis de Acesso" cor="border-purple-400">
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-purple-800 text-sm">SuperAdmin (CTI)</span>
                  <Badge texto="Acesso total" cor="blue" />
                </div>
                <div className="p-4 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Criar, editar e cancelar eventos</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Enviar convites por e-mail para a lista de distribuição</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Visualizar e gerenciar todos os agendamentos</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Enviar comunicados internos</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Gerenciar usuários administradores (promover/revogar do AD)</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Registrar presença dos participantes</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-blue-800 text-sm">Administrador</span>
                  <Badge texto="Acesso parcial" cor="slate" />
                </div>
                <div className="p-4 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Criar, editar e cancelar eventos</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Enviar convites e gerenciar agendamentos</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Enviar comunicados internos</p>
                  <p className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400 shrink-0" /> Não pode gerenciar outros administradores</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-slate-700 text-sm">Colaborador</span>
                  <Badge texto="Acesso via e-mail" cor="slate" />
                </div>
                <div className="p-4 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Visualizar eventos disponíveis</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Reservar horários em eventos</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Entrar na lista de espera quando vagas esgotam</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Cancelar seu próprio agendamento</p>
                  <p className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400 shrink-0" /> Não acessa o painel administrativo</p>
                </div>
              </div>
            </div>
          </Secao>

          {/* ── Fluxo Completo ── */}
          <Secao id="fluxo" icon={ArrowRight} titulo="Fluxo Completo do Sistema" cor="border-emerald-400">
            <p className="text-slate-600 mb-5 text-sm">Veja como funciona o ciclo completo desde a criação do evento até a realização:</p>
            <div className="space-y-0">
              <Passo numero={1} titulo="Admin cria o evento" descricao="O administrador acessa o painel, clica em 'Criar Novo Evento' e preenche os dados: nome, data, horários disponíveis, vagas por horário e descrição do serviço." />
              <Passo numero={2} titulo="Admin envia os convites" descricao="Com o evento criado, o admin clica em 'Enviar E-mails' para disparar os convites automaticamente para toda a lista de distribuição do AD." />
              <Passo numero={3} titulo="Colaborador recebe o e-mail" descricao="Cada colaborador recebe um e-mail com um link único e personalizado para acessar o evento." />
              <Passo numero={4} titulo="Colaborador escolhe o horário" descricao="Ao clicar no link, o colaborador é levado para a página do evento onde pode ver os horários disponíveis e reservar o de sua preferência." />
              <Passo numero={5} titulo="Confirmação automática" descricao="Após a reserva, o colaborador recebe um e-mail de confirmação com os detalhes do agendamento." />
              <Passo numero={6} titulo="Admin registra a presença" descricao="No dia do evento, o admin acessa a lista de presença e marca quem compareceu." />
              <Passo numero={7} titulo="Evento encerrado" descricao="Após o encerramento, o evento muda de status para 'Encerrado' e os dados ficam disponíveis para relatórios." />
            </div>
          </Secao>

          {/* ── Dashboard ── */}
          <Secao id="admin-dashboard" icon={LayoutDashboard} titulo="Dashboard" cor="border-blue-400">
            <p className="text-slate-600 mb-4 text-sm">
              O Dashboard é a página inicial do painel administrativo. Ele apresenta um resumo operacional dos próximos eventos e das ações que exigem atenção.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-extrabold text-slate-900">Próximo</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Próximo Evento</p>
                <p className="text-xs text-slate-400 mt-1">Data, horário e ocupação da próxima atividade publicada</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-extrabold text-slate-900">—</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Agenda Futura</p>
                <p className="text-xs text-slate-400 mt-1">Quantidade de eventos e totais agrupados de vagas livres e ocupadas</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-extrabold text-slate-900">—</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Pendências</p>
                <p className="text-xs text-slate-400 mt-1">Presenças, fila de espera e falhas de envio que precisam de ação</p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                As notificações são atualizadas automaticamente a cada <strong>30 segundos</strong>.
                Você também pode clicar em <strong>"Atualizar"</strong> no ícone de sino para forçar uma atualização.
              </p>
            </div>
          </Secao>

          {/* ── Eventos ── */}
          <Secao id="admin-eventos" icon={Calendar} titulo="Gerenciar Eventos" cor="border-indigo-400">
            <p className="text-slate-600 mb-5 text-sm">
              Esta é a seção principal do sistema. Aqui o administrador gerencia todo o ciclo de vida dos eventos de bem-estar.
            </p>

            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" /> Criar um Novo Evento
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Clique em <strong>"Criar Novo Evento"</strong> no Dashboard ou no botão de mesmo nome na tela de Agendamentos.
              Preencha os campos:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2 text-sm text-slate-700">
              <p><strong>Título:</strong> nome do serviço ou atividade (ex: "Massagem Relaxante — Abril")</p>
              <p><strong>Descrição:</strong> detalhes sobre o evento ou serviço oferecido</p>
              <p><strong>Data:</strong> data em que o evento ocorrerá</p>
              <p><strong>Horários:</strong> cada horário representa uma vaga disponível com hora de início e fim</p>
              <p><strong>Vagas por horário:</strong> quantas pessoas podem se inscrever em cada horário</p>
            </div>

            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" /> Enviar Convites por E-mail
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Após criar o evento, clique em <strong>"Enviar E-mails"</strong> no card do evento.
              O sistema buscará automaticamente todos os usuários ativos no Active Directory e enviará um convite
              com link único para cada um.
            </p>
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 mb-5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                <strong>Atenção:</strong> após enviar os e-mails, o evento é bloqueado para edição.
                Certifique-se de que os dados estão corretos antes de disparar.
              </p>
            </div>

            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-orange-500" /> Editar um Evento
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              Clique nos <strong>"..."</strong> (três pontinhos) no card do evento e selecione <strong>"Editar"</strong>.
              Só é possível editar eventos que ainda <strong>não tiveram e-mails enviados</strong>.
            </p>

            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" /> Cancelar um Evento
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Clique nos <strong>"..."</strong> e selecione <strong>"Cancelar"</strong>.
              Todos os colaboradores inscritos receberão uma notificação de cancelamento por e-mail.
            </p>

            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-600" /> Lista de Presença
            </h3>
            <p className="text-sm text-slate-600">
              No dia do evento, clique em <strong>"Lista de Presença"</strong> no card do evento para ver
              todos os inscritos e marcar quem compareceu. O sistema registra automaticamente a participação.
            </p>
          </Secao>

          {/* ── Comunicados ── */}
          <Secao id="admin-comunicados" icon={Megaphone} titulo="Comunicados" cor="border-orange-400">
            <p className="text-slate-600 mb-4 text-sm">
              A seção de Comunicados permite enviar mensagens informativas para os colaboradores via e-mail,
              sem necessidade de criar um evento.
            </p>
            <div className="space-y-3">
              <Card icon={Mail} titulo="Criar um comunicado" descricao="Acesse 'Comunicados' no menu lateral, clique em 'Novo Comunicado', preencha o título e a mensagem e clique em 'Enviar'. O e-mail será disparado para a lista de distribuição do AD." cor="orange" />
              <Card icon={Bell} titulo="Histórico de comunicados" descricao="Todos os comunicados enviados ficam listados na página com data e hora de envio para consulta futura." cor="slate" />
            </div>
          </Secao>

          {/* ── Gestão de Usuários ── */}
          <Secao id="admin-usuarios" icon={ShieldCheck} titulo="Gestão de Usuários (SuperAdmin)" cor="border-purple-400">
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex gap-2 mb-5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-800">
                Esta funcionalidade é exclusiva para o perfil <strong>SuperAdmin</strong>.
                Administradores comuns não têm acesso a esta seção.
              </p>
            </div>
            <div className="space-y-3">
              <Card icon={UserCheck} titulo="Promover a Administrador" descricao="Pesquise um colaborador pelo nome ou e-mail (busca no Active Directory) e clique em 'Promover'. O colaborador passará a ter acesso ao painel administrativo." cor="purple" />
              <Card icon={XCircle} titulo="Revogar acesso de Administrador" descricao="Na lista de administradores, clique em 'Revogar' ao lado do usuário desejado. O acesso administrativo será removido imediatamente." cor="red" />
              <Card icon={Users} titulo="Listar Administradores" descricao="A página exibe todos os usuários com perfil de administrador atualmente ativos no sistema." cor="slate" />
            </div>
          </Secao>

          {/* ── Colaborador ── */}
          <Secao id="colaborador" icon={LogIn} titulo="Acesso do Colaborador" cor="border-emerald-400">
            <p className="text-slate-600 mb-4 text-sm">
              O colaborador <strong>não precisa de senha</strong> para acessar o sistema.
              O acesso é feito exclusivamente através do link recebido por e-mail.
            </p>

            <h3 className="font-bold text-slate-700 mb-3">Como o colaborador acessa:</h3>
            <div className="space-y-0 mb-5">
              <Passo numero={1} titulo="Recebe o e-mail de convite" descricao="O colaborador recebe um e-mail da AEB com um link personalizado para o evento." />
              <Passo numero={2} titulo="Clica no link" descricao="O link direciona diretamente para a página do evento, sem necessidade de login ou senha." />
              <Passo numero={3} titulo="Escolhe o horário" descricao="Na página do evento, o colaborador vê os horários disponíveis e clica em 'Reservar' no de sua preferência." />
              <Passo numero={4} titulo="Recebe a confirmação" descricao="Um e-mail de confirmação é enviado automaticamente com os detalhes do agendamento." />
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-800">
                <p className="font-semibold mb-1">Cancelamento pelo colaborador</p>
                <p>
                  Caso o colaborador precise cancelar, ele pode clicar no link do e-mail de confirmação
                  e usar a opção de cancelamento. A vaga liberada será automaticamente oferecida para
                  quem está na lista de espera.
                </p>
              </div>
            </div>
          </Secao>

          {/* ── Lista de Espera ── */}
          <Secao id="lista-espera" icon={ListOrdered} titulo="Lista de Espera" cor="border-orange-400">
            <p className="text-slate-600 mb-4 text-sm">
              Quando todas as vagas de um horário estão preenchidas, o colaborador pode entrar na lista de espera.
            </p>
            <div className="space-y-3 mb-4">
              <Card icon={ListOrdered} titulo="Como entrar na lista de espera" descricao="Na página do evento, quando o horário está lotado, aparece o botão 'Entrar na Lista de Espera'. O colaborador clica e é adicionado à fila." cor="orange" />
              <Card icon={Mail} titulo="Notificação automática" descricao="Quando uma vaga se abre (por cancelamento), o próximo da fila recebe um e-mail com um link para confirmar a vaga dentro de um prazo determinado." cor="green" />
              <Card icon={Clock} titulo="Prazo de confirmação" descricao="O colaborador tem um tempo limitado para confirmar a vaga pelo link do e-mail. Se não confirmar no prazo, a vaga passa para o próximo da fila." cor="blue" />
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                A ordem da lista de espera é por chegada (primeiro a entrar é o primeiro a ser chamado).
                O colaborador pode sair da lista a qualquer momento clicando no e-mail de confirmação de entrada na fila.
              </p>
            </div>
          </Secao>

          {/* ── Status dos Eventos ── */}
          <Secao id="status" icon={Info} titulo="Status dos Eventos" cor="border-slate-400">
            <p className="text-slate-600 mb-4 text-sm">Cada evento pode estar em um dos seguintes estados:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <Badge texto="ATIVO" cor="green" />
                <p className="text-sm text-slate-600">Evento criado e com e-mails enviados. Colaboradores podem se inscrever.</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <Badge texto="RASCUNHO" cor="slate" />
                <p className="text-sm text-slate-600">Evento criado mas e-mails ainda não foram enviados. Pode ser editado ou excluído.</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <Badge texto="ENCERRADO" cor="blue" />
                <p className="text-sm text-slate-600">Evento finalizado. Não aceita novos agendamentos. Dados disponíveis para relatórios.</p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <Badge texto="CANCELADO" cor="red" />
                <p className="text-sm text-slate-600">Evento cancelado pelo administrador. Todos os inscritos foram notificados por e-mail.</p>
              </div>
            </div>
          </Secao>

          {/* ── FAQ ── */}
          <Secao id="faq" icon={HelpCircle} titulo="Perguntas Frequentes" cor="border-slate-400">
            <div className="space-y-4">
              {[
                {
                  pergunta: 'O colaborador esqueceu o link do e-mail. Como ele acessa?',
                  resposta: 'O administrador pode reenviar os e-mails clicando em "Enviar E-mails" novamente no card do evento. Um novo link será gerado e enviado.',
                },
                {
                  pergunta: 'Posso editar um evento depois de enviar os e-mails?',
                  resposta: 'Não. Após o envio dos e-mails, o evento é bloqueado para edição para garantir que os colaboradores recebam informações consistentes. Se necessário, cancele e crie um novo evento.',
                },
                {
                  pergunta: 'Como promover um colega a administrador?',
                  resposta: 'Apenas o SuperAdmin pode fazer isso. Acesse "Gestão de Usuários" no menu lateral, pesquise o colaborador pelo nome ou e-mail e clique em "Promover".',
                },
                {
                  pergunta: 'O colaborador precisa criar uma conta no sistema?',
                  resposta: 'Não. O acesso é feito diretamente pelo link recebido no e-mail de convite. O sistema valida o colaborador pelo Active Directory da AEB automaticamente.',
                },
                {
                  pergunta: 'O que acontece quando uma vaga é cancelada?',
                  resposta: 'O sistema verifica automaticamente se há alguém na lista de espera e envia um e-mail para o próximo da fila com um link de confirmação e um prazo para aceitar a vaga.',
                },
                {
                  pergunta: 'Como saber quantas pessoas estão na lista de espera?',
                  resposta: 'No card do evento em "Agendamentos", clique nos detalhes do horário para ver a lista de espera de cada um.',
                },
                {
                  pergunta: 'Posso criar múltiplos horários no mesmo evento?',
                  resposta: 'Sim. Ao criar ou editar um evento, você pode adicionar quantos horários precisar, cada um com seu próprio número de vagas.',
                },
              ].map((item, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="font-semibold text-slate-800 text-sm">{item.pergunta}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-slate-600">{item.resposta}</p>
                  </div>
                </div>
              ))}
            </div>
          </Secao>

          {/* Rodapé */}
          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-xs text-slate-400">
              Manual do Sistema Agenda Bem-Estar — AEB · Coordenação de Tecnologia da Informação (CTI)
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
