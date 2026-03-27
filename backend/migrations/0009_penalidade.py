import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0008_alter_evento_options'),
    ]

    operations = [
        # Campo compareceu no Agendamento
        migrations.AddField(
            model_name='agendamento',
            name='compareceu',
            field=models.BooleanField(
                blank=True,
                default=None,
                null=True,
                verbose_name='Compareceu',
            ),
        ),

        # Model Penalidade
        migrations.CreateModel(
            name='Penalidade',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ativa', models.BooleanField(default=True, verbose_name='Ativa')),
                ('criada_em', models.DateTimeField(auto_now_add=True)),
                ('revogada_em', models.DateTimeField(blank=True, null=True)),
                ('motivo_revogacao', models.TextField(blank=True, verbose_name='Motivo da revogação')),
                ('usuario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='penalidades',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('agendamento', models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='penalidade',
                    to='backend.agendamento',
                )),
                ('evento_punicao', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='penalidades',
                    to='backend.evento',
                )),
                ('revogada_por', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='penalidades_revogadas',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Penalidade',
                'verbose_name_plural': 'Penalidades',
                'ordering': ['-criada_em'],
            },
        ),
    ]
