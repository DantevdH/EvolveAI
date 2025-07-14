from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import CoachSerializer, DEFINED_COACHES

class CoachListView(APIView):
    """
    A view that returns a hard-coded list of defined coaches.
    This does not interact with the database.
    """
    def get(self, request, *args, **kwargs):
        # We serialize our Python list of dictionaries
        serializer = CoachSerializer(DEFINED_COACHES, many=True)
        # And return it as a JSON array response
        return Response(serializer.data)