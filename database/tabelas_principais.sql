CREATE SCHEMA bem_estar;

CREATE TABLE bem_estar.eventos (
	ev_id SERIAL PRIMARY KEY,
	ev_nome VARCHAR(255) NOT NULL,
	ev_data_evento DATE NOT NULL,
	ev_horario_inicio TIME NOT NULL,
	ev_horario_termino TIME NOT NULL,
	ev_duracao_sessao_min INTEGER NOT NULL,
	ev_capacidade_por_horario INTEGER NOT NULL,
	ev_corpo_email_convite TEXT,
	ev_status VARCHAR(50) DEFAULT 'Publicado',
	ev_criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bem_estar.slots_horario (
	sl_id SERIAL PRIMARY KEY,
	sl_evento_id INTEGER REFERENCES bem_estar.eventos(ev_id) ON DELETE CASCADE,
	sl_horario_sessao TIME NOT NULL,
	sl_vagas_totais INTEGER NOT NULL,
	sl_vagas_ocupadas INTEGER DEFAULT 0,
	CONSTRAINT chk_vagas CHECK (sl_vagas_ocupadas <= sl_vagas_totais)
);

CREATE TABLE bem_estar.usuarios(
	us_id SERIAL PRIMARY KEY,
	us_nome VARCHAR(255) NOT NULL,
	us_email varchar(255) UNIQUE NOT NULL,
	us_perfil VARCHAR(50) DEFAULT 'colaborador',
	us_ativo BOOLEAN DEFAULT TRUE,
	us_criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bem_estar.agendamentos (
	ag_id SERIAL PRIMARY KEY,
	ag_id_evento INTEGER REFERENCES bem_estar.eventos(ev_id) ON DELETE CASCADE,
	ag_id_slot INTEGER REFERENCES bem_estar.slots_horario(sl_id) ON DELETE CASCADE,
	ag_data_agendamento DATE NOT NULL,
	ag_colaborador_id INTEGER REFERENCES bem_estar.usuarios(us_id) ON DELETE SET NULL,
	ag_nome_convidado_externo VARCHAR(255),
	ag_agendado_por_admin_id INTEGER REFERENCES bem_estar.usuarios(us_id) ON DELETE SET NULL,
	ag_status VARCHAR(50) DEFAULT 'Confirmado',
	ag_criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_colaborador_por_dia
ON bem_estar.agendamentos(ag_colaborador_id, ag_data_agendamento)
WHERE ag_colaborador_id IS NOT NULL;

