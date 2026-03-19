from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0002_agendamentomanual'),
    ]

    operations = [
        migrations.AlterField(
            model_name='agendamentomanual',
            name='horario',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='participantes_manuais',
                to='backend.horario',
            ),
        ),
    ]
