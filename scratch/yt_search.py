import urllib.request
import urllib.parse
import re
import sys
import time
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def get_yt_id(query):
    try:
        url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(query + " exercise form tutorial short")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
        video_ids = re.findall(r"watch\?v=(\S{11})", html)
        if video_ids:
            return video_ids[0]
    except Exception as e:
        print(f"Error for {query}: {e}", file=sys.stderr)
    return None

exercises = [
  "Barbell Bench Press", "Incline Dumbbell Press", "Decline Bench Press", "Cable Crossovers",
  "Dumbbell Flys", "Pec Deck Machine", "Push-ups", "Weighted Dips", "Guillotine Press",
  "Svend Press", "Floor Press", "Dumbbell Pullover", "Landmine Chest Press", "Hex Press",
  "Spoto Press", "Suspension Push-ups", "Band Resisted Push-ups", "Around The Worlds",
  "Low Cable Crossovers", "Machine Chest Press",
  "Barbell Deadlift", "Pull-up", "Barbell Row", "Lat Pulldown", "Seated Cable Row",
  "T-Bar Row", "Meadows Row", "Rack Pulls", "Dumbbell Row", "Straight Arm Pulldown",
  "Chin-ups", "Good Mornings", "Renegade Row", "Inverted Row", "Pendlay Row",
  "Yates Row", "Kroc Row", "Seal Row", "V-Bar Pulldown", "Wide Grip Pull-up",
  "Neutral Grip Pull-up", "Superman Extensions",
  "Standing Overhead Press", "Seated Dumbbell Press", "Dumbbell Lateral Raises",
  "Cable Lateral Raises", "Face Pulls", "Reverse Pec Deck", "Front Raises",
  "Barbell Shrugs", "Dumbbell Shrugs", "Upright Row", "Lu Raises", "Arnold Press",
  "Z Press", "Bradford Press", "Landmine Shoulder Press", "Upright Cable Row",
  "Front Cable Raise", "Band Pull-Aparts", "Y-Raises", "Machine Shoulder Press",
  "Barbell Bicep Curls", "Hammer Curls", "Preacher Curls", "Concentration Curls",
  "Spider Curls", "Tricep Pushdowns", "Overhead Tricep Extension", "Skull Crushers",
  "Close-Grip Bench Press", "JM Press", "Wrist Curls", "Reverse Curls",
  "Incline Dumbbell Curls", "Zottman Curls", "Waiter Curls", "Cable Rope Curls",
  "Drag Curls", "Bicep 21s", "Tate Press", "Tricep Kickbacks", "French Press",
  "Rolling Tricep Extensions", "Diamond Push-ups", "Bench Dips",
  "Barbell Back Squat", "Front Squat", "Hack Squat", "Bulgarian Split Squat",
  "Leg Press", "Sissy Squat", "Leg Extension", "Romanian Deadlift (RDL)",
  "Stiff-Leg Deadlift", "Hip Thrust", "Glute Kickbacks", "Hamstring Curl (Seated)",
  "Hamstring Curl (Lying)", "Walking Lunges", "Calf Raises (Standing)",
  "Calf Raises (Seated)", "Adductor Machine", "Abductor Machine", "Goblet Squat",
  "Zercher Squat", "Jefferson Squat", "Dumbbell Step-Ups", "Split Squat Jumps",
  "Pistol Squats", "Nordic Hamstring Curls", "Glute Ham Raise", "Reverse Lunges",
  "Curtsy Lunges", "Donkey Calf Raises", "Single Leg Calf Raises",
  "Seated Tibialis Raises", "Jump Rope",
  "Plank", "Russian Twists", "Mountain Climbers", "Hanging Leg Raises",
  "Dragon Flags", "Ab Wheel Rollout", "V-Ups", "Bicycle Crunches",
  "Kettlebell Swings", "Burpees", "L-Sit", "Hollow Body Hold",
  "Suitcase Carries", "Farmers Walk", "Pallof Press", "Cable Woodchoppers",
  "Dead Bug", "Bird Dog", "Side Plank", "Reverse Crunches",
  "Flutter Kicks", "Cat Cow", "Thread the Needle", "90/90 Stretch",
  "Couch Stretch", "Worlds Greatest Stretch", "Jumping Jacks", "Jump Squats"
]

mapping = {}
for i, ex in enumerate(exercises):
    vid = get_yt_id(ex)
    if vid:
        mapping[ex] = vid
    time.sleep(0.1)
    if i % 10 == 0:
        print(f"Done {i}/{len(exercises)}", file=sys.stderr)

with open('scratch/yt_mapping.json', 'w') as f:
    json.dump(mapping, f, indent=2)

print("Done generating mapping.")
