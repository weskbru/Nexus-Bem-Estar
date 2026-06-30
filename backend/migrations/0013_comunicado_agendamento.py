import django.utils.timezone
from django.db import migrations, models


def copiar_enviado_em_para_criado_em(apps, schema_editor):
    Comunicado = apps.get_model('backend', 'Comunicado')
    for comunicado in Comunicado.objects.exclude(enviado_em__isnull=True):
        Comunicado.objects.filter(id=comunicado.id).update(criado_em=comunicado.enviado_em)


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0012_agendamentomanual_add_compareceu'),
    ]

    operations = [
        migrations.AddField(
            model_name='comunicado',
            name='status',
            field=models.CharField(
                choices=[
                    ('agendado', 'Agendado'),
                    ('enviando', 'Enviando'),
                    ('enviado', 'Enviado'),
                    ('falhou', 'Falhou'),
                    ('cancelado', 'Cancelado'),
                ],
                default='enviado',
                max_length=20,
                verbose_name='Status',
            ),
        ),
        migrations.AddField(
            model_name='comunicado',
            name='agendado_para',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Agendado para'),
        ),
        migrations.AddField(
            model_name='comunicado',
            name='cancelado_em',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Cancelado em'),
        ),
        migrations.AddField(
            model_name='comunicado',
            name='tentativas_envio',
            field=models.PositiveIntegerField(default=0, verbose_name='Tentativas de envio'),
        ),
        migrations.AddField(
            model_name='comunicado',
            name='erro_envio',
            field=models.TextField(blank=True, verbose_name='Erro de envio'),
        ),
        migrations.AddField(
            model_name='comunicado',
            name='criado_em',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='comunicado',
            name='atualizado_em',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.RunPython(copiar_enviado_em_para_criado_em, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='comunicado',
            name='enviado_em',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Enviado em'),
        ),
        migrations.AlterModelOptions(
            name='comunicado',
            options={'ordering': ['-criado_em'], 'verbose_name': 'Comunicado', 'verbose_name_plural': 'Comunicados'},
        ),
    ]
