from dataclasses import dataclass, field


@dataclass
class ResultadoProcessamento:
    enviados: int = 0
    falhas: int = 0
    mensagens: list[str] = field(default_factory=list)
