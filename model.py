import sys
import json
import numpy as np
from sklearn.tree import DecisionTreeClassifier

# ─────────────────────────────────────────────
#  Encodings
# ─────────────────────────────────────────────

GOAL_MAP = {
    "build_muscle": 0,
    "lose_fat":     1,
    "stay_fit":     2,
    "endurance":    3,
}

LEVEL_MAP = {
    "beginner":     0,
    "intermediate": 1,
    "advanced":     2,
}

def plan_key(goal_enc, level_enc):
    """Maps (goal 0-3, level 0-2) → unique int 0-11"""
    return goal_enc * 3 + level_enc

# ─────────────────────────────────────────────
#  12 Weekly Plans  (goal × level)
#  Shape: [ { day, exercises: [{name, sets}] } × 7 ]
# ─────────────────────────────────────────────

PLANS = {

    # ── BUILD MUSCLE ─────────────────────────────────────────────────────────

    plan_key(0, 0): [   # build_muscle · beginner
        {"day": "Monday",    "exercises": [{"name": "Push-Ups",               "sets": "3×10 reps"},
                                           {"name": "Dumbbell Bench Press",   "sets": "3×10 reps"},
                                           {"name": "Dumbbell Shoulder Press","sets": "3×10 reps"},
                                           {"name": "Tricep Kickbacks",        "sets": "3×12 reps"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Dumbbell Row",           "sets": "3×10 reps"},
                                           {"name": "Lat Pulldown (band)",    "sets": "3×12 reps"},
                                           {"name": "Dumbbell Bicep Curl",    "sets": "3×12 reps"},
                                           {"name": "Face Pulls (band)",       "sets": "3×15 reps"}]},
        {"day": "Wednesday", "exercises": [{"name": "Rest / Light Walk",      "sets": "30 min"}]},
        {"day": "Thursday",  "exercises": [{"name": "Goblet Squat",           "sets": "3×12 reps"},
                                           {"name": "Dumbbell Lunge",         "sets": "3×10 reps each"},
                                           {"name": "Glute Bridge",           "sets": "3×15 reps"},
                                           {"name": "Calf Raises",            "sets": "3×20 reps"}]},
        {"day": "Friday",    "exercises": [{"name": "Incline Push-Ups",       "sets": "3×12 reps"},
                                           {"name": "Dumbbell Lateral Raise", "sets": "3×12 reps"},
                                           {"name": "Hammer Curl",            "sets": "3×12 reps"},
                                           {"name": "Plank",                  "sets": "3×30 sec"}]},
        {"day": "Saturday",  "exercises": [{"name": "Full Body Circuit",      "sets": "3 rounds"},
                                           {"name": "Bodyweight Squat",       "sets": "15 reps"},
                                           {"name": "Push-Up",                "sets": "10 reps"},
                                           {"name": "Dumbbell Row",           "sets": "10 reps each"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    plan_key(0, 1): [   # build_muscle · intermediate
        {"day": "Monday",    "exercises": [{"name": "Barbell Bench Press",    "sets": "4×8 reps"},
                                           {"name": "Incline DB Press",       "sets": "3×10 reps"},
                                           {"name": "Cable Flyes",            "sets": "3×12 reps"},
                                           {"name": "Overhead Tricep Ext.",   "sets": "3×12 reps"},
                                           {"name": "Tricep Dips",            "sets": "3×10 reps"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Barbell Row",            "sets": "4×8 reps"},
                                           {"name": "Pull-Ups",               "sets": "3×8 reps"},
                                           {"name": "Seated Cable Row",       "sets": "3×10 reps"},
                                           {"name": "Barbell Curl",           "sets": "3×10 reps"},
                                           {"name": "Incline DB Curl",        "sets": "3×12 reps"}]},
        {"day": "Wednesday", "exercises": [{"name": "Active Recovery",        "sets": "20 min walk + stretch"}]},
        {"day": "Thursday",  "exercises": [{"name": "Overhead Press",         "sets": "4×8 reps"},
                                           {"name": "Lateral Raises",         "sets": "3×15 reps"},
                                           {"name": "Front Raises",           "sets": "3×12 reps"},
                                           {"name": "Face Pulls",             "sets": "3×15 reps"},
                                           {"name": "Shrugs",                 "sets": "3×12 reps"}]},
        {"day": "Friday",    "exercises": [{"name": "Barbell Squat",          "sets": "4×8 reps"},
                                           {"name": "Romanian Deadlift",      "sets": "3×10 reps"},
                                           {"name": "Leg Press",              "sets": "3×12 reps"},
                                           {"name": "Leg Curl",               "sets": "3×12 reps"},
                                           {"name": "Calf Raises",            "sets": "4×15 reps"}]},
        {"day": "Saturday",  "exercises": [{"name": "Preacher Curl",          "sets": "3×10 reps"},
                                           {"name": "Skull Crushers",         "sets": "3×10 reps"},
                                           {"name": "Cable Crunch",           "sets": "3×15 reps"},
                                           {"name": "Hanging Leg Raise",      "sets": "3×12 reps"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    plan_key(0, 2): [   # build_muscle · advanced
        {"day": "Monday",    "exercises": [{"name": "Flat Barbell Bench Press", "sets": "5×5 reps"},
                                           {"name": "Weighted Dips",            "sets": "4×8 reps"},
                                           {"name": "Incline DB Flyes",         "sets": "4×10 reps"},
                                           {"name": "Close-Grip Bench Press",   "sets": "4×8 reps"},
                                           {"name": "Cable Crossover",          "sets": "3×12 reps"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Deadlift",                 "sets": "5×5 reps"},
                                           {"name": "Weighted Pull-Ups",        "sets": "4×6 reps"},
                                           {"name": "T-Bar Row",                "sets": "4×8 reps"},
                                           {"name": "Barbell Curl",             "sets": "4×8 reps"},
                                           {"name": "Spider Curl",              "sets": "3×12 reps"}]},
        {"day": "Wednesday", "exercises": [{"name": "Active Recovery / Mobility","sets": "30 min"}]},
        {"day": "Thursday",  "exercises": [{"name": "Push Press",               "sets": "4×6 reps"},
                                           {"name": "Arnold Press",             "sets": "4×8 reps"},
                                           {"name": "Lateral Raises",           "sets": "4×15 reps"},
                                           {"name": "Rear Delt Flyes",          "sets": "4×15 reps"},
                                           {"name": "Upright Row",              "sets": "3×10 reps"}]},
        {"day": "Friday",    "exercises": [{"name": "Back Squat",               "sets": "5×5 reps"},
                                           {"name": "Hack Squat",               "sets": "4×8 reps"},
                                           {"name": "Bulgarian Split Squat",    "sets": "3×10 reps each"},
                                           {"name": "Nordic Hamstring Curl",    "sets": "3×8 reps"},
                                           {"name": "Seated Calf Raise",        "sets": "4×15 reps"}]},
        {"day": "Saturday",  "exercises": [{"name": "Weighted Chin-Ups",        "sets": "4×6 reps"},
                                           {"name": "Incline DB Press",         "sets": "4×8 reps"},
                                           {"name": "Lateral Raises",           "sets": "3×15 reps"},
                                           {"name": "Ab Wheel Rollout",         "sets": "4×10 reps"},
                                           {"name": "Hanging Leg Raise",        "sets": "4×12 reps"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                     "sets": "Full rest"}]},
    ],

    # ── LOSE FAT ──────────────────────────────────────────────────────────────

    plan_key(1, 0): [   # lose_fat · beginner
        {"day": "Monday",    "exercises": [{"name": "Brisk Walk",             "sets": "30 min"},
                                           {"name": "Bodyweight Squat",       "sets": "3×15 reps"},
                                           {"name": "Push-Ups",               "sets": "3×10 reps"},
                                           {"name": "Plank",                  "sets": "3×20 sec"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Cycling / Elliptical",   "sets": "25 min steady"},
                                           {"name": "Dumbbell Row",           "sets": "3×12 reps"},
                                           {"name": "Glute Bridge",           "sets": "3×15 reps"}]},
        {"day": "Wednesday", "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
        {"day": "Thursday",  "exercises": [{"name": "Walking Lunges",         "sets": "3×12 reps each"},
                                           {"name": "Incline Push-Ups",       "sets": "3×12 reps"},
                                           {"name": "Standing DB Press",      "sets": "3×12 reps"},
                                           {"name": "Russian Twist",          "sets": "3×15 reps"}]},
        {"day": "Friday",    "exercises": [{"name": "Light Jog / Walk",       "sets": "30 min"},
                                           {"name": "Step-Ups",               "sets": "3×12 reps each"},
                                           {"name": "Bicycle Crunch",         "sets": "3×15 reps"}]},
        {"day": "Saturday",  "exercises": [{"name": "Full Body Circuit",      "sets": "3 rounds — 40s on / 20s off"},
                                           {"name": "Jumping Jacks",          "sets": "40 sec"},
                                           {"name": "Push-Ups",               "sets": "40 sec"},
                                           {"name": "Squat",                  "sets": "40 sec"},
                                           {"name": "Mountain Climbers",      "sets": "40 sec"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    plan_key(1, 1): [   # lose_fat · intermediate
        {"day": "Monday",    "exercises": [{"name": "HIIT Sprint Intervals",  "sets": "10×30 sec on / 30 sec off"},
                                           {"name": "Jump Squats",            "sets": "4×15 reps"},
                                           {"name": "Burpees",                "sets": "4×12 reps"},
                                           {"name": "Plank",                  "sets": "3×45 sec"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Dumbbell Circuit",       "sets": "4 rounds"},
                                           {"name": "Goblet Squat",           "sets": "12 reps"},
                                           {"name": "DB Row",                 "sets": "12 reps"},
                                           {"name": "DB Shoulder Press",      "sets": "12 reps"},
                                           {"name": "Reverse Lunge",          "sets": "12 reps each"}]},
        {"day": "Wednesday", "exercises": [{"name": "Steady-State Cardio",    "sets": "35 min jog or bike"}]},
        {"day": "Thursday",  "exercises": [{"name": "Upper Body Superset",    "sets": "4 rounds"},
                                           {"name": "Pull-Ups",               "sets": "8 reps"},
                                           {"name": "Push-Ups",               "sets": "15 reps"},
                                           {"name": "Lateral Raises",         "sets": "15 reps"},
                                           {"name": "Tricep Pushdown",        "sets": "15 reps"}]},
        {"day": "Friday",    "exercises": [{"name": "Lower Body HIIT",        "sets": "4 rounds"},
                                           {"name": "Leg Press",              "sets": "15 reps"},
                                           {"name": "Box Jumps",              "sets": "10 reps"},
                                           {"name": "Leg Curl",               "sets": "12 reps"},
                                           {"name": "Sprint Finisher",        "sets": "6×20 sec"}]},
        {"day": "Saturday",  "exercises": [{"name": "Active Cardio",          "sets": "45 min walk / swim / bike"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    plan_key(1, 2): [   # lose_fat · advanced
        {"day": "Monday",    "exercises": [{"name": "Barbell Complex",        "sets": "5 rounds — no rest between exercises"},
                                           {"name": "Barbell Row",            "sets": "6 reps"},
                                           {"name": "Hang Clean",             "sets": "6 reps"},
                                           {"name": "Front Squat",            "sets": "6 reps"},
                                           {"name": "Push Press",             "sets": "6 reps"},
                                           {"name": "Good Morning",           "sets": "6 reps"}]},
        {"day": "Tuesday",   "exercises": [{"name": "HIIT Treadmill",         "sets": "20 min — 1 min sprint / 1 min walk"},
                                           {"name": "Weighted Plank",         "sets": "4×45 sec"},
                                           {"name": "Cable Woodchop",         "sets": "4×12 reps each"}]},
        {"day": "Wednesday", "exercises": [{"name": "Kettlebell Swing",       "sets": "5×20 reps"},
                                           {"name": "KB Goblet Squat",        "sets": "4×12 reps"},
                                           {"name": "KB Single-Arm Press",    "sets": "4×10 reps each"},
                                           {"name": "TRX Row",                "sets": "4×12 reps"}]},
        {"day": "Thursday",  "exercises": [{"name": "Tempo Run",              "sets": "30 min at 80% HR max"},
                                           {"name": "Hanging Leg Raise",      "sets": "4×15 reps"},
                                           {"name": "Ab Wheel Rollout",       "sets": "4×12 reps"},
                                           {"name": "V-Ups",                  "sets": "4×15 reps"}]},
        {"day": "Friday",    "exercises": [{"name": "Deadlift",               "sets": "4×6 reps"},
                                           {"name": "Box Jumps",              "sets": "4×10 reps"},
                                           {"name": "Sled Push",              "sets": "4×20 m"},
                                           {"name": "Battle Ropes",           "sets": "4×30 sec"}]},
        {"day": "Saturday",  "exercises": [{"name": "Long Run / Cycle",       "sets": "50–60 min moderate pace"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    # ── STAY FIT ──────────────────────────────────────────────────────────────

    plan_key(2, 0): [   # stay_fit · beginner
        {"day": "Monday",    "exercises": [{"name": "Brisk Walk",             "sets": "25 min"},
                                           {"name": "Push-Ups",               "sets": "3×10 reps"},
                                           {"name": "Bodyweight Squat",       "sets": "3×15 reps"},
                                           {"name": "Plank",                  "sets": "3×20 sec"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Rest / Gentle Stretch",  "sets": "15 min"}]},
        {"day": "Wednesday", "exercises": [{"name": "Dumbbell Row",           "sets": "3×10 reps"},
                                           {"name": "DB Shoulder Press",      "sets": "3×10 reps"},
                                           {"name": "Glute Bridge",           "sets": "3×15 reps"},
                                           {"name": "Bicycle Crunch",         "sets": "3×15 reps"}]},
        {"day": "Thursday",  "exercises": [{"name": "Light Jog / Walk",       "sets": "20 min"}]},
        {"day": "Friday",    "exercises": [{"name": "Full Body Circuit",      "sets": "2 rounds"},
                                           {"name": "Squat",                  "sets": "15 reps"},
                                           {"name": "Push-Up",                "sets": "10 reps"},
                                           {"name": "Reverse Lunge",          "sets": "10 reps each"},
                                           {"name": "Plank",                  "sets": "30 sec"}]},
        {"day": "Saturday",  "exercises": [{"name": "Active Recreation",      "sets": "30 min walk / swim / sport"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    plan_key(2, 1): [   # stay_fit · intermediate
        {"day": "Monday",    "exercises": [{"name": "Dumbbell Bench Press",   "sets": "3×12 reps"},
                                           {"name": "DB Row",                 "sets": "3×12 reps"},
                                           {"name": "Shoulder Press",         "sets": "3×12 reps"},
                                           {"name": "Plank",                  "sets": "3×45 sec"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Jog / Cycle",            "sets": "25 min moderate pace"}]},
        {"day": "Wednesday", "exercises": [{"name": "Goblet Squat",           "sets": "3×12 reps"},
                                           {"name": "Reverse Lunge",          "sets": "3×12 reps each"},
                                           {"name": "Glute Bridge",           "sets": "3×15 reps"},
                                           {"name": "Calf Raises",            "sets": "3×15 reps"}]},
        {"day": "Thursday",  "exercises": [{"name": "Rest / Yoga",            "sets": "20–30 min"}]},
        {"day": "Friday",    "exercises": [{"name": "Pull-Ups / Lat Pulldown","sets": "3×10 reps"},
                                           {"name": "Push-Ups",               "sets": "3×15 reps"},
                                           {"name": "Lateral Raises",         "sets": "3×12 reps"},
                                           {"name": "Bicycle Crunch",         "sets": "3×15 reps"}]},
        {"day": "Saturday",  "exercises": [{"name": "Active Recreation",      "sets": "45 min hike / swim / sport"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    plan_key(2, 2): [   # stay_fit · advanced
        {"day": "Monday",    "exercises": [{"name": "Barbell Bench Press",    "sets": "4×8 reps"},
                                           {"name": "Weighted Pull-Ups",      "sets": "4×8 reps"},
                                           {"name": "Overhead Press",         "sets": "4×8 reps"},
                                           {"name": "Ab Wheel Rollout",       "sets": "3×10 reps"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Tempo Run",              "sets": "30 min at 75% HR max"}]},
        {"day": "Wednesday", "exercises": [{"name": "Back Squat",             "sets": "4×8 reps"},
                                           {"name": "Romanian Deadlift",      "sets": "4×10 reps"},
                                           {"name": "Bulgarian Split Squat",  "sets": "3×10 reps each"},
                                           {"name": "Hanging Leg Raise",      "sets": "3×15 reps"}]},
        {"day": "Thursday",  "exercises": [{"name": "Mobility + Foam Roll",   "sets": "30 min"}]},
        {"day": "Friday",    "exercises": [{"name": "Full Body Circuit",      "sets": "4 rounds"},
                                           {"name": "Kettlebell Swing",       "sets": "15 reps"},
                                           {"name": "Push-Ups",               "sets": "15 reps"},
                                           {"name": "TRX Row",                "sets": "12 reps"},
                                           {"name": "Jump Squat",             "sets": "10 reps"}]},
        {"day": "Saturday",  "exercises": [{"name": "Long Run / Cycle",       "sets": "45–60 min easy pace"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    # ── ENDURANCE ─────────────────────────────────────────────────────────────

    plan_key(3, 0): [   # endurance · beginner
        {"day": "Monday",    "exercises": [{"name": "Brisk Walk",             "sets": "30 min"},
                                           {"name": "Bodyweight Squat",       "sets": "3×15 reps"},
                                           {"name": "Push-Ups",               "sets": "3×10 reps"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Easy Jog / Walk-Jog",    "sets": "20 min (run 1 min, walk 2 min)"}]},
        {"day": "Wednesday", "exercises": [{"name": "Rest / Stretch",         "sets": "15 min"}]},
        {"day": "Thursday",  "exercises": [{"name": "Cycling / Elliptical",   "sets": "25 min low intensity"},
                                           {"name": "Glute Bridge",           "sets": "3×15 reps"},
                                           {"name": "Plank",                  "sets": "3×25 sec"}]},
        {"day": "Friday",    "exercises": [{"name": "Walk-Jog Intervals",     "sets": "25 min"},
                                           {"name": "Calf Raises",            "sets": "3×20 reps"}]},
        {"day": "Saturday",  "exercises": [{"name": "Long Walk / Easy Jog",   "sets": "35–40 min easy pace"}]},
        {"day": "Sunday",    "exercises": [{"name": "Rest",                   "sets": "Full rest"}]},
    ],

    plan_key(3, 1): [   # endurance · intermediate
        {"day": "Monday",    "exercises": [{"name": "Tempo Run",              "sets": "25 min at 75–80% HR max"},
                                           {"name": "Leg Press",              "sets": "3×12 reps"},
                                           {"name": "Calf Raises",            "sets": "3×20 reps"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Romanian Deadlift",      "sets": "3×10 reps"},
                                           {"name": "Bulgarian Split Squat",  "sets": "3×10 reps each"},
                                           {"name": "Hip Flexor Stretch",     "sets": "3×60 sec each"}]},
        {"day": "Wednesday", "exercises": [{"name": "Easy Aerobic Run",       "sets": "35 min at 65% HR max"}]},
        {"day": "Thursday",  "exercises": [{"name": "Interval Training",      "sets": "6×400m at race pace — 90s rest"}]},
        {"day": "Friday",    "exercises": [{"name": "Cross Training",         "sets": "30 min swim or row"},
                                           {"name": "Plank",                  "sets": "3×45 sec"},
                                           {"name": "Dead Bug",               "sets": "3×10 reps each"}]},
        {"day": "Saturday",  "exercises": [{"name": "Long Run",               "sets": "50–60 min conversational pace"}]},
        {"day": "Sunday",    "exercises": [{"name": "Recovery Walk + Stretch","sets": "20 min"}]},
    ],

    plan_key(3, 2): [   # endurance · advanced
        {"day": "Monday",    "exercises": [{"name": "Track Workout",          "sets": "8×800m at 5K pace — 2 min rest"},
                                           {"name": "Ab Wheel Rollout",       "sets": "4×12 reps"},
                                           {"name": "Hanging Leg Raise",      "sets": "4×15 reps"}]},
        {"day": "Tuesday",   "exercises": [{"name": "Deadlift",               "sets": "4×6 reps"},
                                           {"name": "Overhead Press",         "sets": "4×8 reps"},
                                           {"name": "Nordic Hamstring Curl",  "sets": "3×8 reps"},
                                           {"name": "Single-Leg Calf Raise",  "sets": "3×15 reps each"}]},
        {"day": "Wednesday", "exercises": [{"name": "Medium Long Run",        "sets": "60 min at 70% HR max"}]},
        {"day": "Thursday",  "exercises": [{"name": "Hill Repeats",           "sets": "8×90 sec uphill sprint — walk down"},
                                           {"name": "Plyometric Lunges",      "sets": "4×10 reps each"}]},
        {"day": "Friday",    "exercises": [{"name": "Recovery Swim / Cycle",  "sets": "40 min easy"},
                                           {"name": "Thoracic Mobility",      "sets": "10 min routine"}]},
        {"day": "Saturday",  "exercises": [{"name": "Long Run",               "sets": "75–90 min conversational pace"}]},
        {"day": "Sunday",    "exercises": [{"name": "Full Rest / Yoga",       "sets": "30 min"}]},
    ],
}

# ─────────────────────────────────────────────
#  Training data  [age, bmi, goal_enc, level_enc]
# ─────────────────────────────────────────────

rows = []
for goal_enc in range(4):
    for level_enc in range(3):
        label = plan_key(goal_enc, level_enc)
        for age in [18, 25, 32, 42, 55]:
            for bmi in [18.5, 22.0, 26.0, 31.0]:
                rows.append(([age, bmi, goal_enc, level_enc], label))

X_train = [r[0] for r in rows]
y_train = [r[1] for r in rows]

clf = DecisionTreeClassifier(max_depth=6, random_state=42)
clf.fit(X_train, y_train)

# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def compute_bmi(weight_kg, height_cm):
    h = height_cm / 100.0
    return round(weight_kg / h ** 2, 1)

# ─────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────

def main():
    try:
        raw  = sys.stdin.read().strip()
        user = json.loads(raw)

        age       = float(user["age"])
        weight    = float(user["weight"])
        height    = float(user["height"])
        goal_str  = user["goal"].strip().lower().replace(" ", "_")
        level_str = user["level"].strip().lower()

        if goal_str not in GOAL_MAP:
            raise ValueError(f"Invalid goal '{goal_str}'. Choose from: {list(GOAL_MAP.keys())}")
        if level_str not in LEVEL_MAP:
            raise ValueError(f"Invalid level '{level_str}'. Choose from: {list(LEVEL_MAP.keys())}")

        bmi       = compute_bmi(weight, height)
        goal_enc  = GOAL_MAP[goal_str]
        level_enc = LEVEL_MAP[level_str]

        label        = int(clf.predict([[age, bmi, goal_enc, level_enc]])[0])
        workout_data = PLANS[label]

        bmi_cat = ("Underweight" if bmi < 18.5 else
                   "Normal"      if bmi < 25   else
                   "Overweight"  if bmi < 30   else "Obese")

        output = {
            "success": True,
            "user_stats": {
                "age":          age,
                "weight":       weight,
                "height":       height,
                "bmi":          bmi,
                "bmi_category": bmi_cat,
                "goal":         goal_str,
                "level":        level_str,
            },
            "workoutData": workout_data,
        }

        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
