# Set a Day

One hard set for each of 10 body parts, every day, in about 20 minutes. It's a static
web app that you add to your iPhone home screen. No build step, no server, no account.

## Install on iPhone
1. Host the folder over HTTPS. GitHub Pages works: repo **Settings → Pages → Deploy from a branch**, then pick the branch and `/ (root)`.
2. Open the Pages URL in **Safari**, then tap **Share → Add to Home Screen**.
3. Open it from the home screen icon. It runs full-screen and works offline.

## How it works
- **Daily plan** (`js/planner.js`): picks one exercise per body part, using only the
  equipment you have turned on, and avoids repeating yesterday's pick. The plan is
  seeded by the date, so reloading gives the same workout.
- **Spacing rule**: each exercise is tagged with every body part it meaningfully loads
  (`js/exercises.js`). Two exercises that share a tag never run back to back. Out of
  the orders that pass, the planner keeps the one with the fewest equipment-station
  changes, because walking between stations is where the minutes go.
- **Form animation** (`js/figure.js`): a stick figure moves between two keyframes,
  driven by forward kinematics or two-bone IK. Tap the figure to pause it.
- **Tracking** (`js/store.js`): weight × reps × reps-in-reserve for each set, plus the
  workout's start and finish times. Data lives in `localStorage` on the phone. Use
  Settings → Export backup.
- **Short day** (`planner.js` → `SHORT_SLOTS`): 5 compound lifts (squat, hinge, press,
  row, overhead press), each counted toward two body parts, about 12 minutes. Forearms
  get no direct work on short days.
- **Easy week**: if fewer than 1 in 4 sets in the last 14 days beat that lift's previous
  best, the app offers a 7-day easy week: about 85% weight, stopping 3–4 reps short.
  Easy-week sets are left out of the strength index and the progression suggestions.
- **Body measurements**: weekly body weight, arm, chest, thigh and waist, entered in
  Progress or from the end-of-workout card.
- **Weekly card**: the last 7 days vs. the 7 before.
- **Progress**: workout duration against a 25-min goal; a strength index (current
  estimated 1RM ÷ first estimated 1RM, averaged over every exercise you've done);
  per-exercise trends; history.

## Development
Serve the folder with `python3 -m http.server`, then open `/`. `dev/sheet.html` shows
the start, middle and end frame of every exercise animation, so you can check poses.
After changing any file, bump `VERSION` in `sw.js` so installed copies update.
