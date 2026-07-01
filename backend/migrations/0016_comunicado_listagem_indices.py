from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0015_comunicado_status_agendado_para_idx'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='comunicado',
            index=models.Index(fields=['-criado_em'], name='idx_comunicado_criado_desc'),
        ),
        migrations.AddIndex(
            model_name='comunicado',
            index=models.Index(fields=['status', '-criado_em'], name='idx_com_status_criado_desc'),
        ),
    ]
