from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0010_usuario_ramal'),
    ]

    operations = [
        migrations.CreateModel(
            name='Comunicado',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assunto', models.CharField(max_length=200, verbose_name='Assunto')),
                ('corpo_html', models.TextField(verbose_name='Corpo HTML')),
                ('enviado_em', models.DateTimeField(auto_now_add=True, verbose_name='Enviado em')),
                ('total_destinatarios', models.PositiveIntegerField(default=0, verbose_name='Total de destinatários')),
                ('enviado_por', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='comunicados_enviados',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Enviado por',
                )),
            ],
            options={
                'verbose_name': 'Comunicado',
                'verbose_name_plural': 'Comunicados',
                'ordering': ['-enviado_em'],
            },
        ),
    ]
