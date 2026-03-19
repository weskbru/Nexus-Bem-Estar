# Documentação de Testes — Backend

## Como executar

```bash
# Todos os testes
docker compose exec backend python manage.py test backend.tests --verbosity=2

# Um grupo específico
docker compose exec backend python manage.py test backend.tests.tests.AdminEventoTest
```

---

## Status geral

| Grupo | Implementados | Faltando |
|---|---|---|
| Models — Geração de Horários | 5 | 0 |
| Models — Convite de E-mail | 2 | 0 |
| Auth — Login Admin | 3 | 0 |
| Auth — Acesso via Token | 3 | 0 |
| Admin — CRUD de Eventos | 8 | 0 |
| Admin — Envio de E-mails | 4 | 0 |
| Admin — Dashboard | 2 | 0 |
| Colaborador — Eventos e Agendamentos | 11 | 0 |
| Concorrência | 1 | 0 |
| **Participantes Manuais** | **0** | **5** |
| **Lista de Presença** | **0** | **4** |
| **LDAP / Gestão de Usuários** | **0** | **7** |
| **Total** | **39** | **16** |

---

## Testes implementados

### `HorarioGeracaoTest`

| # | Método | O que valida |
|---|---|---|
| 1 | `test_gera_slots_corretos` | 09:00–11:00 com 30 min → exatamente 4 slots |
| 2 | `test_slot_nao_completo_e_descartado` | Slot que não cabe no intervalo é descartado silenciosamente |
| 3 | `test_gerar_horarios_com_agendamentos_gera_erro` | Lança `ValueError` se já há agendamentos no evento |
| 4 | `test_vagas_livres_decrementa_apos_agendamento` | `vagas_livres` cai após confirmar agendamento |
| 5 | `test_horario_esgotado_quando_sem_vagas` | `disponivel = False` quando vagas_livres = 0 |

### `ConviteEmailTest`

| # | Método | O que valida |
|---|---|---|
| 6 | `test_chave_mensagem_gerada_automaticamente` | `chave_mensagem` tem 8 chars e `token` UUID é gerado |
| 7 | `test_unicidade_usuario_evento` | Dois convites para o mesmo par usuário+evento são bloqueados |

---

### `AdminLoginTest`

| # | Método | O que valida |
|---|---|---|
| 8 | `test_login_sucesso` | Credenciais válidas retornam `access`, `refresh` e dados do usuário |
| 9 | `test_login_senha_errada` | Senha incorreta retorna 401 |
| 10 | `test_colaborador_nao_pode_logar_como_admin` | Usuário sem `is_admin` é rejeitado no login admin |

### `AcessoViaTokenTest`

| # | Método | O que valida |
|---|---|---|
| 11 | `test_acesso_valido` | Token válido retorna JWT + `evento_id` + `chave_mensagem` |
| 12 | `test_acesso_token_invalido` | Token inexistente retorna 404 |
| 13 | `test_token_marcado_como_usado` | Após acesso, `convite.usado` passa a `True` |

---

### `AdminEventoTest`

| # | Método | O que valida |
|---|---|---|
| 14 | `test_criar_evento_rascunho` | Cria evento em rascunho sem gerar horários |
| 15 | `test_publicar_evento_gera_horarios` | Publicar muda status e gera os slots |
| 16 | `test_encerrar_evento` | Encerrar muda status para `encerrado` |
| 17 | `test_editar_corpo_email` | PATCH salva `corpo_email` corretamente |
| 18 | `test_validacao_hora_fim_menor_que_inicio` | `hora_fim <= hora_inicio` retorna 400 |
| 19 | `test_validacao_duracao_zero` | `duracao_sessao = 0` retorna 400 |
| 20 | `test_nao_pode_publicar_evento_encerrado` | Publicar evento encerrado retorna 400 |
| 21 | `test_colaborador_nao_acessa_admin` | Colaborador recebe 403 em rotas de admin |

### `EnviarEmailsTest`

| # | Método | O que valida |
|---|---|---|
| 22 | `test_envia_email_para_cada_colaborador` | Número de e-mails enviados = número de colaboradores ativos |
| 23 | `test_email_contem_link_e_chave` | Corpo do e-mail contém o token UUID e a chave de mensagem |
| 24 | `test_reenvio_usa_mesmo_convite` | Segundo envio reutiliza o mesmo `ConviteEmail` (`get_or_create`) |
| 25 | `test_nao_envia_para_evento_nao_publicado` | Enviar e-mails para rascunho retorna 400 |

---

### `AdminDashboardTest`

| # | Método | O que valida |
|---|---|---|
| 26 | `test_dashboard_retorna_metricas` | Resposta contém `total_vagas`, `vagas_ocupadas`, `taxa_ocupacao`, `total_eventos_ativos` |
| 27 | `test_taxa_ocupacao_calculada` | Taxa > 0 e vagas_ocupadas > 0 após agendamento confirmado |

---

### `ColaboradorEventoTest`

| # | Método | O que valida |
|---|---|---|
| 28 | `test_lista_apenas_eventos_publicados` | Eventos em rascunho não aparecem na listagem do colaborador |
| 29 | `test_detalhe_evento_com_horarios` | Detalhe retorna evento com lista completa de horários |
| 30 | `test_reservar_horario_disponivel` | Reserva cria agendamento com status `confirmado` |
| 31 | `test_reservar_horario_sem_vagas` | Horário lotado retorna 400 |
| 32 | `test_usuario_nao_pode_reservar_dois_horarios_no_mesmo_evento` | Segunda reserva no mesmo evento retorna 400 |
| 33 | `test_reservar_evento_encerrado_retorna_404` | Horário de evento encerrado retorna 404 |
| 34 | `test_cancelar_agendamento` | Cancelar muda status para `cancelado` |
| 35 | `test_cancelar_agendamento_ja_cancelado` | Cancelar novamente retorna 400 |
| 36 | `test_cancelar_agendamento_de_outro_usuario_retorna_404` | Não pode cancelar agendamento de outro usuário |
| 37 | `test_meus_agendamentos` | Retorna apenas agendamentos do usuário autenticado |
| 38 | `test_unauthenticated_nao_acessa_eventos` | Sem JWT retorna 401 |

### `ConcorrenciaTest`

| # | Método | O que valida |
|---|---|---|
| 39 | `test_select_for_update_impede_dupla_reserva` | `unique_together` no banco bloqueia agendamento duplicado |

---

## Testes a implementar

### `AgendamentoManualTest` — Participantes sem e-mail

| # | Caso | Comportamento esperado |
|---|---|---|
| 40 | Registrar participante em rascunho sem `horario_id` | Cria com `horario=null` (pendente) — status 201 |
| 41 | Registrar participante em evento publicado sem `horario_id` | Retorna 400 (horário obrigatório em publicado) |
| 42 | Registrar participante em evento publicado com `horario_id` válido | Cria vinculado ao horário — status 201 |
| 43 | Registrar participante em evento encerrado | Retorna 400 |
| 44 | Publicar evento com 3 pendentes e 2 horários (round-robin) | `horario[0]` recebe 2 participantes, `horario[1]` recebe 1 |

---

### `ListaPresencaTest` — Portaria

| # | Caso | Comportamento esperado |
|---|---|---|
| 45 | Lista retorna agendamentos `confirmado` agrupados por horário | Cada objeto de horário contém lista de participantes |
| 46 | Lista inclui participantes manuais junto com os de e-mail | Campos `tipo: 'email'` e `tipo: 'manual'` presentes |
| 47 | Participantes dentro de cada horário estão em ordem alfabética | Ordenação por `nome` |
| 48 | Campo `total` bate com soma real de todos os participantes | Contagem consistente entre horários |

---

### `LdapGestaoTest` — Gestão de Usuários (SuperAdmin)

| # | Caso | Comportamento esperado |
|---|---|---|
| 49 | Busca com menos de 2 caracteres | Retorna 400 |
| 50 | Busca retorna campos `no_sistema`, `is_admin`, `is_superuser` | Dados enriquecidos com status do banco local |
| 51 | Promover usuário novo cria com `is_admin=True` e senha utilizável | Autenticação funciona após promoção — status 201 |
| 52 | Promover usuário já existente atualiza `is_admin=True` sem alterar senha | Idempotente — status 200 |
| 53 | Revogar admin remove `is_admin` e `is_staff` | Usuário perde acesso ao painel |
| 54 | Revogar SuperAdmin retorna 400 | Proteção para não perder acesso ao sistema |
| 55 | Endpoints de LDAP retornam 403 para admin comum | Controle de acesso por `is_superuser` |

---

## Ordem de implementação

1. `AgendamentoManualTest` — cobre participantes sem e-mail (funcionalidade recente crítica)
2. `ListaPresencaTest` — cobre a lista para portaria
3. `LdapGestaoTest` — cobre gestão de acesso de administradores
