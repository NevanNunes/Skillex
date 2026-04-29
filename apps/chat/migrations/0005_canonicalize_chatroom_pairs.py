from django.db import migrations, models
from django.db.models import F, Q


def canonicalize_chatroom_pairs(apps, schema_editor):
    ChatRoom = apps.get_model("chat", "ChatRoom")
    Message = apps.get_model("chat", "Message")

    grouped = {}
    rooms = ChatRoom.objects.all().order_by("created_at", "id")
    for room in rooms:
        t_id = str(room.teacher_id)
        l_id = str(room.learner_id)
        key = tuple(sorted([t_id, l_id]))
        grouped.setdefault(key, []).append(room)

    for key, room_list in grouped.items():
        canonical_teacher_id, canonical_learner_id = key

        # Prefer an already-canonical room to avoid transient unique collisions.
        keeper = None
        for room in room_list:
            if str(room.teacher_id) == canonical_teacher_id and str(room.learner_id) == canonical_learner_id:
                keeper = room
                break
        if keeper is None:
            keeper = room_list[0]

        for room in room_list:
            if room.id == keeper.id:
                continue
            Message.objects.filter(room_id=room.id).update(room_id=keeper.id)
            room.delete()

        if str(keeper.teacher_id) != canonical_teacher_id or str(keeper.learner_id) != canonical_learner_id:
            keeper.teacher_id = canonical_teacher_id
            keeper.learner_id = canonical_learner_id
            keeper.save(update_fields=["teacher", "learner"])


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ("chat", "0004_chatroom_user_pair"),
    ]

    operations = [
        migrations.RunPython(canonicalize_chatroom_pairs, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="chatroom",
            constraint=models.CheckConstraint(
                condition=Q(teacher__lt=F("learner")),
                name="chatroom_teacher_lt_learner",
            ),
        ),
    ]
