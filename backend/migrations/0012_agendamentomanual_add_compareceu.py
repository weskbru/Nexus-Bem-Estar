from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0011_comunicado'),
    ]

    operations = [
        migrations.AddField(
            model_name='agendamentomanual',
            name='compareceu',
            field=models.BooleanField(blank=True, null=True, verbose_name='Compareceu'),
        ),
    ]
