from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AgendamentoManual',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=200, verbose_name='Nome completo')),
                ('matricula', models.CharField(blank=True, max_length=50, verbose_name='Matrícula')),
                ('departamento', models.CharField(blank=True, max_length=100, verbose_name='Departamento')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('evento', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='participantes_manuais',
                    to='backend.evento',
                )),
                ('horario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='participantes_manuais',
                    to='backend.horario',
                )),
            ],
            options={
                'verbose_name': 'Participante Manual',
                'verbose_name_plural': 'Participantes Manuais',
                'ordering': ['-criado_em'],
            },
        ),
    ]
