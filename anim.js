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

const ANIM = {
  /* ---- mobility ---- */
  M01: { f: [[-10, 10, 30, -90, -90, -90, 180, -90, -90, -90, 180], [22, -22, -70, -90, -90, -90, 180, -90, -90, -90, 180]], anchor: 'nh' },
  M02: { v: 'front', noground: true, f: [[180, 180, 0, -90, -90, -45, -100, -100, -80, -45, -100], [180, 180, 40, 90, 90, -45, -100, -100, -80, -45, -100]] },
  M03: { f: [m(QUAD, { 7: 90, 8: 90 }), m(QUAD, { 1: -12, 2: -40, 7: -150, 8: 185 })], anchor: 'nh' },
  M04: { f: [[-15, -5, 0, -90, -90, -15, -90, -90, -90, -140, -140], [-15, -5, 70, -90, -90, -15, -90, 90, 90, -140, -140]], anchor: 'nf' },
  M05: { f: [[90, 90, 0, -110, 20, -90, 180, -110, 20, 0, -90], [92, 95, 0, -110, 20, -70, 180, -110, 20, 0, -90]] },
  M06: { f: [[95, 95, 0, -120, -110, 25, -60, -120, -110, 20, -70], [95, 95, 0, -120, -110, 155, -120, -120, -110, 160, -110]] },
  M07: { f: [[180, 180, 0, 60, 75, 60, 60, 60, 75, 0, 0], [180, 180, 0, 70, 85, 82, 82, 70, 85, 0, 0]], props: [{ t: 'band2', a: 'nh', b: 'nf' }] },
  M08: { f: [[85, 90, 0, -90, -90, -20, 180, -90, -90, -20, 180], [-5, -25, -10, -5, 0, -20, 180, -5, 0, -20, 180]], anchor: 'nk' },
  M09: { f: [[180, 180, 0, 40, 20, 60, -40, 40, 20, 45, 0], [180, 180, 0, 55, 30, 80, -20, 55, 30, 62, 10]] },
  M10: { f: [[170, 176, 0, 125, -55, 50, -70, 125, -55, 50, -70], [168, 196, -10, 145, -40, 50, -70, 145, -40, 50, -70]], props: [{ t: 'roller', at: 'mid2', r: 9 }], anchor: 'nf' },
  M11: { f: [[-52, -52, 0, -52, -52, -112, -112, -52, -52, -112, -112], [-52, -52, 0, -52, -52, -95, -135, -52, -52, -112, -112]], anchor: 'nh' },
  M12: { f: [[90, 90, 0, 180, 90, -100, -90, -90, -90, -75, -95], [84, 80, 0, 180, 90, -105, -92, -90, -90, -70, -98]], props: [{ t: 'wall', at: 'ne', dx: -3, fixed: true }] },
  M13: { f: [[80, 82, 0, -80, -60, -90, 100, -80, -60, -5, -90], [90, 92, 0, -80, -60, -72, 112, -80, -60, 0, -90]], props: [{ t: 'box', at: 'nf', side: 'left', w: 34, fixed: true }] },
  M14: { f: [m(QUAD, { 9: -60, 10: -60 }), [10, 5, 0, -60, -60, -135, 180, -60, -60, -60, -60]], anchor: 'nh' },
  M15: { v: 'front', f: [m(ST, { 3: -95, 4: -95, 7: 130, 8: 20 }), m(ST, { 2: 35, 3: -95, 4: -95, 7: 130, 8: 40 })] },
  M16: { f: [[75, 75, 0, 10, 10, -110, -110, 10, 10, -70, -95], [72, 72, 0, 10, 10, -100, -125, 10, 10, -70, -95]], props: [{ t: 'wall', at: 'nh', dx: 4, fixed: true }] },
  M17: { f: [[92, 92, 0, 130, -60, 0, -90, 130, -60, 0, -90], [92, 120, 0, 150, -40, 0, -90, 150, -40, 0, -90]], props: [{ t: 'box', at: 'hip', side: 'under', w: 40, h: 40, fixed: true }, { t: 'wall', at: 'hip', dx: -18, h: 70, fixed: true }] },
  M18: { f: [[50, 60, 0, -100, -90, -10, 180, -100, -90, 182, 180], [20, 5, -20, -30, 0, -10, 180, -30, 0, 182, 180]] },
  /* ---- core: anti-extension ---- */
  C01: { f: [[180, 180, 0, 90, 90, 90, 0, 90, 90, 90, 0], [180, 180, 0, 90, 90, 5, 0, 170, 175, 90, 0]] },
  C03: { f: [FPLANK, FPLANK] },
  C20: { f: [FPLANK, m(FPLANK, { 7: 5, 8: 5 })], anchor: 'nh' },
  C06: { f: [[180, 180, 0, 172, 176, 0, 0, 172, 176, 0, 0], [180, 160, 0, 155, 165, 22, 15, 155, 165, 22, 15]] },
  C16: { f: [[180, 180, 0, 90, 90, 90, 0, 90, 90, 90, 0], [180, 180, 0, 90, 90, 5, 0, 90, 90, 90, 0]], props: [{ t: 'db', at: 'nh' }] },
  S09: { f: [[180, 180, 0, 90, 90, 90, 0, 60, 55, 90, 0], [180, 180, 0, 170, 175, 5, 0, 60, 55, 90, 0]], props: [{ t: 'circ', at: 'fk', dx: -8, dy: -16, r: 13 }] },
  C12: { f: [FPLANK, [11, 11, 0, -60, 0, 191, 191, -60, 0, 191, 191]], anchor: 'nf', props: [{ t: 'pad', at: 'nf' }] },
  C17: { f: [[60, 60, 0, -30, 0, -90, 180, -30, 0, -90, 180], [18, 14, 0, 5, 5, -150, 180, 5, 5, -150, 180]], anchor: 'nk', props: [{ t: 'circ', at: 'nh', dx: -6, dy: 18, r: 15 }] },
  C18: { f: [[14, 14, 0, -80, 0, 196, 196, -80, 0, 196, 196], [14, 14, 0, -60, 10, 196, 196, -60, 10, 196, 196]], anchor: 'nf', props: [{ t: 'circ', at: 'ne', dx: 6, dy: 18, r: 16, fixed: true }] },
  /* ---- core: anti-rotation ---- */
  C02: { f: [QUAD, m(QUAD, { 2: 5, 5: 180, 6: 180, 7: 8, 8: 8 })], anchor: 'nh' },
  C05: { f: [[90, 90, 0, -60, 0, -95, -85, -60, 0, -85, -95], [90, 90, 0, -5, -5, -95, -85, -5, -5, -85, -95]], props: [{ t: 'band', from: 'sh', dx: -40, dy: 0, to: 'nh' }] },
  C30: { f: [m(QUAD, { 5: 180, 6: 180, 7: 8, 8: 8 }), m(QUAD, { 0: 12, 1: -5, 2: -30, 5: -45, 6: -150, 7: -60, 8: -150 })], anchor: 'nh' },
  C07: { f: [PLANK, m(PLANK, { 7: -40, 8: 160 })], anchor: 'nh' },
  S04: { f: [[90, 90, 0, -60, 0, -90, 180, -60, 0, -90, 180], [90, 90, 0, -5, -5, -90, 180, -5, -5, -90, 180]], props: [{ t: 'band', from: 'sh', dx: -40, dy: 0, to: 'nh' }] },
  C26: { f: [[90, 90, 0, -60, 0, -95, -85, -60, 0, -85, -95], [90, 90, 0, -5, -5, -95, -85, -5, -5, -85, -95]], props: [{ t: 'band', from: 'sh', dx: -40, dy: 0, to: 'nh' }] },
  C23: { f: [[0, 0, 0, -90, -90, -80, 185, -90, -90, -80, 185], [0, 0, -10, -90, -90, -80, 185, -40, 160, -80, 185]], anchor: 'nh' },
  C10: { f: [PLANK, m(PLANK, { 7: 150, 8: -90 })], anchor: 'nh', props: [{ t: 'db', at: 'nh' }, { t: 'db', at: 'fh' }] },
  /* ---- core: anti-lateral flexion (side planks: front view, lying on the left side) ---- */
  C24: { v: 'front', f: [[185, 172, 0, -20, -20, -10, -110, -90, 180, -10, -110], [165, 165, 0, -20, -20, -25, -110, -90, 180, -25, -110]] },
  C04: { v: 'front', f: [[198, 166, 0, -20, -20, -4, -4, -90, 180, -4, -4], [171, 171, 0, 90, 90, -9, -9, -90, 180, -9, -9]] },
  C25: { v: 'front', f: [[171, 171, 0, -20, -20, -9, -9, -90, 180, -9, -9], [171, 171, 0, -20, -20, 18, 18, -90, 180, -9, -9]] },
  C15: { v: 'front', f: [[171, 171, 0, 90, 90, -9, -9, -90, 180, -9, -9], [176, 168, -20, -120, -160, -9, -9, -90, 180, -9, -9]] },
  C08: { v: 'front', f: [[190, 175, 0, -20, -20, -12, -12, -90, 180, -60, -95], [171, 171, 0, -20, -20, -9, -9, -90, 180, -25, -30]], props: [{ t: 'box', at: 'nf', side: 'under', w: 26, h: 30, fixed: 1 }] },
  C11: { v: 'front', f: [m(ST, { 3: -92, 4: -92, 5: -97, 6: -92, 9: -83, 10: -88 }), m(ST, { 3: -92, 4: -92, 5: -83, 6: -88, 9: -97, 10: -92 })], props: [{ t: 'db', at: 'nh' }] },
  /* ---- core: rotation ---- */
  C31: { f: [[180, 180, 0, -10, 0, 90, 0, -10, 0, 90, 0], [180, 180, 0, -10, 0, 30, -40, -10, 0, 35, -35]] },
  C13: { v: 'front', f: [[90, 90, 0, 140, 135, -60, -100, 125, 145, -100, -95], [88, 88, 0, -50, -55, -60, -100, -40, -65, -100, -95]], props: [{ t: 'band', from: 'sh', dx: -55, dy: -45, to: 'nh' }] },
  C14: { v: 'front', f: [[90, 90, 0, -130, -125, -60, -100, -140, -115, -100, -95], [92, 92, 0, 50, 45, -60, -100, 40, 60, -100, -95]], props: [{ t: 'band', from: 'sh', dx: -55, dy: 70, to: 'nh' }] },
  C27: { v: 'front', f: [m(ST, { 3: 60, 4: 130, 7: 110, 8: 40 }), m(ST, { 3: 140, 4: 60, 7: 120, 8: 50 })], props: [{ t: 'db', at: 'nh' }] },
  /* ---- power ---- */
  P01: { v: 'front', f: [[90, 90, 0, 140, 135, -95, -92, 125, 145, -85, -88], [86, 84, 0, -45, -50, -105, -95, -35, -60, -80, -90]], props: [{ t: 'band', from: 'sh', dx: -55, dy: -45, to: 'nh' }], period: 2.4 },
  P02: { f: [PLANK, m(PLANK, { 5: -10, 6: -160 })], anchor: 'nh', period: 1.6 },
  P03: { f: [[2, 2, 0, 160, 160, 182, 182, 160, 160, 182, 182], PLANK], anchor: 'nf', period: 2.4 },
  P04: { f: [[35, 30, 10, -110, -120, -80, -98, -110, -120, -100, -88], [90, 90, 0, 0, 0, -90, -90, 0, 0, -90, -90]], anchor: 'nf', props: [{ t: 'db', at: 'nh' }], period: 2 },
  P05: { f: [PLANK, m(PLANK, { 5: -40, 6: 200, 9: -40, 10: 200 })], anchor: 'nh', props: [{ t: 'circ', at: 'nsm', dx: 0, dy: 16, r: 14 }] },
  /* ---- hips: bridge ---- */
  H01: { f: [[180, 180, 0, 0, 0, 58, -62, 0, 0, 58, -62], [205, 200, 0, 0, 0, 25, -85, 0, 0, 25, -85]] },
  H11: { f: [[180, 180, 0, 0, 0, 58, -62, 0, 0, 58, -62], [205, 200, 0, 0, 0, 25, -85, 0, 0, 25, -85]], props: [{ t: 'miniband', at: 'nk' }] },
  H02: { f: [[180, 180, 0, 0, 0, 58, -62, 0, 0, 45, 45], [205, 200, 0, 0, 0, 25, -85, 0, 0, 20, 20]] },
  H05: { f: [[150, 160, 0, -60, 0, 60, -70, -60, 0, 60, -70], [180, 182, 0, -60, 0, 15, -85, -60, 0, 15, -85]], anchor: 'nf', props: [{ t: 'box', at: 'sh', side: 'under', w: 34, h: 26, fixed: true }, { t: 'db', at: 'hip' }] },
  H08: { f: [[150, 160, 0, -60, 0, 60, -70, -60, 0, 60, 60], [180, 182, 0, -60, 0, 15, -85, -60, 0, 15, 15]], anchor: 'nf', props: [{ t: 'box', at: 'sh', side: 'under', w: 34, h: 26, fixed: true }] },
  H09: { f: [[150, 160, 0, -60, 0, 60, -70, -60, 0, 60, -70], [180, 182, 0, -60, 0, 15, -85, -60, 0, 15, -85]], anchor: 'nf', props: [{ t: 'box', at: 'sh', side: 'under', w: 34, h: 26, fixed: true }, { t: 'bar', at: 'hip' }] },
  H10: { f: [[192, 188, 0, -10, -10, 4, 4, -10, -10, 4, 4], [205, 200, 0, -10, -10, 45, -45, -10, -10, 45, -45]], anchor: 'sh', props: [{ t: 'circ', at: 'nf', dx: 0, dy: 15, r: 14 }] },
  /* ---- hips: abduction ---- */
  H07: { v: 'front', f: [[180, 180, 0, -20, -10, 0, 0, 175, 178, 0, 0], [180, 180, 0, -20, -10, 32, 32, 175, 178, 0, 0]] },
  H03: { v: 'front', f: [[180, 180, 0, -20, -10, -25, 10, 175, 178, -25, 10], [180, 180, 0, -20, -10, 20, -30, 175, 178, -25, 10]] },
  H04: { v: 'front', f: [m(ST, { 0: 92, 1: 92, 3: -100, 4: -80, 5: -100, 6: -92, 7: -80, 8: -100, 9: -82, 10: -88 }), m(ST, { 0: 92, 1: 92, 3: -100, 4: -80, 5: -118, 6: -98, 7: -80, 8: -100, 9: -62, 10: -82 })], props: [{ t: 'band2', a: 'nk', b: 'fk' }], shift: [0, 14] },
  H13: { v: 'front', f: [[90, 90, 0, -100, -90, -50, -90, -80, -90, -130, -90], [90, 90, 0, -100, -90, -20, -90, -80, -90, -160, -90]], props: [{ t: 'box', at: 'hip', side: 'under', w: 40, h: 46, fixed: true }] },
  H12: { v: 'front', f: [[185, 172, 0, -20, -20, -10, -110, -90, 180, -10, -110], [168, 168, 0, -20, -20, 20, -130, -90, 180, -25, -110]], props: [{ t: 'band2', a: 'nk', b: 'fk' }] },
  /* ---- hips: hinge ---- */
  H20: { f: [ST, [35, 35, 0, 120, -150, -80, -100, 120, -150, -80, -100]], anchor: 'nf', props: [{ t: 'stick' }] },
  H06: { f: [ST, [0, 0, 0, -90, -90, -95, -88, -90, -90, 180, 180]], anchor: 'nf' },
  H17: { f: [ST, [35, 35, 0, -60, 120, -80, -98, -60, 120, -80, -98]], anchor: 'nf', props: [{ t: 'band2', a: 'nf', b: 'sh' }] },
  H14: { f: [ST, [0, 0, 0, -90, -90, -95, -88, -90, -90, 180, 180]], anchor: 'nf', props: [{ t: 'db', at: 'fh' }] },
  H15: { f: [ST, [30, 30, 0, -90, -90, -82, -98, -90, -90, -82, -98]], anchor: 'nf', props: [{ t: 'db', at: 'nh' }] },
  H19: { f: [[-100, -100, 0, -100, -100, -140, -140, -100, -100, -140, -140], [40, 40, 0, 120, -60, -140, -140, 120, -60, -140, -140]], anchor: 'nf' },
  H18: { f: [[45, 45, 0, -90, -90, -40, -105, -90, -90, -40, -105], ST], anchor: 'nf', props: [{ t: 'bar', at: 'nh' }] },
  /* ---- legs ---- */
  L01: { f: [m(ST, { 3: 0, 4: 0, 7: 0, 8: 0 }), [60, 65, 0, 0, 0, -8, -100, 0, 0, -8, -100]], anchor: 'nf', props: [{ t: 'box', at: 'hip', side: 'under', w: 34, h: 0, fixed: 1, dx: -10 }] },
  L04: { f: [ST, [90, 90, 0, -90, -90, 0, -90, -90, -90, 0, -90]], anchor: 'nf', props: [{ t: 'wall', at: 'hip', dx: -8, fixed: 1 }] },
  L05: { f: [ST, [90, 90, 0, 0, 0, 0, -90, 0, 0, 0, -90]], anchor: 'nf', props: [{ t: 'circ', at: 'mid', dx: -16, dy: 0, r: 14 }, { t: 'wall', at: 'mid', dx: -32, fixed: 1 }] },
  L02: { f: [m(ST, { 3: -60, 4: 90, 7: -60, 8: 90 }), [72, 72, 0, -60, 90, -5, -110, -60, 90, -5, -110]], anchor: 'nf', props: [{ t: 'db', at: 'nh' }] },
  L06: { f: [[125, 125, 0, -60, -10, 80, 0, -60, -10, 80, 0], [125, 125, 0, -60, -10, 42, 42, -60, -10, 42, 42]], anchor: 'hip', props: [{ t: 'box', at: 'hip', side: 'under', w: 50, h: 20, fixed: true }, { t: 'plate', at: 'nf' }] },
  L03: { f: [m(ST, { 3: -130, 4: 100, 7: -130, 8: 100 }), [62, 66, 0, -130, 100, -5, -112, -130, 100, -5, -112]], anchor: 'nf', props: [{ t: 'bar', at: 'sh' }] },
  L11: { f: [[90, 90, 0, -95, -95, -70, -95, -95, -95, -110, -100], [90, 90, 0, -95, -95, -5, -95, -95, -95, -120, 180]], anchor: 'nf' },
  L09: { f: [[88, 88, 0, -95, -95, -30, -100, -95, -95, -110, -95], [90, 90, 0, -95, -95, -90, -90, -95, -95, -100, -100]], anchor: 'nf', props: [{ t: 'box', at: 'nf', side: 'under', w: 40, h: 0, fixed: true }] },
  L08: { f: [ST, [90, 90, 0, -95, -95, -5, -95, -95, -95, -120, 180]], anchor: 'nf' },
  L07: { f: [[90, 90, 0, -95, -95, -60, -95, -95, -95, -110, 150], [90, 90, 0, -95, -95, -8, -95, -95, -95, -125, 165]], anchor: 'nf', props: [{ t: 'box', at: 'ff', side: 'under', w: 30, h: 0, fixed: true }] },
  L10: { f: [ST, [90, 90, 0, -95, -95, -5, -95, -95, -95, -120, 180]], anchor: 'nf', props: [{ t: 'db', at: 'nh' }] },
  L12: { f: [m(ST, { 3: -100, 4: -60, 9: -90, 10: 180 }), m(ST, { 3: -100, 4: -60, 9: -90, 10: 180 })], lift: [0, 10], props: [{ t: 'box', at: 'nf', side: 'under', w: 30, h: 0, fixed: true }] },
  L13: { f: [[95, 95, 0, -90, -90, -70, -70, -90, -90, -70, -70], [95, 95, 0, -90, -90, -70, -70, -90, -90, -70, -70]], props: [{ t: 'wall', at: 'mid', dx: -8, fixed: true }, { t: 'pulse', at: 'nf', r: [3, 9] }] },
  P06: { f: [[60, 60, 0, -120, -110, -15, -105, -120, -110, -15, -105], m(ST, { 3: 100, 4: 100, 7: 100, 8: 100 })], lift: [0, 24], period: 1.8 },
  P07: { v: 'front', f: [[85, 85, 0, -60, -40, -105, -88, -140, -150, -150, -100], [95, 95, 0, -40, -30, -30, -80, -120, -140, -75, -92]], shift: [-28, 28], period: 1.8 },
  P08: { f: [[88, 88, 0, 20, 10, -30, -100, -150, -120, -110, -95], [90, 90, 0, -150, -120, -90, -90, 30, 20, 0, -90]], anchor: 'nf', props: [{ t: 'box', at: 'nf', side: 'under', w: 40, h: 0, fixed: true }], period: 2 },
  /* ---- upper body ---- */
  R18: { f: [[105, 105, 0, 12, 12, -78, -78, 12, 12, -78, -78], [97, 97, 0, -150, 30, -84, -84, -150, 30, -84, -84]], anchor: 'nf', props: [{ t: 'wall', at: 'nh', dx: 4, fixed: true }] },
  R02: { f: [[90, 90, 0, 0, 0, -95, -85, 0, 0, -85, -95], [90, 90, 0, -150, 0, -95, -85, -150, 0, -85, -95]], props: [{ t: 'band', from: 'sh', dx: 60, dy: 6, to: 'nh' }] },
  R05: { f: [[0, 0, 0, -90, -90, -90, -90, -90, -90, -90, 180], [0, 0, 0, 155, -90, -90, -90, -90, -90, -90, 180]], anchor: 'fh', props: [{ t: 'box', at: 'fk', side: 'under', w: 60, h: 0, fixed: true, dx: 14 }, { t: 'db', at: 'nh' }] },
  R11: { f: [[90, 90, 0, 95, 95, 0, -90, 95, 95, 0, -90], [90, 90, 0, -70, 100, 0, -90, -70, 100, 0, -90]], props: [{ t: 'box', at: 'hip', side: 'under', w: 40, h: 46, fixed: true }, { t: 'bar', at: 'nh' }] },
  R10: { f: [[30, 30, 0, -90, -90, -80, -100, -90, -90, -80, -100], [30, 30, 0, 160, -90, -80, -100, 160, -90, -80, -100]], anchor: 'nf', props: [{ t: 'db', at: 'nh' }] },
  R13: { f: [[35, 35, 0, -90, -90, 215, 215, -90, -90, 215, 215], [28, 28, 0, -150, -70, 208, 208, -150, -70, 208, 208]], anchor: 'nf', props: [{ t: 'box', at: 'nh', side: 'under', w: 30, h: 0, fixed: true }] },
  R04: { f: [PLANK, [5, 5, 0, -150, -80, 185, 185, -150, -80, 185, 185]], anchor: 'nh' },
  R07: { f: [[180, 180, 0, 90, 90, 60, -60, 90, 90, 60, -60], [180, 180, 0, -15, 90, 60, -60, -15, 90, 60, -60]], props: [{ t: 'db', at: 'nh' }] },
  R14: { f: [[180, 180, 0, 90, 90, -60, -95, 90, 90, -60, -95], [180, 180, 0, -40, 90, -60, -95, -40, 90, -60, -95]], anchor: 'mid', props: [{ t: 'box', at: 'mid', side: 'under', w: 70, h: 0, fixed: true }, { t: 'db', at: 'nh' }] },
  R15: { f: [[-10, -10, 0, -90, -90, 170, 170, -90, -90, 170, 170], [-18, -18, 0, -150, -75, 166, 166, -150, -75, 166, 166]], anchor: 'nh', props: [{ t: 'box', at: 'nf', side: 'under', w: 30, h: 0, fixed: true }] },
  R01: { f: [[0, 3, 0, 10, 10, 180, 180, 10, 10, 180, 180], [0, 6, 0, 150, 60, 180, 180, 150, 60, 180, 180]] },
  R03: { v: 'front', f: [m(ST, { 3: -40, 4: 175, 7: -140, 8: 5 }), m(ST, { 3: 0, 4: 0, 7: 180, 8: 180 })], props: [{ t: 'band2', a: 'nh', b: 'fh' }] },
  R06: { f: [[0, 4, 0, 5, 5, 180, 180, 5, 5, 180, 180], [0, 9, 0, 178, 178, 180, 180, 178, 178, 180, 180]] },
  R08: { f: [[90, 90, 0, 15, 15, -95, -85, 15, 15, -85, -95], [90, 90, 0, 160, 55, -95, -85, 160, 55, -85, -95]], props: [{ t: 'band', from: 'sh', dx: 60, dy: -16, to: 'nh' }] },
  R16: { f: [[-20, -20, 0, -90, -90, 200, 192, -90, -90, 200, 192], [-20, -14, 0, 20, 20, 200, 192, 20, 20, 200, 192]], anchor: 'nf', props: [{ t: 'circ', at: 'hip', dx: 4, dy: 18, r: 18, fixed: true }] },
  R17: { v: 'front', f: [m(ST, { 3: -92, 4: -92, 7: -88, 8: -88, 5: -97, 6: -92, 9: -83, 10: -88 }), m(ST, { 3: -92, 4: -92, 7: -88, 8: -88, 5: -83, 6: -88, 9: -97, 10: -92 })], props: [{ t: 'db', at: 'nh' }, { t: 'db', at: 'fh' }] },
  /* ---- stability ---- */
  S01: { f: [m(ST, { 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 }), m(ST, { 0: 88, 1: 92, 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 })], period: 4 },
  S06: { f: [m(ST, { 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 }), m(ST, { 0: 87, 1: 93, 2: -10, 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 })], period: 4 },
  S07: { f: [m(ST, { 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 }), m(ST, { 0: 87, 1: 93, 2: 25, 3: -110, 4: 20, 7: -110, 8: 20, 9: -30, 10: -100 })], props: [{ t: 'pad', at: 'nf' }], period: 3 },
  S02: { f: [[80, 85, 0, -60, -60, -100, -80, -120, -120, -40, -55], [100, 100, 0, -60, -60, -100, -80, -120, -120, -140, -125]], anchor: 'nf', period: 3.6 },
  S03: { f: [[180, 180, 0, -5, -30, 90, 0, -5, -30, 90, 0], [180, 180, 0, -5, -30, 90, 0, -5, -30, 90, 0]], props: [{ t: 'box', at: 'nf', side: 'under', w: 30, fixed: true }, { t: 'pulse', at: 'mid', r: [4, 11] }], period: 10 },
  C09: { f: [QUAD, [0, 0, 0, -90, -90, -80, 185, -90, -90, -80, 185]], anchor: 'nh' },
  S05: { f: [[0, 0, 0, -90, -90, -80, 185, -90, -90, -80, 185], [0, 0, 0, -65, -100, -80, 185, -90, -90, -60, -155]], anchor: 'fh', period: 2 },
  /* ---- release ---- */
  F01: { f: [[12, 12, 0, -90, 0, 186, 186, -90, 0, 186, 186], [12, 12, 0, -90, 0, 186, 186, -90, 0, 186, 186]], shift: [-10, 10], props: [{ t: 'roller', at: 'ntm', r: 9, fixed: true }] },
  F05: { f: [[115, 115, 0, -125, -100, 0, 0, -125, -100, 0, 0], [115, 115, 0, -125, -100, 0, 0, -125, -100, 0, 0]], shift: [-10, 10], props: [{ t: 'roller', at: 'ntm', r: 9, fixed: true }] },
  F04: { f: [[115, 115, 0, -125, -100, 0, 0, -125, -100, 0, 0], [115, 115, 0, -125, -100, 0, 0, -125, -100, 0, 0]], shift: [-10, 10], props: [{ t: 'roller', at: 'nsm', r: 9, fixed: true }] },
  F02: { f: [[110, 105, 0, -130, -110, 30, -70, -130, -110, 40, -5], [100, 98, 0, -130, -110, 40, -65, -130, -110, 50, 0]], props: [{ t: 'ball', at: 'hip', r: 6 }] },
  F03: { f: [[160, 172, 0, 60, -60, 45, -75, 60, -60, 45, -75], [168, 176, 0, 60, -60, 58, -70, 60, -60, 58, -70]], props: [{ t: 'roller', at: 'mid2', r: 9 }] },
  F06: { f: [m(ST, { 5: -88, 6: -100 }), m(ST, { 5: -95, 6: -78 })], anchor: 'ff', props: [{ t: 'ball', at: 'nf', r: 5, fixed: true }] },
  F07: { f: [m(ST, { 0: 82, 1: 80, 3: -90, 4: -90 }), m(ST, { 0: 82, 1: 80, 3: 20, 4: 40 })], anchor: 'nf', props: [{ t: 'wall', at: 'sh', dx: 18, fixed: true }, { t: 'ball', at: 'sh', r: 5, fixed: true, side: true }] },
  /* ---- v2.1 additions ---- */
  R19: { f: [[172, 172, 0, 90, 90, -8, -8, 90, 90, -8, -8], [160, 160, 0, -55, 95, -20, -20, -55, 95, -20, -20]], anchor: 'nf', props: [{ t: 'bar', at: 'nh', fixed: true }] },
  R20: { f: [[180, 180, 0, 0, 90, 58, -62, 0, 90, 58, -62], [180, 170, 0, -20, 80, 58, -62, -20, 80, 58, -62]] },
  H21: { f: [m(PRONE, { 1: 3 }), m(PRONE, { 1: 16, 3: 172, 4: 172, 7: 172, 8: 172 })] },
  H22: { f: [m(PRONE, { 3: 0, 4: 0, 7: 0, 8: 0 }), m(PRONE, { 1: 10, 3: 8, 4: 8, 5: 174, 6: 174, 7: 8, 8: 8, 9: 174, 10: 174 })] },
  H23: { f: [[-25, -25, 0, -150, 60, 180, 180, -150, 60, 180, 180], [0, 0, 0, -150, 60, 180, 180, -150, 60, 180, 180]], anchor: 'nk', props: [{ t: 'box', at: 'nk', side: 'under', w: 50, h: 40, fixed: true }] },
  L14: { f: [m(ST, { 3: -100, 4: -60, 5: -78, 6: -102, 9: -90, 10: 180 }), m(ST, { 3: -100, 4: -60, 5: -78, 6: -102, 9: -90, 10: 180 })], lift: [0, 10], props: [{ t: 'box', at: 'nf', side: 'under', w: 30, h: 0, fixed: true }] },
  L15: { f: [[90, 90, 0, -90, -90, 0, -90, -90, -90, 0, -90], [90, 90, 0, -90, -90, 0, -90, -90, -90, 0, -90]], lift: [0, 6], props: [{ t: 'wall', at: 'hip', dx: -8, fixed: true }] },
  H24: { f: [[180, 180, 0, 0, 0, 58, -62, 0, 0, 58, -62], [180, 180, 0, 0, 0, 60, -60, 0, 0, 60, -60]], props: [{ t: 'pulse', at: 'nk', r: [4, 9] }] },
  H25: { v: 'front', f: [[190, 175, 0, -20, -20, -12, -60, -90, 180, -60, -95], [171, 171, 0, -20, -20, -9, -60, -90, 180, -25, -30]], props: [{ t: 'box', at: 'nk', side: 'under', w: 26, h: 30, fixed: 1 }] },
  L16: { f: [m(ST, { 3: 0, 4: 0, 7: 0, 8: 0, 9: -30, 10: -30 }), [60, 65, 0, 0, 0, -8, -100, 0, 0, -5, -5]], anchor: 'nf', props: [{ t: 'box', at: 'hip', side: 'under', w: 34, h: 0, fixed: 1, dx: -10 }] },
  L17: { f: [[90, 90, 0, -10, 0, -70, -95, -95, -95, -110, -100], [90, 90, 0, -10, 0, -25, -95, -95, -95, -118, 175]], anchor: 'nf', props: [{ t: 'wall', at: 'nh', dx: 4, fixed: true }] },
  R21: { f: [[70, 70, 0, 0, 0, -110, -110, 0, 0, -110, -110], [64, 64, 0, -40, 40, -114, -114, -40, 40, -114, -114]], anchor: 'nf', props: [{ t: 'wall', at: 'nh', dx: 3, fixed: true }] },
  R22: { f: [[90, 90, 0, -150, 0, -95, -85, -150, 0, -85, -95], [90, 90, 0, 0, 0, -95, -85, 0, 0, -85, -95]], props: [{ t: 'band', from: 'sh', dx: -50, dy: 0, to: 'nh' }] }
};
const ANIMV = (() => {
  const d2r = Math.PI / 180, dir = (a, L) => [Math.cos(a * d2r) * L, Math.sin(a * d2r) * L];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]], midp = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function joints(q, front) {
    const [tl, tu, hd, nua, nfa, nth, nsh, fua, ffa, fth, fsh] = q, hip = [0, 0];
    const mid = add(hip, dir(tl, SEG.tl)), sh = add(mid, dir(tu, SEG.tu)), mid2 = add(mid, dir(tu, SEG.tu * 0.45));
    const head = add(sh, dir(tu + hd, SEG.head));
    const ns = front ? add(sh, dir(tu - 90, 12)) : sh, fs = front ? add(sh, dir(tu + 90, 12)) : sh;
    const nhp = front ? add(hip, dir(tl - 90, 7)) : hip, fhp = front ? add(hip, dir(tl + 90, 7)) : hip;
    const ne = add(ns, dir(nua, SEG.ua)), nh = add(ne, dir(nfa, SEG.fa)), fe = add(fs, dir(fua, SEG.ua)), fh = add(fe, dir(ffa, SEG.fa));
    const nk = add(nhp, dir(nth, SEG.th)), nf = add(nk, dir(nsh, SEG.sh)), fk = add(fhp, dir(fth, SEG.th)), ff = add(fk, dir(fsh, SEG.sh));
    return { hip, mid, mid2, sh, head, ns, fs, nhp, fhp, ne, nh, fe, fh, nk, nf, fk, ff, nsm: midp(nk, nf), ntm: midp(nhp, nk), fsm: midp(fk, ff) };
  }
  const G = 152;
  const flip = j => { const s = {}; for (const k in j) s[k] = [j[k][0], -j[k][1]]; return s; };
  const move = (s, dx, dy) => { for (const k in s) s[k] = [s[k][0] + dx, s[k][1] + dy]; return s; };
  function grounded(s, props) {
    let low = -Infinity;
    for (const k in s) { if (k === 'nsm' || k === 'ntm' || k === 'fsm' || k === 'mid2') continue; low = Math.max(low, s[k][1] + (k === 'head' ? SEG.hr : 4)); }
    (props || []).forEach(p => {
      const at = s[p.at]; if (!at || p.fixed !== undefined) return;
      if (p.t === 'ball' || p.t === 'roller') low = Math.max(low, at[1] + 5 + 2 * p.r);
      if (p.t === 'circ' && p.dy > 0) low = Math.max(low, at[1] + p.dy + p.r);
    });
    (props || []).forEach(p => { if (p.t === 'box' && p.side === 'under' && p.h && s[p.at] && p.fixed === undefined) low = Math.max(low, s[p.at][1] + 4 + p.h); });
    return move(s, 0, G - low);
  }
  const cache = {};
  function base(a, t) {
    const q = a.f[0].map((v, i) => v + (a.f[1][i] - v) * t);
    return flip(joints(q, a.v === 'front'));
  }
  function pose(a, t, f0) {
    let s = base(a, t);
    if (a.anchor && f0) { const d = [f0[a.anchor][0] - s[a.anchor][0], f0[a.anchor][1] - s[a.anchor][1]]; move(s, d[0], d[1]); }
    else s = grounded(s, a.props);
    // props with a height ('box' under with h) or fixed supports: lift so the supported point sits on top
    if (!a.anchor) (a.props || []).forEach(p => { if (p.t === 'box' && p.side === 'under' && p.h && p.fixed !== undefined) { /* static furniture: body already placed */ } });
    const lift = a.lift ? a.lift[0] + (a.lift[1] - a.lift[0]) * t : 0, sh = a.shift ? a.shift[0] + (a.shift[1] - a.shift[0]) * t : 0;
    return move(s, sh, -lift);
  }
  function prep(id) {
    if (cache[id]) return cache[id];
    const a = ANIM[id]; if (!a) return null;
    const f0 = pose(a, 0, null);
    // supports with a height: raise the whole figure so that the supported point sits on the support
    let raise = 0;
    (a.props || []).forEach(p => { if (p.t === 'box' && p.side === 'under' && p.h && p.fixed !== undefined) raise = Math.max(raise, p.h - (G - 4 - f0[p.at][1])); });
    if (raise > 0) move(f0, 0, -raise);
    const P = { a, f0, raise };
    const samples = [0, .25, .5, .75, 1].map(t => frame(P, t));
    let minx = Infinity, maxx = -Infinity, miny = Infinity;
    samples.forEach(s => { for (const k in s) { minx = Math.min(minx, s[k][0] - 10); maxx = Math.max(maxx, s[k][0] + 10); miny = Math.min(miny, s[k][1] - (k === 'head' ? SEG.hr : 6)); } });
    (a.props || []).forEach(p => {
      const s = samples[0];
      if (p.t === 'band') { minx = Math.min(minx, s[p.from][0] + p.dx - 6); maxx = Math.max(maxx, s[p.from][0] + p.dx + 6); miny = Math.min(miny, s[p.from][1] + p.dy - 14); }
      if (p.t === 'box' && s[p.at]) { const x = s[p.at][0] + (p.dx || 0); minx = Math.min(minx, x - p.w); maxx = Math.max(maxx, x + p.w); }
      if (p.t === 'wall') miny = Math.min(miny, G - (p.h || 120));
      if (p.t === 'circ' && s[p.at]) { minx = Math.min(minx, s[p.at][0] + (p.dx || 0) - p.r - 4); maxx = Math.max(maxx, s[p.at][0] + (p.dx || 0) + p.r + 4); }
    });
    P.ox = 120 - (minx + maxx) / 2;
    P.w = Math.max(240, maxx - minx + 12);
    const top = Math.floor(Math.min(miny - 8, G - 90));
    P.vb = `${(120 - P.w / 2).toFixed(0)} ${top} ${P.w.toFixed(0)} ${G + 8 - top}`;
    // v2.2: tight frame (guided mode, thumbnails): only as wide as the figure needs (at least 0,8 × the height), so a standing figure is drawn bigger
    const hgt = G + 8 - top, wT = Math.min(P.w, Math.max(maxx - minx + 16, hgt * 0.8));
    P.vbT = `${(120 - wT / 2).toFixed(0)} ${top} ${wT.toFixed(0)} ${hgt}`;
    P.fx = {}; return (cache[id] = P);
  }
  function frame(P, t) { const s = pose(P.a, t, P.a.anchor ? P.f0 : null); if (!P.a.anchor && P.raise > 0) move(s, 0, -P.raise); return s; }
  let colors = null;
  const readColors = () => { const cs = getComputedStyle(document.documentElement); colors = { fg: cs.getPropertyValue('--fg').trim() || '#111', far: cs.getPropertyValue('--far').trim() || '#A7ACB6', gr: cs.getPropertyValue('--line').trim() || '#ccc', ac: cs.getPropertyValue('--accent').trim() || '#2448C8' }; };
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { colors = null; redrawAll(); }); } catch (e) { }
  function render(id, t) {
    const P = prep(id); if (!P) return '';
    if (!colors) readColors();
    const a = P.a, front = a.v === 'front';
    const s = move(frame(P, t), P.ox, 0);
    const fixedAt = k => { if (!P.fx[k]) P.fx[k] = move(frame(P, k), P.ox, 0); return P.fx[k]; };
    const c = colors, f = n => n.toFixed(1), L = (p, q, col, w) => `<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
    let back = '', top = '';
    (a.props || []).forEach(p => {
      const src = p.fixed === undefined || p.fixed === false ? s : fixedAt(p.fixed === true ? 0 : p.fixed);
      const at = p.at ? src[p.at] : null;
      if (p.t === 'wall') back += `<line x1="${f(at[0] + p.dx)}" y1="${G}" x2="${f(at[0] + p.dx)}" y2="${G - (p.h || 120)}" stroke="${c.far}" stroke-width="4" stroke-linecap="round"/>`;
      if (p.t === 'box') { const x0 = at[0] + (p.dx || 0), topY = at[1] + 4, x = p.side === 'left' ? x0 - p.w + 4 : x0 - p.w / 2; back += `<rect x="${f(x)}" y="${f(topY)}" width="${p.w}" height="${f(Math.max(4, G - topY))}" rx="3" fill="none" stroke="${c.far}" stroke-width="3"/>`; }
      if (p.t === 'ball') back += p.side ? `<circle cx="${f(at[0] + 10)}" cy="${f(at[1] + 4)}" r="${p.r}" fill="${c.ac}"/>` : `<circle cx="${f(at[0])}" cy="${f(at[1] + 5 + p.r)}" r="${p.r}" fill="${c.ac}"/>`;
      if (p.t === 'roller') back += `<circle cx="${f(at[0])}" cy="${f(at[1] + 5 + p.r)}" r="${p.r}" fill="none" stroke="${c.ac}" stroke-width="3"/><circle cx="${f(at[0])}" cy="${f(at[1] + 5 + p.r)}" r="3" fill="${c.ac}"/>`;
      if (p.t === 'circ') back += `<circle cx="${f(at[0] + (p.dx || 0))}" cy="${f(at[1] + (p.dy || 0))}" r="${p.r}" fill="none" stroke="${c.ac}" stroke-width="3"/>`;
      if (p.t === 'pad') back += `<rect x="${f(at[0] - 10)}" y="${f(at[1] + 3)}" width="20" height="5" rx="2" fill="${c.ac}"/>`;
      if (p.t === 'band') { const fr = fixedAt(0)[p.from], to = s[p.to], ax = fr[0] + p.dx, ay = fr[1] + p.dy; back += `<line x1="${f(ax)}" y1="${G}" x2="${f(ax)}" y2="${f(Math.min(ay - 8, G - 20))}" stroke="${c.far}" stroke-width="4" stroke-linecap="round"/>`; top += `<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(to[0])}" y2="${f(to[1])}" stroke="${c.ac}" stroke-width="3" stroke-dasharray="5 4" stroke-linecap="round"/>`; }
      if (p.t === 'band2') top += `<line x1="${f(src[p.a][0])}" y1="${f(src[p.a][1])}" x2="${f(src[p.b][0])}" y2="${f(src[p.b][1])}" stroke="${c.ac}" stroke-width="3" stroke-dasharray="5 4" stroke-linecap="round"/>`;
      if (p.t === 'miniband') top += `<ellipse cx="${f(at[0])}" cy="${f(at[1])}" rx="9" ry="5" fill="none" stroke="${c.ac}" stroke-width="3"/>`;
      if (p.t === 'db') top += `<rect x="${f(at[0] - 9)}" y="${f(at[1] - 4)}" width="18" height="8" rx="3" fill="${c.ac}"/>`;
      if (p.t === 'bar') top += `<rect x="${f(at[0] - 16)}" y="${f(at[1] - 3)}" width="32" height="6" rx="3" fill="${c.ac}"/>`;
      if (p.t === 'plate') top += `<line x1="${f(at[0] - 8)}" y1="${f(at[1] + 14)}" x2="${f(at[0] + 10)}" y2="${f(at[1] - 14)}" stroke="${c.far}" stroke-width="5" stroke-linecap="round"/>`;
      if (p.t === 'stick') { const d = [s.head[0] - s.hip[0], s.head[1] - s.hip[1]], n = Math.hypot(d[0], d[1]), ux = d[0] / n, uy = d[1] / n; top += L([s.hip[0] - ux * 8 - uy * 7, s.hip[1] - uy * 8 + ux * 7], [s.head[0] + ux * 12 - uy * 7, s.head[1] + uy * 12 + ux * 7], c.ac, 3); }
      if (p.t === 'pulse') { const r = p.r[0] + (p.r[1] - p.r[0]) * t; top += `<circle cx="${f(at[0])}" cy="${f(at[1] - 10)}" r="${f(r)}" fill="${c.ac}" fill-opacity=".35"/>`; }
    });
    let body = L(s.fs, s.fe, c.far, 7) + L(s.fe, s.fh, c.far, 7) + L(s.fhp, s.fk, c.far, 8) + L(s.fk, s.ff, c.far, 8);
    if (front) body += L(s.nhp, s.fhp, c.fg, 8) + L(s.ns, s.fs, c.fg, 8);
    body += L(s.hip, s.mid, c.fg, 11) + L(s.mid, s.sh, c.fg, 11) + L(s.nhp, s.nk, c.fg, 8) + L(s.nk, s.nf, c.fg, 8) + L(s.ns, s.ne, c.fg, 7) + L(s.ne, s.nh, c.fg, 7)
      + `<circle cx="${f(s.head[0])}" cy="${f(s.head[1])}" r="${SEG.hr}" fill="${c.fg}"/>`;
    const ground = a.noground ? '' : `<line x1="${f(120 - P.w / 2 + 6)}" y1="${G + 2}" x2="${f(120 + P.w / 2 - 6)}" y2="${G + 2}" stroke="${c.gr}" stroke-width="2"/>`;
    return ground + back + body + top;
  }
  const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  function phase(ts, period) { const c = (ts / (period * 1000)) % 1; const x = c < .35 ? c / .35 : c < .5 ? 1 : c < .85 ? 1 - (c - .5) / .35 : 0; return ease(x); }
  /* v2.2 loop (battery): runs only while a moving figure is on screen and the app is in the foreground; stops otherwise and is
     woken up by new figures (MutationObserver), scrolling into view (IntersectionObserver) or the app coming back.
     At most 30 frames/s, and a figure is only redrawn when its pose changed (not during the holds).
     Figures with class "still" (library, thumbnails) are drawn once. Reduced motion: every figure is a still, also when
     the setting changes while the app is open. data-pose = which pose a still shows (0 = start, 1 = end; default end). */
  const mqr = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return null; } })();
  let reduce = !!(mqr && mqr.matches);
  const visible = new Set(), seen = new WeakSet();
  let running = false, dirty = true, last = -1e9;
  const FRAME = 1000 / 30;
  const stillPose = el => el.dataset.pose != null ? +el.dataset.pose : 1;
  const draw = (el, p) => { el._p = p; el.innerHTML = render(el.dataset.anim, p); };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }); kick(); }) : null;
  function scan() {
    dirty = false;
    document.querySelectorAll('svg.anim').forEach(el => { if (seen.has(el)) return; seen.add(el); draw(el, stillPose(el)); if (io) io.observe(el); else visible.add(el); });
  }
  function redrawAll() { document.querySelectorAll('svg.anim').forEach(el => { if (seen.has(el)) draw(el, stillPose(el)); }); kick(); }
  function loop(ts) {
    running = false;
    if (dirty) scan();
    if (reduce || (typeof document !== 'undefined' && document.hidden)) return;
    const moving = [];
    visible.forEach(el => { if (!el.isConnected) { visible.delete(el); if (io) io.unobserve(el); } else if (!el.classList.contains('still')) moving.push(el); });
    if (!moving.length) return;
    if (ts - last >= FRAME - 2) {
      last = ts;
      moving.forEach(el => { const a = ANIM[el.dataset.anim], p = phase(ts, (a && a.period) || 3.2); if (el._p === undefined || Math.abs(p - el._p) > 1e-4) draw(el, p); });
    }
    kick();
  }
  function kick() { if (!running && typeof requestAnimationFrame === 'function') { running = true; requestAnimationFrame(loop); } }
  if (typeof MutationObserver === 'function' && typeof document !== 'undefined')
    new MutationObserver(ms => { if (ms.some(m => !(m.target.closest && m.target.closest('svg.anim')))) { dirty = true; if (!document.hidden) kick(); } }).observe(document.documentElement, { childList: true, subtree: true });
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', kick);
  if (mqr && mqr.addEventListener) mqr.addEventListener('change', () => { reduce = mqr.matches; redrawAll(); });
  kick();
  return { has: id => !!ANIM[id], svg: (id, cls = '', o = {}) => ANIM[id] ? `<svg class="anim ${cls}" data-anim="${id}"${o.pose != null ? ` data-pose="${o.pose}"` : ''} viewBox="${o.tight ? prep(id).vbT : prep(id).vb}" aria-hidden="true"></svg>` : '', render, prep, kick, isFront: id => !!(ANIM[id] && ANIM[id].v === 'front') };
})();
