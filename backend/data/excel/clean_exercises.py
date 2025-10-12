# %% Load the data
import pandas as pd
import numpy as np

# Load your exercise datasets
gym_exercises = pd.read_csv("gym_exercise_dataset.csv")

# %% Load the data

gym_exercises.rename(
    columns={
        "Exercise Name": "Exercise Name",
        "Preparation": "Instructions",
        "Force": "Force",
        "Equipment": "Equipment",
        "Main_muscle": "Main Muscle",
        "Secondary Muscles": "Secondary Muscles",
        "Difficulty (1-5)": "Difficulty",
    },
    inplace=True,
)


def _difficulty_level(difficulty):
    if difficulty <= 2:
        return "Beginner"
    elif difficulty == 3:
        return "Intermediate"
    elif difficulty > 3:
        return "Advanced"


gym_exercises["Difficulty"] = gym_exercises["Difficulty"].apply(_difficulty_level)

gym_exercises["Unique ID"] = (
    gym_exercises["Exercise Name"]
    + gym_exercises["Equipment"]
    + gym_exercises["Main Muscle"]
)
duplicates = gym_exercises[gym_exercises.duplicated(subset=["Unique ID"], keep=False)]
print(f"Found {len(duplicates)} rows with duplicate Unique IDs")
# gym_exercises.to_excel("gym_exercises_filtered.xlsx", index=False)
gym_exercises_filtered = gym_exercises[
    [
        "Exercise Name",
        "Force",
        "Instructions",
        "Equipment",
        "Main Muscle",
        "Secondary Muscles",
        "Difficulty",
    ]
]

print(f"---- unique equipment {gym_exercises_filtered['Equipment'].unique()} ----")
gym_exercises_filtered.to_excel("gym_exercises_filtered.xlsx", index=False)
