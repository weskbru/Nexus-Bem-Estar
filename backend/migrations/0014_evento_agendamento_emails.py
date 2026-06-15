from django.db import migrations, models


def marcar_eventos_ja_enviados(apps, schema_editor):
    Evento = apps.get_model('backend', 'Evento')
    Evento.objects.exclude(emails_enviados_em__isnull=True).update(emails_envio_status='enviado')


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0013_comunicado_agendamento'),
    ]

    operations = [
        migrations.AddField(
            model_name='evento',
            name='emails_envio_status',
            field=models.CharField(
                choices=[
                    ('nao_agendado', 'Nao agendado'),
                    ('agendado', 'Agendado'),
                    ('enviando', 'Enviando'),
                    ('enviado', 'Enviado'),
                    ('falhou', 'Falhou'),
                    ('cancelado', 'Cancelado'),
                ],
                default='nao_agendado',
                max_length=20,
                verbose_name='Status do envio de e-mails',
            ),
        ),
        migrations.AddField(
            model_name='evento',
            name='emails_agendado_para',
            field=models.DateTimeField(blank=True, null=True, verbose_name='E-mails agendados para'),
        ),
        migrations.AddField(
            model_name='evento',
            name='emails_tentativas_envio',
            field=models.PositiveIntegerField(default=0, verbose_name='Tentativas de envio de e-mails'),
        ),
        migrations.AddField(
            model_name='evento',
            name='emails_erro_envio',
            field=models.TextField(blank=True, verbose_name='Erro no envio de e-mails'),
        ),
        migrations.RunPython(marcar_eventos_ja_enviados, migrations.RunPython.noop),
    ]
