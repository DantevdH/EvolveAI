# Coach Fetching Debug Guide

## Setup Instructions

1. **Insert Sample Data**: Run the SQL commands in `sample_coaches.sql` in your Supabase SQL editor
2. **Verify Data**: Check that coaches are visible in your Supabase dashboard

## Testing the Coach Fetching

### Method 1: Using WorkoutManager
```swift
// In your app, the coaches are automatically fetched when:
workoutManager.fetchCoaches(userGoal: "lose_weight") { success in
    if success {
        print("Found coach: \(workoutManager.selectedCoach?.name ?? "None")")
    } else {
        print("No coach found for goal: lose_weight")
    }
}
```

### Method 2: Fetch All Coaches
```swift
workoutManager.fetchAllCoaches { success in
    if success {
        print("Total coaches: \(workoutManager.coaches.count)")
        for coach in workoutManager.coaches {
            print("- \(coach.name): \(coach.goal)")
        }
    }
}
```

### Method 3: Fetch by Specific Goal
```swift
workoutManager.fetchCoachesByGoal("build_muscle") { success in
    if success {
        print("Found coach for muscle building: \(workoutManager.selectedCoach?.name ?? "None")")
    }
}
```

## Expected Goals in Sample Data

The sample data includes coaches for these goals:
- `lose_weight`
- `build_muscle`
- `improve_fitness`
- `increase_strength`
- `endurance_training`
- `flexibility_mobility`

## Troubleshooting

### If coaches aren't loading:
1. Check Supabase connection in your app
2. Verify the `coaches` table exists and has data
3. Check the console for error messages
4. Ensure your app has proper authentication

### Common Issues:
- **No RLS policies**: Since coaches are static data, you might need to disable RLS or add a policy
- **Authentication required**: Make sure your app is properly authenticated
- **Network issues**: Check your Supabase URL and API key

## Adding More Coaches

To add more coaches, insert them into the `coaches` table:

```sql
INSERT INTO public.coaches (name, goal, icon_name, tagline, primary_color_hex) VALUES
('Coach Name', 'goal_type', 'icon.name', 'Tagline here', '#HEXCODE');
```

## Icon Names

Use SF Symbol names for the `icon_name` field:
- `figure.run` - Running figure
- `dumbbell.fill` - Dumbbell
- `heart.fill` - Heart
- `bolt.fill` - Lightning bolt
- `flame.fill` - Fire
- `leaf.fill` - Leaf
- `star.fill` - Star
- `trophy.fill` - Trophy 