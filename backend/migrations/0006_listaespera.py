import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0005_merge_0004'),
    ]

    operations = [
        migrations.CreateModel(
            name='ListaEspera',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('posicao', models.PositiveIntegerField(verbose_name='Posição na fila')),
                ('status', models.CharField(
                    choices=[
                        ('aguardando', 'Aguardando'),
                        ('notificado', 'Notificado'),
                        ('confirmado', 'Confirmado'),
                        ('expirado', 'Expirado'),
                    ],
                    default='aguardando',
                    max_length=20,
                    verbose_name='Status',
                )),
                ('token_confirmacao', models.UUIDField(default=uuid.uuid4, editable=False, unique=True, verbose_name='Token de confirmação')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('notificado_em', models.DateTimeField(blank=True, null=True, verbose_name='Notificado em')),
                ('expira_em', models.DateTimeField(blank=True, null=True, verbose_name='Expira em')),
                ('horario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='lista_espera',
                    to='backend.horario',
                )),
                ('usuario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='lista_espera',
                    to='backend.usuario',
                )),
            ],
            options={
                'verbose_name': 'Lista de Espera',
                'verbose_name_plural': 'Listas de Espera',
                'ordering': ['posicao'],
                'unique_together': {('horario', 'usuario')},
            },
        ),
    ]
