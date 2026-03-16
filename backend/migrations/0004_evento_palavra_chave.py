from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0003_agendamentomanual_horario_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='evento',
            name='palavra_chave',
            field=models.CharField(
                blank=True,
                help_text='Se preenchida, o colaborador precisará informar esta palavra-chave ao clicar no link do convite.',
                max_length=100,
                verbose_name='Palavra-chave de acesso',
            ),
        ),
    ]
