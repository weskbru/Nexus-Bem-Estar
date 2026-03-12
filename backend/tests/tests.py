"""
Testes do backend — Agenda Bem-Estar

Cobertura:
  - Models: geração de horários, propriedades de Horario, ConviteEmail chave auto-gerada
  - Auth: login do admin, acesso via token mágico
  - Admin: CRUD de eventos, publicar, enviar e-mails, editar corpo do e-mail, dashboard
  - Colaborador: listagem de eventos, detalhe, reservar horário, cancelar
  - Regras de negócio: vaga esgotada, duplicata de agendamento, concorrência
"""
import uuid
from datetime import date, time

from django.core import mail
from django.test import TestCase, override_settings
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from ..models.models import Usuario, Evento, Horario, ConviteEmail, Agendamento


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------

def cria_admin(email='admin@empresa.com.br', nome='Admin', password='admin@123'):
    return Usuario.objects.create_superuser(email=email, nome=nome, password=password)


def cria_colaborador(email='joao@empresa.com.br', nome='João Silva', password='col@123'):
    return Usuario.objects.create_user(email=email, nome=nome, password=password)


def cria_evento(status_evento='rascunho', **kwargs):
    defaults = {
        'titulo': 'Massagem – Março 2026',
        'tipo': 'massagem',
        'data': date(2026, 3, 15),
        'hora_inicio': time(9, 0),
        'hora_fim': time(11, 0),
        'duracao_sessao': 30,
        'capacidade_por_horario': 1,
        'status': status_evento,
    }
    defaults.update(kwargs)
    return Evento.objects.create(**defaults)


# ---------------------------------------------------------------------------
# Testes de Model
# ---------------------------------------------------------------------------

class HorarioGeracaoTest(TestCase):
    def test_gera_slots_corretos(self):
        """09:00–11:00 com 30 min → 4 slots."""
        evento = cria_evento(status_evento='publicado')
        evento.gerar_horarios()
        self.assertEqual(evento.horarios.count(), 4)

    def test_slot_nao_completo_e_descartado(self):
        """09:00–11:00 com 40 min → 3 slots (40+40+40=120 min, exato); ou 2 se não couber."""
        # 3 * 40 = 120 min = 2h → cabe exatamente
        evento = cria_evento(
            status_evento='publicado',
            hora_inicio=time(9, 0),
            hora_fim=time(11, 0),
            duracao_sessao=40,
        )
        evento.gerar_horarios()
        self.assertEqual(evento.horarios.count(), 3)

    def test_gerar_horarios_com_agendamentos_gera_erro(self):
        """Não pode regenerar se já há agendamentos."""
        evento = cria_evento(status_evento='publicado')
        evento.gerar_horarios()
        colaborador = cria_colaborador()
        horario = evento.horarios.first()
        Agendamento.objects.create(usuario=colaborador, horario=horario, status='confirmado')

        with self.assertRaises(ValueError):
            evento.gerar_horarios()

    def test_vagas_livres_decrementa_apos_agendamento(self):
        evento = cria_evento(status_evento='publicado', capacidade_por_horario=2)
        evento.gerar_horarios()
        horario = evento.horarios.first()
        colaborador = cria_colaborador()
        Agendamento.objects.create(usuario=colaborador, horario=horario, status='confirmado')

        horario.refresh_from_db()
        self.assertEqual(horario.vagas_livres, 1)
        self.assertTrue(horario.disponivel)

    def test_horario_esgotado_quando_sem_vagas(self):
        evento = cria_evento(status_evento='publicado', capacidade_por_horario=1)
        evento.gerar_horarios()
        horario = evento.horarios.first()
        colaborador = cria_colaborador()
        Agendamento.objects.create(usuario=colaborador, horario=horario, status='confirmado')

        self.assertFalse(horario.disponivel)


class ConviteEmailTest(TestCase):
    def test_chave_mensagem_gerada_automaticamente(self):
        colaborador = cria_colaborador()
        evento = cria_evento()
        convite = ConviteEmail.objects.create(usuario=colaborador, evento=evento)
        self.assertEqual(len(convite.chave_mensagem), 8)
        self.assertIsNotNone(convite.token)

    def test_unicidade_usuario_evento(self):
        """Não deve ser possível criar dois convites para o mesmo par usuario+evento."""
        colaborador = cria_colaborador()
        evento = cria_evento()
        ConviteEmail.objects.create(usuario=colaborador, evento=evento)
        with self.assertRaises(Exception):
            ConviteEmail.objects.create(usuario=colaborador, evento=evento)


# ---------------------------------------------------------------------------
# Testes de Auth
# ---------------------------------------------------------------------------

class AdminLoginTest(APITestCase):
    def setUp(self):
        self.admin = cria_admin()

    def test_login_sucesso(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'admin@empresa.com.br',
            'password': 'admin@123',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)
        self.assertEqual(resp.data['usuario']['email'], 'admin@empresa.com.br')

    def test_login_senha_errada(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'admin@empresa.com.br',
            'password': 'errada',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_colaborador_nao_pode_logar_como_admin(self):
        cria_colaborador(email='col@empresa.com.br')
        resp = self.client.post('/api/auth/login/', {
            'email': 'col@empresa.com.br',
            'password': 'col@123',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class AcessoViaTokenTest(APITestCase):
    def setUp(self):
        self.colaborador = cria_colaborador()
        self.evento = cria_evento()

    def test_acesso_valido(self):
        convite = ConviteEmail.objects.create(usuario=self.colaborador, evento=self.evento)
        resp = self.client.get(f'/api/auth/acesso/{convite.token}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertEqual(resp.data['evento_id'], self.evento.id)
        self.assertEqual(len(resp.data['chave_mensagem']), 8)

    def test_acesso_token_invalido(self):
        resp = self.client.get(f'/api/auth/acesso/{uuid.uuid4()}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_token_marcado_como_usado(self):
        convite = ConviteEmail.objects.create(usuario=self.colaborador, evento=self.evento)
        self.assertFalse(convite.usado)
        self.client.get(f'/api/auth/acesso/{convite.token}/')
        convite.refresh_from_db()
        self.assertTrue(convite.usado)


# ---------------------------------------------------------------------------
# Testes Admin — Eventos
# ---------------------------------------------------------------------------

class AdminEventoTest(APITestCase):
    def setUp(self):
        self.admin = cria_admin()
        self.client.force_authenticate(user=self.admin)

    def test_criar_evento_rascunho(self):
        resp = self.client.post('/api/admin/eventos/', {
            'titulo': 'Yoga – Abril 2026',
            'tipo': 'yoga',
            'data': '2026-04-10',
            'hora_inicio': '07:00:00',
            'hora_fim': '09:00:00',
            'duracao_sessao': 60,
            'capacidade_por_horario': 5,
            'status': 'rascunho',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Evento.objects.count(), 1)
        # Rascunho não gera slots ainda
        self.assertEqual(Horario.objects.count(), 0)

    def test_publicar_evento_gera_horarios(self):
        evento = cria_evento()
        resp = self.client.post(f'/api/admin/eventos/{evento.id}/publicar/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        evento.refresh_from_db()
        self.assertEqual(evento.status, 'publicado')
        self.assertGreater(evento.horarios.count(), 0)
        self.assertEqual(resp.data['horarios_gerados'], evento.horarios.count())

    def test_encerrar_evento(self):
        evento = cria_evento(status_evento='publicado')
        evento.gerar_horarios()
        resp = self.client.post(f'/api/admin/eventos/{evento.id}/encerrar/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        evento.refresh_from_db()
        self.assertEqual(evento.status, 'encerrado')

    def test_editar_corpo_email(self):
        evento = cria_evento()
        novo_corpo = 'Olá {nome}, acesse: {link} — chave: {chave}'
        resp = self.client.patch(f'/api/admin/eventos/{evento.id}/', {'corpo_email': novo_corpo})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        evento.refresh_from_db()
        self.assertEqual(evento.corpo_email, novo_corpo)

    def test_validacao_hora_fim_menor_que_inicio(self):
        resp = self.client.post('/api/admin/eventos/', {
            'titulo': 'Erro',
            'tipo': 'outro',
            'data': '2026-04-10',
            'hora_inicio': '17:00:00',
            'hora_fim': '08:00:00',
            'duracao_sessao': 30,
            'capacidade_por_horario': 1,
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validacao_duracao_zero(self):
        resp = self.client.post('/api/admin/eventos/', {
            'titulo': 'Erro',
            'tipo': 'outro',
            'data': '2026-04-10',
            'hora_inicio': '09:00:00',
            'hora_fim': '11:00:00',
            'duracao_sessao': 0,
            'capacidade_por_horario': 1,
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nao_pode_publicar_evento_encerrado(self):
        evento = cria_evento(status_evento='encerrado')
        resp = self.client.post(f'/api/admin/eventos/{evento.id}/publicar/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_colaborador_nao_acessa_admin(self):
        colaborador = cria_colaborador()
        self.client.force_authenticate(user=colaborador)
        resp = self.client.get('/api/admin/eventos/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class EnviarEmailsTest(APITestCase):
    def setUp(self):
        self.admin = cria_admin()
        self.client.force_authenticate(user=self.admin)
        self.evento = cria_evento(status_evento='publicado')
        self.evento.gerar_horarios()

    def test_envia_email_para_cada_colaborador(self):
        cria_colaborador('ana@empresa.com.br', 'Ana')
        cria_colaborador('pedro@empresa.com.br', 'Pedro')

        resp = self.client.post(f'/api/admin/eventos/{self.evento.id}/enviar-emails/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['enviados'], 2)
        self.assertEqual(len(mail.outbox), 2)

    def test_email_contem_link_e_chave(self):
        colaborador = cria_colaborador()
        resp = self.client.post(f'/api/admin/eventos/{self.evento.id}/enviar-emails/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        convite = ConviteEmail.objects.get(usuario=colaborador, evento=self.evento)
        email_enviado = mail.outbox[0]
        self.assertIn(str(convite.token), email_enviado.body)
        self.assertIn(convite.chave_mensagem, email_enviado.body)

    def test_reenvio_usa_mesmo_convite(self):
        cria_colaborador()
        self.client.post(f'/api/admin/eventos/{self.evento.id}/enviar-emails/')
        qtd_convites_antes = ConviteEmail.objects.count()

        # Segundo envio
        self.client.post(f'/api/admin/eventos/{self.evento.id}/enviar-emails/')
        self.assertEqual(ConviteEmail.objects.count(), qtd_convites_antes)

    def test_nao_envia_para_evento_nao_publicado(self):
        evento_rascunho = cria_evento()
        resp = self.client.post(f'/api/admin/eventos/{evento_rascunho.id}/enviar-emails/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Testes Admin — Dashboard
# ---------------------------------------------------------------------------

class AdminDashboardTest(APITestCase):
    def setUp(self):
        self.admin = cria_admin()
        self.client.force_authenticate(user=self.admin)

    def test_dashboard_retorna_metricas(self):
        resp = self.client.get('/api/admin/dashboard/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for campo in ('total_vagas', 'vagas_ocupadas', 'taxa_ocupacao', 'total_eventos_ativos'):
            self.assertIn(campo, resp.data)

    def test_taxa_ocupacao_calculada(self):
        evento = cria_evento(status_evento='publicado', capacidade_por_horario=2)
        evento.gerar_horarios()
        colaborador = cria_colaborador()
        horario = evento.horarios.first()
        Agendamento.objects.create(usuario=colaborador, horario=horario, status='confirmado')

        resp = self.client.get('/api/admin/dashboard/')
        self.assertGreater(resp.data['taxa_ocupacao'], 0)
        self.assertGreater(resp.data['vagas_ocupadas'], 0)


# ---------------------------------------------------------------------------
# Testes Colaborador — Eventos e Agendamentos
# ---------------------------------------------------------------------------

class ColaboradorEventoTest(APITestCase):
    def setUp(self):
        self.colaborador = cria_colaborador()
        self.client.force_authenticate(user=self.colaborador)
        self.evento = cria_evento(status_evento='publicado')
        self.evento.gerar_horarios()
        self.horario = self.evento.horarios.first()

    def test_lista_apenas_eventos_publicados(self):
        cria_evento(titulo='Rascunho', status_evento='rascunho')
        resp = self.client.get('/api/colaborador/eventos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['titulo'], self.evento.titulo)

    def test_detalhe_evento_com_horarios(self):
        resp = self.client.get(f'/api/colaborador/eventos/{self.evento.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('horarios', resp.data)
        self.assertEqual(len(resp.data['horarios']), self.evento.horarios.count())

    def test_reservar_horario_disponivel(self):
        resp = self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{self.horario.id}/reservar/'
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'confirmado')
        self.assertEqual(Agendamento.objects.count(), 1)

    def test_reservar_horario_sem_vagas(self):
        outro_col = cria_colaborador('maria@empresa.com.br', 'Maria')
        Agendamento.objects.create(usuario=outro_col, horario=self.horario, status='confirmado')

        resp = self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{self.horario.id}/reservar/'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usuario_nao_pode_reservar_dois_horarios_no_mesmo_evento(self):
        # Reserva o primeiro slot
        self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{self.horario.id}/reservar/'
        )
        # Tenta reservar outro slot do mesmo evento
        horario2 = self.evento.horarios.all()[1]
        resp = self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{horario2.id}/reservar/'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reservar_evento_encerrado_retorna_404(self):
        self.evento.status = 'encerrado'
        self.evento.save()
        resp = self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{self.horario.id}/reservar/'
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_cancelar_agendamento(self):
        agendamento = Agendamento.objects.create(
            usuario=self.colaborador, horario=self.horario, status='confirmado'
        )
        resp = self.client.post(f'/api/colaborador/agendamentos/{agendamento.id}/cancelar/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        agendamento.refresh_from_db()
        self.assertEqual(agendamento.status, 'cancelado')

    def test_cancelar_agendamento_ja_cancelado(self):
        agendamento = Agendamento.objects.create(
            usuario=self.colaborador, horario=self.horario, status='cancelado'
        )
        resp = self.client.post(f'/api/colaborador/agendamentos/{agendamento.id}/cancelar/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelar_agendamento_de_outro_usuario_retorna_404(self):
        outro = cria_colaborador('outro@empresa.com.br', 'Outro')
        agendamento = Agendamento.objects.create(
            usuario=outro, horario=self.horario, status='confirmado'
        )
        resp = self.client.post(f'/api/colaborador/agendamentos/{agendamento.id}/cancelar/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_meus_agendamentos(self):
        Agendamento.objects.create(
            usuario=self.colaborador, horario=self.horario, status='confirmado'
        )
        resp = self.client.get('/api/colaborador/agendamentos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_unauthenticated_nao_acessa_eventos(self):
        self.client.logout()
        resp = self.client.get('/api/colaborador/eventos/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Teste de concorrência (simulado)
# ---------------------------------------------------------------------------

class ConcorrenciaTest(TestCase):
    def test_select_for_update_impede_dupla_reserva(self):
        """
        Verifica que unique_together impede agendamento duplicado.
        O select_for_update na view impede race condition; aqui testamos
        a restrição de banco como segunda linha de defesa.
        """
        from django.db import IntegrityError
        colaborador = cria_colaborador()
        evento = cria_evento(status_evento='publicado', capacidade_por_horario=2)
        evento.gerar_horarios()
        horario = evento.horarios.first()

        Agendamento.objects.create(usuario=colaborador, horario=horario, status='confirmado')
        with self.assertRaises(IntegrityError):
            Agendamento.objects.create(usuario=colaborador, horario=horario, status='confirmado')
