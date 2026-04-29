from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_chatrooms_to_user_pairs(apps, schema_editor):
    ChatRoom = apps.get_model("chat", "ChatRoom")
    Message = apps.get_model("chat", "Message")

    # First, copy teacher/learner from each room's match.
    for room in ChatRoom.objects.select_related("match", "match__teacher", "match__learner"):
        room.teacher_id = room.match.teacher_id
        room.learner_id = room.match.learner_id
        room.save(update_fields=["teacher", "learner"])

    # Merge duplicate rooms that now map to the same pair.
    # Keep the oldest room and move messages from duplicates.
    keep_by_pair = {}
    for room in ChatRoom.objects.order_by("created_at", "id"):
        key = (room.teacher_id, room.learner_id)
        keeper_id = keep_by_pair.get(key)
        if keeper_id is None:
            keep_by_pair[key] = room.id
            continue

        Message.objects.filter(room_id=room.id).update(room_id=keeper_id)
        room.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0003_initial"),
        ("matching", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="chatroom",
            name="learner",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="chat_rooms_as_learner",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="chatroom",
            name="teacher",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="chat_rooms_as_teacher",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(migrate_chatrooms_to_user_pairs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="chatroom",
            name="learner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="chat_rooms_as_learner",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="chatroom",
            name="teacher",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="chat_rooms_as_teacher",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RemoveField(
            model_name="chatroom",
            name="match",
        ),
        migrations.AddConstraint(
            model_name="chatroom",
            constraint=models.UniqueConstraint(
                fields=("teacher", "learner"),
                name="unique_chatroom_teacher_learner",
            ),
        ),
        migrations.AddIndex(
            model_name="chatroom",
            index=models.Index(fields=["teacher", "learner"], name="chat_room_pair_idx"),
        ),
    ]
