import json
import pandas as pd

with open('exercise_features.json', 'r') as f:
    data = json.load(f)

df = pd.DataFrame(data)
df.to_excel('exercise_features.xlsx', index=False)