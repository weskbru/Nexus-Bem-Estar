from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0014_evento_agendamento_emails'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='comunicado',
            index=models.Index(
                fields=['status', 'agendado_para'],
                name='idx_comunicado_status_agenda',
            ),
        ),
    ]
