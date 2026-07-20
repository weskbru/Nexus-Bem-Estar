from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0009_penalidade'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='ramal',
            field=models.CharField(blank=True, max_length=20, verbose_name='Ramal'),
        ),
    ]
