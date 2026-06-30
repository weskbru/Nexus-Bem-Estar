import csv
import os
from dataclasses import dataclass
from datetime import date, time

from django.contrib.auth.hashers import make_password
from django.db import transaction

from ...models.models import Agendamento, AgendamentoManual, ConviteEmail, Evento, Usuario


TAG_EMAIL_DOMINIO = 'carga.test'
TAG_TITULO_EVENTO = '[CARGA] Bem-Estar — Load Test'


@dataclass(frozen=True)
class LimpezaCargaResultado:
    usuarios: int
    convites: int
    agendamentos: int
    participantes_manuais: int
    eventos: int


@dataclass(frozen=True)
class SeedCargaResultado:
    evento_id: int
    evento_criado: bool
    total_slots: int
    duracao_sessao: int
    vagas: int
    usuarios_criados: int
    usuarios_existentes: int
    convites_criados: int
    total_tokens: int
    output: str
    stress_slot_id: int | None
    limpeza: LimpezaCargaResultado | None = None


@transaction.atomic
def gerar_massa_carga(
    *,
    n_usuarios: int,
    duracao_sessao: int,
    vagas: int,
    output: str,
    limpar: bool = False,
) -> SeedCargaResultado:
    limpeza = limpar_dados_carga() if limpar else None

    evento, evento_criado = _obter_ou_criar_evento(duracao_sessao, vagas)
    total_slots = evento.horarios.count()

    usuarios_criados = _criar_usuarios_carga(n_usuarios)
    usuarios_existentes = n_usuarios - usuarios_criados

    todos_usuarios = list(
        Usuario.objects
        .filter(email__endswith=f'@{TAG_EMAIL_DOMINIO}')
        .order_by('email')[:n_usuarios]
    )

    convites_criados = _criar_convites(evento, todos_usuarios)
    todos_convites = _listar_convites(evento, n_usuarios)
    _exportar_tokens_csv(output, todos_convites, evento.id)

    primeiro_slot = evento.horarios.order_by('hora_inicio').first()

    return SeedCargaResultado(
        evento_id=evento.id,
        evento_criado=evento_criado,
        total_slots=total_slots,
        duracao_sessao=duracao_sessao,
        vagas=vagas,
        usuarios_criados=usuarios_criados,
        usuarios_existentes=usuarios_existentes,
        convites_criados=convites_criados,
        total_tokens=len(todos_convites),
        output=output,
        stress_slot_id=primeiro_slot.id if primeiro_slot else None,
        limpeza=limpeza,
    )


def limpar_dados_carga() -> LimpezaCargaResultado:
    usuarios = Usuario.objects.filter(email__endswith=f'@{TAG_EMAIL_DOMINIO}')
    resultado = LimpezaCargaResultado(
        usuarios=usuarios.count(),
        convites=ConviteEmail.objects.filter(usuario__in=usuarios).count(),
        agendamentos=Agendamento.objects.filter(usuario__in=usuarios).count(),
        participantes_manuais=AgendamentoManual.objects.filter(
            evento__titulo=TAG_TITULO_EVENTO
        ).count(),
        eventos=Evento.objects.filter(titulo=TAG_TITULO_EVENTO).count(),
    )

    ConviteEmail.objects.filter(usuario__in=usuarios).delete()
    Agendamento.objects.filter(usuario__in=usuarios).delete()
    AgendamentoManual.objects.filter(evento__titulo=TAG_TITULO_EVENTO).delete()
    Evento.objects.filter(titulo=TAG_TITULO_EVENTO).delete()
    usuarios.delete()

    return resultado


def _obter_ou_criar_evento(duracao_sessao: int, vagas: int) -> tuple[Evento, bool]:
    evento, criado = Evento.objects.get_or_create(
        titulo=TAG_TITULO_EVENTO,
        defaults={
            'tipo': 'outro',
            'data': date(2099, 12, 31),
            'hora_inicio': time(8, 0),
            'hora_fim': time(16, 40),
            'duracao_sessao': duracao_sessao,
            'capacidade_por_horario': vagas,
            'status': 'publicado',
        },
    )

    if criado:
        evento.gerar_horarios()

    return evento, criado


def _criar_usuarios_carga(n_usuarios: int) -> int:
    senha_hash = make_password('carga@123')
    emails_existentes = set(
        Usuario.objects
        .filter(email__endswith=f'@{TAG_EMAIL_DOMINIO}')
        .values_list('email', flat=True)
    )

    novos = []
    for i in range(1, n_usuarios + 1):
        email = f'carga{i:05d}@{TAG_EMAIL_DOMINIO}'
        if email not in emails_existentes:
            novos.append(Usuario(
                email=email,
                nome=f'Usuário Carga {i:05d}',
                password=senha_hash,
                is_active=True,
            ))

    if novos:
        Usuario.objects.bulk_create(novos, batch_size=500)

    return len(novos)


def _criar_convites(evento: Evento, usuarios: list[Usuario]) -> int:
    emails_com_convite = set(
        ConviteEmail.objects
        .filter(evento=evento)
        .values_list('usuario__email', flat=True)
    )

    novos_convites = [
        ConviteEmail(usuario=usuario, evento=evento)
        for usuario in usuarios
        if usuario.email not in emails_com_convite
    ]

    convites_criados = 0
    for i in range(0, len(novos_convites), 200):
        lote = novos_convites[i:i + 200]
        for convite in lote:
            convite.save()
        convites_criados += len(lote)

    return convites_criados


def _listar_convites(evento: Evento, n_usuarios: int) -> list[ConviteEmail]:
    return list(
        ConviteEmail.objects
        .filter(evento=evento)
        .select_related('usuario')
        .order_by('usuario__email')[:n_usuarios]
    )


def _exportar_tokens_csv(output: str, convites: list[ConviteEmail], evento_id: int) -> None:
    os.makedirs(os.path.dirname(output) if os.path.dirname(output) else '.', exist_ok=True)

    with open(output, 'w', newline='') as arquivo:
        writer = csv.DictWriter(arquivo, fieldnames=['token', 'evento_id', 'email'])
        writer.writeheader()
        for convite in convites:
            writer.writerow({
                'token': str(convite.token),
                'evento_id': evento_id,
                'email': convite.usuario.email,
            })
