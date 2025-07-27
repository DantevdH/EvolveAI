from rest_framework import serializers


# This defines the structure of a single coach object
class CoachSerializer(serializers.Serializer):
    # read_only=True means these fields are for output only
    name = serializers.CharField(read_only=True)
    goal = serializers.CharField(read_only=True)
    iconName = serializers.CharField(read_only=True)
    tagline = serializers.CharField(read_only=True)
    primaryColorHex = serializers.CharField(read_only=True)


# This is our hard-coded, developer-defined list of coaches
# It's the Python equivalent of your Swift CoachProvider
DEFINED_COACHES = [
    {
        "name": "Coach Stride",
        "goal": "Improve Endurance",
        "iconName": "figure.run",
        "tagline": "Going the distance, one step at a time.",
        "primaryColorHex": "#007AFF",
    },
    {
        "name": "Coach Forge",
        "goal": "Bodybuilding",
        "iconName": "dumbbell.fill",
        "tagline": "Sculpting strength, building legends.",
        "primaryColorHex": "#FF9500",
    },
    {
        "name": "Coach Titan",
        "goal": "Increase Strength",
        "iconName": "flame.fill",
        "tagline": "Unleash your inner power.",
        "primaryColorHex": "#FF3B30",
    },
    {
        "name": "Coach Balance",
        "goal": "General Fitness",
        "iconName": "heart.fill",
        "tagline": "Your daily dose of wellness.",
        "primaryColorHex": "#428044",
    },
    {
        "name": "Coach Shift",
        "goal": "Weight Loss",
        "iconName": "scalemass.fill",
        "tagline": "Transforming your energy.",
        "primaryColorHex": "#7F1093",
    },
    {
        "name": "Coach Bolt",
        "goal": "Power & Speed",
        "iconName": "bolt.fill",
        "tagline": "Ignite your potential.",
        "primaryColorHex": "#1AD1DD",
    },
]
