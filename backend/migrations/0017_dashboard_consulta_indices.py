from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0016_comunicado_listagem_indices'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='agendamento',
            index=models.Index(
                fields=['-criado_em'],
                name='idx_agendamento_criado',
            ),
        ),
        migrations.AddIndex(
            model_name='agendamento',
            index=models.Index(
                fields=['status', '-criado_em'],
                name='idx_ag_status_criado',
            ),
        ),
        migrations.AddIndex(
            model_name='evento',
            index=models.Index(
                fields=['status', 'data', 'hora_fim'],
                name='idx_evento_status_data_fim',
            ),
        ),
    ]
