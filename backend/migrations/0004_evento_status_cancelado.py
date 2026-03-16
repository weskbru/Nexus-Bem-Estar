from django.db import migrations, models


def trocar_rascunho_por_cancelado(apps, schema_editor):
    Evento = apps.get_model('backend', 'Evento')
    Evento.objects.filter(status='rascunho').update(status='cancelado')


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0003_agendamentomanual_horario_nullable'),
    ]

    operations = [
        migrations.RunPython(trocar_rascunho_por_cancelado, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='evento',
            name='status',
            field=models.CharField(
                choices=[
                    ('publicado', 'Publicado'),
                    ('cancelado', 'Cancelado'),
                    ('encerrado', 'Encerrado'),
                ],
                default='publicado',
                max_length=20,
                verbose_name='Status',
            ),
        ),
    ]
