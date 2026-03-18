from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0006_listaespera'),
    ]

    operations = [
        migrations.AddField(
            model_name='evento',
            name='emails_enviados_em',
            field=models.DateTimeField(blank=True, null=True, verbose_name='E-mails enviados em'),
        ),
    ]
