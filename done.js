'use strict';
/* DynamCore – completing sessions: date, RPE 1–10, actual duration and remark, editable afterwards,
   and sending the completed session to Intervals.icu (one way: app → Intervals.icu).
   Intervals.icu: first look for a strength activity from a watch on that day and add RPE + remark to it;
   otherwise create a completed (manual) activity, linked to the planned workout when possible.
   Uses globals from app.js (P, S, UI, t, esc, $, saveAll, rerender, sheet, closeSheet, weekPlan, mondayOfWeek, ...). */

function findLog(w, key) { const m = S.logs.filter(l => l.w === w && l.key === key); return m[m.length - 1] || null; }
function slotDay(w, key) {
  const pl = weekPlan(P, S, w), s = pl.slots.find(x => x.key === key);
  return s ? pl.monday + s.day : null;
}
const typeLabel = ty => t('type_' + ty);

/* ---------- the "done" sheet ---------- */
function openDone(ctx) {
  // ctx: { w, key, type, est, routine?, guidedMin?, isNew? }
  const log = ctx.isNew ? null : findLog(ctx.w, ctx.key);
  const td = today();
  const planned = ctx.routine ? td : (slotDay(ctx.w, ctx.key) ?? td);
  const day = log ? log.d : Math.min(planned, td);
  const rpe = log ? log.rpe : null;
  const dur = log && log.dur ? log.dur : (ctx.guidedMin || ctx.est || 30);
  UI.doneCtx = { ...ctx, rpe };
  const hasKey = !!(P.icuKey && String(P.icuKey).trim());
  const linked = log && log.icu ? `<p class="small muted">${t('dn_linked', { d: DN.fmt(log.icu.at) })}${log.icu.mode === 'watch' ? ' ' + t('dn_linked_watch') : ''}</p>` : '';
  sheet(`${ctx.finished ? `<p class="eyebrow ok">✓ ${t('g_finished')}</p>` : ''}<h3>${log ? t('dn_edit') : t('dn_title')} · ${esc(typeLabel(ctx.type))}</h3>
    <div class="dn">
      <div class="fld"><span class="lbl" id="dn-dl">${t('dn_date')}</span><div class="dnd"><b id="dn-dtxt">${DN.fmtY(day)}</b>
        <label class="dnchg">${t('dn_change')}<input type="date" id="dn-date" value="${DN.iso(day)}" max="${DN.iso(td)}" aria-labelledby="dn-dl"></label></div></div>
      <div class="fld"><span class="lbl">${t('dn_rpe')}</span><small class="muted">${t('rpe_hint', { r: RPE_TARGET[ctx.type] || '' })}</small>
        <div class="rpe">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `<button class="rpeb" data-act="dnrpe" data-v="${i}" aria-pressed="${rpe === i}"><b>${i}</b><small>${t('rpe_labels')[i]}</small></button>`).join('')}</div></div>
      <label class="fld"><span class="lbl">${t('dn_dur')}</span><input id="dn-dur" inputmode="numeric" value="${dur}"></label>
      <label class="fld"><span class="lbl">${t('dn_note')}</span><textarea id="dn-note" class="note" placeholder="${t('dn_note_ph')}">${esc(log && log.note || '')}</textarea></label>
      ${linked}
      <div class="sheetact"><p class="msg" id="dn-msg" aria-live="polite"></p><div class="row"><button class="btn big" data-act="dnsave" data-send="${hasKey && P.icuAuto ? 1 : 0}">${hasKey && P.icuAuto ? t('dn_save_send') : t('dn_save')}</button>
        ${hasKey && !P.icuAuto ? `<button class="btn ghost" data-act="dnsave" data-send="1">${t('dn_save_send')}</button>` : ''}</div></div>
    </div>`);
}
/* v2.2: the date is shown as DD-MM-YYYY text; the real date field lies invisibly over "wijzig" (opens the iPhone date picker) */
document.addEventListener('input', ev => { if (ev.target && ev.target.id === 'dn-date') { const o = $('#dn-dtxt'); if (o && ev.target.value) o.textContent = DN.fmtY(DN.parse(ev.target.value)); } });
async function saveDone(send) {
  const c = UI.doneCtx, m = $('#dn-msg');
  if (!c.rpe) { m.className = 'msg bad'; m.textContent = t('dn_need_rpe'); return; }
  const d = $('#dn-date').value ? DN.parse($('#dn-date').value) : today();
  const dur = Math.max(1, Math.min(300, parseInt($('#dn-dur').value, 10) || c.est || 30));
  const note = $('#dn-note').value.trim();
  let log = c.isNew ? null : findLog(c.w, c.key), msg = '';
  if (!log) {
    log = { w: String(c.key).startsWith('R-') ? planWeekOf(P, d) : c.w, key: c.key, type: c.type, d, rpe: c.rpe, est: c.est, dur, note, prevAdj: (P.adj || {})[c.type] || 0 };
    const snap = sessionSnapshot(c); if (snap) log.ses = snap;   // v2.1: keep what was actually done
    S.logs.push(log);
    if (!String(c.key).startsWith('R-') && c.type !== 'GROUP') {
      const r = applyRpe(P, S.logs, c.type, c.rpe);
      if (r) { log.adjChanged = true; msg = t(r === 'harder' ? 'adj_harder' : 'adj_easier', { t: t('typeS_' + c.type).toLowerCase() }); }
    }
  } else {
    const rpeChanged = log.rpe !== c.rpe;
    Object.assign(log, { d, rpe: c.rpe, dur, note });
    if (String(log.key).startsWith('R-')) log.w = planWeekOf(P, d);   // v2.0.1: a routine belongs to the plan week of its date
    // recompute the RPE adjustment only when this is the latest session of its type
    const sameType = S.logs.filter(l => l.type === log.type);
    if (rpeChanged && sameType[sameType.length - 1] === log && log.type !== 'GROUP' && !String(log.key).startsWith('R-')) {
      if (log.adjChanged) { P.adj = P.adj || {}; P.adj[log.type] = log.prevAdj || 0; log.adjChanged = false; }
      log.prevAdj = (P.adj || {})[log.type] || 0;
      const r = applyRpe(P, S.logs, log.type, log.rpe);
      if (r) { log.adjChanged = true; msg = t(r === 'harder' ? 'adj_harder' : 'adj_easier', { t: t('typeS_' + log.type).toLowerCase() }); }
    }
  }
  saveAll();
  UI.doneCtx.isNew = false; UI.doneCtx.w = log.w; UI.doneCtx.key = log.key;
  // v2.0: close the sheet after saving; the result (and the Intervals.icu result) is shown at the bottom of the screen
  closeSheet(); rerenderBehindSheet();
  const pre = (msg || t('saved')) + ' ';
  if (send || (log.icu && P.icuKey)) {
    toast(pre + t('dn_sending'));
    try { const r = await icuDone(log); toast(pre + r); }
    catch (e) { toast(pre + icuError(e), true); }
    rerenderBehindSheet();
  } else toast(msg || t('saved'));
}
function rerenderBehindSheet() { const y = scrollY; route(); scrollTo(0, y); }

/* ---------- Intervals.icu: completed activity ---------- */
async function icuRaw(path, opts = {}) {
  const { key } = icuCreds(); if (!key) throw { code: 'nokey' };
  let res;
  try { res = await fetch(`https://intervals.icu/api/v1${path}`, { ...opts, headers: { Authorization: 'Basic ' + btoa('API_KEY:' + key), 'Content-Type': 'application/json' } }); }
  catch (e) { throw { code: 'blocked' }; }
  if (res.status === 401 || res.status === 403) throw { code: 'auth' };
  if (!res.ok) throw { code: 'http', status: res.status };
  return res.json().catch(() => ({}));
}
function doneDescription(log, base) {
  const head = `DynamCore · ${typeLabel(log.type)} · ${log.dur} min · RPE ${log.rpe}`;
  if (base !== undefined) return (base ? base + '\n\n' : '') + head + (log.note ? '\n' + log.note : '');
  return (log.note ? log.note + '\n\n' : '') + head;
}
async function icuDone(log) {
  const day = DN.iso(log.d), load = sessionLoad(P, log.type, log.est || log.dur);
  if (log.icu && log.icu.id) {
    const body = { icu_rpe: log.rpe, description: doneDescription(log, log.icu.mode === 'watch' ? (log.icu.base || '') : undefined) };
    if (log.icu.mode === 'manual') Object.assign(body, { start_date_local: `${day}T${(P.icsTime || '19:00')}:00`, moving_time: log.dur * 60, elapsed_time: log.dur * 60, icu_training_load: load });
    await icuRaw(`/activity/${encodeURIComponent(log.icu.id)}`, { method: 'PUT', body: JSON.stringify(body) });
    log.icu.at = today(); saveAll(); return t('dn_updated');
  }
  const { id: ath } = icuCreds();
  // 1. a strength activity from a watch on that day?
  let list = [];
  try { list = await icuRaw(`/athlete/${encodeURIComponent(ath)}/activities?oldest=${day}&newest=${day}`); } catch (e) { if (e.code === 'auth' || e.code === 'nokey' || e.code === 'blocked') throw e; }
  const used = new Set(S.logs.filter(l => l.icu && l.icu.id).map(l => String(l.icu.id)));
  const watch = (Array.isArray(list) ? list : []).find(a => a && /weight|strength/i.test(a.type || '') && !String(a.external_id || '').startsWith('dynamcore') && !used.has(String(a.id)));
  if (watch) {
    const base = watch.description || '';
    await icuRaw(`/activity/${encodeURIComponent(watch.id)}`, { method: 'PUT', body: JSON.stringify({ icu_rpe: log.rpe, description: doneDescription(log, base) }) });
    log.icu = { id: watch.id, mode: 'watch', base, at: today() }; saveAll(); return t('dn_sent_watch');
  }
  // 2. otherwise: a completed (manual) activity, linked to the planned workout if we sent one
  const planned = S.icuSent && S.icuSent[icuExtId(log.w, log.key)];
  const body = {
    start_date_local: `${day}T${(P.icsTime || '19:00')}:00`, type: 'WeightTraining', name: `DynamCore · ${log.type === 'GROUP' ? t('type_GROUP') : typeLabel(log.type)}`,
    description: doneDescription(log), moving_time: log.dur * 60, elapsed_time: log.dur * 60, icu_rpe: log.rpe, icu_training_load: load,
    external_id: `dynamcore-done-${P.start}-w${log.w}-${log.key}-${log.d}`
  };
  let res;
  if (planned && typeof planned === 'object' && planned.id != null) {
    try { res = await icuRaw(`/athlete/${encodeURIComponent(ath)}/activities/manual`, { method: 'POST', body: JSON.stringify({ ...body, paired_event_id: planned.id }) }); }
    catch (e) { if (e.code !== 'http') throw e; }
  }
  if (!res) res = await icuRaw(`/athlete/${encodeURIComponent(ath)}/activities/manual`, { method: 'POST', body: JSON.stringify(body) });
  log.icu = { id: res && res.id, mode: 'manual', at: today() }; saveAll();
  return t('dn_sent');
}
async function icuUndo(log) {
  if (!log.icu || !log.icu.id) return '';
  if (log.icu.mode === 'manual') await icuRaw(`/activity/${encodeURIComponent(log.icu.id)}`, { method: 'DELETE' });
  else await icuRaw(`/activity/${encodeURIComponent(log.icu.id)}`, { method: 'PUT', body: JSON.stringify({ icu_rpe: null, description: log.icu.base || '' }) });
  return t('dn_deleted');
}

/* ---------- summary block in the session view ---------- */
function doneBlock(w, key, type) {
  const log = findLog(w, key); if (!log) return '';
  const hasKey = !!(P.icuKey && String(P.icuKey).trim());
  return `<section class="card donebox"><div class="row between"><b>✓ ${t('status_done')} · ${DN.fmt(log.d)}</b><span class="pill">RPE ${log.rpe ?? '–'}</span></div>
    <p class="small muted">${t('dn_dur_s')}: ${log.dur || log.est || '–'} ${t('min')}${log.icu ? ' · ' + t('dn_linked', { d: DN.fmt(log.icu.at) }) : ''}</p>
    ${log.note ? `<p class="note-view">${esc(log.note)}</p>` : ''}
    <div class="row"><button class="btn quiet" data-act="dnedit" data-w="${w}" data-k="${esc(key)}" data-t="${type}">${t('dn_edit_btn')}</button>
      ${hasKey ? `<button class="btn ghost" data-act="dnsend" data-w="${w}" data-k="${esc(key)}">${log.icu ? t('dn_resend') : t('dn_send')}</button>` : ''}
      <button class="btn quiet" data-act="dnundo" data-w="${w}" data-k="${esc(key)}">${t('undo_done')}</button></div>
    <p class="msg" id="dnb-msg" aria-live="polite"></p></section>`;
}

document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act^="dn"]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'dnrpe') { UI.doneCtx.rpe = +el.dataset.v; document.querySelectorAll('.dn .rpeb').forEach(b => b.setAttribute('aria-pressed', String(b === el))); }
  if (a === 'dnsave') saveDone(el.dataset.send === '1');
  if (a === 'dnedit') { const w = +el.dataset.w, k = el.dataset.k, log = findLog(w, k); openDone({ w, key: k, type: el.dataset.t, est: log ? log.est : 30 }); }
  if (a === 'dnsend') {
    const log = findLog(+el.dataset.w, el.dataset.k), m = el.closest('#sheet') ? $('#sheet #dnb-msg') : $('#view #dnb-msg'); if (!log) return;
    if (m) { m.className = 'msg'; m.textContent = t('dn_sending'); }
    const inSheet = !!el.closest('#sheet');
    try { const r = await icuDone(log); rerenderBehindSheet(); if (inSheet) sheet(doneBlock(log.w, log.key, log.type)); const m2 = inSheet ? $('#sheet #dnb-msg') : $('#view #dnb-msg'); if (m2) { m2.className = 'msg'; m2.textContent = r; } }
    catch (e) { const m2 = (inSheet ? $('#sheet #dnb-msg') : $('#view #dnb-msg')) || m; if (m2) { m2.className = 'msg bad'; m2.textContent = icuError(e); } }
  }
  if (a === 'dnundo') {
    const w = +el.dataset.w, k = el.dataset.k, log = findLog(w, k); if (!log) return;
    if (log.icu && log.icu.id && P.icuKey) {
      UI.undoCtx = { w, k };
      sheet(`<h3>${t('undo_done')}</h3><p>${t('dn_undo_q')}</p><div class="chips col">${chip('dnundogo', 'data-icu="1"', false, t('dn_undo_yes'))}${chip('dnundogo', 'data-icu="0"', false, t('dn_undo_no'))}</div><p class="msg" id="dn-msg"></p>`);
    } else doUndo(w, k, false);
  }
  if (a === 'dnundogo') { const { w, k } = UI.undoCtx; await doUndo(w, k, el.dataset.icu === '1'); }
});
async function doUndo(w, k, alsoIcu) {
  const log = findLog(w, k);
  if (alsoIcu && log) {
    const m = $('#dn-msg'); if (m) { m.className = 'msg'; m.textContent = t('dn_sending'); }
    try { await icuUndo(log); } catch (e) { if (m) { m.className = 'msg bad'; m.textContent = icuError(e); } return; }
  }
  if (log && log.adjChanged) { P.adj = P.adj || {}; P.adj[log.type] = log.prevAdj || 0; }
  S.logs = S.logs.filter(l => !(l.w === w && l.key === k)); saveAll(); closeSheet(); rerenderBehindSheet();
}
