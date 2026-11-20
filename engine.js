'use strict';
/* DynamCore – planning engine. Pure functions on (profile, state); no DOM. */

/* ---------- dates: day numbers (UTC days), weeks start on Monday ---------- */
const DN = {
  num: (y, m, d) => Math.floor(Date.UTC(y, m, d) / 864e5),
  today: () => { const t = new Date(); return DN.num(t.getFullYear(), t.getMonth(), t.getDate()); },
  parse: s => { const [y, m, d] = s.split('-').map(Number); return DN.num(y, m - 1, d); },
  date: n => new Date(n * 864e5),
  iso: n => DN.date(n).toISOString().slice(0, 10),
  dow: n => (DN.date(n).getUTCDay() + 6) % 7,
  monday: n => n - DN.dow(n),
  fmt: n => { const d = DN.date(n); return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; },
  fmtY: n => `${DN.fmt(n)}-${DN.date(n).getUTCFullYear()}`
};

/* ---------- random (deterministic, so a plan stays the same when reopened) ---------- */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = hashStr(seed); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- constants ---------- */
const TYPES = ['CORE', 'LEG', 'MOB', 'ACT', 'REC', 'GROUP'];
const HARD = new Set(['CORE', 'LEG']);
const GYM_EXPANDS = ['db', 'kb', 'band', 'swiss', 'bench', 'roller', 'ball', 'miniband', 'gym'];

/* Which home session types come first per phase; the first N are planned. */
const PRIORITY = {
  base:      ['LEG', 'CORE', 'MOB', 'CORE', 'LEG'],
  inseason:  ['CORE', 'MOB', 'LEG', 'CORE', 'MOB'],
  offseason: ['MOB', 'CORE', 'MOB', 'CORE', 'LEG'],
  taper:     ['CORE', 'MOB', 'MOB', 'CORE', 'MOB'],
  race:      ['ACT', 'MOB', 'MOB', 'ACT', 'MOB']
};

/* Session templates. A slot is "pattern" or "patternA|patternB" (fallbacks); a trailing digit fixes the level. */
const TPL = {
  CORE: { wu: ['mob-spine', 'antirot1', 'bridge1', 'scap1', 'mob-hipflex1'],
          main: ['antiext', 'antilat', 'bridge', 'pull', 'antirot', 'push', 'abd|hinge', 'rot|scap', 'crawl|carry'],
          power: { at: 3, pat: 'power' }, cd: ['mob-hipflex', 'mob-glute|mob-ham', 'mob-chest|mob-lat'] },
  LEG:  { wu: ['mob-hipflex1', 'bridge1', 'abd1', 'balance1', 'mob-hip1'],
          main: ['squat', 'hinge', 'lunge', 'bridge', 'calf', 'abd', 'carry|antilat', 'antiext'],
          power: { at: 2, pat: 'legpower' }, cd: ['mob-hipflex', 'mob-ham', 'mob-calf'] },
  MOB:  { roll: ['roll-legs', 'roll-glute', 'roll-back', 'roll-calf', 'roll-foot', 'roll-chest'],
          mob: ['mob-hipflex', 'mob-tspine', 'mob-ham', 'mob-glute', 'mob-hip', 'mob-chest', 'mob-calf', 'mob-lat', 'mob-neck', 'mob-spine'],
          stab: ['balance', 'breath1', 'antiext1', 'antirot1', 'crawl1'] },
  ACT:  { list: ['breath1', 'mob-hipflex1', 'bridge1', 'antiext1', 'antilat', 'power|crawl', 'balance'] },
  REC:  { list: ['roll-legs', 'roll-glute', 'mob-hipflex', 'mob-ham', 'mob-glute', 'mob-chest|mob-lat', 'breath1'] }
};
const MOB_COUNTS = { 15: [2, 4, 1], 20: [3, 5, 2], 30: [4, 7, 3], 45: [6, 10, 4] };
const STR_START = { 15: { wu: 2, cd: 1, n: 4, r: 2 }, 20: { wu: 3, cd: 1, n: 5, r: 2 }, 30: { wu: 4, cd: 2, n: 6, r: 3 }, 45: { wu: 5, cd: 3, n: 7, r: 3 } };

/* ---------- dose ---------- */
function parseDose(s) { const m = /^([rtb])(\d+)(s?)$/.exec(s); return { k: m[1], n: +m[2], side: m[3] === 's' }; }
function scaleDose(d, f) {
  if (d.k === 'b' || f === 1) return { ...d };
  const n = d.k === 't' ? Math.max(10, Math.round(d.n * f / 5) * 5) : Math.max(3, Math.round(d.n * f));
  return { ...d, n };
}
function itemSeconds(d) {
  const sides = d.side ? 2 : 1;
  if (d.k === 'r') return d.n * 3.5 * sides + (d.side ? 14 : 10);
  if (d.k === 't') return d.n * sides + (d.side ? 13 : 8);
  return d.n * 10 + 5;
}

/* ---------- profile helpers ---------- */
function equipSet(p, travel) {
  if (travel) return new Set();
  const s = new Set(p.eq || []);
  if (s.has('gym')) GYM_EXPANDS.forEach(x => s.add(x));
  return s;
}
function allowed(e, ctx) {
  if (ctx.blocked.has(e.id)) return false;
  if (e.avoid.some(a => ctx.complaints.has(a))) return false;
  if (ctx.travel && e.space) return false;
  if (e.eq.length && !e.eq.some(x => ctx.eq.has(x))) return false;
  return true;
}
function makeCtx(p, travel) {
  return { eq: equipSet(p, travel), complaints: new Set(p.complaints || []), blocked: new Set(p.blocked || []), travel: !!travel };
}
function candidates(pat, ctx) { return EX.filter(e => e.pat === pat && !e.v21 && allowed(e.avoidV1 ? { ...e, avoid: e.avoidV1 } : e, ctx)); }   // v2.0.1 builder: library as it was (v2.1 additions excluded)

/* Pick one exercise for a slot spec at a target level. */
function pickSlot(spec, level, ctx, used, rand) {
  for (const alt of spec.split('|')) {
    const m = /^(.*?)(\d)?$/.exec(alt); const pat = m[1]; const lvl = m[2] ? +m[2] : level;
    const c = candidates(pat, ctx).filter(e => !used.has(e.id));
    if (!c.length) continue;
    const best = Math.min(...c.map(e => Math.abs(e.lvl - lvl) + (e.lvl > lvl ? 0.5 : 0)));
    const pool = c.filter(e => Math.abs(e.lvl - lvl) + (e.lvl > lvl ? 0.5 : 0) === best);
    const e = pool[Math.floor(rand() * pool.length)];
    used.add(e.id);
    return { id: e.id, pat, fixed: !!m[2] };
  }
  return null;
}

/* ---------- phases ---------- */
function phaseFor(p, monday) {
  if (p.phaseOverride && p.phaseOverride !== 'auto') return p.phaseOverride;
  const races = (p.races || []).map(r => DN.parse(r.d)).sort((a, b) => a - b);
  const sunday = monday + 6;
  if (races.some(r => r >= monday && r <= sunday)) return 'race';
  if (races.some(r => r > sunday && r <= sunday + 7)) return 'taper';
  const next = races.find(r => r > sunday), prev = [...races].reverse().find(r => r < monday);
  if (next !== undefined && next - monday <= 70) return 'inseason';
  if (prev !== undefined && monday - prev <= 28 && next !== undefined && next - monday <= 112) return 'inseason';
  if (prev !== undefined && monday - prev <= 28) return 'offseason';
  return 'base';
}
function styleFor(phase, block, p, monday) {
  if (phase === 'inseason' || phase === 'taper' || phase === 'race') return 'power';
  if (phase === 'offseason') return 'control';
  const next = (p.races || []).map(r => DN.parse(r.d)).filter(r => r > monday).sort((a, b) => a - b)[0];
  if (next !== undefined && next - monday <= 112) return 'power';
  return block === 0 ? 'control' : 'strength';
}

/* ---------- weeks ---------- */
const startNum = p => DN.parse(p.start);
/* v2.0 pauses: p.pauses = [{ from, to }] (day numbers, to = resume day). A calendar week that lies completely inside a pause
   (and is not the week in which the pause started) is skipped: it gets no plan week number. The start date never moves,
   so everything done before a pause stays in its own calendar week. */
function skippedMondays(p) {
  const st = startNum(p), out = [];
  (p.pauses || []).forEach(x => { if (!x || !Number.isFinite(x.from) || !Number.isFinite(x.to)) return;
    for (let m = DN.monday(x.from) + 7; m + 7 <= x.to; m += 7) if (m > st && !out.includes(m)) out.push(m); });
  return out.sort((a, b) => a - b);
}
function planWeekOf(p, dayNum) {
  const m = DN.monday(dayNum), raw = Math.floor((m - startNum(p)) / 7) + 1;
  return raw - skippedMondays(p).filter(x => x <= m).length;
}
function mondayOfWeek(p, w) {
  let c = startNum(p) + (w - 1) * 7;
  for (const x of skippedMondays(p)) if (x <= c) c += 7;
  return c;
}
function pausedDay(p, dn) {
  if (p.paused != null && dn >= p.paused) return true;
  return (p.pauses || []).some(x => x && dn >= x.from && dn < x.to);
}
function isRecovery(p, st, w) {
  const k = +p.rk || 0;
  const snap = st.weekSnap && st.weekSnap[w];
  let rec = snap && snap.upto == null ? !!snap.rec : k > 0 && w % k === 0;
  const ov = st.weekOv[w];
  if (ov && typeof ov.rec === 'boolean') rec = ov.rec;
  return rec;
}
const blockOf = (p, w) => Math.floor((w - 1) / ((+p.rk || 0) > 0 ? +p.rk : 4));
const weekInBlock = (p, w) => (w - 1) % ((+p.rk || 0) > 0 ? +p.rk : 4);

function groupTypeOf(focus) {
  const f = new Set(focus || []);
  if (f.has('legs') || f.has('strength')) return 'LEG';
  if (f.has('core') || f.has('back')) return 'CORE';
  if (f.has('mobility')) return 'MOB';
  return 'LEG';
}
const groupIsHard = focus => groupTypeOf(focus) !== 'MOB';

/* Assign session types to days with simple scoring (spacing of hard sessions, hard bike days). */
function assignDays(types, days, groupDay, groupHard, hardBike) {
  const hb = new Set(hardBike || []);
  const freeDays = days.filter(d => d !== groupDay).sort((a, b) => a - b);
  const n = Math.min(types.length, freeDays.length);
  const use = types.slice(0, n);
  let best = null, bestScore = Infinity;
  const perm = (arr, k, chosen) => {
    if (chosen.length === k) { score(chosen); return; }
    for (const d of arr) if (!chosen.includes(d)) perm(arr, k, [...chosen, d]);
  };
  const gap = (a, b) => { const g = Math.abs(a - b); return Math.min(g, 7 - g); };
  const score = chosen => {
    let s = 0;
    const hard = [];
    chosen.forEach((d, i) => { if (HARD.has(use[i]) || use[i] === 'ACT') hard.push(d); });
    if (groupDay != null && groupHard) hard.push(groupDay);
    for (let i = 0; i < hard.length; i++) for (let j = i + 1; j < hard.length; j++) { const g = gap(hard[i], hard[j]); if (g === 0) s += 20; else if (g === 1) s += 8; }
    chosen.forEach((d, i) => {
      const t = use[i];
      if (t === 'LEG' && hb.has((d + 1) % 7)) s += 3;
      if (t === 'CORE' && hb.has((d + 1) % 7)) s += 2;
      if (t === 'LEG' && hb.has(d)) s -= 1;
      if (t === 'MOB' && !hb.has(d)) s -= 0.5;
    });
    // keep the same type order through the week as the priority list (stable feel)
    for (let i = 1; i < chosen.length; i++) if (use[i] === use[i - 1] && chosen[i] < chosen[i - 1]) s += 0.1;
    if (s < bestScore) { bestScore = s; best = chosen; }
  };
  perm(freeDays, n, []);
  return { slots: use.map((t, i) => ({ type: t, day: best ? best[i] : freeDays[i] })), dropped: types.length - n };
}

/* The plan of a week before moves/skips: computed from the current settings. */
function computeBase(p, st, w) {
  const monday = mondayOfWeek(p, w);
  const phase = phaseFor(p, monday);
  const rec = isRecovery(p, st, w);
  const ov = st.weekOv[w] || {};
  const N = Math.max(2, Math.min(5, +p.perWeek || 3));
  let types = PRIORITY[phase].slice(0, N);
  const g = p.group && p.group.on && !ov.groupOff ? { day: +p.group.day, focus: ov.groupFocus || p.group.focus || [] } : null;
  if (g) {
    const gt = groupTypeOf(g.focus);
    const i = types.indexOf(gt);
    if (i >= 0) types.splice(i, 1); else types.pop();
  }
  const travel = !!(ov.travel ?? p.travelAlways);
  const { slots, dropped } = assignDays(types, (p.days || []).map(Number), g ? g.day : null, g ? groupIsHard(g.focus) : false, p.hardBike);
  const counts = {};
  const out = slots.map(s => { counts[s.type] = (counts[s.type] || 0) + 1; return { ...s, key: `${s.type}-${counts[s.type]}`, idx: counts[s.type] }; });
  const firstHard = out.filter(s => HARD.has(s.type)).sort((a, b) => a.day - b.day)[0];
  if (firstHard && (w === 1 || rec) && !(ov.noTest)) firstHard.test = true;
  if (g) out.push({ type: 'GROUP', day: g.day, key: 'GROUP', focus: g.focus });
  return { monday, phase, rec, travel, slots: out, dropped, block: blockOf(p, w) };
}
/* v2.0 frozen weeks (st.weekSnap[w]): once a week has started, its sessions no longer follow later settings changes.
   upto == null: the whole week is frozen (past week). upto = day index: only sessions before that day (or already done)
   are frozen; the rest of the current week follows the current settings. */
const effDay = (ov, s) => (ov.moves && ov.moves[s.key] != null ? +ov.moves[s.key] : s.day);
const slotBase = s => { const o = { type: s.type, day: s.day, key: s.key, idx: s.idx }; if (s.test) o.test = true; if (s.focus) o.focus = s.focus; return o; };
const validSnap = x => !!(x && typeof x === 'object' && Array.isArray(x.slots) && x.slots.every(s => s && TYPES.includes(s.type) && Number.isInteger(s.day) && s.day >= 0 && s.day <= 6 && typeof s.key === 'string'));
function baseOf(p, st, w) {
  const snap = st.weekSnap && st.weekSnap[w], ov = st.weekOv[w] || {};
  if (!validSnap(snap)) return computeBase(p, st, w);   // no (or damaged) frozen data: follow the current settings
  const monday = mondayOfWeek(p, w);
  if (snap.upto == null) {
    let rec = !!snap.rec; if (typeof ov.rec === 'boolean') rec = ov.rec;
    const slots = snap.slots.filter(s => !(s.type === 'GROUP' && ov.groupOff)).map(s => s.type === 'GROUP' && ov.groupFocus ? { ...s, focus: ov.groupFocus } : { ...s });
    return { monday, phase: snap.phase, rec, travel: !!(ov.travel ?? snap.travel), slots, dropped: snap.dropped || 0, block: snap.block };
  }
  /* v2.0.1: a planned session with the same type on the same planned day as a frozen one IS that session (it may be done
     early or moved) and is not added again. Only a really new session (new settings) is added, on today or later;
     its name changes only when the name is already taken. */
  const now = computeBase(p, st, w), frozen = snap.slots.map(s => ({ ...s })), keys = new Set(frozen.map(s => s.key));
  const maxIdx = {}; frozen.concat(now.slots).forEach(s => { maxIdx[s.type] = Math.max(maxIdx[s.type] || 0, s.idx || 0); });
  const same = s => frozen.some(f => f.type === s.type && f.day === s.day);
  const add = [];
  now.slots.forEach(s => {
    if (s.type === 'GROUP') { if (!keys.has('GROUP') && effDay(ov, s) >= snap.upto) { keys.add('GROUP'); add.push(s); } return; }
    if (same(s)) return;
    let c = s;
    if (keys.has(s.key)) { const idx = ++maxIdx[s.type]; c = { ...s, idx, key: `${s.type}-${idx}` }; }
    if (effDay(ov, c) < snap.upto) return;              // new settings cannot place a session on a day that has passed
    keys.add(c.key); add.push(c);
  });
  if (frozen.some(s => s.test)) add.forEach(s => { delete s.test; });
  return { ...now, slots: frozen.concat(add) };
}
/* v2.0.1 repair: v2.0 could save the same session twice in a frozen week (same type, same planned day).
   Keep the one that is done (all of them if more are done), otherwise the lowest number. Returns the removed sessions. */
function repairSnaps(st, isDoneFn) {
  const removed = [];
  Object.keys(st.weekSnap || {}).forEach(k => {
    const w = +k, snap = st.weekSnap[k];
    if (!validSnap(snap)) { delete st.weekSnap[k]; return; }
    const groups = {};
    snap.slots.forEach(s => { if (s.type !== 'GROUP') (groups[s.type + '|' + s.day] = groups[s.type + '|' + s.day] || []).push(s); });
    const drop = new Set();
    Object.values(groups).filter(g => g.length > 1).forEach(g => {
      const done = g.filter(s => isDoneFn(w, s.key));
      const keep = done.length ? done : [g.slice().sort((a, b) => (a.idx || 0) - (b.idx || 0))[0]];
      g.forEach(s => { if (!keep.includes(s)) drop.add(s.key); });
    });
    if (drop.size) { snap.slots = snap.slots.filter(s => !drop.has(s.key)); drop.forEach(key => removed.push({ w, key })); }
  });
  return removed;
}
function weekPlan(p, st, w) {
  const b = baseOf(p, st, w), ov = st.weekOv[w] || {};
  const out = b.slots.map(s => ({ ...s }));
  out.forEach(s => {
    s.day = effDay(ov, s);
    const paused = pausedDay(p, b.monday + s.day);
    s.skipped = !!(ov.skips && ov.skips[s.key]) || paused;
    if (paused) s.paused = true;
  });
  out.sort((a, b2) => a.day - b2.day);
  return { w, monday: b.monday, phase: b.phase, rec: b.rec, travel: b.travel, slots: out, dropped: b.dropped, block: b.block };
}
/* Freeze the weeks that have started: past weeks completely, the current week up to today (+ sessions already done). */
function freezeWeeks(p, st, todayNum, isDoneFn) {
  if (!p || !p.start) return 0;
  st.weekSnap = st.weekSnap || {};
  const cw = planWeekOf(p, todayNum); let n = 0;
  // v2.0.1: during a running pause, weeks after the week in which the pause started are not frozen (their dates change on resume)
  const last = p.paused != null ? Math.min(cw, planWeekOf(p, p.paused)) : cw;
  for (let w = 1; w <= last; w++) {
    const cur = validSnap(st.weekSnap[w]) ? st.weekSnap[w] : null;
    const full = w < cw;
    if (cur && cur.upto == null) continue;
    const ov = st.weekOv[w] || {}, b = baseOf(p, st, w);
    if (full) {
      const k = +p.rk || 0;   // stored without this week's own toggles (recovery, travel): those stay in weekOv and still apply
      st.weekSnap[w] = { phase: b.phase, rec: k > 0 && w % k === 0, travel: !!p.travelAlways, block: b.block, dropped: b.dropped, slots: b.slots.map(slotBase) };
    } else {
      const upto = todayNum - b.monday;
      st.weekSnap[w] = { upto, slots: b.slots.filter(s => effDay(ov, s) < upto || isDoneFn(w, s.key)).map(slotBase) };
    }
    n++;
  }
  return n;
}

/* ---------- level ---------- */
function effLevel(p, type) {
  const base = +p.level || 1;
  const adj = (p.adj && p.adj[type]) || 0;
  return Math.max(1, Math.min(3, base + adj));
}

/* ---------- session builder ---------- */
function doseFactor(p, plan, type) {
  let f = 1;
  if (type === 'CORE' || type === 'LEG') {
    const wib = weekInBlock(p, plan.w);
    f = [1, 1.15, 1.3, 1.4, 1.5][Math.min(4, wib)];
  }
  if (plan.rec && plan.phase !== 'race') f = 0.85;   // v2.0: a race week that is also a recovery week follows the race rules only
  if (plan.phase === 'offseason') f *= 0.9;
  if (plan.phase === 'inseason') f *= 0.95;
  if (plan.phase === 'taper') f *= 0.75;
  if (plan.phase === 'race') f *= 0.6;
  return f;
}
const restFor = (style, level) => style === 'control' && level < 2 ? 30 : 45;

/* v2.0.1 builder, kept unchanged as buildSessionV1: weeks before S.engFrom (and ACT/REC) still use it, so history stays the same. */
function buildSessionV1(p, st, plan, slot, opts = {}) {
  const type = slot.type;
  const ov = (st.weekOv[plan.w] || {});
  const dur = +(opts.dur || (ov.dur && ov.dur[slot.key]) || capDur(p.dur || 30, plan.phase, type));
  const travel = opts.travel ?? plan.travel;
  const ctx = makeCtx(p, travel);
  const used = new Set();
  const rand = rng(`${plan.block}|${type}|${slot.idx || 1}|${travel ? 't' : ''}|${p.level}|${(p.adj || {})[type] || 0}`);
  const level = effLevel(p, type);
  const style = styleFor(plan.phase, plan.block, p, plan.monday);
  const f = doseFactor(p, plan, type);
  const swaps = (ov.swaps && ov.swaps[slot.key]) || {};
  const mk = (pick, factor) => {
    if (!pick) return null;
    let id = pick.id;
    if (swaps[id] && EXMAP[swaps[id]]) id = swaps[id];
    const e = EXMAP[id];
    return { id, orig: pick.id, pat: pick.pat, dose: scaleDose(parseDose(e.dose), factor) };
  };
  const blocks = [];

  if (type === 'CORE' || type === 'LEG') {
    const t = TPL[type];
    let main = [...t.main];
    if (style === 'power') main.splice(t.power.at, 0, t.power.pat);
    const start = STR_START[dur] || STR_START[30];
    let cfg = { ...start };
    if (plan.rec || plan.phase === 'taper' || plan.phase === 'race') cfg.r = Math.max(1, cfg.r - 1);
    const rest = restFor(style, level);
    // pick a full ordered list once, then trim to fit time
    const wuAll = t.wu.map(s => mk(pickSlot(s, 1, ctx, used, rand), 1)).filter(Boolean);
    const mainAll = main.map(s => mk(pickSlot(s, level, ctx, used, rand), f)).filter(Boolean);
    const cdAll = t.cd.map(s => mk(pickSlot(s, Math.min(level, 2), ctx, used, rand), 1)).filter(Boolean);
    const est = c => {
      const wu = wuAll.slice(0, c.wu), mn = mainAll.slice(0, c.n), cd = cdAll.slice(0, c.cd);
      const s = wu.reduce((a, i) => a + itemSeconds(i.dose) + 5, 0)
        + c.r * mn.reduce((a, i) => a + itemSeconds(i.dose), 0) + (c.r * mn.length - 1) * rest + (c.r - 1) * 30
        + cd.reduce((a, i) => a + itemSeconds(i.dose) + 5, 0);
      return s / 60;
    };
    for (let k = 0; k < 8; k++) {
      const e = est(cfg);
      if (e > dur + 2) { if (cfg.n > 4) cfg.n--; else if (cfg.r > 1) cfg.r--; else if (cfg.wu > 2) cfg.wu--; else break; }
      else if (e < dur - 3) { if (cfg.n < mainAll.length && cfg.n < 8) cfg.n++; else if (cfg.r < 4) cfg.r++; else break; }
      else break;
    }
    cfg.n = Math.min(cfg.n, mainAll.length);
    blocks.push({ k: 'wu', rounds: 1, rest: 0, items: wuAll.slice(0, cfg.wu) });
    blocks.push({ k: 'main', rounds: cfg.r, rest, roundRest: rest + 30, items: mainAll.slice(0, cfg.n) });
    blocks.push({ k: 'cd', rounds: 1, rest: 0, items: cdAll.slice(0, cfg.cd) });
    return finish({ type, dur, style, level, blocks, key: slot.key, test: !!slot.test, travel });
  }
  if (type === 'MOB') {
    const [nr0, nm0, ns0] = MOB_COUNTS[dur] || MOB_COUNTS[30];
    const lvl = Math.min(level, 2);
    const rollAll = TPL.MOB.roll.map(s => mk(pickSlot(s, 1, ctx, used, rand), 1)).filter(Boolean);
    const mobAll = TPL.MOB.mob.map(s => mk(pickSlot(s, lvl, ctx, used, rand), 1)).filter(Boolean);
    const stabAll = TPL.MOB.stab.map(s => mk(pickSlot(s, lvl, ctx, used, rand), 1)).filter(Boolean);
    let c = { r: Math.min(nr0, rollAll.length), m: Math.min(mobAll.length, nm0 + Math.max(0, nr0 - rollAll.length)), s: Math.min(ns0, stabAll.length), f: 1, mr: 1 };
    const sc = (arr, n, f) => arr.slice(0, n).map(i => ({ ...i, dose: scaleDose(i.dose, f) }));
    const est = c => (sc(rollAll, c.r, c.f).concat(sc(stabAll, c.s, 1)).reduce((a, i) => a + itemSeconds(i.dose) + 5, 0)
      + c.mr * sc(mobAll, c.m, c.f).reduce((a, i) => a + itemSeconds(i.dose) + 5, 0)) / 60;
    for (let k = 0; k < 40; k++) {
      const e = est(c);
      if (e < dur - 2) {
        if (c.f < 1.35) c.f = Math.round((c.f + 0.15) * 100) / 100;
        else if (c.m < mobAll.length) c.m++;
        else if (c.r < rollAll.length) c.r++;
        else if (c.s < stabAll.length) c.s++;
        else if (c.f < 1.6) c.f = Math.round((c.f + 0.25) * 100) / 100;
        else if (c.mr < 2) { c.mr = 2; c.f = 1; }
        else break;
      } else if (e > dur + 2) {
        if (c.m > 3) c.m--; else if (c.mr > 1) c.mr = 1; else if (c.r > 1) c.r--; else if (c.s > 1) c.s--; else break;
      } else break;
    }
    if (c.r) blocks.push({ k: 'roll', rounds: 1, rest: 0, items: sc(rollAll, c.r, c.f) });
    blocks.push({ k: 'mob', rounds: c.mr, rest: 0, items: sc(mobAll, c.m, c.f) });
    blocks.push({ k: 'stab', rounds: 1, rest: 0, items: sc(stabAll, c.s, 1) });
    return finish({ type, dur, style: 'recovery', level, blocks, key: slot.key, test: false, travel });
  }
  // ACT (pre-race activation) and REC (post-ride recovery): fixed short lists
  const list = TPL[type].list.map(s => mk(pickSlot(s, Math.min(level, 2), ctx, used, rand), type === 'ACT' ? 0.8 : 1)).filter(Boolean);
  blocks.push({ k: type === 'ACT' ? 'act' : 'rec', rounds: type === 'ACT' ? 2 : 1, rest: 0, items: list });
  return finish({ type, dur: type === 'ACT' ? 12 : 15, style: type === 'ACT' ? 'power' : 'recovery', level, blocks, key: slot.key, test: false, travel });
}
function capDur(d, phase, type) {
  d = +d;
  if (phase === 'race') return Math.min(d, 15);
  if (phase === 'taper' && type !== 'MOB') return Math.min(d, 20);
  return d;
}
function finish(s) {
  let sec = 0;
  s.blocks.forEach(b => {
    const one = b.items.reduce((a, i) => a + itemSeconds(i.dose) + (b.rest ? 0 : 5), 0);
    sec += one * b.rounds + (b.rest ? (b.rounds * b.items.length - 1) * b.rest + (b.rounds - 1) * 30 : 0);
  });
  s.est = Math.max(5, Math.round(sec / 60));
  return s;
}

/* Alternatives for the swap button: same pattern, allowed, sorted by closeness in level. */
function swapOptions(p, id, level, travel) {
  const e = EXMAP[id]; const ctx = makeCtx(p, travel);
  return EX.filter(x => x.pat === e.pat && x.id !== id && !x.hidden && allowed(x, ctx)).sort((a, b) => Math.abs(a.lvl - level) - Math.abs(b.lvl - level) || a.lvl - b.lvl);
}

/* ---------- baseline test → level (FIRST ESTIMATE thresholds; adjust after the test group) ---------- */
const TEST_THRESHOLDS = {
  T1: [15, 35],   // single-leg balance eyes closed, seconds (mean L/R): <15 → 1, 15–35 → 2, >35 → 3
  T3: [12, 25],   // single-leg bridge reps (mean L/R)
  T4: [60, 120],  // forearm plank, seconds
  T5: [30, 75]    // side plank, seconds (mean L/R)
};
function levelFromTest(t) {
  const v = {
    T1: avg(t.T1L, t.T1R), T3: avg(t.T3L, t.T3R), T4: num(t.T4), T5: avg(t.T5L, t.T5R)
  };
  const scores = Object.keys(TEST_THRESHOLDS).filter(k => v[k] != null).map(k => {
    const [a, b] = TEST_THRESHOLDS[k]; return v[k] < a ? 1 : v[k] <= b ? 2 : 3;
  });
  if (scores.length < 3) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
function num(x) { return x === undefined || x === null || x === '' ? null : +x; }
function avg(a, b) { a = num(a); b = num(b); if (a == null && b == null) return null; if (a == null) return b; if (b == null) return a; return (a + b) / 2; }

/* ---------- RPE → automatic adjustment ---------- */
function applyRpe(p, logs, type, rpe) {
  p.adj = p.adj || {};
  const cur = p.adj[type] || 0;
  if (type === 'MOB' || type === 'REC' || type === 'ACT') {
    if (rpe >= 7 && cur > -1) { p.adj[type] = cur - 1; return 'easier'; }
    return null;
  }
  if (rpe >= 9 && cur > -1) { p.adj[type] = cur - 1; return 'easier'; }
  if (rpe <= 4) {
    const prev = logs.filter(l => l.type === type).slice(-2, -1)[0];
    if (prev && prev.rpe <= 4 && cur < 1 && effLevel(p, type) < 3) { p.adj[type] = cur + 1; return 'harder'; }
  }
  return null;
}

/* ---------- calendar file ---------- */
function buildIcs(p, st, fromWeek, weeks, title, labelOf) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DynamCore//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const [hh, mm] = (p.icsTime || '19:00').split(':').map(Number);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  for (let w = Math.max(1, fromWeek); w < fromWeek + weeks; w++) {
    const plan = weekPlan(p, st, w);
    plan.slots.forEach(s => {
      if (s.skipped) return;
      const day = plan.monday + s.day; const d = DN.date(day);
      const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
      const dur = s.type === 'GROUP' ? 60 : buildSession(p, st, plan, s).est;
      const pad = x => String(x).padStart(2, '0');
      const endMin = hh * 60 + mm + dur;
      L.push('BEGIN:VEVENT', `UID:dynamcore-${p.start}-w${w}-${s.key}@dynamcore`, `DTSTAMP:${stamp}`,
        `DTSTART:${ymd}T${pad(hh)}${pad(mm)}00`, `DTEND:${ymd}T${pad(Math.floor(endMin / 60) % 24)}${pad(endMin % 60)}00`,
        `SUMMARY:${labelOf(s, w)}`, 'DESCRIPTION:DynamCore', 'END:VEVENT');
    });
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}

/* ---------- equipment per session ---------- */
function sessionEquip(p, ses) {
  const ctx = makeCtx(p, ses.travel), out = [];
  ses.blocks.forEach(b => b.items.forEach(i => {
    const ex = EXMAP[i.id]; if (!ex.eq.length) return;
    const pick = ex.eq.find(x => x !== 'gym' && ctx.eq.has(x) && (p.eq || []).includes(x)) || ex.eq.find(x => ctx.eq.has(x)) || ex.eq[0];
    if (!out.includes(pick)) out.push(pick);
  }));
  const order = ['db', 'kb', 'band', 'miniband', 'roller', 'ball', 'swiss', 'bench', 'gym'];
  return out.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/* ---------- training load for Intervals.icu ----------
   load = load-per-hour x duration. Defaults follow the TSS logic (hours x IF^2 x 100) with an assumed
   intensity factor per session type: mobility 0,55 -> 30/h, activation 0,60 -> 36/h, core/legs 0,70 -> 49/h,
   group strength 0,75 -> 56/h, post-ride recovery 0,45 -> 20/h. FIRST ESTIMATE: the coach can change these in Settings. */
const LOAD_PER_HOUR = { CORE: 49, LEG: 49, MOB: 30, ACT: 36, REC: 20, GROUP: 56 };
function sessionLoad(p, type, minutes) {
  const per = (p.loadPerHour && +p.loadPerHour[type]) || LOAD_PER_HOUR[type] || 40;
  return Math.round(per * minutes / 60);
}

/* =====================================================================================================================
   v2.1 – structured variation (coach approved 20-11-2026; review doc "DynamCore – exercise variation review (Phase 1)").
   R1 identities: the 1st CORE/LEG session of a week is A, the 2nd B, a 3rd C; a single one is M (mixed). A group session
      counts as identity A of its type (legs/strength → LEG A), so the home sessions of that type become B, C, …
   R2 one "used" set per week: no main exercise twice in a week (when the pool allows it).
   R3 must slots (!) are never cut to fit the time; optional slots go first, then a round.
   R4 undulating dose: A = strength intent (library reps, hardest fitting variant, rest 60 s, load cue),
      B/C = capacity intent (reps/time × 1,2, variants up to one level easier, rest 30 s). M = as v2.0.1 (rest 30/45 s).
   R5 block arc: week 1 learn, then build, last build week = challenge (factors as v2.0.1: 1,00/1,15/1,30/…; loaded
      exercises stop at 1,15 and get "choose a heavier weight"); recovery week = the exercises and number of exercises
      of the week before, one round fewer, dose × 0,85, nothing added (session gets shorter).
   R6 ladders: per pattern the allowed exercises sorted by level; the anchor (first must slot) is chosen per era of
      2 blocks, other slots per block, by a fixed rotation (no random seed with level/RPE in it: a level change moves a rung).
   R7 small pools: sister pattern first, then repeat with a cue (dose mode), and mark it.
   R8 routines: extra session = next identity of the week; travel = B with bodyweight; swaps can be kept for the block.
   ===================================================================================================================== */
const IDENT = {
  CORE: {
    A: { wu: ['mob-spine', 'antiext1', 'bridge1', 'scap1'], main: ['antiext!', 'pull!', 'backext!', 'bridge!', 'scap', 'crawl|carry'], cd: ['mob-hipflex', 'mob-ham|mob-chest'], intent: 'A' },
    B: { wu: ['mob-tspine', 'antilat1', 'abd1', 'balance1'], main: ['antilat!', 'antirot!', 'abd!', 'push!', 'rot|carry', 'add'], cd: ['mob-glute', 'mob-hip|mob-lat'], intent: 'B', power: 'power' },
    C: { wu: ['mob-spine', 'crawl1', 'bridge1', 'mob-tspine'], main: ['crawl!', 'carry!|antilat', 'rot!|antirot', 'balance!', 'scap', 'add'], cd: ['mob-hipflex', 'mob-chest|mob-lat'], intent: 'B' },
    M: { wu: ['mob-spine', 'bridge1', 'abd1', 'scap1'], main: ['antiext!', 'antilat!', 'antirot!', 'pull!', 'bridge', 'backext', 'push', 'abd', 'scap'], cd: ['mob-hipflex', 'mob-glute|mob-ham'], intent: 'M', power: 'power' }
  },
  LEG: {
    A: { wu: ['mob-hipflex1', 'bridge1', 'hinge1', 'mob-hip1'], main: ['hinge:bi!', 'squat!', 'bridge!', 'calf!', 'antiext', 'carry'], cd: ['mob-hipflex', 'mob-ham', 'mob-calf'], intent: 'A', power: 'legpower' },
    B: { wu: ['mob-hip1', 'abd1', 'balance1', 'mob-hipflex1'], main: ['lunge!', 'hinge:uni!', 'abd!', 'add!|antilat', 'balance', 'calf'], cd: ['mob-glute', 'mob-hip', 'mob-calf'], intent: 'B' },
    C: { wu: ['mob-hipflex1', 'bridge1', 'balance1', 'mob-hip1'], main: ['legpower!|squat', 'hinge!', 'lunge!', 'calf!', 'balance', 'antilat'], cd: ['mob-hipflex', 'mob-glute', 'mob-calf'], intent: 'B' },
    M: { wu: ['mob-hipflex1', 'bridge1', 'abd1', 'balance1'], main: ['squat!', 'hinge!', 'lunge!', 'abd!', 'calf', 'bridge', 'add'], cd: ['mob-hipflex', 'mob-ham', 'mob-calf'], intent: 'M', power: 'legpower' }
  }
};
/* R7: patterns that train the same tissue in another way, used when a pattern has no free exercise left this week */
const SISTER = { pull: ['scap', 'backext'], scap: ['pull'], backext: ['scap', 'hinge'], lunge: ['bridge:uni', 'balance'], squat: ['lunge'],
  push: ['crawl'], antiext: ['crawl'], antirot: ['crawl', 'rot'], antilat: ['add', 'carry'], add: ['antilat'], abd: ['antilat'],
  hinge: ['bridge'], bridge: ['hinge'], calf: ['balance'], carry: ['antilat'], crawl: ['antiext'], rot: ['antirot'], balance: ['abd'] };
const MOB_EMPH = [   // R2/R6 for mobility: region emphasis rotates per week (hips + calf / thoracic + shoulder / posterior chain)
  ['mob-hipflex', 'mob-hip', 'mob-calf', 'mob-glute', 'mob-ham', 'mob-tspine', 'mob-chest', 'mob-lat', 'mob-neck', 'mob-spine'],
  ['mob-tspine', 'mob-chest', 'mob-lat', 'mob-neck', 'mob-spine', 'mob-hipflex', 'mob-ham', 'mob-glute', 'mob-hip', 'mob-calf'],
  ['mob-ham', 'mob-glute', 'mob-calf', 'mob-lat', 'mob-hipflex', 'mob-spine', 'mob-tspine', 'mob-hip', 'mob-chest', 'mob-neck']
];
const LOADED_EQ = new Set(['db', 'kb', 'gym']);
const isLoaded = e => e.eq.length > 0 && e.eq.every(x => LOADED_EQ.has(x));
const engFrom = st => (st && Number.isFinite(+st.engFrom) && st.engFrom !== null ? +st.engFrom : 1);
const engineFor = (st, w) => (w >= engFrom(st) ? 2 : 1);
const blockLen = p => ((+p.rk || 0) > 0 ? +p.rk : 4);
/* week phase inside the block: learn / build / challenge / rec */
function weekPhase(p, plan) {
  if (plan.rec) return 'rec';
  const k = blockLen(p), wib = weekInBlock(p, plan.w), last = (+p.rk || 0) > 0 ? k - 2 : 3;
  return wib === 0 ? 'learn' : wib >= last ? 'challenge' : 'build';
}

/* identities of the CORE/LEG sessions of a week (fixed by session number, so moving or skipping changes nothing) */
function weekIdentities(plan) {
  const out = {}, g = plan.slots.find(s => s.type === 'GROUP'), gt = g ? groupTypeOf(g.focus) : null;
  ['CORE', 'LEG'].forEach(T => {
    const list = plan.slots.filter(s => s.type === T).sort((a, b) => (a.idx || 0) - (b.idx || 0) || String(a.key).localeCompare(String(b.key)));
    const seq = gt === T ? ['B', 'C', 'A'] : list.length === 1 ? ['M'] : ['A', 'B', 'C'];
    list.forEach((s, i) => { out[s.key] = seq[Math.min(i, seq.length - 1)]; });
  });
  return out;
}
function extraIdentity(plan, T) {
  const g = plan.slots.find(s => s.type === 'GROUP'), gt = g ? groupTypeOf(g.focus) : null;
  const n = plan.slots.filter(s => s.type === T).length;
  if (gt === T) return ['B', 'C', 'A'][Math.min(n, 2)];
  if (n === 1) return 'C';
  return ['A', 'B', 'C'][Math.min(n, 2)];
}

/* one pick on a ladder. spec "pat[:uni|:bi][level]|alt…"; o = { level, wide, rot, weekUsed, sesUsed, ctx, allowRepeat } */
function parseAlt(alt) { const m = /^([a-z-]+)(?::(uni|bi))?(\d)?$/.exec(alt); return { pat: m[1], lat: m[2] || null, lvl: m[3] ? +m[3] : null }; }
function ladder(pat, lat, ctx) {
  return EX.filter(e => e.pat === pat && !e.hidden && allowed(e, ctx) && (!lat || (lat === 'uni') === parseDose(e.dose).side));
}
function bandOf(c, lvl, wide) {
  const d = e => Math.abs(e.lvl - lvl) + (e.lvl > lvl ? 0.5 : 0);
  if (wide) { const w = c.filter(e => e.lvl <= lvl && e.lvl >= lvl - 1); if (w.length) return w; }
  const best = Math.min(...c.map(d)); return c.filter(e => d(e) === best);
}
function pick2(spec, o) {
  const alts = spec.replace(/!/g, '').split('|').map(parseAlt);
  const choose = (pool, lvl) => { const b = bandOf(pool, lvl, o.wide); return b[((o.rot % b.length) + b.length) % b.length]; };
  const tryAlt = (a, skipWeek) => {
    let c = ladder(a.pat, a.lat, o.ctx).filter(e => !o.sesUsed.has(e.id));
    if (!c.length && a.lat) c = ladder(a.pat, null, o.ctx).filter(e => !o.sesUsed.has(e.id));
    const free = skipWeek ? c : c.filter(e => !o.weekUsed.has(e.id));
    return free.length ? choose(free, a.lvl || o.level) : null;
  };
  for (const a of alts) { const e = tryAlt(a); if (e) return { e, pat: a.pat }; }
  for (const a of alts) for (const s of (SISTER[a.pat] || [])) { const b = parseAlt(s); b.lvl = a.lvl; const e = tryAlt(b); if (e) return { e, pat: b.pat, sister: true }; }
  if (o.allowRepeat) for (const a of alts) { const e = tryAlt(a, true); if (e) return { e, pat: a.pat, rep: true }; }
  return null;
}

/* main picks for every CORE/LEG session of the week: musts of all sessions first, then optional slots (R2/R3) */
function weekPicks(p, plan) {
  const ids = weekIdentities(plan), style = styleFor(plan.phase, plan.block, p, plan.monday);
  const order = { A: 0, M: 1, B: 2, C: 3 };
  const ses = plan.slots.filter(s => s.type === 'CORE' || s.type === 'LEG').map(s => ({ s, id: ids[s.key] }))
    .sort((a, b) => (a.s.type === b.s.type ? 0 : a.s.type === 'CORE' ? -1 : 1) || order[a.id] - order[b.id] || (a.s.idx || 0) - (b.s.idx || 0));
  const g = plan.slots.find(s => s.type === 'GROUP'), legA = ses.some(x => x.s.type === 'LEG' && (x.id === 'A' || x.id === 'M')) || !!(g && groupTypeOf(g.focus) === 'LEG');
  const weekUsed = new Set(), out = {};
  ses.forEach(x => { out[x.s.key] = specsFor(x.s.type, x.id, style, legA); });
  const ctx = makeCtx(p, plan.travel);
  [true, false].forEach(mustPass => ses.forEach(x => {
    const r = out[x.s.key], level = effLevel(p, x.s.type);
    r.specs.forEach((sp, i) => {
      if (sp.must !== mustPass || r.picks[i] !== undefined) return;
      const anchor = i === 0, rot = hashStr(`${x.s.type}|${x.id}|${i}`) % 997 + (anchor ? Math.floor(plan.block / 2) : plan.block);
      const pk = pick2(sp.spec, { level, wide: r.intent !== 'A' && r.intent !== 'M' && !anchor, rot, weekUsed, sesUsed: r.used, ctx, allowRepeat: sp.must });
      r.picks[i] = pk || null;
      if (pk) { weekUsed.add(pk.e.id); r.used.add(pk.e.id); }
    });
  }));
  Object.values(out).forEach(r => { r.main = r.specs.map((sp, i) => r.picks[i] ? { ...r.picks[i], must: sp.must } : null).filter(Boolean); });
  return { ids, out, weekUsed, style };
}
function specsFor(type, ident, style, legA) {
  const d = IDENT[type][ident] || IDENT[type].M;
  let specs = d.main.map(x => ({ spec: x, must: x.includes('!') }));
  if (type === 'CORE' && ident === 'A' && legA) specs = specs.map(x => x.spec === 'bridge!' ? { spec: 'bridge', must: false } : x);   // F9: hip extension already in LEG A / group
  if (type === 'CORE' && ident === 'M' && !legA) specs = specs.map(x => x.spec === 'bridge' ? { spec: 'bridge!', must: true } : x);   // no leg work this week: keep hip extension
  if (style === 'power' && d.power) specs.splice(1, 0, { spec: d.power + '!', must: true });
  return { specs, picks: [], used: new Set(), intent: d.intent, ident };
}

/* warm-up (level 1) and cool-down (level ≤ 2) of a session: follow the identity, rotate per block, never repeat a main exercise */
function sidePicks(type, ident, level, plan, ctx, mainIds) {
  const def = IDENT[type][ident] || IDENT[type].M, sesUsed = new Set(mainIds);
  const side = (specs, lvl, tag) => specs.map((sp, i) => { const pk = pick2(sp, { level: lvl, wide: false, rot: hashStr(`${type}|${ident}|${tag}${i}|${sp}`) % 997 + plan.block, weekUsed: new Set(), sesUsed, ctx, allowRepeat: false });
    if (pk) sesUsed.add(pk.e.id); return pk; }).filter(Boolean);
  const wu = side(def.wu, 1, 'w'), cd = side(def.cd, Math.min(level, 2), 'c');
  return { wu, cd };
}

function buildSession(p, st, plan, slot, opts = {}) {
  if (engineFor(st, plan.w) === 1 || !['CORE', 'LEG', 'MOB'].includes(slot.type)) return buildSessionV1(p, st, plan, slot, opts);
  return buildSessionV2(p, st, plan, slot, opts);
}

function doseFactor2(p, plan, type, wibOverride) {
  let f = 1;
  if (type === 'CORE' || type === 'LEG') f = [1, 1.15, 1.3, 1.4, 1.5][Math.min(4, wibOverride ?? weekInBlock(p, plan.w))];
  if (plan.rec && plan.phase !== 'race' && wibOverride == null) f = 0.85;
  if (plan.phase === 'offseason') f *= 0.9;
  if (plan.phase === 'inseason') f *= 0.95;
  if (plan.phase === 'taper') f *= 0.75;
  if (plan.phase === 'race') f *= 0.6;
  return f;
}

function buildSessionV2(p, st, plan, slot, opts = {}) {
  const type = slot.type, ov = (st.weekOv && st.weekOv[plan.w]) || {};
  const dur = +(opts.dur || (ov.dur && ov.dur[slot.key]) || capDur(p.dur || 30, plan.phase, type));
  const travel = opts.travel ?? plan.travel;
  const ctx = makeCtx(p, travel), level = effLevel(p, type), style = styleFor(plan.phase, plan.block, p, plan.monday);
  const wk = weekPicks(p, plan), wph = weekPhase(p, plan);
  const routine = String(slot.key).startsWith('R-');
  const swaps = (ov.swaps && ov.swaps[slot.key]) || {};
  const bsw = (st.blkSwaps && st.blkSwaps[`${plan.block}|${slot.key}`]) || {};
  const swapOf = id => { if (swaps[id] && EXMAP[swaps[id]]) return swaps[id]; const b = bsw[id]; if (b && EXMAP[b.to] && plan.w >= (b.from || 0)) return b.to; return id; };
  const mk = (e, pat, dose, extra = {}) => { const id = swapOf(e.id); return { id, orig: e.id, pat, dose, ...extra }; };
  const blocks = [];

  if (type === 'CORE' || type === 'LEG') {
    // this session's main picks: a planned session takes its row of the week; a routine picks around the whole week
    let r = wk.out[slot.key], ident;
    if (r && !travel === !plan.travel) ident = r.ident;
    else {
      ident = slot.key === 'R-TRAVEL' ? 'B' : routine ? extraIdentity(plan, type) : (wk.ids[slot.key] || 'M');
      const gg = plan.slots.find(s => s.type === 'GROUP'), legA = plan.slots.some(s => s.type === 'LEG' && ['A', 'M'].includes(wk.ids[s.key])) || !!(gg && groupTypeOf(gg.focus) === 'LEG');
      r = specsFor(type, ident, style, legA);
      const used = routine ? new Set(wk.weekUsed) : new Set([...wk.weekUsed].filter(id => !(wk.out[slot.key] || { used: new Set() }).used.has(id)));
      [true, false].forEach(mustPass => r.specs.forEach((sp, i) => {
        if (sp.must !== mustPass || r.picks[i] !== undefined) return;
        const anchor = i === 0, rot = hashStr(`${type}|${ident}|${i}`) % 997 + (anchor ? Math.floor(plan.block / 2) : plan.block);
        const pk = pick2(sp.spec, { level, wide: r.intent !== 'A' && r.intent !== 'M' && !anchor, rot, weekUsed: used, sesUsed: r.used, ctx, allowRepeat: sp.must });
        r.picks[i] = pk || null; if (pk) { used.add(pk.e.id); r.used.add(pk.e.id); }
      }));
      r.main = r.specs.map((sp, i) => r.picks[i] ? { ...r.picks[i], must: sp.must } : null).filter(Boolean);
    }
    const def = IDENT[type][ident] || IDENT[type].M, intent = def.intent;
    const mult = intent === 'B' ? 1.2 : 1;
    const rest = intent === 'A' ? 60 : intent === 'B' ? 30 : restFor(style, level);
    const sides = sidePicks(type, ident, level, plan, ctx, r.main.map(x => x.e.id));
    const wuAll = sides.wu.map(x => mk(x.e, x.pat, parseDose(x.e.dose)));
    const cdAll = sides.cd.map(x => mk(x.e, x.pat, parseDose(x.e.dose)));
    const mainFor = f => r.main.map(x => {
      const e = x.e, loaded = isLoaded(e);
      const ff = loaded && f > 1.15 ? 1.15 : f;   // loaded: reps stop at × 1,15, the load goes up instead
      const dose = scaleDose(parseDose(e.dose), ff * mult);
      let cue = null;
      if (x.rep) cue = dose.k === 't' ? 'cue_rep_t' : 'cue_rep_r';
      else if (loaded) cue = wph === 'rec' ? 'cue_load_rec' : wph === 'challenge' ? 'cue_load_up' : 'cue_load_rir';
      return mk(e, x.pat, dose, { must: x.must, ...(cue ? { cue } : {}), ...(x.rep ? { rep: true } : {}), ...(x.sister ? { sister: true } : {}) });
    });
    const start = STR_START[dur] || STR_START[30];
    const nMust = r.main.filter(x => x.must).length;
    const fit = (f, rounds0) => {
      const mainAll = mainFor(f);
      let cfg = { ...start, n: Math.max(nMust, Math.min(start.n, mainAll.length)), r: rounds0 };
      const est = c => {
        const wu = wuAll.slice(0, c.wu), mn = mainAll.slice(0, c.n), cd = cdAll.slice(0, c.cd);
        return (wu.reduce((a, i) => a + itemSeconds(i.dose) + 5, 0) + c.r * mn.reduce((a, i) => a + itemSeconds(i.dose), 0)
          + (c.r * mn.length - 1) * rest + (c.r - 1) * 30 + cd.reduce((a, i) => a + itemSeconds(i.dose) + 5, 0)) / 60;
      };
      // all combinations of rounds and number of exercises (musts always in): closest to the time (over time counts double),
      // then the planned number of rounds, then more exercises; shorter warm-up/cool-down only if needed
      const rMax = 4, nMax = Math.max(nMust, Math.min(mainAll.length, 8));
      const pickBest = (wu, cd) => { let best = null;
        for (let r = 1; r <= rMax; r++) for (let n = Math.min(nMust, mainAll.length); n <= nMax; n++) {
          const c = { ...cfg, wu, cd, r, n }, e = est(c), off = e > dur + 2 ? (e - dur) * 2 : e < dur - 3 ? dur - e : 0;
          const score = off * 10 + Math.abs(r - rounds0) + (nMax - n) * 0.3;
          if (!best || score < best.score) best = { c, e, score };
        } return best; };
      let best = pickBest(cfg.wu, cfg.cd);
      for (let wu = cfg.wu, cd = cfg.cd; best.e > dur + 2 && (wu > 2 || cd > 1);) { if (wu > 2) wu--; else cd--; best = pickBest(wu, cd); }
      cfg = best.c;
      return { cfg, mainAll };
    };
    const r0 = (plan.phase === 'taper' || plan.phase === 'race') ? Math.max(1, start.r - 1) : start.r;
    let cfg, mainAll;
    if (plan.rec && plan.phase !== 'race') {
      // R5: the exercises (and their number) of the week before, one round fewer, × 0,85, nothing added
      const prev = fit(doseFactor2(p, plan, type, Math.max(0, weekInBlock(p, plan.w) - 1)), r0);
      cfg = { ...prev.cfg }; if (cfg.r > 1) cfg.r--; else if (cfg.n > nMust) cfg.n--;   // already 1 round (short session): one optional exercise fewer
      mainAll = mainFor(doseFactor2(p, plan, type));
    } else ({ cfg, mainAll } = fit(doseFactor2(p, plan, type), r0));
    blocks.push({ k: 'wu', rounds: 1, rest: 0, items: wuAll.slice(0, cfg.wu) });
    blocks.push({ k: 'main', rounds: cfg.r, rest, roundRest: rest + 30, items: mainAll.slice(0, cfg.n) });
    blocks.push({ k: 'cd', rounds: 1, rest: 0, items: cdAll.slice(0, cfg.cd) });
    return finish({ type, dur, style, level, blocks, key: slot.key, test: !!slot.test, travel, eng: 2, ident, intent, wph });
  }

  // MOB: region emphasis rotates per week and per MOB session; avoid the stretches of this week's cool-downs (R2/R6)
  const [nr0, nm0, ns0] = MOB_COUNTS[dur] || MOB_COUNTS[30];
  const lvl = Math.min(level, 2), wib = weekInBlock(p, plan.w);
  const cdUsed = new Set();
  plan.slots.filter(s => wk.out[s.key]).forEach(s => {
    const r = wk.out[s.key]; sidePicks(s.type, r.ident, effLevel(p, s.type), plan, ctx, r.main.map(x => x.e.id)).cd.forEach(x => cdUsed.add(x.e.id));
  });
  const emph = MOB_EMPH[(wib + (slot.idx || 1) - 1) % 3];
  const used = new Set();
  const one = (sp, lv, i, avoid) => pick2(sp, { level: lv, wide: false, rot: hashStr(`MOB|${sp}|${i}`) % 997 + plan.block * 3 + wib, weekUsed: avoid, sesUsed: used, ctx, allowRepeat: true });
  const take = (specs, lv, avoid) => specs.map((sp, i) => { const pk = one(sp, lv, i, avoid); if (pk) used.add(pk.e.id); return pk; }).filter(Boolean)
    .map(x => mk(x.e, x.pat, parseDose(x.e.dose)));
  const rollAll = take(TPL.MOB.roll, 1, new Set());
  const mobAll = take(emph, lvl, cdUsed);
  const stabAll = take(TPL.MOB.stab, lvl, wk.weekUsed);
  let c = { r: Math.min(nr0, rollAll.length), m: Math.min(mobAll.length, nm0 + Math.max(0, nr0 - rollAll.length)), s: Math.min(ns0, stabAll.length), f: 1, mr: 1 };
  const sc = (arr, n, f) => arr.slice(0, n).map(i => ({ ...i, dose: scaleDose(i.dose, f) }));
  const est = c => (sc(rollAll, c.r, c.f).concat(sc(stabAll, c.s, 1)).reduce((a, i) => a + itemSeconds(i.dose) + 5, 0)
    + c.mr * sc(mobAll, c.m, c.f).reduce((a, i) => a + itemSeconds(i.dose) + 5, 0)) / 60;
  for (let k = 0; k < 40; k++) {
    const e = est(c);
    if (e < dur - 2) {
      if (c.f < 1.35) c.f = Math.round((c.f + 0.15) * 100) / 100;
      else if (c.m < mobAll.length) c.m++;
      else if (c.r < rollAll.length) c.r++;
      else if (c.s < stabAll.length) c.s++;
      else if (c.f < 1.6) c.f = Math.round((c.f + 0.25) * 100) / 100;
      else if (c.mr < 2) { c.mr = 2; c.f = 1; }
      else break;
    } else if (e > dur + 2) {
      if (c.m > 3) c.m--; else if (c.mr > 1) c.mr = 1; else if (c.r > 1) c.r--; else if (c.s > 1) c.s--; else break;
    } else break;
  }
  if (c.r) blocks.push({ k: 'roll', rounds: 1, rest: 0, items: sc(rollAll, c.r, c.f) });
  blocks.push({ k: 'mob', rounds: c.mr, rest: 0, items: sc(mobAll, c.m, c.f) });
  blocks.push({ k: 'stab', rounds: 1, rest: 0, items: sc(stabAll, c.s, 1) });
  return finish({ type, dur, style: 'recovery', level, blocks, key: slot.key, test: false, travel, eng: 2, emph: (wib + (slot.idx || 1) - 1) % 3, wph });
}
/* the main exercises planned in a week (for the swap list: avoid offering what is done on another day) */
function weekMainIds(p, plan) { try { return weekPicks(p, plan).weekUsed; } catch (e) { return new Set(); } }
