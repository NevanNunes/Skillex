# Generated manually for mutual-consent matching

from django.db import migrations, models


def backfill_existing_match_acceptance(apps, schema_editor):
    Match = apps.get_model("matching", "Match")
    Match.objects.filter(status="accepted").update(
        teacher_accepted=True,
        learner_accepted=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("matching", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="match",
            name="teacher_accepted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="match",
            name="learner_accepted",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_existing_match_acceptance, migrations.RunPython.noop),
    ]
