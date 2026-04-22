# common/mixins.py
class SerializerContextMixin:
    """Passes request into serializer context automatically."""
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context