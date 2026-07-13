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
import time as time_module
from datetime import date, datetime, time, timedelta
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from ..models.models import Usuario, Evento, Horario, ConviteEmail, Agendamento, AgendamentoManual, Penalidade, Comunicado
from ..views.permissions import liberar_penalidades_expiradas
from ..views.colaborador.otp_agendamento_view import cache_key_otp


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------

def cria_admin(email='admin@empresa.com.br', nome='Admin', password='admin@123'):
    return Usuario.objects.create_superuser(email=email, nome=nome, password=password)


def cria_colaborador(email='joao@empresa.com.br', nome='João Silva', password='col@123'):
    return Usuario.objects.create_user(email=email, nome=nome, password=password)


def cria_evento(status_evento='publicado', **kwargs):
    defaults = {
        'titulo': 'Massagem – Março 2026',
        'tipo': 'massagem',
        'data': timezone.localdate() + timedelta(days=30),
        'hora_inicio': time(9, 0),
        'hora_fim': time(11, 0),
        'duracao_sessao': 30,
        'capacidade_por_horario': 1,
        'status': status_evento,
    }
    defaults.update(kwargs)
    return Evento.objects.create(**defaults)


def autoriza_otp_agendamento(usuario, horario, codigo='1234'):
    cache.set(
        cache_key_otp(usuario.id, horario.id),
        {
            'codigo': codigo,
            'tentativas': 0,
            'expira_em': time_module.time() + 300,
        },
        timeout=300,
    )
    return codigo


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

    def test_criar_evento_publicado_por_padrao(self):
        resp = self.client.post('/api/admin/eventos/', {
            'titulo': 'Yoga – Abril 2026',
            'tipo': 'yoga',
            'data': (timezone.localdate() + timedelta(days=30)).isoformat(),
            'hora_inicio': '07:00:00',
            'hora_fim': '09:00:00',
            'duracao_sessao': 60,
            'capacidade_por_horario': 5,
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Evento.objects.count(), 1)
        evento = Evento.objects.first()
        self.assertEqual(evento.status, 'publicado')
        self.assertGreater(Horario.objects.count(), 0)

    def test_publicar_evento_gera_horarios(self):
        evento = cria_evento(status_evento='cancelado')
        resp = self.client.post(f'/api/admin/eventos/{evento.id}/publicar/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        evento.refresh_from_db()
        self.assertEqual(evento.status, 'publicado')
        self.assertGreater(evento.horarios.count(), 0)
        self.assertEqual(resp.data['horarios_gerados'], evento.horarios.count())

    def test_cancelar_evento(self):
        evento = cria_evento(status_evento='publicado')
        evento.gerar_horarios()
        resp = self.client.post(f'/api/admin/eventos/{evento.id}/cancelar/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        evento.refresh_from_db()
        self.assertEqual(evento.status, 'cancelado')

    def test_nao_pode_cancelar_evento_nao_publicado(self):
        evento = cria_evento(status_evento='cancelado')
        resp = self.client.post(f'/api/admin/eventos/{evento.id}/cancelar/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

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
            'data': (timezone.localdate() + timedelta(days=30)).isoformat(),
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
            'data': (timezone.localdate() + timedelta(days=30)).isoformat(),
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

    def test_evento_publicado_e_encerrado_automaticamente_apos_horario(self):
        agora = timezone.localtime()
        inicio = (agora - timedelta(hours=2)).time().replace(microsecond=0)
        fim = (agora - timedelta(hours=1)).time().replace(microsecond=0)
        evento = cria_evento(
            status_evento='publicado',
            data=agora.date(),
            hora_inicio=inicio,
            hora_fim=fim,
        )

        resp = self.client.get('/api/admin/eventos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        evento.refresh_from_db()
        self.assertEqual(evento.status, 'encerrado')

    def test_colaborador_nao_acessa_admin(self):
        colaborador = cria_colaborador()
        self.client.force_authenticate(user=colaborador)
        resp = self.client.get('/api/admin/eventos/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    EMAIL_DESTINO_EVENTO='ld-bem-estar@aeb.gov.br',
)
class EnviarEmailsTest(APITestCase):
    def setUp(self):
        self.admin = cria_admin()
        self.client.force_authenticate(user=self.admin)
        self.evento = cria_evento(status_evento='publicado')
        self.evento.gerar_horarios()

    def test_envia_email_para_destinatario_configurado(self):
        resp = self.client.post(f'/api/admin/eventos/{self.evento.id}/enviar-emails/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['destinatario'], ['ld-bem-estar@aeb.gov.br'])
        self.assertEqual(len(mail.outbox), 1)

    def test_email_contem_link_do_evento(self):
        resp = self.client.post(f'/api/admin/eventos/{self.evento.id}/enviar-emails/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        email_enviado = mail.outbox[0]
        html = email_enviado.alternatives[0][0]
        self.assertIn(f'/evento/{self.evento.id}/entrar', html)

    def test_reenvio_usa_mesmo_convite(self):
        cria_colaborador()
        self.client.post(f'/api/admin/eventos/{self.evento.id}/enviar-emails/')
        qtd_convites_antes = ConviteEmail.objects.count()

        # Segundo envio
        self.client.post(f'/api/admin/eventos/{self.evento.id}/enviar-emails/')
        self.assertEqual(ConviteEmail.objects.count(), qtd_convites_antes)

    def test_nao_envia_para_evento_nao_publicado(self):
        evento_cancelado = cria_evento(status_evento='cancelado')
        resp = self.client.post(f'/api/admin/eventos/{evento_cancelado.id}/enviar-emails/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Testes Admin — Comunicados
# ---------------------------------------------------------------------------

class AdminComunicadoTest(APITestCase):
    def setUp(self):
        self.admin = cria_admin()
        self.client.force_authenticate(user=self.admin)

    def cria_comunicado(self, **kwargs):
        defaults = {
            'assunto': 'Campanha de bem-estar',
            'corpo_html': '<p>Participe das atividades.</p>',
            'enviado_por': self.admin,
            'status': Comunicado.Status.AGENDADO,
            'agendado_para': timezone.now() + timedelta(hours=2),
        }
        defaults.update(kwargs)
        return Comunicado.objects.create(**defaults)

    def test_lista_comunicados_com_filtro_paginacao_e_limite_page_size(self):
        self.cria_comunicado(assunto='Campanha de yoga', status=Comunicado.Status.AGENDADO)
        self.cria_comunicado(assunto='Aviso enviado', status=Comunicado.Status.ENVIADO, enviado_em=timezone.now())
        self.cria_comunicado(assunto='Campanha de pilates', status=Comunicado.Status.AGENDADO)

        resp = self.client.get('/api/admin/comunicados/?q=campanha&status=agendado&page=1&page_size=1')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 2)
        self.assertEqual(resp.data['page'], 1)
        self.assertEqual(resp.data['page_size'], 1)
        self.assertEqual(resp.data['total_pages'], 2)
        self.assertNotIn('corpo_html', resp.data['results'][0])

        resp_limite = self.client.get('/api/admin/comunicados/?page=0&page_size=999')
        self.assertEqual(resp_limite.data['page'], 1)
        self.assertEqual(resp_limite.data['page_size'], 50)

    def test_valida_conteudo_e_modo_de_envio(self):
        resp_sem_assunto = self.client.post('/api/admin/comunicados/', {
            'assunto': '',
            'corpo_html': '<p>Texto</p>',
        })
        self.assertEqual(resp_sem_assunto.status_code, status.HTTP_400_BAD_REQUEST)

        resp_sem_corpo = self.client.post('/api/admin/comunicados/', {
            'assunto': 'Aviso',
            'corpo_html': '',
        })
        self.assertEqual(resp_sem_corpo.status_code, status.HTTP_400_BAD_REQUEST)

        resp_modo = self.client.post('/api/admin/comunicados/', {
            'assunto': 'Aviso',
            'corpo_html': '<p>Texto</p>',
            'modo_envio': 'fax',
        })
        self.assertEqual(resp_modo.status_code, status.HTTP_400_BAD_REQUEST)

    def test_agenda_comunicado_e_valida_data(self):
        resp_sem_data = self.client.post('/api/admin/comunicados/', {
            'assunto': 'Aviso',
            'corpo_html': '<p>Texto</p>',
            'modo_envio': 'agendado',
        })
        self.assertEqual(resp_sem_data.status_code, status.HTTP_400_BAD_REQUEST)

        resp_data_invalida = self.client.post('/api/admin/comunicados/', {
            'assunto': 'Aviso',
            'corpo_html': '<p>Texto</p>',
            'modo_envio': 'agendado',
            'agendado_para': 'ontem',
        })
        self.assertEqual(resp_data_invalida.status_code, status.HTTP_400_BAD_REQUEST)

        resp_data_passada = self.client.post('/api/admin/comunicados/', {
            'assunto': 'Aviso',
            'corpo_html': '<p>Texto</p>',
            'modo_envio': 'agendado',
            'agendado_para': (timezone.now() + timedelta(minutes=1)).isoformat(),
        })
        self.assertEqual(resp_data_passada.status_code, status.HTTP_400_BAD_REQUEST)

        agendado_para = timezone.now() + timedelta(hours=1)
        resp = self.client.post('/api/admin/comunicados/', {
            'assunto': 'Aviso agendado',
            'corpo_html': '<p>Texto</p>',
            'modo_envio': 'agendado',
            'agendado_para': agendado_para.isoformat(),
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], Comunicado.Status.AGENDADO)
        self.assertIsNotNone(resp.data['agendado_para_formatado'])

    @patch('backend.views.admin.comunicado_view.email_service.enviar_para_lista_comunicado', return_value=3)
    @patch('backend.views.admin.comunicado_view.email_service.get_destinatarios_comunicado', return_value=['ld@aeb.gov.br'])
    def test_envia_comunicado_imediato(self, _destinatarios, enviar_mock):
        resp = self.client.post('/api/admin/comunicados/', {
            'assunto': 'Envio imediato',
            'corpo_html': '<p>Texto</p>',
        })

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], Comunicado.Status.ENVIADO)
        self.assertEqual(resp.data['total_enviado'], 3)
        enviar_mock.assert_called_once_with('Envio imediato', '<p>Texto</p>')

    @patch('backend.views.admin.comunicado_view.email_service.get_destinatarios_comunicado', return_value=[])
    def test_envio_imediato_sem_destinatario_retorna_500(self, _destinatarios):
        resp = self.client.post('/api/admin/comunicados/', {
            'assunto': 'Sem destino',
            'corpo_html': '<p>Texto</p>',
        })

        self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertFalse(Comunicado.objects.filter(assunto='Sem destino').exists())

    def test_detalhe_atualiza_agendado_e_cancela(self):
        comunicado = self.cria_comunicado()

        resp_get = self.client.get(f'/api/admin/comunicados/{comunicado.id}/')
        self.assertEqual(resp_get.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_get.data['corpo_html'], comunicado.corpo_html)

        novo_agendamento = timezone.now() + timedelta(hours=3)
        resp_put = self.client.put(f'/api/admin/comunicados/{comunicado.id}/', {
            'assunto': 'Campanha atualizada',
            'corpo_html': '<p>Novo texto</p>',
            'modo_envio': 'agendado',
            'agendado_para': novo_agendamento.isoformat(),
        })
        self.assertEqual(resp_put.status_code, status.HTTP_200_OK)
        comunicado.refresh_from_db()
        self.assertEqual(comunicado.assunto, 'Campanha atualizada')
        self.assertEqual(comunicado.status, Comunicado.Status.AGENDADO)

        resp_delete = self.client.delete(f'/api/admin/comunicados/{comunicado.id}/')
        self.assertEqual(resp_delete.status_code, status.HTTP_200_OK)
        comunicado.refresh_from_db()
        self.assertEqual(comunicado.status, Comunicado.Status.CANCELADO)
        self.assertIsNotNone(comunicado.cancelado_em)

    @patch('backend.views.admin.comunicado_view.email_service.enviar_para_lista_comunicado', return_value=4)
    @patch('backend.views.admin.comunicado_view.email_service.get_destinatarios_comunicado', return_value=['ld@aeb.gov.br'])
    def test_atualiza_agendado_para_envio_imediato(self, _destinatarios, _enviar):
        comunicado = self.cria_comunicado(status=Comunicado.Status.CANCELADO, cancelado_em=timezone.now())

        resp = self.client.put(f'/api/admin/comunicados/{comunicado.id}/', {
            'assunto': 'Reenvio',
            'corpo_html': '<p>Texto reenviado</p>',
            'modo_envio': 'imediato',
        })

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], Comunicado.Status.ENVIADO)
        self.assertEqual(resp.data['total_enviado'], 4)
        comunicado.refresh_from_db()
        self.assertIsNone(comunicado.agendado_para)
        self.assertIsNone(comunicado.cancelado_em)

    def test_detalhe_retorna_404_e_bloqueia_alteracoes_invalidas(self):
        resp_get = self.client.get('/api/admin/comunicados/999/')
        self.assertEqual(resp_get.status_code, status.HTTP_404_NOT_FOUND)

        resp_put = self.client.put('/api/admin/comunicados/999/', {
            'assunto': 'Nao existe',
            'corpo_html': '<p>Texto</p>',
        })
        self.assertEqual(resp_put.status_code, status.HTTP_404_NOT_FOUND)

        resp_delete = self.client.delete('/api/admin/comunicados/999/')
        self.assertEqual(resp_delete.status_code, status.HTTP_404_NOT_FOUND)

        enviado = self.cria_comunicado(status=Comunicado.Status.ENVIADO, enviado_em=timezone.now())
        resp_put_enviado = self.client.put(f'/api/admin/comunicados/{enviado.id}/', {
            'assunto': 'Alterar enviado',
            'corpo_html': '<p>Texto</p>',
        })
        self.assertEqual(resp_put_enviado.status_code, status.HTTP_400_BAD_REQUEST)

        enviando = self.cria_comunicado(status=Comunicado.Status.ENVIANDO)
        resp_put_enviando = self.client.put(f'/api/admin/comunicados/{enviando.id}/', {
            'assunto': 'Alterar enviando',
            'corpo_html': '<p>Texto</p>',
        })
        self.assertEqual(resp_put_enviando.status_code, status.HTTP_400_BAD_REQUEST)

        resp_delete_enviado = self.client.delete(f'/api/admin/comunicados/{enviado.id}/')
        self.assertEqual(resp_delete_enviado.status_code, status.HTTP_400_BAD_REQUEST)


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
        self.evento = cria_evento(
            status_evento='publicado',
            data=timezone.localdate() + timedelta(days=1),
        )
        self.evento.gerar_horarios()
        self.horario = self.evento.horarios.first()

    def test_lista_apenas_eventos_publicados(self):
        cria_evento(titulo='Cancelado', status_evento='cancelado')
        resp = self.client.get('/api/colaborador/eventos/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['titulo'], self.evento.titulo)

    def test_detalhe_evento_com_horarios(self):
        resp = self.client.get(f'/api/colaborador/eventos/{self.evento.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('horarios', resp.data)
        self.assertEqual(len(resp.data['horarios']), self.evento.horarios.count())

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_solicitar_otp_reutiliza_codigo_ainda_valido(self):
        cache.clear()

        resp1 = self.client.post(f'/api/colaborador/horarios/{self.horario.id}/solicitar-otp/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertFalse(resp1.data['reutilizado'])
        self.assertEqual(len(mail.outbox), 1)

        resp2 = self.client.post(f'/api/colaborador/horarios/{self.horario.id}/solicitar-otp/')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data['reutilizado'])
        self.assertEqual(len(mail.outbox), 1)

        resp3 = self.client.post(
            f'/api/colaborador/horarios/{self.horario.id}/solicitar-otp/',
            {'reenviar': True},
            format='json',
        )
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)
        self.assertFalse(resp3.data['reutilizado'])
        self.assertEqual(len(mail.outbox), 2)

    def test_reservar_horario_disponivel(self):
        otp = autoriza_otp_agendamento(self.colaborador, self.horario)
        resp = self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{self.horario.id}/reservar/',
            {'otp': otp},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'confirmado')
        self.assertEqual(Agendamento.objects.count(), 1)

    def test_reservar_horario_sem_vagas(self):
        outro_col = cria_colaborador('maria@empresa.com.br', 'Maria')
        Agendamento.objects.create(usuario=outro_col, horario=self.horario, status='confirmado')

        otp = autoriza_otp_agendamento(self.colaborador, self.horario)
        resp = self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{self.horario.id}/reservar/',
            {'otp': otp},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_usuario_nao_pode_reservar_dois_horarios_no_mesmo_evento(self):
        # Reserva o primeiro slot
        otp = autoriza_otp_agendamento(self.colaborador, self.horario)
        self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{self.horario.id}/reservar/',
            {'otp': otp},
            format='json',
        )
        # Tenta reservar outro slot do mesmo evento
        horario2 = self.evento.horarios.all()[1]
        otp2 = autoriza_otp_agendamento(self.colaborador, horario2)
        resp = self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{horario2.id}/reservar/',
            {'otp': otp2},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)

    def test_reservar_evento_encerrado_retorna_404(self):
        self.evento.status = 'encerrado'
        self.evento.save()
        otp = autoriza_otp_agendamento(self.colaborador, self.horario)
        resp = self.client.post(
            f'/api/colaborador/eventos/{self.evento.id}/horarios/{self.horario.id}/reservar/',
            {'otp': otp},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_libera_penalidade_com_evento_punicao_encerrado(self):
        evento_origem = cria_evento(
            titulo='Evento Origem',
            status_evento='encerrado',
            data=timezone.localdate() - timedelta(days=3),
        )
        evento_origem.gerar_horarios()
        agendamento_origem = Agendamento.objects.create(
            usuario=self.colaborador,
            horario=evento_origem.horarios.first(),
            status='confirmado',
            compareceu=False,
        )
        evento_punicao = cria_evento(
            titulo='Evento Punição',
            status_evento='encerrado',
            data=timezone.localdate() - timedelta(days=1),
        )
        penalidade = Penalidade.objects.create(
            usuario=self.colaborador,
            agendamento=agendamento_origem,
            evento_punicao=evento_punicao,
            ativa=True,
        )

        liberadas = liberar_penalidades_expiradas()

        self.assertEqual(liberadas, 1)
        penalidade.refresh_from_db()
        self.assertFalse(penalidade.ativa)

    def test_admin_penalidades_libera_expiradas_antes_de_listar_ativas(self):
        admin = cria_admin('admin.penalidades@empresa.com.br')
        evento_origem = cria_evento(
            titulo='Evento Origem',
            status_evento='encerrado',
            data=timezone.localdate() - timedelta(days=3),
        )
        evento_origem.gerar_horarios()
        agendamento_origem = Agendamento.objects.create(
            usuario=self.colaborador,
            horario=evento_origem.horarios.first(),
            status='confirmado',
            compareceu=False,
        )
        evento_punicao = cria_evento(
            titulo='Evento Punição',
            status_evento='encerrado',
            data=timezone.localdate() - timedelta(days=1),
        )
        penalidade = Penalidade.objects.create(
            usuario=self.colaborador,
            agendamento=agendamento_origem,
            evento_punicao=evento_punicao,
            ativa=True,
        )

        self.client.force_authenticate(user=admin)
        resp = self.client.get('/api/admin/penalidades/?ativa=true')

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        penalidade.refresh_from_db()
        self.assertFalse(penalidade.ativa)
        self.assertEqual(len(resp.data), 0)

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

    def test_cancelar_agendamento_menos_de_30_minutos_antes_bloqueia(self):
        agora = timezone.make_aware(datetime(2026, 7, 20, 10, 0))
        evento = cria_evento(
            status_evento='publicado',
            data=agora.date(),
            hora_inicio=time(10, 20),
            hora_fim=time(10, 50),
        )
        horario = Horario.objects.create(
            evento=evento,
            hora_inicio=time(10, 20),
            hora_fim=time(10, 50),
            vagas_disponiveis=1,
        )
        agendamento = Agendamento.objects.create(
            usuario=self.colaborador, horario=horario, status='confirmado'
        )

        with patch('backend.views.colaborador.agendamento_view.timezone.now', return_value=agora):
            resp = self.client.post(f'/api/colaborador/agendamentos/{agendamento.id}/cancelar/')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        agendamento.refresh_from_db()
        self.assertEqual(agendamento.status, 'confirmado')

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


# ---------------------------------------------------------------------------
# Factories adicionais
# ---------------------------------------------------------------------------

def cria_superadmin(email='super@empresa.com.br', nome='Super Admin', password='super@123'):
    return Usuario.objects.create_superuser(email=email, nome=nome, password=password)


def cria_admin_simples(email='admin_simples@empresa.com.br', nome='Admin Simples', password='admin@123'):
    u = Usuario.objects.create_user(email=email, nome=nome, password=password)
    u.is_admin = True
    u.is_staff = True
    u.save(update_fields=['is_admin', 'is_staff'])
    return u


# ---------------------------------------------------------------------------
# Testes Admin — Participantes Manuais
# ---------------------------------------------------------------------------

class AgendamentoManualTest(APITestCase):
    def setUp(self):
        self.admin = cria_admin()
        self.client.force_authenticate(user=self.admin)

    def test_registrar_participante_sem_horario_retorna_400(self):
        """Rascunho: horario_id não é necessário → participante fica pendente (horario=null)."""
        evento = cria_evento(status_evento='publicado')
        resp = self.client.post(
            f'/api/admin/eventos/{evento.id}/registrar-participante/',
            {'nome': 'Carlos Sem E-mail'},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(AgendamentoManual.objects.filter(evento=evento).exists())

    def test_registrar_participante_publicado_sem_horario_retorna_400(self):
        """Publicado: horario_id obrigatório → 400."""
        evento = cria_evento(status_evento='publicado')
        evento.gerar_horarios()
        resp = self.client.post(
            f'/api/admin/eventos/{evento.id}/registrar-participante/',
            {'nome': 'Carlos Sem E-mail'},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registrar_participante_publicado_com_horario(self):
        """Publicado + horario_id válido → cria vinculado ao horário, status 201."""
        evento = cria_evento(status_evento='publicado')
        evento.gerar_horarios()
        horario = evento.horarios.first()
        resp = self.client.post(
            f'/api/admin/eventos/{evento.id}/registrar-participante/',
            {'nome': 'Carlos Sem E-mail', 'horario_id': horario.id},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        participante = AgendamentoManual.objects.get(evento=evento)
        self.assertEqual(participante.horario, horario)

    def test_registrar_participante_evento_encerrado_retorna_400(self):
        """Evento encerrado → 400."""
        evento = cria_evento(status_evento='encerrado')
        resp = self.client.post(
            f'/api/admin/eventos/{evento.id}/registrar-participante/',
            {'nome': 'Carlos Sem E-mail'},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_publicar_com_pendentes_distribui_round_robin(self):
        """
        Publicar evento com 3 pendentes e 2 horários.
        horario[0] recebe índices 0 e 2 (0%2=0, 2%2=0),
        horario[1] recebe índice 1 (1%2=1).
        """
        evento = cria_evento(
            status_evento='cancelado',
            hora_inicio=time(9, 0),
            hora_fim=time(10, 0),
            duracao_sessao=30,
        )  # rascunho; gera 2 slots ao publicar
        for i in range(3):
            AgendamentoManual.objects.create(evento=evento, nome=f'Participante {i}')

        resp = self.client.post(f'/api/admin/eventos/{evento.id}/publicar/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        horarios = list(evento.horarios.order_by('hora_inicio'))
        self.assertEqual(len(horarios), 2)
        h0_count = AgendamentoManual.objects.filter(evento=evento, horario=horarios[0]).count()
        h1_count = AgendamentoManual.objects.filter(evento=evento, horario=horarios[1]).count()
        self.assertEqual(h0_count, 2)
        self.assertEqual(h1_count, 1)


# ---------------------------------------------------------------------------
# Testes Admin — Lista de Presença
# ---------------------------------------------------------------------------

class ListaPresencaTest(APITestCase):
    def setUp(self):
        self.admin = cria_admin()
        self.client.force_authenticate(user=self.admin)
        self.evento = cria_evento(status_evento='publicado')
        self.evento.gerar_horarios()
        self.horario = self.evento.horarios.first()
        self.colaborador = cria_colaborador()
        Agendamento.objects.create(
            usuario=self.colaborador, horario=self.horario, status='confirmado'
        )

    def test_lista_retorna_agendamentos_agrupados_por_horario(self):
        """Lista retorna agendamentos confirmados agrupados por horário."""
        resp = self.client.get(f'/api/admin/eventos/{self.evento.id}/lista-presenca/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('horarios', resp.data)
        self.assertGreater(len(resp.data['horarios']), 0)
        horario_data = next(
            h for h in resp.data['horarios'] if h['horario_id'] == self.horario.id
        )
        self.assertEqual(len(horario_data['participantes']), 1)

    def test_lista_inclui_participantes_email_e_manual(self):
        """Lista inclui participantes com tipo='email' e tipo='manual'."""
        AgendamentoManual.objects.create(
            evento=self.evento, horario=self.horario, nome='Zara Manual'
        )
        resp = self.client.get(f'/api/admin/eventos/{self.evento.id}/lista-presenca/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        horario_data = next(
            h for h in resp.data['horarios'] if h['horario_id'] == self.horario.id
        )
        tipos = {p['tipo'] for p in horario_data['participantes']}
        self.assertIn('email', tipos)
        self.assertIn('manual', tipos)

    def test_participantes_em_ordem_alfabetica(self):
        """Participantes dentro de cada horário estão em ordem alfabética pelo nome."""
        AgendamentoManual.objects.create(
            evento=self.evento, horario=self.horario, nome='Ana Primeira'
        )
        resp = self.client.get(f'/api/admin/eventos/{self.evento.id}/lista-presenca/')
        horario_data = next(
            h for h in resp.data['horarios'] if h['horario_id'] == self.horario.id
        )
        nomes = [p['nome'] for p in horario_data['participantes']]
        self.assertEqual(nomes, sorted(nomes))

    def test_total_bate_com_soma_real(self):
        """Campo total bate com a soma real de participantes em todos os horários."""
        AgendamentoManual.objects.create(
            evento=self.evento, horario=self.horario, nome='Extra Manual'
        )
        resp = self.client.get(f'/api/admin/eventos/{self.evento.id}/lista-presenca/')
        total_calculado = sum(len(h['participantes']) for h in resp.data['horarios'])
        self.assertEqual(resp.data['total'], total_calculado)
        self.assertEqual(resp.data['total'], 2)  # 1 email + 1 manual


# ---------------------------------------------------------------------------
# Testes SuperAdmin — Gestão de Usuários (LDAP)
# ---------------------------------------------------------------------------

class LdapGestaoTest(APITestCase):
    def setUp(self):
        self.superadmin = cria_superadmin()
        self.client.force_authenticate(user=self.superadmin)

    def test_busca_com_menos_de_2_caracteres_retorna_400(self):
        """Busca com menos de 2 chars → 400."""
        resp = self.client.get('/api/admin/ldap/buscar/?q=a')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_busca_retorna_campos_de_status(self):
        """Busca retorna campos no_sistema, is_admin, is_superuser enriquecidos."""
        resp = self.client.get('/api/admin/ldap/buscar/?q=jonas')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreater(len(resp.data), 0)
        usuario = resp.data[0]
        self.assertIn('no_sistema', usuario)
        self.assertIn('is_admin', usuario)
        self.assertIn('is_superuser', usuario)

    def test_promover_novo_usuario_cria_com_admin_e_senha_padrao(self):
        """Promover usuário novo cria com is_admin=True e senha padrão utilizável — status 201."""
        resp = self.client.post('/api/admin/ldap/promover/', {
            'email': 'novo.admin@aeb.gov.br',
            'nome': 'Novo Admin',
            'matricula': '999001',
            'departamento': 'TI',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        usuario = Usuario.objects.get(email='novo.admin@aeb.gov.br')
        self.assertTrue(usuario.is_admin)
        self.assertTrue(usuario.check_password('aeb@2026'))

    def test_promover_usuario_existente_e_idempotente(self):
        """Promover usuário já existente atualiza is_admin=True sem alterar senha — status 200."""
        existente = cria_colaborador('existente@aeb.gov.br', 'Existente', 'senha_anterior')
        self.assertFalse(existente.is_admin)

        resp = self.client.post('/api/admin/ldap/promover/', {
            'email': 'existente@aeb.gov.br',
            'nome': 'Existente',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        existente.refresh_from_db()
        self.assertTrue(existente.is_admin)
        self.assertTrue(existente.check_password('senha_anterior'))

    def test_revogar_admin_remove_acesso(self):
        """Revogar admin remove is_admin e is_staff."""
        admin = cria_admin_simples()
        resp = self.client.post(f'/api/admin/ldap/revogar/{admin.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        admin.refresh_from_db()
        self.assertFalse(admin.is_admin)
        self.assertFalse(admin.is_staff)

    def test_revogar_superadmin_retorna_400(self):
        """Proteção: revogar SuperAdmin retorna 400."""
        outro_super = cria_superadmin('outro.super@empresa.com.br', 'Outro Super', 'super@456')
        resp = self.client.post(f'/api/admin/ldap/revogar/{outro_super.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_comum_nao_acessa_endpoints_ldap(self):
        """Endpoints de LDAP retornam 403 para admin comum (is_superuser=False)."""
        admin_simples = cria_admin_simples()
        self.client.force_authenticate(user=admin_simples)
        resp = self.client.get('/api/admin/ldap/buscar/?q=jonas')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
