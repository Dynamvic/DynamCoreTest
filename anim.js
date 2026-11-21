'use strict';
/* DynamCore – exercise animations (own work, DynamVic).
   Pose = [tl, tu, hd, nUA, nFA, nTH, nSH, fUA, fFA, fTH, fSH]: absolute segment angles in degrees (0 = right, 90 = up)
   for lower trunk, upper trunk, head (relative), near/right upper arm, forearm, thigh, shin and far/left ditto.
   Side view (default): near side dark, far side grey. v:'front' = seen from the front (or from above for floor work):
   right side dark, left side grey. Options per exercise:
     anchor: joint that stays in place during the movement (otherwise the lowest point stands on the ground)
     lift: [from,to] px off the ground, shift: [from,to] px sideways, period: seconds per repetition, noground: true
   Props: wall, box (side left/under, h = height), ball, roller, circ (free circle), miniband, db, bar, band (anchor post → joint),
     band2 (between two joints), pad, stick, pulse. fixed: true/frame index = prop stays where it was in that frame. */
const SEG = { tl: 30, tu: 30, ua: 24, fa: 22, th: 46, sh: 44, head: 15, hr: 9 };
const ST = [90, 90, 0, -90, -90, -90, -90, -90, -90, -90, -90];              // standing
const QUAD = [0, 0, 0, -90, -90, -90, 180, -90, -90, -90, 180];              // hands and knees, facing right
const PLANK = [18, 18, 0, -90, -90, 198, 198, -90, -90, 198, 198];          // high plank
const FPLANK = [9, 9, 0, -90, 0, 189, 189, -90, 0, 189, 189];               // forearm plank
const SUP = [180, 180, 0, -5, -5, 0, 0, -5, -5, 0, 0];                       // lying on the back, head left
const PRONE = [0, 3, 0, 180, 180, 180, 180, 180, 180, 180, 180];            // lying on the belly, head right
const m = (base, ch) => base.map((v, i) => ch[i] !== undefined ? ch[i] : v); // copy a pose with changes {index: value}

const ANIM = {};   // v2.3: filled by the batch blocks below (the v2.2 poses were removed once all 128 were redrawn; they are in release-prev/anim.js)

/* ---- v2.3.0 batch 1: the 15 weakest, redrawn in format v2 (coach decisions 20-11-2026) ----
   arm: 2 = new arm length; keys = poses; tempo = phases in seconds (from the tempo table: cue or default 2 s down / 1 s up;
   timed holds: 2 s into position, 4 s hold, 1 s back); lab = caption (i18n key al_…); cue = joint that gets the arrow.
   Front view now also for M06, C05, S04, C26 and M18 (coach 20-11-2026; C31 and M08 stayed in side view). */
const mirrorFront = q => [q[0], q[1], -q[2], 180 - q[7], 180 - q[8], 180 - q[9], 180 - q[10], 180 - q[3], 180 - q[4], 180 - q[5], 180 - q[6]];
const mirrorLen = l => { const o = {}; for (const k in l) o[/^[nf][A-Z]/.test(k) ? (k[0] === 'n' ? 'f' : 'n') + k.slice(1) : k] = l[k]; return o; };
const HOLD = (lin, lout) => [{ to: 1, s: 2, lab: lin }, { hold: 4, lab: 'hold' }, { to: 0, s: 1, lab: lout }];
const SIDES = (lr, ll) => [{ to: 1, s: 2, lab: lr }, { to: 0, s: 1, lab: 'mid' }, { to: 2, s: 2, lab: ll }, { to: 0, s: 1, lab: 'mid' }];
const PAL0 = [90, 90, 0, -60, 150, -95, -88, -120, 30, -85, -92], PAL1 = [90, 90, 0, -150, -90, -95, -88, -30, -90, -85, -92];   // Pallof: hands at the chest / pressed out to the viewer
const PAL_LEN = [{}, { nUA: .4, fUA: .4, nFA: .25, fFA: .25 }];
const M06U = [90, 92, 0, -62, -80, 62, -82, -118, -100, 118, -98], M06R = [90, 96, 6, -58, -80, -6, 182, -120, -100, -28, 190];
const M06L = { nTH: .9, nSH: .55, fTH: .5, fSH: .75 };
Object.assign(ANIM, {
  M06: { v: 'front', arm: 2, keys: [M06U, M06R, mirrorFront(M06R)], len: [{ nTH: .62, fTH: .62, nSH: .68, fSH: .68 }, M06L, mirrorLen(M06L)],
    tempo: SIDES('right', 'left'), cue: ['nk'], props: [{ t: 'mat', w: 170 }] },
  // C31 stays in side view (coach 20-11-2026): the v2.2 poses, new arm length, default tempo
  C31: { arm: 2, keys: [[180, 180, 0, -10, 0, 90, 0, -10, 0, 90, 0], [180, 180, 0, -10, 0, 30, -40, -10, 0, 35, -35]],
    tempo: [{ to: 1, s: 2, lab: 'down' }, { to: 0, s: 1, lab: 'back' }], cue: ['nk'], props: [{ t: 'mat', w: 170 }] },
  C05: { v: 'front', arm: 2, keys: [PAL0, PAL1], len: PAL_LEN, tempo: [{ to: 1, s: 1, lab: 'press' }, { hold: 3, lab: 'hold' }, { to: 0, s: 2, lab: 'back' }],
    cue: ['nh'], props: [{ t: 'band', from: 'sh', dx: -64, dy: -16, to: 'nh' }] },
  C26: { v: 'front', arm: 2, keys: [PAL0, PAL1], len: PAL_LEN, tempo: [{ to: 1, s: 1, lab: 'press' }, { hold: 3, lab: 'hold' }, { to: 0, s: 2, lab: 'back' }],
    cue: ['nh'], props: [{ t: 'cable', from: 'sh', dx: -66, dy: -16, to: 'nh' }] },
  S04: { v: 'front', arm: 2, keys: [m(PAL0, { 5: -92, 6: -40, 9: -88, 10: -140 }), m(PAL1, { 5: -92, 6: -40, 9: -88, 10: -140 })],
    len: [{ nSH: .38, fSH: .38 }, { ...PAL_LEN[1], nSH: .38, fSH: .38 }], tempo: HOLD('press', 'back'), cue: ['nh'],
    props: [{ t: 'band', from: 'sh', dx: -64, dy: -16, to: 'nh' }, { t: 'mat', w: 90 }] },
  M18: { v: 'front', arm: 2, keys: [[90, 90, 0, -80, -92, -150, 180, -100, -88, -95, -90], [90, 90, 0, -75, -80, -150, 180, -105, -100, -95, -90]],
    len: [{ fTH: .3, fSH: .25 }, { TL: .55, TU: .4, HD: .6, nUA: .55, fUA: .55, nFA: .45, fFA: .45, fTH: .3, fSH: .25 }],
    tempo: HOLD('fold', 'back'), cue: ['head'], props: [{ t: 'mat', w: 170 }] },
  M14: { arm: 2, keys: [[0, 0, 0, -90, -90, -95, -95, -90, -90, -90, 180], [22, 14, 0, -40, -40, -112, -100, -40, -40, -35, 180]],
    len: [{ nTH: .5, nSH: .5 }, { nTH: .5, nSH: .5 }], anchor: 'nh', tempo: [{ to: 1, s: 2, lab: 'rock' }, { to: 0, s: 1, lab: 'back' }], cue: ['hip'], props: [{ t: 'mat', w: 150 }] },
  // C30: the black (near) arm and the grey (far) leg move; supporting: grey arm and black knee
  C30: { arm: 2, keys: [m(QUAD, { 3: 6, 4: 6, 9: 180, 10: 180 }), m(QUAD, { 0: 12, 1: 20, 2: -30, 3: -105, 4: -125, 9: -45, 10: -165 })], anchor: 'fh',
    tempo: [{ to: 1, s: 1, lab: 'crunch' }, { to: 0, s: 2, lab: 'out' }], cue: ['ne'], props: [{ t: 'mat', w: 150 }] },
  // M08 stays in side view: a front view of child's pose was tried and does not read clearly (coach: keep it simple)
  M08: { arm: 2, keys: [m(QUAD, {}), [-8, -14, -10, -5, -2, -30, 180, -5, -2, -30, 180]],
    anchor: 'nk', tempo: HOLD('in', 'back'), cue: ['hip'], props: [{ t: 'mat', w: 160 }] },
  C12: { arm: 2, keys: [[9, 9, 0, -90, 0, 189, 189, -90, 0, 189, 189], [12, 12, 0, -40, 0, 192, 192, -40, 0, 192, 192]], anchor: 'nh',
    tempo: [{ to: 1, s: 2, lab: 'slide' }, { to: 0, s: 1, lab: 'back' }], cue: ['nf'], props: [{ t: 'pad', at: 'nf' }] },
  // C04/C24 (round 3, coach: not clear): legs together (stack), elbow stays on the floor under the shoulder (anchor),
  // forearm points at the viewer (short), top arm along the body; hips on the floor → one straight line (feet or knees to shoulder)
  C04: { v: 'front', arm: 2, stack: .3, anchor: 'fe', keys: [[150, 152, 0, -22, -35, -2, -2, -90, 180, -2, -2], [168, 168, 0, -4, -17, -12, -12, -90, 180, -12, -12]],
    len: [{ fFA: .25 }, { fFA: .25 }], tempo: HOLD('up', 'down'), cue: ['hip'], props: [{ t: 'mat', w: 190 }] },
  C24: { v: 'front', arm: 2, stack: .3, anchor: 'fe', keys: [[150, 152, 0, -22, -35, -2, -100, -90, 180, -2, -100], [164, 164, 0, -8, -21, -16, -100, -90, 180, -16, -100]],
    len: [{ fFA: .25, nSH: .15, fSH: .15 }, { fFA: .25, nSH: .15, fSH: .15 }], tempo: HOLD('up', 'down'), cue: ['hip'], props: [{ t: 'mat', w: 160 }] },
  C15: { v: 'front', arm: 2, keys: [[171, 171, 0, 90, 90, -9, -9, -90, 180, -9, -9], [176, 166, -25, -125, -165, -9, -9, -90, 180, -9, -9]],
    tempo: [{ to: 1, s: 2, lab: 'thread' }, { to: 0, s: 1, lab: 'open' }], cue: ['nh'], props: [{ t: 'mat', w: 180 }] },
  H23: { arm: 2, keys: [[-55, -60, 0, -150, 30, 180, 180, -150, 30, 180, 180], [0, 2, 0, -150, 30, 180, 180, -150, 30, 180, 180]], anchor: 'nk',
    tempo: HOLD('up', 'down'), cue: ['head'], props: [{ t: 'box', at: 'ntm', side: 'under', w: 58, h: 40, fixed: true }, { t: 'hook', at: 'nf', fixed: true }] },
  L15: { arm: 2, toes: true, keys: [[90, 90, 0, -55, -10, 0, -90, -55, -10, 0, -90], [90, 90, 0, -55, -10, 0, -90, -55, -10, 0, -90]],
    len: [{}, { PF: 60 }], tempo: HOLD('heels', 'down'), cue: ['nf'], props: [{ t: 'wall', at: 'hip', dx: -8, fixed: true }] }
});

/* ---- v2.3.0 batch 2: the next 15 by score (same rules as batch 1; simple and clear, no long-way turns) ---- */
const SPL = [168, 168, 0, -4, -17, -12, -12, -90, 180, -12, -12];   // straight forearm side plank (front view, legs together)
const UPDN = (lu, ld) => [{ to: 1, s: 1, lab: lu }, { to: 0, s: 2, lab: ld }];   // 1 s up, 2 s down (default tempo, up first)
const DNUP = (ld, lu) => [{ to: 1, s: 2, lab: ld }, { to: 0, s: 1, lab: lu }];   // 2 s down, 1 s up
Object.assign(ANIM, {
  H04: { v: 'front', arm: 2, keys: [m(ST, { 3: -95, 4: -88, 5: -100, 6: -92, 7: -85, 8: -92, 9: -80, 10: -88 }), m(ST, { 3: -95, 4: -88, 5: -62, 6: -80, 7: -85, 8: -92, 9: -80, 10: -88 })],
    shift: [0, 7], tempo: DNUP('step', 'close'), cue: ['nf'], props: [{ t: 'band2', a: 'nk', b: 'fk', solid: true }] },
  S09: { arm: 2, keys: [[180, 180, 0, 90, 90, 90, 0, 90, 90, 100, 0], [180, 180, 0, 90, 90, 5, 0, 172, 176, 100, 0]],
    tempo: DNUP('out', 'back'), cue: ['nf', 'fh'], props: [{ t: 'ballmid', a: 'nh', b: 'fk' }, { t: 'mat', w: 180 }] },
  L06: { arm: 2, anchor: 'hip', keys: [[125, 125, 0, -60, -10, 42, 42, -60, -10, 42, 42], [125, 125, 0, -60, -10, 80, 0, -60, -10, 80, 0]],
    tempo: DNUP('down', 'press'), cue: ['nf'], props: [{ t: 'box', at: 'hip', side: 'under', w: 50, h: 20, fixed: true }, { t: 'rest', a: 'hip', b: 'sh', off: 9 }, { t: 'sled', at: 'nf', from: 'hip' }] },
  // S07: a head turn cannot be seen from the side, so the figure stands still on the towel and the caption says the side
  S07: { arm: 2, keys: [m(ST, { 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 }), m(ST, { 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 })],
    tempo: [{ hold: 2, lab: 'right' }, { hold: 2, lab: 'left' }], props: [{ t: 'pad', at: 'nf' }] },
  F06: { arm: 2, anchor: 'ff', keys: [m(ST, { 5: -84, 6: -102 }), m(ST, { 5: -96, 6: -76 })], tempo: DNUP('toes', 'heel'), cue: ['nf'], props: [{ t: 'ball', at: 'nf', r: 6, fixed: true }] },
  C17: { arm: 2, anchor: 'nk', keys: [[35, 35, 0, -90, 0, -80, 180, -90, 0, -80, 180], [30, 30, 0, -5, 0, -25, 180, -5, 0, -25, 180]],
    tempo: DNUP('out', 'back'), cue: ['nh'], props: [{ t: 'floorball', a: 'ne', b: 'nh', r: 24 }, { t: 'mat', w: 150 }] },
  C25: { v: 'front', arm: 2, stack: .3, anchor: 'fe', keys: [SPL, m(SPL, { 5: 16, 6: 16 })], len: [{ fFA: .25 }, { fFA: .25 }],
    tempo: UPDN('up', 'down'), cue: ['nf'], props: [{ t: 'mat', w: 190 }] },
  // C08/H25: the elbow is on the floor (ground), the bottom leg hangs free below the top leg
  // body rises from the shoulder (on the elbow, ~30 up) to the knee on the chair (~45 up); hips sag → almost straight
  C08: { v: 'front', arm: 2, stack: .3, anchor: 'fe', ground: 'fe', keys: [[176, 176, 0, 0, -12, 24, 24, -90, 180, -26, 178], [188, 188, 0, 12, 0, 9, 9, -90, 180, -26, 178]], len: [{ fFA: .25 }, { fFA: .25 }],
    tempo: HOLD('up', 'down'), cue: ['hip'], props: [{ t: 'box', at: 'nsm', side: 'under', w: 34, fixed: 1 }, { t: 'mat', w: 150 }] },
  H25: { v: 'front', arm: 2, stack: .3, anchor: 'fe', ground: 'fe', keys: [[176, 176, 0, 0, -12, 24, -100, -90, 180, -26, 178], [188, 188, 0, 12, 0, 9, -100, -90, 180, -26, 178]],
    len: [{ fFA: .25, nSH: .3 }, { fFA: .25, nSH: .3 }], tempo: HOLD('up', 'down'), cue: ['hip'], props: [{ t: 'box', at: 'nk', side: 'under', w: 26, fixed: 1 }, { t: 'mat', w: 150 }] },
  H13: { v: 'front', arm: 2, keys: [[90, 90, 0, -100, -90, -62, -90, -80, -90, -118, -90], [90, 90, 0, -100, -90, -28, -90, -80, -90, -152, -90]],
    len: [{ nTH: .55, fTH: .55 }, { nTH: .55, fTH: .55 }], tempo: UPDN('open', 'back'), cue: ['nk'],
    props: [{ t: 'box', at: 'hip', side: 'under', w: 40, h: 46, fixed: true }, { t: 'kpad', at: 'nk', side: 1 }, { t: 'kpad', at: 'fk', side: -1 }] },
  H12: { v: 'front', arm: 2, stack: .3, anchor: 'fe', keys: [[164, 164, 0, -8, -21, -16, -100, -90, 180, -16, -100], [164, 164, 0, -8, -21, 14, -100, -90, 180, -16, -100]],
    len: [{ fFA: .25, nSH: .15, fSH: .15 }, { fFA: .25, nSH: .15, fSH: .15 }], tempo: UPDN('open', 'back'), cue: ['nk'], props: [{ t: 'band2', a: 'nk', b: 'fk', solid: true }, { t: 'mat', w: 160 }] },
  H19: { arm: 2, anchor: 'nf', keys: [[40, 40, 0, 120, -60, -140, -140, 120, -60, -140, -140], [-100, -100, 0, -20, 160, -140, -140, -20, 160, -140, -140]],
    tempo: DNUP('down', 'up'), cue: ['head'], props: [{ t: 'bench45', a: 'nf', b: 'nhp', off: 9 }] },
  L12: { arm: 2, toes: true, keys: [m(ST, { 3: -100, 4: -60, 9: -90, 10: 180 }), m(ST, { 3: -100, 4: -60, 9: -90, 10: 180 })], len: [{ PF: -25 }, { PF: 40 }],
    tempo: [{ to: 1, s: 1, lab: 'heels' }, { to: 0, s: 3, lab: 'down' }], cue: ['nf'], props: [{ t: 'box', at: 'nt', side: 'under', w: 30, h: 20, dx: 14, fixed: true }] },
  L14: { arm: 2, toes: true, keys: [m(ST, { 3: -100, 4: -60, 5: -78, 6: -102, 9: -90, 10: 180 }), m(ST, { 3: -100, 4: -60, 5: -78, 6: -102, 9: -90, 10: 180 })],
    len: [{}, { PF: 45 }], tempo: [{ to: 1, s: 1, lab: 'heels' }, { to: 0, s: 3, lab: 'down' }], cue: ['nf'] },
  F07: { arm: 2, anchor: 'nf', keys: [m(ST, { 0: 82, 1: 80, 3: -90, 4: -90 }), m(ST, { 0: 82, 1: 80, 3: 20, 4: 40 })], tempo: UPDN('up', 'down'), cue: ['nh'],
    props: [{ t: 'wall', at: 'sh', dx: 18, fixed: true }, { t: 'ball', at: 'sh', r: 7, fixed: true, side: true }] }
});

/* ---- v2.3.0 batch 3 ---- */
// ik2: arm angles (upper arm, forearm; degrees, before the y-flip) so that the hand reaches (tx, ty) from a shoulder at (sx, 0),
// with the v2.3 arm (30 + 26). side = +1 / -1 chooses on which side the elbow bends.
const ik2 = (sx, tx, ty, side) => {
  const dx = tx - sx, d = Math.max(5, Math.min(Math.hypot(dx, ty), 55.5)), b = Math.atan2(ty, dx), a = Math.acos((900 + d * d - 676) / (60 * d));
  const u = b + side * a, ex = sx + 30 * Math.cos(u), ey = 30 * Math.sin(u), r = v => Math.round(v * 180 / Math.PI);
  return [r(u), r(Math.atan2(ty - ey, tx - ex))];
};
// C27 halo (front): both hands hold one weight and circle it around the head: in front of the chin → right → over the head → left
const HALO = [[0, 8], [22, 24], [0, 40], [-22, 24]].map(([x, y]) => { const n = ik2(12, x, y, -1), f = ik2(-12, x, y, 1); return m(ST, { 3: n[0], 4: n[1], 7: f[0], 8: f[1] }); });
const PLK2 = [18, 18, 0, -90, -90, 198, 198, -90, -90, 198, 198];   // high plank (hands under the shoulders)
const ROLL = [{ to: 1, s: 2, lab: 'roll' }, { to: 0, s: 1, lab: 'roll' }];
Object.assign(ANIM, {
  C27: { v: 'front', arm: 2, keys: HALO, tempo: [1, 2, 3, 0].map(k => ({ to: k, s: .75, lab: 'around' })), cue: ['nh'], props: [{ t: 'db', at: 'nh' }] },
  // H18: deep enough that the hands (and plates) reach the floor at the bottom (hands 26 up = plate radius)
  H18: { arm: 2, anchor: 'nf', keys: [ST, [26, 26, 8, -90, -90, -15, -115, -90, -90, -15, -115]], tempo: DNUP('down', 'up'), cue: ['hip'],
    props: [{ t: 'disc', at: 'nh', r: 'auto' }, { t: 'bar', at: 'nh', plain: true }] },
  R11: { arm: 2, keys: [[90, 90, 0, 95, 95, 0, -90, 95, 95, 0, -90], [90, 90, 0, -70, 100, 0, -90, -70, 100, 0, -90]], tempo: UPDN('pull', 'back'), cue: ['nh'],
    props: [{ t: 'box', at: 'hip', side: 'under', w: 40, h: 46, fixed: true }, { t: 'hook', at: 'nk', fixed: true }, { t: 'pulley', at: 'nh' }, { t: 'bar', at: 'nh', plain: true }] },
  F01: { arm: 2, keys: [[12, 12, 0, -90, 0, 186, 186, -90, 0, 186, 186], [12, 12, 0, -90, 0, 186, 186, -90, 0, 186, 186]], shift: [-10, 10], tempo: ROLL, props: [{ t: 'roller', at: 'ntm', r: 9, fixed: true }] },
  F05: { arm: 2, keys: [[115, 115, 0, -125, -100, 0, 0, -125, -100, 0, 0], [115, 115, 0, -125, -100, 0, 0, -125, -100, 0, 0]], shift: [-10, 10], tempo: ROLL, props: [{ t: 'roller', at: 'ntm', r: 9, fixed: true }] },
  F04: { arm: 2, keys: [[115, 115, 0, -125, -100, 0, 0, -125, -100, 0, 0], [115, 115, 0, -125, -100, 0, 0, -125, -100, 0, 0]], shift: [-10, 10], tempo: ROLL, props: [{ t: 'roller', at: 'nsm', r: 9, fixed: true }] },
  F02: { arm: 2, keys: [[110, 105, 0, -130, -110, 30, -70, -130, -110, 40, -5], [100, 98, 0, -130, -110, 40, -65, -130, -110, 50, 0]], tempo: ROLL, props: [{ t: 'ball', at: 'hip', r: 9 }] },
  H24: { arm: 2, keys: [[180, 180, 0, 0, 0, 58, -62, 0, 0, 58, -62], [180, 180, 0, 0, 0, 60, -60, 0, 0, 60, -60]], tempo: HOLD('squeeze', 'back'),
    props: [{ t: 'circ', at: 'nk', r: 8 }, { t: 'pulse', at: 'nk', r: [4, 9] }, { t: 'mat', w: 170 }] },
  // C07 / C10: the black (near) arm taps / rows, so it can be seen from the side; the grey hand supports
  C07: { arm: 2, anchor: 'fh', keys: [PLK2, m(PLK2, { 3: ik2(0, 8, -8, 1)[0], 4: ik2(0, 8, -8, 1)[1] })], tempo: UPDN('tap', 'back'), cue: ['nh'] },
  C10: { arm: 2, anchor: 'fh', keys: [PLK2, m(PLK2, { 3: ik2(0, -20, -6, -1)[0], 4: ik2(0, -20, -6, -1)[1] })], tempo: UPDN('row', 'down'), cue: ['nh'], props: [{ t: 'db', at: 'nh' }, { t: 'db', at: 'fh' }] },
  // R01: face down; lift into Y (arms forward), T (arms out to the sides = towards the viewer, short), W (elbows bent back)
  R01: { arm: 2, keys: [[0, 3, 0, 5, 5, 180, 180, 5, 5, 180, 180], [0, 12, 0, 28, 28, 180, 180, 28, 28, 180, 180], [0, 12, 0, 20, 20, 180, 180, 20, 20, 180, 180], [0, 12, 0, -150, 50, 180, 180, -150, 50, 180, 180]],
    len: [{}, {}, { nUA: .3, nFA: .3, fUA: .3, fFA: .3 }, { nUA: .55, nFA: .6, fUA: .55, fFA: .6 }],
    tempo: [{ to: 1, s: 1, lab: 'y' }, { to: 0, s: 2, lab: 'down' }, { to: 2, s: 1, lab: 't' }, { to: 0, s: 2, lab: 'down' }, { to: 3, s: 1, lab: 'w' }, { to: 0, s: 2, lab: 'down' }], cue: ['nh'], props: [{ t: 'mat', w: 180 }] },
  // R06: arms sweep from in front, around the side (towards the viewer = short), to the hips; and back
  R06: { arm: 2, keys: [[0, 8, 0, 8, 8, 180, 180, 8, 8, 180, 180], [0, 8, 0, 90, 90, 180, 180, 90, 90, 180, 180], [0, 8, 0, 172, 172, 180, 180, 172, 172, 180, 180]],
    len: [{}, { nUA: .3, nFA: .3, fUA: .3, fFA: .3 }, {}],
    tempo: [{ to: 1, s: 1, lab: 'sweep' }, { to: 2, s: 1, lab: 'sweep' }, { to: 1, s: .5, lab: 'back' }, { to: 0, s: .5, lab: 'back' }], cue: ['nh'], props: [{ t: 'mat', w: 180 }] },
  H21: { arm: 2, keys: [m(PRONE, { 1: 3, 3: 180, 4: 180, 7: 180, 8: 180 }), m(PRONE, { 1: 22, 2: 5, 3: 166, 4: 166, 7: 166, 8: 166 })], tempo: HOLD('up', 'down'), cue: ['head'], props: [{ t: 'mat', w: 180 }] },
  H22: { arm: 2, keys: [m(PRONE, { 3: 0, 4: 0, 7: 0, 8: 0 }), m(PRONE, { 1: 10, 3: 8, 4: 8, 5: 174, 6: 174, 7: 8, 8: 8, 9: 174, 10: 174 })],
    tempo: [{ to: 1, s: 1, lab: 'up' }, { hold: 2, lab: 'hold' }, { to: 0, s: 2, lab: 'down' }], cue: ['nh', 'nf'], props: [{ t: 'mat', w: 180 }] },
  // C18: feet on the floor, body angled up so the forearms lie on top of the ball
  C18: { arm: 2, anchor: 'nf', ground: 'nf', keys: [[30, 30, 0, -80, 0, 210, 210, -80, 0, 210, 210], [30, 30, 0, -64, 8, 210, 210, -64, 8, 210, 210]],
    tempo: [{ to: 1, s: 1.5, lab: 'circle' }, { to: 0, s: 1.5, lab: 'circle' }], cue: ['nh'], props: [{ t: 'floorball', a: 'ne', b: 'nh', r: 'auto' }] }
});

/* ---- v2.3.0 batch 4 (21: the remaining Phase 1 notes + next by score) ---- */
// both hands together on one handle (front view): angles for near (+12) and far (-12) arm reaching (x, y) from the shoulder centre
const BOTH = (x, y) => { const n = ik2(12, x, y, -1), f = ik2(-12, x, y, 1); return { 3: n[0], 4: n[1], 7: f[0], 8: f[1] }; };
const MIDLEN = { nUA: .45, nFA: .35, fUA: .45, fFA: .35 };   // hands in front of the chest = arms towards the viewer (short)
const HKNEEL = { 5: -90, 6: -90, 9: -150, 10: -90 };           // half kneeling, front view: back knee straight down, front knee turned a little out, shin down
const HKLEN = { nSH: .2, fTH: .55, fSH: 1 };   // back shin goes away from the viewer (short); front thigh partly towards the viewer
// side view arm reaching a point given in the trunk's own frame (x forward, y along the trunk), for a trunk angle tl
const ikT = (tl, tx, ty, side) => { const r = (tl - 90) * Math.PI / 180; return ik2(0, tx * Math.cos(r) - ty * Math.sin(r), tx * Math.sin(r) + ty * Math.cos(r), side); };
const HTH = (tl, th, sh) => { const a = ikT(tl, -8, 22, 1), b = ikT(tl, -12, -40, -1); return [tl, tl, 0, a[0], a[1], th, sh, b[0], b[1], th, sh]; };   // H20: hands on the stick at neck and low back
const HIPT = [[150, 160, 0, -60, 0, 60, -70, -60, 0, 60, -70], [180, 182, 0, -60, 0, 15, -85, -60, 0, 15, -85]];
const PLANKW = [0, 0, 0, -90, -90, 182, 182, -90, -90, 182, 182];   // high plank, body level (shins on a ball)
Object.assign(ANIM, {
  C11: { v: 'front', arm: 2, keys: [m(ST, { 3: -92, 4: -92, 5: -90, 6: -95, 9: -92, 10: -88 }), m(ST, { 3: -92, 4: -92, 5: -90, 6: -88, 9: -92, 10: -95 })],
    len: [{ nTH: .45 }, { fTH: .45 }], tempo: [{ to: 1, s: 1.5, lab: 'walk' }, { to: 0, s: 1.5, lab: 'walk' }], cue: ['nf'], props: [{ t: 'db', at: 'nh' }] },
  C13: { v: 'front', arm: 2, keys: [m(ST, { ...HKNEEL, ...BOTH(-34, 42) }), m(ST, { ...HKNEEL, ...BOTH(0, -8) }), m(ST, { ...HKNEEL, ...BOTH(26, -54) })],
    len: [HKLEN, { ...HKLEN, ...MIDLEN }, HKLEN], tempo: [{ to: 1, s: 1, lab: 'chop' }, { to: 2, s: 1, lab: 'chop' }, { to: 1, s: .5, lab: 'back' }, { to: 0, s: .5, lab: 'back' }],
    cue: ['nh'], props: [{ t: 'band', from: 'sh', dx: -62, dy: 44, to: 'nh' }, { t: 'mat', w: 90 }] },
  C14: { v: 'front', arm: 2, keys: [m(ST, { ...HKNEEL, ...BOTH(-30, -54) }), m(ST, { ...HKNEEL, ...BOTH(0, -8) }), m(ST, { ...HKNEEL, ...BOTH(28, 42) })],
    len: [HKLEN, { ...HKLEN, ...MIDLEN }, HKLEN], tempo: [{ to: 1, s: 1, lab: 'lift' }, { to: 2, s: 1, lab: 'lift' }, { to: 1, s: .5, lab: 'back' }, { to: 0, s: .5, lab: 'back' }],
    cue: ['nh'], props: [{ t: 'band', from: 'sh', dx: -62, dy: -78, to: 'nh' }, { t: 'mat', w: 90 }] },
  // P01 explosive: chop in 0,5 s (coach 21-11-2026), controlled return 3 s (cue)
  P01: { v: 'front', arm: 2, keys: [m(ST, { 5: -95, 6: -92, 9: -85, 10: -88, ...BOTH(-34, 42) }), m(ST, { 5: -95, 6: -92, 9: -85, 10: -88, ...BOTH(0, -8) }), m(ST, { 5: -95, 6: -92, 9: -85, 10: -88, ...BOTH(26, -54) })],
    len: [{}, MIDLEN, {}], tempo: [{ to: 1, s: .25, lab: 'chop' }, { to: 2, s: .25, lab: 'chop' }, { to: 1, s: 1.5, lab: 'back' }, { to: 0, s: 1.5, lab: 'back' }],
    cue: ['nh'], props: [{ t: 'band', from: 'sh', dx: -62, dy: 44, to: 'nh' }] },
  S03: { arm: 2, keys: [[180, 180, 0, -5, -30, 90, 0, -5, -30, 90, 0], [180, 180, 0, -5, -30, 90, 0, -5, -30, 90, 0]],
    tempo: [{ to: 1, s: 4, lab: 'inhale' }, { to: 0, s: 6, lab: 'exhale' }], props: [{ t: 'box', at: 'nf', side: 'under', w: 30, fixed: true }, { t: 'pulse', at: 'mid', r: [4, 12] }, { t: 'mat', w: 150 }] },
  R19: { arm: 2, anchor: 'nf', keys: [[172, 172, 0, 90, 90, -8, -8, 90, 90, -8, -8], [160, 160, 0, -55, 95, -20, -20, -55, 95, -20, -20]],
    tempo: UPDN('pull', 'down'), cue: ['sh'], props: [{ t: 'table', at: 'nh', fixed: true }] },
  // C20: the black (near) arm reaches forward and holds 2 s (cue); the grey forearm supports
  C20: { arm: 2, anchor: 'fe', keys: [FPLANK, m(FPLANK, { 3: 6, 4: 6 })], tempo: [{ to: 1, s: 1, lab: 'out' }, { hold: 2, lab: 'hold' }, { to: 0, s: 2, lab: 'back' }], cue: ['nh'] },
  S06: { arm: 2, keys: [m(ST, { 3: -110, 4: 20, 7: -110, 8: 20 }), m(ST, { 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 })], tempo: HOLD('in', 'back'), props: [{ t: 'eyes' }] },
  // P04 explosive ("snap the hips"): up in 0,5 s, down 1,5 s (coach 21-11-2026)
  P04: { arm: 2, anchor: 'nf', keys: [[35, 30, 10, -110, -120, -80, -98, -110, -120, -100, -88], [90, 90, 0, 0, 0, -90, -90, 0, 0, -90, -90]],
    tempo: [{ to: 1, s: .5, lab: 'snap' }, { to: 0, s: 1.5, lab: 'down' }], cue: ['nh'], props: [{ t: 'kb', at: 'nh' }] },
  C06: { arm: 2, anchor: 'mid', keys: [[180, 180, 0, 172, 176, 0, 0, 172, 176, 0, 0], [180, 162, 0, 150, 160, 25, 20, 150, 160, 25, 20]], tempo: HOLD('up', 'down'), cue: ['nf'], props: [{ t: 'mat', w: 190 }] },
  C16: { arm: 2, keys: [[180, 180, 0, 90, 90, 90, 0, 90, 90, 90, 0], [180, 180, 0, 90, 90, 5, 0, 90, 90, 90, 0], [180, 180, 0, 90, 90, 90, 0, 90, 90, 5, 0]],
    tempo: [{ to: 1, s: 2, lab: 'out' }, { to: 0, s: 1, lab: 'back' }, { to: 2, s: 2, lab: 'out' }, { to: 0, s: 1, lab: 'back' }], cue: ['nf'], props: [{ t: 'db', at: 'nh' }, { t: 'mat', w: 180 }] },
  H15: { arm: 2, anchor: 'nf', keys: [ST, [30, 30, 0, -90, -90, -82, -98, -90, -90, -82, -98]], tempo: DNUP('down', 'up'), cue: ['hip'], props: [{ t: 'db', at: 'nh' }] },
  // C01: opposite arm and leg, both sides (prototype poses)
  C01: { arm: 2, keys: [[180, 180, 0, 90, 90, 90, 0, 90, 90, 90, 0], [180, 180, 0, 90, 90, 8, 3, 168, 172, 90, 0], [180, 180, 0, 168, 172, 90, 0, 90, 90, 8, 3]],
    tempo: [{ to: 1, s: 2, lab: 'out' }, { to: 0, s: 1, lab: 'back' }, { to: 2, s: 2, lab: 'out' }, { to: 0, s: 1, lab: 'back' }], cue: ['nf', 'fh'], props: [{ t: 'mat', w: 190 }] },
  // C02: the black (near) arm and the grey (far) leg reach long and hold 2 s (cue)
  C02: { arm: 2, anchor: 'fh', keys: [QUAD, m(QUAD, { 2: 5, 3: 8, 4: 8, 9: 180, 10: 180 })], tempo: [{ to: 1, s: 1, lab: 'out' }, { hold: 2, lab: 'hold' }, { to: 0, s: 2, lab: 'back' }],
    cue: ['nh'], props: [{ t: 'mat', w: 150 }] },
  H20: { arm: 2, anchor: 'nf', keys: [HTH(90, -90, -90), HTH(35, -80, -100)], tempo: DNUP('down', 'up'), cue: ['hip'], props: [{ t: 'stick' }] },
  L04: { arm: 2, anchor: 'nf', keys: [m(ST, { 3: -55, 4: -10, 7: -55, 8: -10 }), [90, 90, 0, -55, -10, 0, -90, -55, -10, 0, -90]], tempo: HOLD('down', 'up'), cue: ['hip'], props: [{ t: 'wall', at: 'hip', dx: -8, fixed: 1 }] },
  C03: { arm: 2, anchor: 'ne', keys: [[25, 25, 0, -90, 0, 180, 180, -90, 0, 180, 180], FPLANK], tempo: HOLD('up', 'down'), cue: ['hip'], props: [{ t: 'mat', w: 190 }] },
  P05: { arm: 2, anchor: 'nh', ground: 'nh', keys: [PLANKW, [-25, -20, 0, -90, -90, -50, 190, -90, -90, -50, 190]], tempo: UPDN('tuck', 'out'), cue: ['nk'], props: [{ t: 'floorball', a: 'nk', b: 'nf', r: 'auto' }] },
  H05: { arm: 2, anchor: 'nf', keys: HIPT, tempo: [{ to: 1, s: 1, lab: 'up' }, { hold: 2, lab: 'hold' }, { to: 0, s: 2, lab: 'down' }], cue: ['hip'],
    props: [{ t: 'box', at: 'sh', side: 'under', w: 34, h: 26, fixed: true }, { t: 'db', at: 'hip' }] },
  H08: { arm: 2, anchor: 'nf', keys: [m(HIPT[0], { 10: 60 }), m(HIPT[1], { 10: 15 })], tempo: UPDN('up', 'down'), cue: ['hip'], props: [{ t: 'box', at: 'sh', side: 'under', w: 34, h: 26, fixed: true }] },
  H09: { arm: 2, anchor: 'nf', keys: HIPT, tempo: [{ to: 1, s: 1, lab: 'up' }, { hold: 1, lab: 'hold' }, { to: 0, s: 2, lab: 'down' }], cue: ['hip'],
    props: [{ t: 'box', at: 'sh', side: 'under', w: 34, h: 26, fixed: true }, { t: 'bar', at: 'hip' }] }
});

/* ---- v2.3.0 batch 5 (next 21 by score; no Phase 1 notes): new arm length, tempo, captions ---- */
const YTW = (tl, tu) => [[tl, tu, 0, -90, -90], [tl, tu + 8, 0, 20, 20], [tl, tu + 8, 0, tl - 10, tl - 10], [tl, tu + 8, 0, -170, 30]];   // rest, Y, T (short), W (short)
const R16L = [200, 192, 200, 192];
const QUADH = [0, 0, 0, -90, -90, -80, 185, -90, -90, -80, 185];   // bear plank: knees just off the floor
Object.assign(ANIM, {
  H17: { arm: 2, anchor: 'nf', keys: [ST, [35, 35, 0, -60, 120, -80, -98, -60, 120, -80, -98]], tempo: DNUP('down', 'up'), cue: ['hip'], props: [{ t: 'band2', a: 'nf', b: 'sh', solid: true }] },
  L05: { arm: 2, anchor: 'nf', keys: [ST, [90, 90, 0, 0, 0, 0, -90, 0, 0, 0, -90]], tempo: DNUP('down', 'up'), cue: ['hip'],
    props: [{ t: 'circ', at: 'mid', dx: -16, dy: 0, r: 14 }, { t: 'wall', at: 'mid', dx: -32, fixed: 1 }] },
  L09: { arm: 2, anchor: 'nf', keys: [[88, 88, 0, -95, -95, -30, -100, -95, -95, -110, -95], [90, 90, 0, -95, -95, -90, -90, -95, -95, -100, -100]], tempo: UPDN('stepup', 'down'), cue: ['hip'],
    props: [{ t: 'box', at: 'nf', side: 'under', w: 40, h: 0, fixed: true }] },
  // P08 explosive ("drive up fast"): up 0,5 s, down 1,5 s (coach 21-11-2026)
  P08: { arm: 2, anchor: 'nf', keys: [[88, 88, 0, 20, 10, -30, -100, -150, -120, -110, -95], [90, 90, 0, -150, -120, -90, -90, 30, 20, 0, -90]],
    tempo: [{ to: 1, s: .5, lab: 'drive' }, { to: 0, s: 1.5, lab: 'down' }], cue: ['fk'], props: [{ t: 'box', at: 'nf', side: 'under', w: 40, h: 0, fixed: true }] },
  R18: { arm: 2, anchor: 'nf', keys: [[105, 105, 0, 12, 12, -78, -78, 12, 12, -78, -78], [97, 97, 0, -150, 30, -84, -84, -150, 30, -84, -84]], tempo: UPDN('pull', 'back'), cue: ['sh'],
    props: [{ t: 'wall', at: 'nh', dx: 4, fixed: true }] },
  R02: { arm: 2, keys: [[90, 90, 0, 0, 0, -95, -85, 0, 0, -85, -95], [90, 90, 0, -150, 0, -95, -85, -150, 0, -85, -95]],
    tempo: [{ to: 1, s: 1, lab: 'pull' }, { hold: 2, lab: 'hold' }, { to: 0, s: 2, lab: 'back' }], cue: ['ne'], props: [{ t: 'band', from: 'sh', dx: 60, dy: 6, to: 'nh' }] },
  R07: { arm: 2, keys: [[180, 180, 0, 90, 90, 60, -60, 90, 90, 60, -60], [180, 180, 0, -15, 90, 60, -60, -15, 90, 60, -60]], tempo: DNUP('down', 'press'), cue: ['nh'],
    props: [{ t: 'db', at: 'nh' }, { t: 'mat', w: 180 }] },
  R14: { arm: 2, anchor: 'mid', keys: [[180, 180, 0, 90, 90, -60, -95, 90, 90, -60, -95], [180, 180, 0, -40, 90, -60, -95, -40, 90, -60, -95]], tempo: DNUP('down', 'press'), cue: ['nh'],
    props: [{ t: 'box', at: 'mid', side: 'under', w: 70, h: 0, fixed: true }, { t: 'db', at: 'nh' }] },
  R03: { v: 'front', arm: 2, keys: [m(ST, { 3: -40, 4: 175, 7: -140, 8: 5 }), m(ST, { 3: 0, 4: 0, 7: 180, 8: 180 })], len: [{ nUA: .45, nFA: .45, fUA: .45, fFA: .45 }, {}],
    tempo: UPDN('apart', 'back'), cue: ['nh'], props: [{ t: 'band2', a: 'nh', b: 'fh', solid: true }] },
  R08: { arm: 2, keys: [[90, 90, 0, 15, 15, -95, -85, 15, 15, -85, -95], [90, 90, 0, 160, 55, -95, -85, 160, 55, -85, -95]], tempo: UPDN('pull', 'back'), cue: ['ne'],
    props: [{ t: 'band', from: 'sh', dx: 60, dy: -16, to: 'nh' }] },
  R16: { arm: 2, anchor: 'nf', keys: YTW(-20, -20).map(k => [...k, ...R16L.slice(0, 2), ...k.slice(3, 5), ...R16L.slice(2)]),
    len: [{}, {}, { nUA: .3, nFA: .3, fUA: .3, fFA: .3 }, { nUA: .55, nFA: .6, fUA: .55, fFA: .6 }],
    tempo: [{ to: 1, s: 1, lab: 'y' }, { to: 0, s: 2, lab: 'down' }, { to: 2, s: 1, lab: 't' }, { to: 0, s: 2, lab: 'down' }, { to: 3, s: 1, lab: 'w' }, { to: 0, s: 2, lab: 'down' }],
    cue: ['nh'], props: [{ t: 'circ', at: 'hip', dx: 4, dy: 18, r: 18, fixed: true }] },
  M10: { arm: 2, anchor: 'nf', keys: [[170, 176, 0, 125, -55, 50, -70, 125, -55, 50, -70], [168, 196, -10, 145, -40, 50, -70, 145, -40, 50, -70]], tempo: DNUP('open', 'back'), cue: ['head'],
    props: [{ t: 'roller', at: 'mid2', r: 9 }] },
  M13: { arm: 2, keys: [[80, 82, 0, -80, -60, -90, 100, -80, -60, -5, -90], [90, 92, 0, -80, -60, -72, 112, -80, -60, 0, -90]], tempo: HOLD('in', 'back'), cue: ['hip'],
    props: [{ t: 'box', at: 'nf', side: 'left', w: 34, fixed: true }] },
  M12: { arm: 2, keys: [[90, 90, 0, 180, 90, -100, -90, -90, -90, -75, -95], [84, 80, 0, 180, 90, -105, -92, -90, -90, -70, -98]], tempo: HOLD('in', 'back'), cue: ['sh'],
    props: [{ t: 'wall', at: 'ne', dx: -3, fixed: true }] },
  M16: { arm: 2, keys: [[75, 75, 0, 10, 10, -110, -110, 10, 10, -70, -95], [72, 72, 0, 10, 10, -100, -125, 10, 10, -70, -95]], tempo: HOLD('in', 'back'), cue: ['nk'],
    props: [{ t: 'wall', at: 'nh', dx: 4, fixed: true }] },
  F03: { arm: 2, keys: [[160, 172, 0, 60, -60, 45, -75, 60, -60, 45, -75], [168, 176, 0, 60, -60, 58, -70, 60, -60, 58, -70]], tempo: ROLL, props: [{ t: 'roller', at: 'mid2', r: 9 }] },
  L16: { arm: 2, anchor: 'nf', keys: [m(ST, { 3: 0, 4: 0, 7: 0, 8: 0, 9: -30, 10: -30 }), [60, 65, 0, 0, 0, -8, -100, 0, 0, -5, -5]], tempo: DNUP('sit', 'stand'), cue: ['hip'],
    props: [{ t: 'box', at: 'hip', side: 'under', w: 34, h: 0, fixed: 1, dx: -10 }] },
  L17: { arm: 2, anchor: 'nf', keys: [[90, 90, 0, -10, 0, -70, -95, -95, -95, -110, -100], [90, 90, 0, -10, 0, -25, -95, -95, -95, -118, 175]], tempo: DNUP('down', 'up'), cue: ['hip'],
    props: [{ t: 'wall', at: 'nh', dx: 4, fixed: true }] },
  R21: { arm: 2, anchor: 'nf', keys: [[70, 70, 0, 0, 0, -110, -110, 0, 0, -110, -110], [64, 64, 0, -40, 40, -114, -114, -40, 40, -114, -114]], tempo: DNUP('down', 'press'), cue: ['sh'],
    props: [{ t: 'wall', at: 'nh', dx: 3, fixed: true }] },
  R22: { arm: 2, keys: [[90, 90, 0, -150, 0, -95, -85, -150, 0, -85, -95], [90, 90, 0, 0, 0, -95, -85, 0, 0, -85, -95]], tempo: UPDN('press', 'back'), cue: ['nh'],
    props: [{ t: 'band', from: 'sh', dx: -50, dy: 0, to: 'nh' }] },
  C23: { arm: 2, anchor: 'fh', keys: [QUADH, m(QUADH, { 2: -10, 3: ik2(0, 8, -8, 1)[0], 4: ik2(0, 8, -8, 1)[1] })], tempo: UPDN('tap', 'back'), cue: ['nh'] }
});

/* ---- v2.3.0 batch 6 (next 20; explosive P03, P06, P07 at 0,5 s / 1,5 s, coach 21-11-2026) ---- */
const ALT = lab => [{ to: 1, s: 1.5, lab }, { to: 0, s: 1.5, lab }];   // even alternating loop (walking, crawling, pedalling)
const BEAR1 = [0, 0, 0, -65, -100, -80, 185, -90, -90, -60, -155], BEAR2 = [0, 0, 0, -90, -90, -60, -155, -65, -100, -80, 185];
Object.assign(ANIM, {
  P03: { arm: 2, anchor: 'nf', keys: [PLANK, [2, 2, 0, 160, 160, 182, 182, 160, 160, 182, 182]], tempo: [{ to: 1, s: 1.5, lab: 'down' }, { to: 0, s: .5, lab: 'up' }], cue: ['sh'], props: [{ t: 'mat', w: 190 }] },
  H07: { v: 'front', arm: 2, keys: [[180, 180, 0, -20, -10, 0, 0, 175, 178, 0, 0], [180, 180, 0, -20, -10, 32, 32, 175, 178, 0, 0]], tempo: UPDN('up', 'down'), cue: ['nf'], props: [{ t: 'mat', w: 190 }] },
  H03: { v: 'front', arm: 2, keys: [[180, 180, 0, -20, -10, -25, 10, 175, 178, -25, 10], [180, 180, 0, -20, -10, 20, -30, 175, 178, -25, 10]], tempo: UPDN('open', 'back'), cue: ['nk'], props: [{ t: 'mat', w: 170 }] },
  L11: { arm: 2, anchor: 'nf', keys: [[90, 90, 0, -95, -95, -70, -95, -95, -95, -110, -100], [90, 90, 0, -95, -95, -5, -95, -95, -95, -120, 180]], tempo: HOLD('down', 'up'), cue: ['hip'] },
  P06: { arm: 2, keys: [[60, 60, 0, -120, -110, -15, -105, -120, -110, -15, -105], m(ST, { 3: 100, 4: 100, 7: 100, 8: 100 })], lift: [0, 24], tempo: [{ to: 1, s: .5, lab: 'jump' }, { to: 0, s: 1.5, lab: 'down' }], cue: ['hip'] },
  // P07: hop sideways in 0,5 s, stick the landing 2 s (cue), hop back
  P07: { v: 'front', arm: 2, keys: [[85, 85, 0, -60, -40, -105, -88, -140, -150, -150, -100], [95, 95, 0, -40, -30, -30, -80, -120, -140, -75, -92]], shift: [-28, 28],
    tempo: [{ to: 1, s: .5, lab: 'jump' }, { hold: 2, lab: 'hold' }, { to: 0, s: .5, lab: 'jump' }, { hold: 2, lab: 'hold' }], cue: ['hip'] },
  // S02: the free foot taps front, side (towards the viewer = short) and back
  S02: { arm: 2, anchor: 'nf', keys: [[90, 90, 0, -60, -60, -100, -80, -120, -120, -100, -100], [80, 85, 0, -60, -60, -100, -80, -120, -120, -40, -55], [90, 90, 0, -60, -60, -100, -80, -120, -120, -80, -95], [100, 100, 0, -60, -60, -100, -80, -120, -120, -140, -125]],
    len: [{}, {}, { fTH: .5, fSH: .5 }, {}], tempo: [{ to: 1, s: 2, lab: 'out' }, { to: 0, s: 1, lab: 'back' }, { to: 2, s: 2, lab: 'out' }, { to: 0, s: 1, lab: 'back' }, { to: 3, s: 2, lab: 'out' }, { to: 0, s: 1, lab: 'back' }], cue: ['ff'] },
  S05: { arm: 2, keys: [BEAR1, BEAR2], tempo: ALT('crawl'), cue: ['nh'] },
  M01: { arm: 2, anchor: 'nh', keys: [[22, -22, -70, -90, -90, -90, 180, -90, -90, -90, 180], [-10, 10, 30, -90, -90, -90, 180, -90, -90, -90, 180]], tempo: DNUP('cow', 'cat'), cue: ['mid'], props: [{ t: 'mat', w: 150 }] },
  M02: { v: 'front', noground: true, arm: 2, keys: [[180, 180, 0, -90, -90, -45, -100, -100, -80, -45, -100], [180, 180, 40, 90, 90, -45, -100, -100, -80, -45, -100]], tempo: DNUP('open', 'back'), cue: ['nh'] },
  M03: { arm: 2, anchor: 'fh', keys: [m(QUAD, { 3: 90, 4: 90 }), m(QUAD, { 1: -12, 2: -40, 3: -150, 4: 185 })], tempo: DNUP('thread', 'open'), cue: ['nh'], props: [{ t: 'mat', w: 150 }] },
  M04: { arm: 2, anchor: 'nf', keys: [[-15, -5, 0, -90, -90, -15, -90, -90, -90, -140, -140], [-15, -5, 70, 90, 90, -15, -90, -90, -90, -140, -140]], tempo: DNUP('open', 'back'), cue: ['nh'] },
  M05: { arm: 2, keys: [[90, 90, 0, -110, 20, -90, 180, -110, 20, 0, -90], [92, 95, 0, -110, 20, -70, 180, -110, 20, 0, -90]], tempo: HOLD('in', 'back'), cue: ['hip'], props: [{ t: 'mat', w: 120 }] },
  M11: { arm: 2, anchor: 'nh', keys: [[-52, -52, 0, -52, -52, -95, -135, -52, -52, -112, -112], [-52, -52, 0, -52, -52, -112, -112, -52, -52, -95, -135]], tempo: ALT('pedal'), cue: ['nf'] },
  M09: { arm: 2, keys: [[180, 180, 0, 40, 20, 60, -40, 40, 20, 45, 0], [180, 180, 0, 55, 30, 80, -20, 55, 30, 62, 10]], tempo: HOLD('in', 'back'), cue: ['nk'], props: [{ t: 'mat', w: 170 }] },
  M15: { v: 'front', arm: 2, keys: [m(ST, { 3: -95, 4: -95, 7: 130, 8: 20 }), m(ST, { 2: 35, 3: -95, 4: -95, 7: 130, 8: 40 })], tempo: HOLD('in', 'back'), cue: ['head'] },
  R20: { arm: 2, keys: [[180, 180, 0, 0, 90, 58, -62, 0, 90, 58, -62], [180, 170, 0, -20, 80, 58, -62, -20, 80, 58, -62]], tempo: HOLD('press', 'back'), cue: ['sh'], props: [{ t: 'mat', w: 170 }] },
  // L13: heels stay on the floor, toes pull up (foot points up = negative PF)
  L13: { arm: 2, keys: [[95, 95, 0, -90, -90, -70, -70, -90, -90, -70, -70], [95, 95, 0, -90, -90, -70, -70, -90, -90, -70, -70]], len: [{}, { PF: -55 }],
    tempo: UPDN('toesup', 'down'), cue: ['nt'], props: [{ t: 'wall', at: 'mid', dx: -8, fixed: true }] },
  R17: { v: 'front', arm: 2, keys: [m(ST, { 3: -92, 4: -92, 7: -88, 8: -88, 5: -90, 6: -95, 9: -92, 10: -88 }), m(ST, { 3: -92, 4: -92, 7: -88, 8: -88, 5: -90, 6: -88, 9: -92, 10: -95 })],
    len: [{ nTH: .45 }, { fTH: .45 }], tempo: ALT('walk'), cue: ['nf'], props: [{ t: 'db', at: 'nh' }, { t: 'db', at: 'fh' }] },
  M17: { arm: 2, keys: [[92, 92, 0, 130, -60, 0, -90, 130, -60, 0, -90], [92, 120, 0, 150, -40, 0, -90, 150, -40, 0, -90]], tempo: DNUP('open', 'back'), cue: ['head'],
    props: [{ t: 'box', at: 'hip', side: 'under', w: 40, h: 40, fixed: true }, { t: 'wall', at: 'hip', dx: -18, h: 70, fixed: true }] }
});

/* ---- v2.3.0 batch 7 (the last 21). Rule for all 128: working phase (lift, press, pull) 1 s, lowering/return 2 s; cue holds in between ---- */
const BRIDGE = [[180, 180, 0, 0, 0, 58, -62, 0, 0, 58, -62], [205, 200, 0, 0, 0, 25, -85, 0, 0, 25, -85]];
const LUNGE = [ST, [90, 90, 0, -95, -95, -5, -95, -95, -95, -120, 180]];
Object.assign(ANIM, {
  S01: { arm: 2, keys: [m(ST, { 3: -110, 4: 20, 7: -110, 8: 20 }), m(ST, { 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 })], tempo: HOLD('in', 'back'), cue: ['ff'] },
  C09: { arm: 2, anchor: 'nh', keys: [QUAD, QUADH], tempo: HOLD('up', 'down'), cue: ['nk'], props: [{ t: 'mat', w: 150 }] },
  P02: { arm: 2, anchor: 'nh', keys: [m(PLANK, { 5: -10, 6: -160 }), m(PLANK, { 9: -10, 10: -160 })], tempo: ALT('climb'), cue: ['nk'] },
  H01: { arm: 2, keys: BRIDGE, tempo: UPDN('up', 'down'), cue: ['hip'], props: [{ t: 'mat', w: 170 }] },
  H11: { arm: 2, keys: BRIDGE, tempo: [{ to: 1, s: 1, lab: 'up' }, { hold: 2, lab: 'hold' }, { to: 0, s: 2, lab: 'down' }], cue: ['hip'], props: [{ t: 'miniband', at: 'nk' }, { t: 'mat', w: 170 }] },
  H02: { arm: 2, keys: [[180, 180, 0, 0, 0, 58, -62, 0, 0, 45, 45], [205, 200, 0, 0, 0, 25, -85, 0, 0, 20, 20]], tempo: UPDN('up', 'down'), cue: ['hip'], props: [{ t: 'mat', w: 170 }] },
  H10: { arm: 2, anchor: 'sh', keys: [[192, 188, 0, -10, -10, 4, 4, -10, -10, 4, 4], [205, 200, 0, -10, -10, 45, -45, -10, -10, 45, -45]], tempo: UPDN('curl', 'out'), cue: ['nf'],
    props: [{ t: 'circ', at: 'nf', dx: 0, dy: 15, r: 14 }] },
  H06: { arm: 2, anchor: 'nf', keys: [ST, [0, 0, 0, -90, -90, -95, -88, -90, -90, 180, 180]], tempo: DNUP('down', 'up'), cue: ['hip'] },
  H14: { arm: 2, anchor: 'nf', keys: [ST, [0, 0, 0, -90, -90, -95, -88, -90, -90, 180, 180]], tempo: DNUP('down', 'up'), cue: ['hip'], props: [{ t: 'db', at: 'fh' }] },
  L01: { arm: 2, anchor: 'nf', keys: [m(ST, { 3: 0, 4: 0, 7: 0, 8: 0 }), [60, 65, 0, 0, 0, -8, -100, 0, 0, -8, -100]], tempo: DNUP('down', 'up'), cue: ['hip'],
    props: [{ t: 'box', at: 'hip', side: 'under', w: 34, h: 0, fixed: 1, dx: -10 }] },
  L02: { arm: 2, anchor: 'nf', keys: [m(ST, { 3: -60, 4: 90, 7: -60, 8: 90 }), [72, 72, 0, -60, 90, -5, -110, -60, 90, -5, -110]], tempo: DNUP('down', 'up'), cue: ['hip'], props: [{ t: 'db', at: 'nh' }] },
  L03: { arm: 2, anchor: 'nf', keys: [m(ST, { 3: -130, 4: 100, 7: -130, 8: 100 }), [62, 66, 0, -130, 100, -5, -112, -130, 100, -5, -112]], tempo: DNUP('down', 'up'), cue: ['hip'], props: [{ t: 'bar', at: 'sh' }] },
  L08: { arm: 2, anchor: 'nf', keys: LUNGE, tempo: DNUP('down', 'up'), cue: ['hip'] },
  L07: { arm: 2, anchor: 'nf', keys: [[90, 90, 0, -95, -95, -60, -95, -95, -95, -110, 150], [90, 90, 0, -95, -95, -8, -95, -95, -95, -125, 165]], tempo: DNUP('down', 'up'), cue: ['hip'],
    props: [{ t: 'box', at: 'ff', side: 'under', w: 30, h: 0, fixed: true }] },
  L10: { arm: 2, anchor: 'nf', keys: LUNGE, tempo: DNUP('down', 'up'), cue: ['hip'], props: [{ t: 'db', at: 'nh' }] },
  R05: { arm: 2, anchor: 'fh', keys: [[0, 0, 0, -90, -90, -90, -90, -90, -90, -90, 180], [0, 0, 0, 155, -90, -90, -90, -90, -90, -90, 180]], tempo: UPDN('row', 'down'), cue: ['nh'],
    props: [{ t: 'box', at: 'fk', side: 'under', w: 60, h: 0, fixed: true, dx: 14 }, { t: 'db', at: 'nh' }] },
  R10: { arm: 2, anchor: 'nf', keys: [[30, 30, 0, -90, -90, -80, -100, -90, -90, -80, -100], [30, 30, 0, 160, -90, -80, -100, 160, -90, -80, -100]], tempo: UPDN('row', 'down'), cue: ['nh'], props: [{ t: 'db', at: 'nh' }] },
  R13: { arm: 2, anchor: 'nf', keys: [[35, 35, 0, -90, -90, 215, 215, -90, -90, 215, 215], [28, 28, 0, -150, -70, 208, 208, -150, -70, 208, 208]], tempo: DNUP('down', 'press'), cue: ['sh'],
    props: [{ t: 'box', at: 'nh', side: 'under', w: 30, h: 0, fixed: true }] },
  R04: { arm: 2, anchor: 'nh', keys: [PLANK, [5, 5, 0, -150, -80, 185, 185, -150, -80, 185, 185]], tempo: DNUP('down', 'press'), cue: ['sh'] },
  R15: { arm: 2, anchor: 'nh', keys: [[-10, -10, 0, -90, -90, 170, 170, -90, -90, 170, 170], [-18, -18, 0, -150, -75, 166, 166, -150, -75, 166, 166]], tempo: DNUP('down', 'press'), cue: ['sh'],
    props: [{ t: 'box', at: 'nf', side: 'under', w: 30, h: 0, fixed: true }] },
  M07: { arm: 2, keys: [[180, 180, 0, 60, 75, 60, 60, 60, 75, 0, 0], [180, 180, 0, 70, 85, 82, 82, 70, 85, 0, 0]], tempo: HOLD('in', 'back'), cue: ['nf'],
    props: [{ t: 'band2', a: 'nh', b: 'nf', solid: true }, { t: 'mat', w: 180 }] }
});
/* ---------- animation engine v2 (v2.3.0) ----------
   Timing: an exercise without "tempo" gets the v2.2 pattern generated from its period (35 % to key 1, 15 % hold, 35 % back,
   15 % hold, eased), so its movement is exactly as before. "tempo" = steps { to: key, s: seconds, e: easing, lab } and
   { hold: seconds, lab }, played in order and looped. "keys" (2 or more poses) replaces "f" when present.
   Drawing: A = refined figure (tapered limbs, round joints, hands, feet, ground shadow, clearer equipment) everywhere;
   C = A + cue overlay (faint ghost of the pose it is moving to, dashed arrow along the "cue" joints, phase caption) in guided
   mode and the exercise sheet. A figure is built once and then only its coordinates are updated (no rebuild per frame). */
const ANIMV = (() => {
  const d2r = Math.PI / 180, dir = (a, L) => [Math.cos(a * d2r) * L, Math.sin(a * d2r) * L];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]], midp = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], lerp = (a, b, t) => a + (b - a) * t;
  const ARM2 = { ua: 30, fa: 26 };   // v2.3 arm length (+22 %, coach 20-11-2026), per exercise with arm: 2 until every batch is re-tuned
  const NOGROUND = { nsm: 1, ntm: 1, fsm: 1, mid2: 1, nt: 1, ft: 1 };
  function joints(q, front, len, arm2, sw = 1) {   // sw: width between left and right side in a front view (side-lying: legs together)
    const L = k => (len && len[k] !== undefined ? len[k] : 1), ua = arm2 ? ARM2.ua : SEG.ua, fa = arm2 ? ARM2.fa : SEG.fa;
    const [tl, tu, hd, nua, nfa, nth, nsh, fua, ffa, fth, fsh] = q, hip = [0, 0];
    // len: TL/TU/HD shorten the trunk and neck (bending towards or away from the viewer in a front view); PF = foot pointed (degrees)
    const mid = add(hip, dir(tl, SEG.tl * L('TL'))), sh = add(mid, dir(tu, SEG.tu * L('TU'))), mid2 = add(mid, dir(tu, SEG.tu * L('TU') * 0.45));
    const head = add(sh, dir(tu + hd, SEG.head * L('HD')));
    const ns = front ? add(sh, dir(tu - 90, 12 * sw)) : sh, fs = front ? add(sh, dir(tu + 90, 12 * sw)) : sh;
    const nhp = front ? add(hip, dir(tl - 90, 7 * sw)) : hip, fhp = front ? add(hip, dir(tl + 90, 7 * sw)) : hip;
    const ne = add(ns, dir(nua, ua * L('nUA'))), nh = add(ne, dir(nfa, fa * L('nFA'))), fe = add(fs, dir(fua, ua * L('fUA'))), fh = add(fe, dir(ffa, fa * L('fFA')));
    const nk = add(nhp, dir(nth, SEG.th * L('nTH'))), nf = add(nk, dir(nsh, SEG.sh * L('nSH'))), fk = add(fhp, dir(fth, SEG.th * L('fTH'))), ff = add(fk, dir(fsh, SEG.sh * L('fSH')));
    // feet: side view 90° to the shin and forward (minus PF when the foot is pointed); front view short, turned outwards
    const pf = (len && len.PF) || 0;
    const nt = front ? add(nf, dir(nsh + (nsh > -90 ? 60 : -60), 6)) : add(nf, dir(nsh + 90 - pf, 10));
    const ft = front ? add(ff, dir(fsh + (fsh > -90 ? 60 : -60), 6)) : add(ff, dir(fsh + 90 - pf, 10));
    return { hip, mid, mid2, sh, head, ns, fs, nhp, fhp, ne, nh, fe, fh, nk, nf, fk, ff, nsm: midp(nk, nf), ntm: midp(nhp, nk), fsm: midp(fk, ff), nt, ft };
  }
  const G = 152;
  const flip = j => { const s = {}; for (const k in j) s[k] = [j[k][0], -j[k][1]]; return s; };
  const move = (s, dx, dy) => { for (const k in s) s[k] = [s[k][0] + dx, s[k][1] + dy]; return s; };
  function grounded(s, props, toes, gj) {   // toes: the toe tips count for the floor (heel raise); gj: this joint is on the floor
    if (gj && s[gj]) return move(s, 0, G - s[gj][1] - 4);
    let low = -Infinity;
    for (const k in s) { if (NOGROUND[k] && !(toes && (k === 'nt' || k === 'ft'))) continue; low = Math.max(low, s[k][1] + (k === 'head' ? SEG.hr : 4)); }
    (props || []).forEach(p => {
      const at = s[p.at]; if (!at) return;
      // v2.3: a fixed roller or ball (rolling, ball under the foot) also stands on the floor; before it sank below the floor line
      if ((p.t === 'ball' || p.t === 'roller') && (p.fixed === undefined || !p.side)) low = Math.max(low, at[1] + 5 + 2 * p.r);
      if (p.fixed !== undefined) return;
      if (p.t === 'circ' && p.dy > 0) low = Math.max(low, at[1] + p.dy + p.r);
    });
    (props || []).forEach(p => { if (p.t === 'box' && p.side === 'under' && p.h && s[p.at] && p.fixed === undefined) low = Math.max(low, s[p.at][1] + 4 + p.h); });
    return move(s, 0, G - low);
  }
  const keysOf = a => a.keys || a.f;
  const CAP = 24, hasCap = a => !!(a.tempo && a.tempo.some(s => s.lab));
  /* timeline: tempo steps with start time and length; generated from the period when the exercise has no tempo */
  function timeline(a) {
    if (a._tl) return a._tl;
    const p = a.period || 3.2;
    const tempo = a.tempo || [{ to: 1, s: .35 * p }, { hold: .15 * p }, { to: 0, s: .35 * p }, { hold: .15 * p }];
    const steps = []; let cur = 0, t = 0;
    tempo.forEach(st => { const s = { ...st, from: cur, to: st.hold !== undefined ? cur : st.to, t0: t, d: st.hold !== undefined ? st.hold : st.s }; steps.push(s); t += s.d; cur = s.to; });
    return (a._tl = { steps, period: t });
  }
  const EASE = { io: x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, o: x => 1 - (1 - x) * (1 - x), i: x => x * x, l: x => x };
  function at(a, c) {   // c = position in the loop, 0…1
    const tl = timeline(a), tt = (((c % 1) + 1) % 1) * tl.period;
    let i = tl.steps.findIndex(s => tt < s.t0 + s.d); if (i < 0) i = tl.steps.length - 1;
    const st = tl.steps[i], x = st.d ? Math.min(1, (tt - st.t0) / st.d) : 1;
    return { i, st, e: st.from === st.to ? 0 : (EASE[st.e] || EASE.io)(x), left: Math.max(0, st.d - (tt - st.t0)) };
  }
  /* pose between key k0 and key k1 (e = 0…1), placed like v2.2: anchor joint fixed or lowest point on the floor, then lift/shift.
     tw = weight towards "the other pose" (0 at key 0, 1 at any other key) for lift, shift and pulse. */
  function place(P, k0, k1, e) {
    // v2.3: an angle change over 180° turns the short way; before, e.g. 180° → -30° swung 210° the long way round.
    // Changes up to 180° (exactly 180° included) keep the direction they always had.
    const shortTurn = d => Math.abs(d) <= 180 ? d : ((d % 360) + 540) % 360 - 180;
    const a = P.a, K = keysOf(a), q = K[k0].map((v, i) => v + shortTurn(K[k1][i] - v) * e);
    const la = (a.len || [])[k0] || {}, lb = (a.len || [])[k1] || {}, len = {};
    for (const k of new Set([...Object.keys(la), ...Object.keys(lb)])) { const d0 = k === 'PF' ? 0 : 1; len[k] = lerp(la[k] ?? d0, lb[k] ?? d0, e); }
    let s = flip(joints(q, a.v === 'front', len, a.arm === 2, a.stack || 1));
    const tw = lerp(k0 ? 1 : 0, k1 ? 1 : 0, e);
    if (a.anchor && P.f0) { const d = [P.f0[a.anchor][0] - s[a.anchor][0], P.f0[a.anchor][1] - s[a.anchor][1]]; move(s, d[0], d[1]); }
    else s = grounded(s, a.props, a.toes, a.ground);
    const lift = a.lift ? a.lift[0] + (a.lift[1] - a.lift[0]) * tw : 0, sh = a.shift ? a.shift[0] + (a.shift[1] - a.shift[0]) * tw : 0;
    move(s, sh, -lift);
    if (P.f0 && !a.anchor && P.raise > 0) move(s, 0, -P.raise);
    Object.defineProperty(s, '_tw', { value: tw, enumerable: false, writable: true }); return s;
  }
  const cache = {};
  function prep(id) {
    if (cache[id]) return cache[id];
    const a = ANIM[id]; if (!a) return null;
    const P = { a };
    const f0 = place(P, 0, 0, 0);
    let raise = 0;
    (a.props || []).forEach(p => { if (p.t === 'box' && p.side === 'under' && p.h && p.fixed !== undefined) raise = Math.max(raise, p.h - (G - 4 - f0[p.at][1])); });
    if (raise > 0) move(f0, 0, -raise);
    P.f0 = f0; P.raise = raise;
    const samples = [];
    timeline(a).steps.forEach(st => { if (st.from !== st.to) [0, .25, .5, .75, 1].forEach(x => samples.push(place(P, st.from, st.to, x))); });
    if (!samples.length) samples.push(place(P, 0, 0, 0));
    let minx = Infinity, maxx = -Infinity, miny = Infinity;
    samples.forEach(s => { for (const k in s) { if (k === '_tw') continue; minx = Math.min(minx, s[k][0] - 10); maxx = Math.max(maxx, s[k][0] + 10); miny = Math.min(miny, s[k][1] - (k === 'head' ? SEG.hr : 6)); } });
    (a.props || []).forEach(p => {
      const s = samples[0];
      if (p.t === 'band' || p.t === 'cable') { minx = Math.min(minx, s[p.from][0] + p.dx - 8); maxx = Math.max(maxx, s[p.from][0] + p.dx + 6); miny = Math.min(miny, s[p.from][1] + p.dy - 14); }
      if (p.t === 'box' && s[p.at]) { const x = s[p.at][0] + (p.dx || 0); minx = Math.min(minx, x - p.w); maxx = Math.max(maxx, x + p.w); }
      if (p.t === 'wall') miny = Math.min(miny, G - (p.h || 120));
      if (p.t === 'circ' && s[p.at]) { minx = Math.min(minx, s[p.at][0] + (p.dx || 0) - p.r - 4); maxx = Math.max(maxx, s[p.at][0] + (p.dx || 0) + p.r + 4); }
      if (p.t === 'mat') { minx = Math.min(minx, s.hip[0] + (p.dx || 0) - p.w / 2); maxx = Math.max(maxx, s.hip[0] + (p.dx || 0) + p.w / 2); }
    });
    P.ox = 120 - (minx + maxx) / 2;
    P.w = Math.max(240, maxx - minx + 12);
    const top = Math.floor(Math.min(miny - 8, G - 90)), hgt = G + 8 - top;
    P.vbA = [Math.round(120 - P.w / 2), top, Math.round(P.w), hgt];
    // tight frame (guided mode, thumbnails): only as wide as the figure needs (at least 0,8 × the height)
    const capW = hasCap(a) ? 170 : 0;   // room for a readable caption (guided mode)
    const wT = Math.min(Math.max(P.w, capW), Math.max(maxx - minx + 16, hgt * 0.8, capW));
    P.vbTA = [Math.round(120 - wT / 2), top, Math.round(wT), hgt];
    P.vb = P.vbA.join(' '); P.vbT = P.vbTA.join(' ');
    P.fx = {}; return (cache[id] = P);
  }
  const posed = (P, k0, k1, e) => move(place(P, k0, k1, e), P.ox, 0);   // _tw is not enumerable, so move() keeps it
  const vb0top = P => P.vbA[1];   // top of the frame (overhead pulley)

  /* ---------- drawing: a list of primitives [tag, attributes, text] ---------- */
  const n1 = v => (Math.round(v * 10) / 10).toString();
  let colors = null;
  const readColors = () => { const cs = getComputedStyle(document.documentElement), v = (k, d) => cs.getPropertyValue(k).trim() || d;
    colors = { fg: v('--fg', '#111214'), far: v('--far', '#8A909B'), gr: v('--line', '#E1E2E5'), ac: v('--accent', '#2448C8'), on: v('--on-accent', '#FFFFFF') }; };
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { colors = null; redrawAll(); }); } catch (e) { }
  function limb(o, p, q, w1, w2, fill, op) {   // tapered segment with round ends (round joints where limbs meet)
    const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, h1 = w1 / 2, h2 = w2 / 2;
    const ex = op ? { opacity: op } : {};
    o.push(['path', { d: `M${n1(p[0] + nx * h1)} ${n1(p[1] + ny * h1)}L${n1(q[0] + nx * h2)} ${n1(q[1] + ny * h2)}L${n1(q[0] - nx * h2)} ${n1(q[1] - ny * h2)}L${n1(p[0] - nx * h1)} ${n1(p[1] - ny * h1)}Z`, fill, ...ex }]);
    o.push(['circle', { cx: n1(p[0]), cy: n1(p[1]), r: n1(h1), fill, ...ex }], ['circle', { cx: n1(q[0]), cy: n1(q[1]), r: n1(h2), fill, ...ex }]);
  }
  const dot = (o, p, r, fill, op) => o.push(['circle', { cx: n1(p[0]), cy: n1(p[1]), r: n1(r), fill, ...(op ? { opacity: op } : {}) }]);
  const ln = (o, p, q, stroke, w, ex = {}) => o.push(['line', { x1: n1(p[0]), y1: n1(p[1]), x2: n1(q[0]), y2: n1(q[1]), stroke, 'stroke-width': w, 'stroke-linecap': 'round', ...ex }]);
  function body(o, s, C, front, op) {
    const far = op ? C.fg : C.far, near = C.fg;
    limb(o, s.fs, s.fe, 6.5, 5.5, far, op); limb(o, s.fe, s.fh, 5.5, 4.5, far, op); dot(o, s.fh, 3.3, far, op);
    limb(o, s.fhp, s.fk, 9.5, 7.5, far, op); limb(o, s.fk, s.ff, 7.5, 5.5, far, op); limb(o, s.ff, s.ft, 5, 3.5, far, op);
    if (front) { limb(o, s.nhp, s.fhp, 9.5, 9.5, near, op); limb(o, s.ns, s.fs, 8.5, 8.5, near, op); }
    const nk = [s.sh[0] + (s.head[0] - s.sh[0]) * .45, s.sh[1] + (s.head[1] - s.sh[1]) * .45];
    limb(o, s.hip, s.mid, 12.5, 11.5, near, op); limb(o, s.mid, s.sh, 11.5, 12, near, op); limb(o, s.sh, nk, 6, 6, near, op); dot(o, s.head, SEG.hr, near, op);
    limb(o, s.nhp, s.nk, 10, 8, near, op); limb(o, s.nk, s.nf, 8, 6, near, op); limb(o, s.nf, s.nt, 5.5, 4, near, op);
    limb(o, s.ns, s.ne, 7, 6, near, op); limb(o, s.ne, s.nh, 6, 4.8, near, op); dot(o, s.nh, 3.6, near, op);
  }
  function dumbbell(o, p, C) {   // handle across the hand + two plates
    ln(o, [p[0] - 9, p[1]], [p[0] + 9, p[1]], C.ac, 3.2);
    o.push(['rect', { x: n1(p[0] - 13.5), y: n1(p[1] - 7), width: 8, height: 14, rx: 2.5, fill: C.ac }], ['rect', { x: n1(p[0] + 5.5), y: n1(p[1] - 7), width: 8, height: 14, rx: 2.5, fill: C.ac }]);
  }
  function props(o, P, s, C, layer) {
    const a = P.a;
    const fixedAt = k => { if (!P.fx[k]) P.fx[k] = posed(P, k, k, 0); return P.fx[k]; };
    (a.props || []).forEach(p => {
      const src = p.fixed === undefined || p.fixed === false ? s : fixedAt(p.fixed === true ? 0 : p.fixed);
      const at = p.at ? src[p.at] : null;
      if (layer === 'back') {
        if (p.t === 'mat') o.push(['rect', { x: n1(P.f0.hip[0] + P.ox + (p.dx || 0) - p.w / 2), y: G, width: p.w, height: 4, rx: 2, fill: C.ac, opacity: .35 }]);        if (p.t === 'wall') ln(o, [at[0] + p.dx, G], [at[0] + p.dx, G - (p.h || 120)], C.far, 4);
        if (p.t === 'box') { const x0 = at[0] + (p.dx || 0), topY = at[1] + 4, x = p.side === 'left' ? x0 - p.w + 4 : x0 - p.w / 2;
          o.push(['rect', { x: n1(x), y: n1(topY), width: p.w, height: n1(Math.max(4, G - topY)), rx: 3, fill: 'none', stroke: C.far, 'stroke-width': 3 }]); }
        if (p.t === 'ball') dot(o, p.side ? [at[0] + 10, at[1] + 4] : [at[0], at[1] + 5 + p.r], p.r, C.ac);
        if (p.t === 'roller') { o.push(['circle', { cx: n1(at[0]), cy: n1(at[1] + 5 + p.r), r: p.r, fill: 'none', stroke: C.ac, 'stroke-width': 3.5 }]); dot(o, [at[0], at[1] + 5 + p.r], 3, C.ac); }
        if (p.t === 'circ') o.push(['circle', { cx: n1(at[0] + (p.dx || 0)), cy: n1(at[1] + (p.dy || 0)), r: p.r, fill: 'none', stroke: C.ac, 'stroke-width': 3.5 }]);
        if (p.t === 'pad') o.push(['rect', { x: n1(at[0] - 14), y: n1(at[1] + 3), width: 28, height: 6, rx: 2.5, fill: C.ac }]);
        if (p.t === 'band') { const fr = fixedAt(0)[p.from], ax = fr[0] + p.dx; o.push(['rect', { x: n1(ax - 4), y: n1(Math.min(fr[1] + p.dy - 8, G - 20)), width: 8, height: n1(G - Math.min(fr[1] + p.dy - 8, G - 20)), rx: 3, fill: C.far }]); }
        if (p.t === 'cable') { const fr = fixedAt(0)[p.from], ax = fr[0] + p.dx, ay = fr[1] + p.dy;   // cable column with a pulley at handle height
          o.push(['rect', { x: n1(ax - 7), y: n1(Math.min(ay - 40, G - 150)), width: 14, height: n1(G - Math.min(ay - 40, G - 150)), rx: 3, fill: 'none', stroke: C.far, 'stroke-width': 3 }]);
          o.push(['circle', { cx: n1(ax + 4), cy: n1(ay), r: 5, fill: C.far }]); }
        if (p.t === 'hook') o.push(['rect', { x: n1(at[0] - 12), y: n1(at[1] - 15), width: 24, height: 9, rx: 4, fill: C.far }]);   // feet hooked under a couch / held
        // v2.3 batch 2 equipment
        if (p.t === 'ballmid') { const A = src[p.a], B = src[p.b];   // ball pressed between two joints (e.g. hand and knee)
          dot(o, midp(A, B), Math.max(6, Math.hypot(B[0] - A[0], B[1] - A[1]) / 2 - 3), C.ac); }
        if (p.t === 'floorball') { const c = midp(src[p.a], src[p.b]);   // ball on the floor under a segment; r 'auto' = fits under it in the start pose
          const r = p.r === 'auto' ? Math.max(8, (G - midp(P.f0[p.a], P.f0[p.b])[1]) / 2 - 4) : p.r;
          o.push(['circle', { cx: n1(c[0]), cy: n1(G - r), r: n1(r), fill: 'none', stroke: C.ac, 'stroke-width': 3.5 }]); }
        if (p.t === 'disc') { const r = p.r === 'auto' ? Math.max(8, G - fixedAt(1)[p.at][1]) : p.r;   // weight plate seen from the side; 'auto' = on the floor in pose 2
          o.push(['circle', { cx: n1(at[0]), cy: n1(at[1]), r: n1(r), fill: C.ac, 'fill-opacity': .22, stroke: C.ac, 'stroke-width': 3 }]); }
        if (p.t === 'table') { ln(o, [at[0] - 34, at[1] - 2], [at[0] + 34, at[1] - 2], C.far, 6); ln(o, [at[0] - 30, at[1]], [at[0] - 30, G], C.far, 4); ln(o, [at[0] + 30, at[1]], [at[0] + 30, G], C.far, 4); }   // table top + legs
        if (p.t === 'pulley') { ln(o, at, [at[0], vb0top(P) + 6], C.ac, 2.4); dot(o, [at[0], vb0top(P) + 6], 5, C.far); }   // cable straight up to an overhead pulley
        if (p.t === 'kpad') o.push(['rect', { x: n1(at[0] + (p.side > 0 ? 7 : -14)), y: n1(at[1] - 10), width: 7, height: 20, rx: 3, fill: C.far }]);   // machine pad outside the knee
        if (p.t === 'rest' || p.t === 'bench45') {   // backrest / bench along a body segment, a little behind it
          const A = src[p.a], B = src[p.b], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nx = -(B[1] - A[1]) / L * p.off, ny = (B[0] - A[0]) / L * p.off;
          const a2 = [A[0] + nx, A[1] + ny], b2 = [B[0] + nx, B[1] + ny];
          ln(o, a2, b2, C.far, 6);
          if (p.t === 'bench45') { const m2 = midp(a2, b2); ln(o, m2, [m2[0], G], C.far, 4); ln(o, [a2[0] - ny * .6, a2[1] + nx * .6], [a2[0] + ny * .6, a2[1] - nx * .6], C.far, 5); }
        }
        if (p.t === 'sled') { const A = src[p.from], F = src[p.at], L = Math.hypot(F[0] - A[0], F[1] - A[1]) || 1, ux = (F[0] - A[0]) / L, uy = (F[1] - A[1]) / L;   // leg-press plate across the feet + rail
          const c = [F[0] + ux * 4, F[1] + uy * 4]; ln(o, [c[0] - uy * 18, c[1] + ux * 18], [c[0] + uy * 18, c[1] - ux * 18], C.far, 6); ln(o, c, [c[0] + ux * 34, c[1] + uy * 34], C.far, 3); }
      } else {
        if (p.t === 'band') { const fr = fixedAt(0)[p.from], ax = fr[0] + p.dx, ay = fr[1] + p.dy, to = s[p.to], dd = Math.hypot(to[0] - ax, to[1] - ay);
          ln(o, [ax, ay], to, C.ac, n1(Math.max(2.4, 5 - dd / 30))); }
        if (p.t === 'cable') { const fr = fixedAt(0)[p.from]; ln(o, [fr[0] + p.dx + 4, fr[1] + p.dy], s[p.to], C.ac, 2.4); }
        if (p.t === 'band2') ln(o, src[p.a], src[p.b], C.ac, p.solid ? 5 : 3.5, p.solid ? {} : { 'stroke-dasharray': '5 4' });
        if (p.t === 'miniband') o.push(['ellipse', { cx: n1(at[0]), cy: n1(at[1]), rx: 11, ry: 6, fill: 'none', stroke: C.ac, 'stroke-width': 3.5 }]);
        if (p.t === 'db') dumbbell(o, at, C);
        if (p.t === 'kb') { dot(o, [at[0], at[1] + 9], 8, C.ac); ln(o, [at[0] - 5, at[1] + 2], [at[0] + 5, at[1] + 2], C.ac, 3); }   // kettlebell hanging from the hand
        if (p.t === 'eyes') { const h = s.head, d = s.head[0] >= s.sh[0] ? 1 : -1; ln(o, [h[0] + d * 1, h[1] - 1], [h[0] + d * 8, h[1] - 1], C.on, 3); }   // closed eye (short line on the face)
        if (p.t === 'bar') { ln(o, [at[0] - 20, at[1]], [at[0] + 20, at[1]], C.ac, 3.5); if (!p.plain) o.push(['rect', { x: n1(at[0] - 22), y: n1(at[1] - 9), width: 6, height: 18, rx: 2, fill: C.ac }], ['rect', { x: n1(at[0] + 16), y: n1(at[1] - 9), width: 6, height: 18, rx: 2, fill: C.ac }]); }
        if (p.t === 'plate') ln(o, [at[0] - 8, at[1] + 14], [at[0] + 10, at[1] - 14], C.far, 5);
        if (p.t === 'stick') { const d = [s.head[0] - s.hip[0], s.head[1] - s.hip[1]], n = Math.hypot(d[0], d[1]), ux = d[0] / n, uy = d[1] / n; ln(o, [s.hip[0] - ux * 8 - uy * 7, s.hip[1] - uy * 8 + ux * 7], [s.head[0] + ux * 12 - uy * 7, s.head[1] + uy * 12 + ux * 7], C.ac, 3); }
        if (p.t === 'pulse') { const r = p.r[0] + (p.r[1] - p.r[0]) * s._tw; o.push(['circle', { cx: n1(at[0]), cy: n1(at[1] - 10), r: n1(r), fill: C.ac, 'fill-opacity': .35 }]); }
      }
    });
  }
  function shadow(o, P, s, C) {
    const xs = []; for (const k in s) if (k !== '_tw' && s[k][1] > G - 14) xs.push(s[k][0]);
    if (!xs.length || P.a.noground) return;
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    o.push(['ellipse', { cx: n1((x0 + x1) / 2), cy: G + 3, rx: n1(Math.max(14, (x1 - x0) / 2 + 10)), ry: 4.5, fill: C.fg, opacity: .12 }]);
  }
  /* one frame: A (cue = false) or C (cue = true: ghost, arrow, caption). f = { k0, k1, e, st, left } */
  function prims(id, f, opt) {
    const P = prep(id); if (!P) return [];
    if (!colors) readColors();
    const C = colors, a = P.a, front = a.v === 'front', s = posed(P, f.k0, f.k1, f.e), vb = opt.tight ? P.vbTA : P.vbA, o = [];
    if (!a.noground) ln(o, [vb[0] + 6, G + 2], [vb[0] + vb[2] - 6, G + 2], C.gr, 2);
    props(o, P, s, C, 'back'); shadow(o, P, s, C);
    if (opt.cue && f.gk !== undefined && f.gk !== null) {
      // ghost and arrow depend only on the phase (from/to pose) and the colours, so they are built once per phase and reused every frame
      if (P.gc !== C) { P.gc = C; P.gcache = {}; }
      const moving = !(f.af === f.gk || (f.st && f.st.hold !== undefined)), ck = `${f.gk}|${moving ? f.af : '-'}`;
      if (!P.gcache[ck]) {
        const g = [];
        body(g, posed(P, f.gk, f.gk, 0), C, front, .09);                     // faint ghost of the pose it is heading for
        (a.cue || []).forEach(j => {                                          // dashed arrow along the path of the cue joint, only while moving
          if (!moving) return;
          const pts = []; for (let i = 0; i <= 12; i++) pts.push(posed(P, f.af, f.gk, EASE.io(i / 12))[j]);
          const e = pts[12], b = pts[10], an = Math.atan2(e[1] - b[1], e[0] - b[0]);
          if (Math.hypot(e[0] - pts[0][0], e[1] - pts[0][1]) < 8) return;
          g.push(['path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${n1(p[0])} ${n1(p[1])}`).join(''), fill: 'none', stroke: C.ac, 'stroke-width': 3, 'stroke-dasharray': '2 6', 'stroke-linecap': 'round' }]);
          g.push(['path', { d: `M${n1(e[0] - 9 * Math.cos(an - .5))} ${n1(e[1] - 9 * Math.sin(an - .5))}L${n1(e[0])} ${n1(e[1])}L${n1(e[0] - 9 * Math.cos(an + .5))} ${n1(e[1] - 9 * Math.sin(an + .5))}`, fill: 'none', stroke: C.ac, 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }]);
        });
        P.gcache[ck] = g;
      }
      o.push(...P.gcache[ck]);
    }
    body(o, s, C, front, 0);
    props(o, P, s, C, 'top');
    if (opt.cap && f.st && f.st.lab) {                                        // caption above the figure (guided mode only): what to do now (+ seconds left for reps)
      const lab = typeof t === 'function' ? t('al_' + f.st.lab) : f.st.lab;
      const txt = opt.secs && f.st.d >= 1.5 ? `${lab} · ${Math.ceil(f.left - 1e-6)} s` : lab;
      // small pill, kept 14 units in from the left and 5 from the top, clear of the panel's rounded corner
      const fs = Math.min(13, (vb[2] - 46) / (txt.length * .66)), w = 18 + txt.length * fs * .66, y0 = vb[1] - CAP + 5, x0 = vb[0] + 14;
      o.push(['rect', { x: n1(x0), y: n1(y0), width: n1(w), height: n1(fs + 11), rx: n1((fs + 11) / 2), fill: C.ac }]);
      o.push(['text', { x: n1(x0 + w / 2), y: n1(y0 + fs + 3), 'text-anchor': 'middle', 'font-family': 'Poppins,system-ui,sans-serif', 'font-weight': 700, 'font-size': n1(fs), fill: C.on }, txt]);
    }
    return o;
  }
  const escT = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const toSVG = o => o.map(([tag, at, txt]) => `<${tag} ${Object.keys(at).map(k => `${k}="${at[k]}"`).join(' ')}${txt !== undefined ? `>${escT(txt)}</${tag}>` : '/>'}`).join('');
  /* the frame for loop position c (animated) or for a still: key k (A) / key 0 with ghost + arrow towards key 1 (C) */
  function frameAt(id, c) {
    const P = prep(id), a = P.a, tl = timeline(a), r = at(a, c), st = r.st;
    let gk = st.to, af = st.from;
    if (st.hold !== undefined) { const nx = tl.steps.slice(r.i + 1).concat(tl.steps).find(x => x.to !== st.to); gk = nx ? nx.to : st.to; af = st.to; }
    return { k0: st.from, k1: st.to, e: r.e, st, left: r.left, gk, af, i: r.i };
  }
  const frameStill = (id, k, cue) => cue ? { k0: 0, k1: 0, e: 0, gk: Math.min(1, keysOf(ANIM[id]).length - 1), af: 0 } : { k0: k, k1: k, e: 0 };
  function patch(el, o) {
    const sig = o.map(p => p[0]).join();
    if (el._sig !== sig || el.childElementCount !== o.length) { el.innerHTML = toSVG(o); el._sig = sig; el._prev = o; return; }
    const kids = el.children, prev = el._prev;
    for (let i = 0; i < o.length; i++) {
      const A = o[i][1], B = prev[i][1];
      for (const k in A) if (A[k] !== B[k]) kids[i].setAttribute(k, A[k]);
      if (o[i][2] !== prev[i][2]) kids[i].textContent = o[i][2];
    }
    el._prev = o;
  }
  const optOf = el => ({ cue: el.classList.contains('cue'), cap: el.classList.contains('cap'), tight: el.dataset.t === '1', secs: el.dataset.secs !== '0' });

  /* ---------- loop (battery, v2.2): runs only while a moving figure is on screen and the app is in the foreground ---------- */
  const mqr = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return null; } })();
  let reduce = !!(mqr && mqr.matches);
  const visible = new Set(), seen = new WeakSet();
  let running = false, dirty = true, last = -1e9;
  const FRAME = 1000 / 30;
  const stillKey = el => el.dataset.pose != null ? +el.dataset.pose : 1;
  const drawStill = el => { el._k = 'still'; patch(el, prims(el.dataset.anim, frameStill(el.dataset.anim, stillKey(el), optOf(el).cue), optOf(el))); };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }); kick(); }) : null;
  function scan() {
    dirty = false;
    document.querySelectorAll('svg.anim').forEach(el => { if (seen.has(el)) return; seen.add(el); drawStill(el); if (io) io.observe(el); else visible.add(el); });
  }
  function redrawAll() { document.querySelectorAll('svg.anim').forEach(el => { if (seen.has(el)) drawStill(el); }); kick(); }
  function loop(ts) {
    running = false;
    if (dirty) scan();
    if (reduce || (typeof document !== 'undefined' && document.hidden)) return;
    const moving = [];
    visible.forEach(el => { if (!el.isConnected) { visible.delete(el); if (io) io.unobserve(el); } else if (!el.classList.contains('still')) moving.push(el); });
    if (!moving.length) return;
    if (ts - last >= FRAME - 2) {
      last = ts;
      moving.forEach(el => {
        const id = el.dataset.anim, a = ANIM[id]; if (!a) return;
        const opt = optOf(el), f = frameAt(id, ts / 1000 / timeline(a).period);
        const key = `${f.i}:${f.e.toFixed(4)}${opt.cap && opt.secs && f.st.lab ? ':' + Math.ceil(f.left - 1e-6) : ''}`;   // nothing changes during a hold
        if (el._k !== key) { el._k = key; patch(el, prims(id, f, opt)); }
      });
    }
    kick();
  }
  function kick() { if (!running && typeof requestAnimationFrame === 'function') { running = true; requestAnimationFrame(loop); } }
  if (typeof MutationObserver === 'function' && typeof document !== 'undefined')
    new MutationObserver(ms => { if (ms.some(m => !(m.target.closest && m.target.closest('svg.anim')))) { dirty = true; if (!document.hidden) kick(); } }).observe(document.documentElement, { childList: true, subtree: true });
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', kick);
  if (mqr && mqr.addEventListener) mqr.addEventListener('change', () => { reduce = mqr.matches; redrawAll(); });
  kick();
  /* svg(id, classes, { tight, pose, secs }): classes "still" (drawn once), "cue" (option C); tight = frame cropped to the figure */
  // class "cap" (guided mode) gets CAP units of room above the figure for the caption, when the exercise has captions
  const vbOf = (id, tight, cap) => { const P = prep(id), v = (tight ? P.vbTA : P.vbA).slice(); if (cap && hasCap(P.a)) { v[1] -= CAP; v[3] += CAP; } return v.join(' '); };
  const svg = (id, cls = '', o = {}) => ANIM[id] ? `<svg class="anim ${cls}" data-anim="${id}"${o.pose != null ? ` data-pose="${o.pose}"` : ''}${o.tight ? ' data-t="1"' : ''}${o.secs === false ? ' data-secs="0"' : ''} viewBox="${vbOf(id, o.tight, /\bcap\b/.test(cls))}" aria-hidden="true"></svg>` : '';
  return {
    has: id => !!ANIM[id], svg, prep, kick, vbOf, isFront: id => !!(ANIM[id] && ANIM[id].v === 'front'),
    // tools and tests: markup for loop position c (option A or C), for v2.2-style "t" between pose 1 and 2, the timeline and the placed joints
    markup: (id, c, opt = {}) => toSVG(prims(id, opt.still ? frameStill(id, opt.key ?? 1, opt.cue) : frameAt(id, c), opt)),
    render: (id, t) => toSVG(prims(id, { k0: 0, k1: 1, e: t }, {})),
    timeline: id => timeline(ANIM[id]), jointsAt: (id, k0, k1, e) => place(prep(id), k0, k1, e), frameAt
  };
})();
