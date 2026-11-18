// Exercise library.
//
// part     — the body part this exercise is scheduled for
// tags     — every body part meaningfully loaded (primary + secondary + grip).
//            Two exercises that share any tag are never placed back to back.
// eq       — equipment required (see EQUIPMENT); exercise is only eligible
//            when every item is enabled in Settings.
// station  — where in the gym it happens; the planner orders the workout to
//            minimise station changes (that is where the minutes go).
// reps     — target rep range; perSide = reps are per arm/leg.
// anim     — stick-figure keyframes (see figure.js). A = start, B = end.

export const PARTS = [
  { id: 'quads', name: 'Quads' },
  { id: 'hamstrings', name: 'Hamstrings' },
  { id: 'glutes', name: 'Glutes' },
  { id: 'chest', name: 'Chest' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'back', name: 'Back' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'triceps', name: 'Triceps' },
  { id: 'forearm_front', name: 'Front forearm' },
  { id: 'forearm_back', name: 'Back forearm' },
];

export const PART_NAME = Object.fromEntries(PARTS.map(p => [p.id, p.name]));

export const EQUIPMENT = [
  { id: 'barbell', name: 'Barbell & plates', note: 'Floor/hang barbell lifts', default: true },
  { id: 'rack', name: 'Power rack', note: 'Squats, presses, bench in the rack', default: true },
  { id: 'bench', name: 'Flat bench', default: true },
  { id: 'incline', name: 'Bench adjusts to incline', note: 'Off unless your bench inclines', default: false },
  { id: 'db', name: 'Dumbbells', default: true },
  { id: 'cable', name: 'Cable machine', note: 'Adjustable pulley + handle, bar & rope', default: true },
  { id: 'box', name: '12-18-24 box', default: true },
  { id: 'legmachine', name: 'Leg curl / extension machine', default: true },
  { id: 'pullup', name: 'Pull-up bar', note: 'Off unless your rack has one', default: false },
];

// ---------- pose helpers ----------
const G = 148; // ankle height when standing on the ground
const stand = (x = 100, extra = {}) => ({ hip: [x, 74], t: 180, legs: [{ ik: [x + 2, G], bend: 'fwd' }], ...extra });
const hang = { fk: [2, 2] };
const benchFlat = { type: 'bench', x1: 36, x2: 136, y: 106 };
const rack = { type: 'rack', x1: 112, x2: 140 };
const seatProps = [
  { type: 'bench', x1: 54, x2: 112, y: 104 },
  { type: 'pad', pts: [[66, 102], [58, 52]] },
];
// lying on a flat bench, head to the right
const supine = (arm) => ({ hip: [72, 100], t: 90, legs: [{ ik: [44, G], bend: 'up' }], arms: [arm] });
// seated on bench, forearms resting on thighs (wrist work)
const wristSeat = (ha) => ({ hip: [80, 100], t: 135, legs: [{ ik: [122, G], bend: 'fwd' }], arms: [{ fk: [-26, 90, ha] }] });
const wristBench = { type: 'bench', x1: 40, x2: 100, y: 104 };

// front view helpers
const fArm = (ua, fa, us = 1, fs = 1) => ({ ua, fa, us, fs });

export const EXERCISES = [
  // ================= QUADS =================
  {
    id: 'back_squat', name: 'Barbell Back Squat', part: 'quads', tags: ['quads', 'glutes'], eq: ['rack', 'barbell'],
    station: 'barbell', reps: [6, 10], compound: true,
    cues: ['Set the safety pins just below your bottom position.', 'Bar on upper back, brace your core hard, then sit down between your hips.', 'Knees track over toes; drive up through mid-foot.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [{ ik: [-4, 4], rel: 'shoulder', bend: 'down' }] }),
      B: { hip: [80, 112], t: 140, legs: [{ ik: [104, G], bend: 'fwd' }], arms: [{ ik: [-4, 6], rel: 'shoulder', bend: 'down' }] },
      props: [rack, { type: 'plate', at: 'shoulder', back: 5, r: 10 }],
    },
  },
  {
    id: 'front_squat', name: 'Barbell Front Squat', part: 'quads', tags: ['quads', 'glutes'], eq: ['rack', 'barbell'],
    station: 'barbell', reps: [6, 10], compound: true,
    cues: ['Bar rests on the front of your shoulders, elbows high.', 'Stay upright; sit straight down.', 'Keep elbows up as you drive out of the bottom.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [{ fk: [95, 250] }] }),
      B: { hip: [84, 112], t: 160, legs: [{ ik: [104, G], bend: 'fwd' }], arms: [{ fk: [75, 230] }] },
      props: [rack, { type: 'plate', at: 'hand', dx: 3, r: 10 }],
    },
  },
  {
    id: 'leg_extension', name: 'Leg Extension', part: 'quads', tags: ['quads'], eq: ['legmachine'],
    station: 'legmachine', reps: [10, 15],
    cues: ['Knee lined up with the machine pivot.', 'Kick up to full lockout and squeeze for a beat.', 'Lower under control — don\'t let the stack slam.'],
    anim: {
      view: 'side',
      A: { hip: [80, 100], t: 185, legs: [{ fk: [90, 0] }], arms: [{ fk: [5, 60] }] },
      B: { hip: [80, 100], t: 185, legs: [{ fk: [90, 85] }], arms: [{ fk: [5, 60] }] },
      props: [...seatProps, { type: 'roll', at: 'ankle', side: 'front' }],
    },
  },
  {
    id: 'bulgarian', name: 'DB Bulgarian Split Squat', part: 'quads', tags: ['quads', 'glutes'], eq: ['db', 'bench'],
    station: 'db', reps: [8, 12], perSide: true,
    cues: ['Rear foot laces-down on the bench.', 'Drop straight down until the back knee nearly touches.', 'Front knee travels forward over toes for quads.'],
    anim: {
      view: 'side',
      A: { hip: [113, 73], t: 178, legs: [{ ik: [122, G], bend: 'fwd' }, { ik: [63, 109], bend: 'down' }], arms: [hang] },
      B: { hip: [96, 106], t: 168, legs: [{ ik: [122, G], bend: 'fwd' }, { ik: [63, 109], bend: 'down' }], arms: [hang] },
      props: [{ type: 'bench', x1: 26, x2: 72, y: 113 }, { type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'step_up', name: 'DB Step-Up (12–18" box)', part: 'quads', tags: ['quads', 'glutes'], eq: ['db', 'box'],
    station: 'box', reps: [8, 12], perSide: true,
    cues: ['Whole foot on the box.', 'Push through the top leg — minimal push from the floor leg.', 'Step down slowly.'],
    anim: {
      view: 'side',
      A: { hip: [100, 82], t: 172, legs: [{ ik: [130, 118], bend: 'fwd' }, { ik: [88, G], bend: 'fwd' }], arms: [hang] },
      B: { hip: [124, 46], t: 180, legs: [{ ik: [130, 118], bend: 'fwd' }, { ik: [114, 108], bend: 'fwd' }], arms: [hang] },
      props: [{ type: 'box', x1: 112, x2: 156, y: 121 }, { type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'goblet_squat', name: 'DB Goblet Squat', part: 'quads', tags: ['quads', 'glutes'], eq: ['db'],
    station: 'db', reps: [8, 15],
    cues: ['Hold one dumbbell vertically against your chest.', 'Sit down between your heels, chest tall.', 'Elbows brush the inside of the knees at the bottom.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [{ fk: [20, 170] }] }),
      B: { hip: [82, 112], t: 150, legs: [{ ik: [104, G], bend: 'fwd' }], arms: [{ fk: [-10, 140] }] },
      props: [{ type: 'db', at: 'hand', big: true }],
    },
  },

  // ================= HAMSTRINGS =================
  {
    id: 'leg_curl', name: 'Leg Curl (machine)', part: 'hamstrings', tags: ['hamstrings'], eq: ['legmachine'],
    station: 'legmachine', reps: [10, 15],
    cues: ['Shown seated — lying works the same way.', 'Curl the pad all the way, squeeze the hamstrings.', 'Slow 2–3 s return to full stretch.'],
    anim: {
      view: 'side',
      A: { hip: [80, 100], t: 185, legs: [{ fk: [90, 82] }], arms: [{ fk: [5, 60] }] },
      B: { hip: [80, 100], t: 185, legs: [{ fk: [90, -15] }], arms: [{ fk: [5, 60] }] },
      props: [...seatProps, { type: 'roll', at: 'ankle', side: 'back' }],
    },
  },
  {
    id: 'bb_rdl', name: 'Barbell Romanian Deadlift', part: 'hamstrings', tags: ['hamstrings', 'glutes', 'forearm_front'], eq: ['barbell', 'rack'],
    station: 'barbell', reps: [6, 10], compound: true,
    cues: ['Unrack at hip height. Soft knees, flat back.', 'Push hips back; bar slides down the thighs.', 'Stop when hamstrings are fully stretched, then drive hips forward.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [hang] }),
      B: { hip: [70, 82], t: 105, legs: [{ ik: [104, G], bend: 'fwd' }], arms: [hang] },
      props: [{ type: 'plate', at: 'hand', r: 10 }],
    },
  },
  {
    id: 'db_rdl', name: 'DB Romanian Deadlift', part: 'hamstrings', tags: ['hamstrings', 'glutes', 'forearm_front'], eq: ['db'],
    station: 'db', reps: [8, 12], compound: true,
    cues: ['Dumbbells in front of thighs, soft knees.', 'Hinge: hips back, back flat, weights close to legs.', 'Feel the hamstring stretch, then stand tall.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [hang] }),
      B: { hip: [70, 82], t: 105, legs: [{ ik: [104, G], bend: 'fwd' }], arms: [hang] },
      props: [{ type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'sl_rdl', name: 'Single-Leg DB RDL', part: 'hamstrings', tags: ['hamstrings', 'glutes'], eq: ['db'],
    station: 'db', reps: [8, 12], perSide: true,
    cues: ['Dumbbell in the hand opposite the working leg.', 'Hinge while the free leg swings straight back.', 'Hips stay square to the floor.'],
    anim: {
      view: 'side',
      A: { hip: [100, 73], t: 180, legs: [{ ik: [104, G], bend: 'fwd' }, { fk: [-4, -4] }], arms: [hang] },
      B: { hip: [86, 80], t: 98, legs: [{ ik: [104, G], bend: 'fwd' }, { fk: [-84, -84] }], arms: [hang] },
      props: [{ type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'good_morning', name: 'Barbell Good Morning', part: 'hamstrings', tags: ['hamstrings', 'glutes'], eq: ['rack', 'barbell'],
    station: 'barbell', reps: [8, 12], compound: true,
    cues: ['Bar on upper back like a squat; go light.', 'Soft knees, push hips back until torso nears parallel.', 'Back stays flat the whole time.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [{ ik: [-4, 4], rel: 'shoulder', bend: 'down' }] }),
      B: { hip: [74, 82], t: 100, legs: [{ ik: [104, G], bend: 'fwd' }], arms: [{ ik: [-2, -6], rel: 'shoulder', bend: 'down' }] },
      props: [rack, { type: 'plate', at: 'shoulder', back: 5, r: 10 }],
    },
  },

  // ================= GLUTES =================
  {
    id: 'hip_thrust', name: 'Barbell Hip Thrust', part: 'glutes', tags: ['glutes', 'hamstrings'], eq: ['barbell', 'bench'],
    station: 'barbell', reps: [8, 12], compound: true,
    cues: ['Upper back on the bench edge, bar over hips (pad it).', 'Chin tucked; drive through heels.', 'Lock out with shins vertical and squeeze for 1 s.'],
    anim: {
      view: 'side',
      A: { hip: [92, 134], t: 127, legs: [{ ik: [58, G], bend: 'up' }], arms: [{ ik: [0, -6], rel: 'hip', bend: 'up' }] },
      B: { hip: [86, 107], t: 90, legs: [{ ik: [58, G], bend: 'up' }], arms: [{ ik: [0, -6], rel: 'hip', bend: 'up' }] },
      props: [{ type: 'bench', x1: 122, x2: 176, y: 112 }, { type: 'plate', at: 'hip', dy: -10, r: 10 }],
    },
  },
  {
    id: 'pull_through', name: 'Cable Pull-Through', part: 'glutes', tags: ['glutes', 'hamstrings'], eq: ['cable'],
    station: 'cable', reps: [10, 15],
    cues: ['Low pulley, rope between your legs, face away.', 'Hinge back letting the rope pull hands through.', 'Snap hips forward and squeeze glutes at the top.'],
    anim: {
      view: 'side',
      A: { hip: [86, 82], t: 104, legs: [{ ik: [106, G], bend: 'fwd' }], arms: [{ ik: [100, 128], bend: 'fwd' }] },
      B: stand(102, { arms: [{ ik: [110, 92], bend: 'fwd' }] }),
      props: [{ type: 'cable', from: [30, 144], at: 'hand' }],
    },
  },
  {
    id: 'reverse_lunge', name: 'DB Reverse Lunge', part: 'glutes', tags: ['glutes', 'quads'], eq: ['db'],
    station: 'db', reps: [8, 12], perSide: true,
    cues: ['Step back long; slight forward lean.', 'Back knee drops toward the floor.', 'Drive through the front heel to stand.'],
    anim: {
      view: 'side',
      A: { hip: [114, 73], t: 178, legs: [{ ik: [118, G], bend: 'fwd' }, { ik: [112, G], bend: 'fwd' }], arms: [hang] },
      B: { hip: [100, 108], t: 168, legs: [{ ik: [118, G], bend: 'fwd' }, { ik: [54, G], bend: 'down' }], arms: [hang] },
      props: [{ type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'sl_hip_thrust', name: 'Single-Leg Hip Thrust', part: 'glutes', tags: ['glutes', 'hamstrings'], eq: ['bench'],
    station: 'db', reps: [10, 15], perSide: true,
    cues: ['Upper back on the bench, one foot planted.', 'Other knee pulled up toward your chest.', 'Hold a dumbbell on the hip once bodyweight gets easy.'],
    anim: {
      view: 'side',
      A: { hip: [92, 134], t: 127, legs: [{ ik: [58, G], bend: 'up' }, { fk: [150, 250] }], arms: [{ ik: [178, 111], bend: 'up' }] },
      B: { hip: [86, 107], t: 90, legs: [{ ik: [58, G], bend: 'up' }, { fk: [150, 250] }], arms: [{ ik: [178, 111], bend: 'up' }] },
      props: [{ type: 'bench', x1: 122, x2: 176, y: 112 }],
    },
  },
  {
    id: 'high_step_up', name: 'High Step-Up (18" box)', part: 'glutes', tags: ['glutes', 'quads'], eq: ['box'],
    station: 'box', reps: [8, 12], perSide: true,
    cues: ['Higher box = more glute. Lean slightly forward.', 'Drive through the heel of the top foot.', 'Hold dumbbells once bodyweight is easy.'],
    anim: {
      view: 'side',
      A: { hip: [100, 84], t: 160, legs: [{ ik: [130, 106], bend: 'fwd' }, { ik: [86, G], bend: 'fwd' }], arms: [hang] },
      B: { hip: [126, 34], t: 178, legs: [{ ik: [130, 106], bend: 'fwd' }, { ik: [112, 96], bend: 'fwd' }], arms: [hang] },
      props: [{ type: 'box', x1: 112, x2: 158, y: 109 }],
    },
  },

  // ================= CHEST =================
  {
    id: 'bench_press', name: 'Barbell Bench Press', part: 'chest', tags: ['chest', 'shoulders', 'triceps'], eq: ['rack', 'bench', 'barbell'],
    station: 'barbell', reps: [6, 10], compound: true,
    cues: ['Bench in the rack, safeties set at chest height — you\'re training alone.', 'Shoulder blades pinched, feet planted.', 'Touch mid-chest, press up and slightly back.'],
    anim: {
      view: 'side',
      A: supine({ ik: [0, -50], rel: 'shoulder', bend: 'back' }),
      B: supine({ ik: [-8, -18], rel: 'shoulder', bend: 'back' }),
      props: [benchFlat, rack, { type: 'plate', at: 'hand', r: 10 }],
    },
  },
  {
    id: 'db_bench', name: 'DB Bench Press', part: 'chest', tags: ['chest', 'shoulders', 'triceps'], eq: ['db', 'bench'],
    station: 'db', reps: [8, 12], compound: true,
    cues: ['Kick the dumbbells up off your knees as you lie back.', 'Lower to chest level, elbows ~45° from torso.', 'Press up, bringing the bells together.'],
    anim: {
      view: 'side',
      A: supine({ ik: [0, -50], rel: 'shoulder', bend: 'back' }),
      B: supine({ ik: [-6, -14], rel: 'shoulder', bend: 'back' }),
      props: [benchFlat, { type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'incline_db', name: 'Incline DB Press', part: 'chest', tags: ['chest', 'shoulders', 'triceps'], eq: ['db', 'incline'],
    station: 'db', reps: [8, 12], compound: true,
    cues: ['Bench at ~30°.', 'Lower to upper chest, elbows slightly tucked.', 'Press straight up over your shoulders.'],
    anim: {
      view: 'side',
      A: { hip: [70, 104], t: 128, legs: [{ ik: [40, G], bend: 'up' }], arms: [{ ik: [-6, -50], rel: 'shoulder', bend: 'back' }] },
      B: { hip: [70, 104], t: 128, legs: [{ ik: [40, G], bend: 'up' }], arms: [{ ik: [-16, -10], rel: 'shoulder', bend: 'back' }] },
      props: [{ type: 'bench', x1: 50, x2: 84, y: 108 }, { type: 'pad', pts: [[78, 110], [116, 76]] }, { type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'cable_fly', name: 'Single-Arm Cable Fly', part: 'chest', tags: ['chest', 'shoulders'], eq: ['cable'],
    station: 'cable', reps: [10, 15], perSide: true,
    cues: ['Pulley at shoulder height, stand side-on.', 'Slight bend in the elbow, locked in place.', 'Sweep the hand across to your midline; squeeze the chest.'],
    anim: {
      view: 'front',
      A: { cx: 112, L: fArm(85, 82), R: fArm(12, 18) },
      B: { cx: 112, L: fArm(-38, -48, 0.55, 0.55), R: fArm(12, 18) },
      props: [{ type: 'cable', from: [24, 40], at: 'handL' }],
    },
  },
  {
    id: 'low_high_fly', name: 'Low-to-High Cable Fly', part: 'chest', tags: ['chest', 'shoulders'], eq: ['cable'],
    station: 'cable', reps: [10, 15], perSide: true,
    cues: ['Pulley at the bottom, stand side-on.', 'Arc the hand up and across to chin height.', 'Upper-chest focus; keep the elbow angle fixed.'],
    anim: {
      view: 'front',
      A: { cx: 112, L: fArm(38, 34), R: fArm(12, 18) },
      B: { cx: 112, L: fArm(196, 206, 0.5, 0.5), R: fArm(12, 18) },
      props: [{ type: 'cable', from: [24, 144], at: 'handL' }],
    },
  },

  // ================= SHOULDERS =================
  {
    id: 'ohp', name: 'Barbell Overhead Press', part: 'shoulders', tags: ['shoulders', 'triceps'], eq: ['rack', 'barbell'],
    station: 'barbell', reps: [6, 10], compound: true,
    cues: ['Unrack at collarbone height, glutes and abs tight.', 'Press straight up; move your head back, then through.', 'Finish with the bar over mid-foot, biceps by ears.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [{ ik: [12, -2], rel: 'shoulder', bend: 'down' }] }),
      B: stand(100, { arms: [{ ik: [-2, -52], rel: 'shoulder', bend: 'fwd' }] }),
      props: [rack, { type: 'plate', at: 'hand', r: 10 }],
    },
  },
  {
    id: 'db_ohp', name: 'Standing DB Shoulder Press', part: 'shoulders', tags: ['shoulders', 'triceps'], eq: ['db'],
    station: 'db', reps: [8, 12], compound: true,
    cues: ['Dumbbells at shoulder height, palms forward.', 'Ribs down — don\'t lean back.', 'Press up until arms are straight.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [{ ik: [8, -6], rel: 'shoulder', bend: 'down' }] }),
      B: stand(100, { arms: [{ ik: [0, -52], rel: 'shoulder', bend: 'fwd' }] }),
      props: [{ type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'lateral_raise', name: 'DB Lateral Raise', part: 'shoulders', tags: ['shoulders'], eq: ['db'],
    station: 'db', reps: [12, 20],
    cues: ['Slight lean forward, soft elbows.', 'Raise out to the sides, leading with the elbows.', 'Stop at shoulder height; lower slowly.'],
    anim: {
      view: 'front',
      A: { cx: 100, L: fArm(10, 12), R: fArm(10, 12) },
      B: { cx: 100, L: fArm(86, 90), R: fArm(86, 90) },
      props: [{ type: 'db', at: 'handL' }, { type: 'db', at: 'handR' }],
    },
  },
  {
    id: 'cable_lateral', name: 'Cable Lateral Raise', part: 'shoulders', tags: ['shoulders'], eq: ['cable'],
    station: 'cable', reps: [12, 20], perSide: true,
    cues: ['Low pulley, cable crossing in front of your body.', 'Raise the hand out to shoulder height.', 'Constant tension — no rest at the bottom.'],
    anim: {
      view: 'front',
      A: { cx: 104, L: fArm(55, 70), R: fArm(-14, -14) },
      B: { cx: 104, L: fArm(55, 70), R: fArm(86, 90) },
      props: [{ type: 'cable', from: [30, 144], at: 'handR' }],
    },
  },
  {
    id: 'face_pull', name: 'Cable Face Pull', part: 'shoulders', tags: ['shoulders', 'back'], eq: ['cable'],
    station: 'cable', reps: [12, 20],
    cues: ['Rope at forehead height.', 'Pull to your face, hands splitting past your ears.', 'Elbows high; finish like a double-biceps pose.'],
    anim: {
      view: 'side',
      A: stand(96, { t: 184, arms: [{ ik: [50, -10], rel: 'shoulder', bend: 'down' }] }),
      B: stand(96, { t: 184, arms: [{ ik: [8, -14], rel: 'shoulder', bend: 'back' }] }),
      props: [{ type: 'cable', from: [184, 16], at: 'hand' }],
    },
  },
  {
    id: 'rear_delt_fly', name: 'Single-Arm Cable Rear-Delt Fly', part: 'shoulders', tags: ['shoulders', 'back'], eq: ['cable'],
    station: 'cable', reps: [12, 20], perSide: true,
    cues: ['Pulley at shoulder height; grab the cable with the far hand.', 'Sweep the arm back and out, elbow soft.', 'Stop when the arm is in line with your shoulders.'],
    anim: {
      view: 'front',
      A: { cx: 100, L: fArm(-62, -70, 0.6, 0.6), R: fArm(10, 14) },
      B: { cx: 100, L: fArm(86, 90), R: fArm(10, 14) },
      props: [{ type: 'cable', from: [182, 40], at: 'handL' }],
    },
  },

  // ================= BACK =================
  {
    id: 'bb_row', name: 'Barbell Bent-Over Row', part: 'back', tags: ['back', 'biceps', 'forearm_front'], eq: ['barbell'],
    station: 'barbell', reps: [6, 10], compound: true,
    cues: ['Hinge to ~45°, flat back, soft knees.', 'Row the bar to your lower ribs.', 'Lower to straight arms without losing your hinge.'],
    anim: {
      view: 'side',
      A: { hip: [78, 80], t: 116, legs: [{ ik: [104, G], bend: 'fwd' }], arms: [{ ik: [0, 53], rel: 'shoulder', bend: 'back' }] },
      B: { hip: [78, 80], t: 116, legs: [{ ik: [104, G], bend: 'fwd' }], arms: [{ ik: [-16, 22], rel: 'shoulder', bend: 'up' }] },
      props: [{ type: 'plate', at: 'hand', r: 10 }],
    },
  },
  {
    id: 'db_row', name: 'One-Arm DB Row', part: 'back', tags: ['back', 'biceps', 'forearm_front'], eq: ['db', 'bench'],
    station: 'db', reps: [8, 12], perSide: true, compound: true,
    cues: ['Same-side knee and hand on the bench, back flat.', 'Pull the dumbbell toward your hip.', 'Full stretch at the bottom.'],
    anim: {
      view: 'side',
      A: { hip: [92, 74], t: 108, legs: [{ ik: [76, G], bend: 'fwd' }, { fk: [5, -90] }], arms: [{ ik: [0, 52], rel: 'shoulder', bend: 'back' }, { ik: [138, 112], bend: 'back' }] },
      B: { hip: [92, 74], t: 108, legs: [{ ik: [76, G], bend: 'fwd' }, { fk: [5, -90] }], arms: [{ ik: [-18, 18], rel: 'shoulder', bend: 'up' }, { ik: [138, 112], bend: 'back' }] },
      props: [{ type: 'bench', x1: 50, x2: 150, y: 114 }, { type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'cable_pulldown', name: 'Half-Kneeling Cable Pulldown', part: 'back', tags: ['back', 'biceps'], eq: ['cable'],
    station: 'cable', reps: [8, 12], perSide: true,
    cues: ['High pulley, kneel facing it (single handle or bar).', 'Pull the elbow down to your side.', 'Let the shoulder blade rise fully on the way up.'],
    anim: {
      view: 'side',
      A: { hip: [100, 110], t: 176, legs: [{ ik: [126, G], bend: 'fwd' }, { fk: [-4, -90] }], arms: [{ ik: [22, -48], rel: 'shoulder', bend: 'fwd' }] },
      B: { hip: [100, 110], t: 176, legs: [{ ik: [126, G], bend: 'fwd' }, { fk: [-4, -90] }], arms: [{ ik: [6, 10], rel: 'shoulder', bend: 'back' }] },
      props: [{ type: 'cable', from: [168, 4], at: 'hand' }],
    },
  },
  {
    id: 'cable_row', name: 'Single-Arm Cable Row', part: 'back', tags: ['back', 'biceps'], eq: ['cable'],
    station: 'cable', reps: [8, 12], perSide: true,
    cues: ['Pulley at chest height, staggered stance.', 'Reach forward to stretch, then row elbow back past your torso.', 'Don\'t twist — keep chest facing the machine.'],
    anim: {
      view: 'side',
      A: { hip: [100, 76], t: 166, legs: [{ ik: [120, G], bend: 'fwd' }, { ik: [80, G], bend: 'fwd' }], arms: [{ ik: [50, 12], rel: 'shoulder', bend: 'down' }] },
      B: { hip: [100, 76], t: 172, legs: [{ ik: [120, G], bend: 'fwd' }, { ik: [80, G], bend: 'fwd' }], arms: [{ ik: [-4, 34], rel: 'shoulder', bend: 'back' }] },
      props: [{ type: 'cable', from: [184, 80], at: 'hand' }],
    },
  },
  {
    id: 'straight_arm', name: 'Straight-Arm Cable Pulldown', part: 'back', tags: ['back'], eq: ['cable'],
    station: 'cable', reps: [10, 15],
    cues: ['High pulley, bar or rope, slight hinge.', 'Arms nearly straight; sweep hands down to thighs.', 'Feel the lats, not the triceps.'],
    anim: {
      view: 'side',
      A: stand(96, { t: 162, arms: [{ fk: [150, 150] }] }),
      B: stand(96, { t: 162, arms: [{ fk: [-8, -8] }] }),
      props: [{ type: 'cable', from: [182, 12], at: 'hand' }],
    },
  },
  {
    id: 'chest_supported_row', name: 'Chest-Supported DB Row', part: 'back', tags: ['back', 'biceps'], eq: ['db', 'incline'],
    station: 'db', reps: [8, 12], compound: true,
    cues: ['Lie face-down on a 30–45° incline.', 'Row both dumbbells to your hips.', 'Chest stays glued to the pad.'],
    anim: {
      view: 'side',
      A: { hip: [80, 104], t: 128, legs: [{ ik: [52, G], bend: 'fwd' }], arms: [{ ik: [0, 52], rel: 'shoulder', bend: 'back' }] },
      B: { hip: [80, 104], t: 128, legs: [{ ik: [52, G], bend: 'fwd' }], arms: [{ ik: [-16, 22], rel: 'shoulder', bend: 'up' }] },
      props: [{ type: 'pad', pts: [[86, 112], [122, 80]] }, { type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'pullup', name: 'Pull-Up', part: 'back', tags: ['back', 'biceps', 'forearm_front'], eq: ['pullup'],
    station: 'barbell', reps: [5, 12], compound: true,
    cues: ['Dead hang, hands just outside shoulders.', 'Pull your chest toward the bar.', 'Lower all the way. Log added weight (0 = bodyweight).'],
    anim: {
      view: 'side',
      A: { hip: [98, 104], t: 180, legs: [{ fk: [-6, -24] }], arms: [{ ik: [100, 6], bend: 'fwd' }] },
      B: { hip: [96, 72], t: 174, legs: [{ fk: [-6, -24] }], arms: [{ ik: [100, 6], bend: 'fwd' }] },
      props: [{ type: 'bar', at: [100, 6] }, { type: 'rack', x1: 84, x2: 116 }],
    },
  },

  // ================= BICEPS =================
  {
    id: 'bb_curl', name: 'Barbell Curl', part: 'biceps', tags: ['biceps', 'forearm_front'], eq: ['barbell'],
    station: 'barbell', reps: [8, 12],
    cues: ['Shoulder-width underhand grip.', 'Elbows pinned to your sides.', 'Curl up, squeeze, lower over 2 s.'],
    anim: { view: 'side', A: stand(100, { arms: [{ fk: [4, 8] }] }), B: stand(100, { arms: [{ fk: [10, 158] }] }), props: [{ type: 'plate', at: 'hand', r: 10 }] },
  },
  {
    id: 'db_curl', name: 'DB Curl', part: 'biceps', tags: ['biceps'], eq: ['db'],
    station: 'db', reps: [8, 12],
    cues: ['Palms forward, elbows still.', 'Curl both (or alternate) to shoulder height.', 'Fully straighten at the bottom.'],
    anim: { view: 'side', A: stand(100, { arms: [{ fk: [4, 8] }] }), B: stand(100, { arms: [{ fk: [10, 158] }] }), props: [{ type: 'db', at: 'hand' }] },
  },
  {
    id: 'hammer_curl', name: 'Hammer Curl', part: 'biceps', tags: ['biceps', 'forearm_back'], eq: ['db'],
    station: 'db', reps: [8, 12],
    cues: ['Palms facing each other (neutral grip).', 'Curl without swinging.', 'Hits brachialis and the outer forearm too.'],
    anim: { view: 'side', A: stand(100, { arms: [{ fk: [4, 8] }] }), B: stand(100, { arms: [{ fk: [10, 158] }] }), props: [{ type: 'db', at: 'hand' }] },
  },
  {
    id: 'cable_curl', name: 'Cable Curl', part: 'biceps', tags: ['biceps'], eq: ['cable'],
    station: 'cable', reps: [10, 15],
    cues: ['Low pulley, bar attachment, step back a little.', 'Elbows at your sides.', 'Squeeze at the top; slow return.'],
    anim: { view: 'side', A: stand(96, { arms: [{ fk: [6, 24] }] }), B: stand(96, { arms: [{ fk: [12, 152] }] }), props: [{ type: 'cable', from: [178, 144], at: 'hand' }] },
  },
  {
    id: 'incline_curl', name: 'Incline DB Curl', part: 'biceps', tags: ['biceps'], eq: ['db', 'incline'],
    station: 'db', reps: [8, 12],
    cues: ['Bench at ~45°, arms hanging straight down behind you.', 'Curl without letting elbows drift forward.', 'Big stretch at the bottom.'],
    anim: {
      view: 'side',
      A: { hip: [100, 104], t: 206, legs: [{ ik: [140, G], bend: 'up' }], arms: [{ fk: [-6, -6] }] },
      B: { hip: [100, 104], t: 206, legs: [{ ik: [140, G], bend: 'up' }], arms: [{ fk: [-6, 140] }] },
      props: [{ type: 'bench', x1: 84, x2: 120, y: 108 }, { type: 'pad', pts: [[96, 110], [74, 62]] }, { type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'bayesian_curl', name: 'Bayesian Cable Curl', part: 'biceps', tags: ['biceps'], eq: ['cable'],
    station: 'cable', reps: [10, 15], perSide: true,
    cues: ['Face away from a low/mid pulley, step forward.', 'Arm starts behind your body — big stretch.', 'Curl without letting the elbow travel forward.'],
    anim: {
      view: 'side',
      A: { hip: [108, 76], t: 176, legs: [{ ik: [126, G], bend: 'fwd' }, { ik: [88, G], bend: 'fwd' }], arms: [{ fk: [-30, -36] }] },
      B: { hip: [108, 76], t: 176, legs: [{ ik: [126, G], bend: 'fwd' }, { ik: [88, G], bend: 'fwd' }], arms: [{ fk: [-26, 150] }] },
      props: [{ type: 'cable', from: [22, 92], at: 'hand' }],
    },
  },

  // ================= TRICEPS =================
  {
    id: 'pushdown', name: 'Cable Pushdown', part: 'triceps', tags: ['triceps'], eq: ['cable'],
    station: 'cable', reps: [10, 15],
    cues: ['High pulley, rope or bar.', 'Elbows locked at your sides.', 'Push to full lockout, spreading the rope at the bottom.'],
    anim: { view: 'side', A: stand(96, { t: 172, arms: [{ fk: [2, 140] }] }), B: stand(96, { t: 172, arms: [{ fk: [2, 4] }] }), props: [{ type: 'cable', from: [172, 10], at: 'hand' }] },
  },
  {
    id: 'overhead_cable_ext', name: 'Overhead Cable Extension', part: 'triceps', tags: ['triceps'], eq: ['cable'],
    station: 'cable', reps: [10, 15],
    cues: ['Face away from the pulley, rope behind your head.', 'Staggered stance, lean forward.', 'Extend forward until arms are straight; deep stretch on return.'],
    anim: {
      view: 'side',
      A: { hip: [100, 76], t: 154, legs: [{ ik: [126, G], bend: 'fwd' }, { ik: [80, G], bend: 'fwd' }], arms: [{ fk: [160, 330] }] },
      B: { hip: [100, 76], t: 154, legs: [{ ik: [126, G], bend: 'fwd' }, { ik: [80, G], bend: 'fwd' }], arms: [{ fk: [150, 150] }] },
      props: [{ type: 'cable', from: [24, 60], at: 'hand' }],
    },
  },
  {
    id: 'db_skullcrusher', name: 'DB Skull Crusher', part: 'triceps', tags: ['triceps'], eq: ['db', 'bench'],
    station: 'db', reps: [8, 12],
    cues: ['Lie on the bench, dumbbells over your shoulders.', 'Bend only at the elbows, lowering beside your head.', 'Extend back up; upper arms stay still.'],
    anim: {
      view: 'side',
      A: supine({ fk: [170, 176] }),
      B: supine({ fk: [168, 32] }),
      props: [benchFlat, { type: 'db', at: 'hand' }],
    },
  },
  {
    id: 'close_grip_bench', name: 'Close-Grip Bench Press', part: 'triceps', tags: ['triceps', 'chest', 'shoulders'], eq: ['rack', 'bench', 'barbell'],
    station: 'barbell', reps: [6, 10], compound: true,
    cues: ['Hands shoulder-width; safeties set.', 'Elbows tucked close to your sides.', 'Touch lower chest, press to lockout.'],
    anim: {
      view: 'side',
      A: supine({ ik: [0, -50], rel: 'shoulder', bend: 'back' }),
      B: supine({ ik: [-12, -16], rel: 'shoulder', bend: 'back' }),
      props: [benchFlat, rack, { type: 'plate', at: 'hand', r: 10 }],
    },
  },
  {
    id: 'overhead_db_ext', name: 'Overhead DB Extension', part: 'triceps', tags: ['triceps'], eq: ['db'],
    station: 'db', reps: [8, 12],
    cues: ['Hold one dumbbell overhead with both hands.', 'Lower it behind your head; elbows point up.', 'Extend to lockout.'],
    anim: { view: 'side', A: stand(100, { arms: [{ fk: [174, 340] }] }), B: stand(100, { arms: [{ fk: [174, 178] }] }), props: [{ type: 'db', at: 'hand', big: true }] },
  },

  // ================= FRONT FOREARM (flexors) =================
  {
    id: 'bb_wrist_curl', name: 'Barbell Wrist Curl', part: 'forearm_front', tags: ['forearm_front'], eq: ['barbell', 'bench'],
    station: 'barbell', reps: [12, 20],
    cues: ['Sit, forearms on thighs, palms up, wrists past the knees.', 'Let the bar roll to your fingertips.', 'Curl the wrists up as far as possible.'],
    anim: { view: 'side', A: wristSeat(8), B: wristSeat(150), props: [wristBench, { type: 'plate', at: 'tip', r: 10 }] },
  },
  {
    id: 'db_wrist_curl', name: 'DB Wrist Curl', part: 'forearm_front', tags: ['forearm_front'], eq: ['db', 'bench'],
    station: 'db', reps: [12, 20],
    cues: ['Forearms on thighs or the bench, palms up.', 'Lower to a full stretch.', 'Curl the wrist up and squeeze.'],
    anim: { view: 'side', A: wristSeat(8), B: wristSeat(150), props: [wristBench, { type: 'db', at: 'tip' }] },
  },
  {
    id: 'btb_wrist_curl', name: 'Behind-the-Back Wrist Curl', part: 'forearm_front', tags: ['forearm_front'], eq: ['barbell', 'rack'],
    station: 'barbell', reps: [12, 20],
    cues: ['Unrack the bar behind you, palms facing back.', 'Let it roll to your fingers.', 'Curl the wrists up toward your forearms.'],
    anim: {
      view: 'side',
      A: stand(100, { arms: [{ fk: [-8, -8, 6] }] }),
      B: stand(100, { arms: [{ fk: [-8, -8, -70] }] }),
      props: [rack, { type: 'plate', at: 'tip', r: 10 }],
    },
  },
  {
    id: 'cable_wrist_curl', name: 'Cable Wrist Curl', part: 'forearm_front', tags: ['forearm_front'], eq: ['cable', 'bench'],
    station: 'cable', reps: [12, 20],
    cues: ['Sit facing a low pulley, forearms on thighs, palms up.', 'Full stretch, then curl the wrists up.', 'Constant tension — no resting at the bottom.'],
    anim: { view: 'side', A: wristSeat(8), B: wristSeat(150), props: [wristBench, { type: 'cable', from: [182, 144], at: 'tip' }] },
  },

  // ================= BACK FOREARM (extensors) =================
  {
    id: 'bb_reverse_curl', name: 'Barbell Reverse Curl', part: 'forearm_back', tags: ['forearm_back', 'biceps'], eq: ['barbell'],
    station: 'barbell', reps: [10, 15],
    cues: ['Overhand grip, shoulder width.', 'Elbows pinned; wrists straight.', 'Curl up, lower slowly.'],
    anim: { view: 'side', A: stand(100, { arms: [{ fk: [4, 8] }] }), B: stand(100, { arms: [{ fk: [10, 150] }] }), props: [{ type: 'plate', at: 'hand', r: 10 }] },
  },
  {
    id: 'db_reverse_wrist', name: 'DB Reverse Wrist Curl', part: 'forearm_back', tags: ['forearm_back'], eq: ['db', 'bench'],
    station: 'db', reps: [12, 20],
    cues: ['Forearms on thighs, palms DOWN.', 'Lift the back of the hand toward you.', 'Light weight, full range.'],
    anim: { view: 'side', A: wristSeat(16), B: wristSeat(120), props: [wristBench, { type: 'db', at: 'tip' }] },
  },
  {
    id: 'cable_reverse_curl', name: 'Cable Reverse Curl', part: 'forearm_back', tags: ['forearm_back', 'biceps'], eq: ['cable'],
    station: 'cable', reps: [10, 15],
    cues: ['Low pulley, straight bar, overhand grip.', 'Elbows pinned; wrists stay neutral.', 'Curl up, slow on the way down.'],
    anim: { view: 'side', A: stand(96, { arms: [{ fk: [6, 24] }] }), B: stand(96, { arms: [{ fk: [12, 148] }] }), props: [{ type: 'cable', from: [178, 144], at: 'hand' }] },
  },
  {
    id: 'bb_reverse_wrist', name: 'Barbell Reverse Wrist Curl', part: 'forearm_back', tags: ['forearm_back'], eq: ['barbell', 'bench'],
    station: 'barbell', reps: [12, 20],
    cues: ['Forearms on thighs, palms DOWN, wrists past knees.', 'Raise the knuckles up as high as you can.', 'Lower slowly — this one burns fast.'],
    anim: { view: 'side', A: wristSeat(16), B: wristSeat(120), props: [wristBench, { type: 'plate', at: 'tip', r: 10 }] },
  },
];

export const EX = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
