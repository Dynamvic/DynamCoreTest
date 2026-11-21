'use strict';
/* DynamCore – group features without a server.
   1. Share card: an image + text of your week for the WhatsApp group. The text ends with a code (#DC1.…)
      that the coach page reads to build the ranking.
   2. Group challenges: the coach makes a challenge on coach.html and shares its code (DCC1.…); athletes paste it here.
   Uses globals from app.js (P, S, t, esc, $, saveAll, rerender, sheet, copyText, isDone, curWeek, lang). */

const b64u = {
  enc: o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))))
};

/* ---------- stats ---------- */
/* v2.0: minutes = actual duration as saved with the session; older logs without it: planned (group session 60) */
const logMin = l => +l.dur || (l.type === 'GROUP' ? 60 : (+l.est || 0));
function grpWeek(w) {
  const pl = weekPlan(P, S, w), need = pl.slots.filter(s => !s.skipped);
  return { done: pl.slots.filter(s => isDone(w, s.key)).length, total: need.length, complete: need.length > 0 && need.every(s => isDone(w, s.key)), paused: !need.length && pl.slots.some(s => s.paused) };
}
function grpStreak() {
  const cw = curWeek(); let n = 0;
  if (cw >= 1 && grpWeek(cw).complete) n++;
  for (let w = cw - 1; w >= 1; w--) { const g = grpWeek(w); if (g.complete) n++; else if (g.paused) continue; else break; }
  return n;
}
function chProgress(c) {
  const from = DN.parse(c.f), to = DN.parse(c.to);
  const logs = S.logs.filter(l => l.d >= from && l.d <= to);
  let v = 0;
  if (c.k === 'sessions') v = logs.length;
  else if (c.k === 'minutes') v = logs.reduce((a, l) => a + logMin(l), 0);
  else if (c.k === 'type') v = logs.filter(l => l.type === c.ty).length;
  else if (c.k === 'weeks') {
    for (let w = 1; w <= curWeek(); w++) { const mon = mondayOfWeek(P, w); if (mon >= from && mon + 6 <= to && grpWeek(w).complete) v++; }
  }
  const td = DN.today();
  return { v, g: +c.g || 1, pct: Math.min(100, v / (+c.g || 1) * 100), state: td < from ? 'future' : td > to ? 'ended' : 'running', daysLeft: Math.max(0, to - td), from, to };
}
const kindLabel = (c, n) => c.k === 'type' ? tn('kind_type', n, { t: t('typeS_' + c.ty).toLowerCase() }) : tn('kind_' + c.k, n);   // v2.3: singular for 1
function shareData() {
  const cw = Math.max(1, curWeek()), wk = grpWeek(cw);
  const tot = S.logs.length, min = S.logs.reduce((a, l) => a + logMin(l), 0);
  const ch = (S.challenges || []).map(c => ({ c, p: chProgress(c) })).filter(x => x.p.state !== 'future');
  return { name: (P.name || '').trim() || (lang() === 'nl' ? 'Atleet' : 'Athlete'), w: cw, wd: wk.done, wt: wk.total, s: grpStreak(), tot, min, ch };
}
function shareToken(d) {
  return 'DC1.' + b64u.enc({ n: d.name, d: DN.iso(DN.today()), w: d.w, wd: d.wd, wt: d.wt, s: d.s, tot: d.tot, min: d.min, c: d.ch.map(x => ({ i: x.c.i, v: x.p.v, g: x.p.g })) });
}
function shareText(d) {
  const L = [`💪 DynamCore · ${d.name}`, `${t('card_week', { n: d.w })}: ${d.wd}/${d.wt} ${t('card_sessions')}`];
  if (d.s) L.push(`🔥 ${d.s} ${tn('card_streak', d.s)}`);
  L.push(`📈 ${d.tot} ${tn('card_total', d.tot)}`);
  d.ch.forEach(x => L.push(`🏁 ${x.c.t}: ${x.p.v}/${x.p.g} ${kindLabel(x.c, x.p.g)}`));
  L.push(`#${shareToken(d)}`);
  return L.join('\n');
}

/* ---------- share card image ---------- */
let logoImg = null;
function loadLogo() { return new Promise(res => { if (logoImg) return res(logoImg); const i = new Image(); i.onload = () => { logoImg = i; res(i); }; i.onerror = () => res(null); i.src = 'icons/logo-dark.png'; }); }
async function drawCard(d) {
  try { await document.fonts.ready; } catch (e) { }
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), ink = '#111214', mute = '#5D616B', acc = '#2448C8', soft = '#EEEFF1';
  const disp = '"Poppins","Avenir Next","Segoe UI",sans-serif', body = '"Inter","Segoe UI",sans-serif';
  x.fillStyle = '#F5F5F3'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#FFFFFF'; roundRect(x, 48, 48, W - 96, H - 96, 48); x.fill();
  const logo = await loadLogo();
  if (logo) { const lw = 420, lh = lw * logo.height / logo.width; x.drawImage(logo, 96, 96, lw, lh); }
  x.fillStyle = mute; x.font = `600 34px ${body}`; x.fillText('DynamCore', W - 96 - x.measureText('DynamCore').width, 140);
  x.fillStyle = ink; x.font = `800 84px ${disp}`; x.fillText(fit(x, d.name, W - 192), 96, 330);
  x.fillStyle = acc; x.font = `700 44px ${disp}`; x.fillText(t('card_week', { n: d.w }).toUpperCase(), 96, 400);
  // big ring: sessions this week
  const cx = 300, cy = 640, r = 170, pct = d.wt ? d.wd / d.wt : 0;
  x.lineWidth = 34; x.strokeStyle = soft; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = acc; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, pct)); x.stroke();
  x.fillStyle = ink; x.font = `800 120px ${disp}`; const s1 = `${d.wd}/${d.wt}`; x.fillText(s1, cx - x.measureText(s1).width / 2, cy + 40);
  x.fillStyle = mute; x.font = `500 32px ${body}`; const s2 = t('card_sessions'); x.fillText(s2, cx - x.measureText(s2).width / 2, cy + r + 80);
  // side stats
  const stat = (y, big, small) => { x.fillStyle = ink; x.font = `800 96px ${disp}`; x.fillText(String(big), 600, y); x.fillStyle = mute; x.font = `500 32px ${body}`; x.fillText(small, 600, y + 48); };
  stat(560, d.s, tn('card_streak', d.s)); stat(760, d.tot, tn('card_total', d.tot));
  // challenges
  let y = 960;
  d.ch.slice(0, 2).forEach(({ c, p }) => {
    x.fillStyle = ink; x.font = `700 38px ${disp}`; x.fillText(fit(x, '🏁 ' + c.t, W - 192), 96, y);
    x.fillStyle = soft; roundRect(x, 96, y + 26, W - 192, 30, 15); x.fill();
    x.fillStyle = acc; roundRect(x, 96, y + 26, Math.max(30, (W - 192) * p.pct / 100), 30, 15); x.fill();
    x.fillStyle = mute; x.font = `500 30px ${body}`; x.fillText(`${p.v} / ${p.g} ${kindLabel(c, p.g)}`, 96, y + 100);
    y += 160;
  });
  x.fillStyle = mute; x.font = `500 26px ${body}`; const ft = 'DynamVic Cycling coach'; x.fillText(ft, W / 2 - x.measureText(ft).width / 2, H - 90);
  return new Promise(res => cv.toBlob(b => res(b), 'image/png'));
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function fit(x, s, max) { let o = s; while (x.measureText(o).width > max && o.length > 3) o = o.slice(0, -2); return o === s ? s : o + '…'; }

let shareBlobUrl = null, shareFile = null, shareTxt = '';
async function openShare() {
  const d = shareData(); shareTxt = shareText(d);
  const blob = await drawCard(d);
  if (shareBlobUrl) URL.revokeObjectURL(shareBlobUrl);
  shareBlobUrl = blob ? URL.createObjectURL(blob) : null;
  shareFile = blob ? new File([blob], 'dynamcore-week.png', { type: 'image/png' }) : null;
  const canFiles = !!(shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] }));
  sheet(`<h3>${t('share_title')}</h3>${shareBlobUrl ? `<img class="sharecard" src="${shareBlobUrl}" alt="${esc(t('share_title'))}">` : ''}
    <div class="sheetact"><div class="row">${canFiles ? `<button class="btn primary" data-act="grpshareimg">${t('share_img')}</button>` : ''}<button class="btn ${canFiles ? 'ghost' : 'primary'}" data-act="grpsharetxt">${t('share_txt')}</button><span class="msg" id="shmsg"></span></div></div>
    <p class="small muted">${t(canFiles ? 'share_note' : 'share_fallback')}</p><pre class="itxt" id="shtxt">${esc(shareTxt)}</pre>`);
}

/* ---------- challenges ---------- */
function parseChallenge(code) {
  const m = /DCC1\.([A-Za-z0-9_-]+)/.exec(code || ''); if (!m) return null;
  try { const c = b64u.dec(m[1]); if (!c.i || !c.t || !c.k || !c.f || !c.to || !c.g) return null; return c; } catch (e) { return null; }
}
function addChallenge(code) {
  const c = parseChallenge(code); if (!c) return null;
  S.challenges = (S.challenges || []).filter(x => x.i !== c.i); S.challenges.push(c); saveAll(); return c;
}
function grpSection() {
  const list = (S.challenges || []).map(c => ({ c, p: chProgress(c) })).sort((a, b) => a.p.to - b.p.to);
  const row = ({ c, p }) => `<div class="ch"><div class="row between"><b>${esc(c.t)}</b><span class="small muted">${p.state === 'ended' ? t('ch_ended') : p.state === 'future' ? t('ch_not_started', { d: DN.fmt(p.from) }) : t('ch_days_left', { n: p.daysLeft })}</span></div>
    <div class="prog"><div class="bar"><i style="width:${p.pct}%"></i></div><div class="lbl"><span>${p.v} / ${p.g} ${esc(kindLabel(c, p.g))}${p.v >= p.g ? ' · ' + t('ch_done') : ''}</span><span>${DN.fmt(p.from)} – ${DN.fmt(p.to)}</span></div></div>
    <button class="btn tiny quiet" data-act="grprm" data-i="${esc(c.i)}">${t('ch_remove')}</button></div>`;
  return `<section class="card" id="grp"><h3>${t('ch_title')}</h3>${list.length ? list.map(row).join('') : `<p class="small muted">${t('ch_none')}</p>`}
    <div class="row"><input class="search" id="chcode" placeholder="${t('ch_paste_ph')}" autocomplete="off"><button class="btn quiet" data-act="grpadd">${t('ch_add')}</button></div><p class="msg" id="chmsg"></p>
    <button class="btn wide" data-act="grpshare">${t('share_week')}</button></section>`;
}

document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act^="grp"]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'grpshare') openShare();
  if (a === 'grpsharetxt') copyText(shareTxt, $('#shmsg'), $('#shtxt'));
  if (a === 'grpshareimg') { try { await navigator.share({ files: [shareFile], text: shareTxt }); } catch (e) { if (e && e.name !== 'AbortError') { const m = $('#shmsg'); if (m) m.textContent = t('share_fallback'); } } }
  if (a === 'grpadd') { const c = addChallenge($('#chcode').value); if (c) { rerender(); const m = $('#chmsg'); if (m) m.textContent = t('ch_added', { t: c.t }); } else { const m = $('#chmsg'); if (m) { m.className = 'msg bad'; m.textContent = t('ch_bad'); } } }
  if (a === 'grprm') { S.challenges = (S.challenges || []).filter(x => x.i !== el.dataset.i); saveAll(); rerender(); }
});

/* challenge link: …/dynamcore/?c=DCC1.xxxx (works when the link opens the app; otherwise paste the code) */
function importChallengeFromUrl() {
  try {
    const q = new URLSearchParams(location.search).get('c');
    if (q && typeof P !== 'undefined' && P) { const c = addChallenge(q); history.replaceState(null, '', location.pathname + (location.hash || '#progress')); if (c) { location.hash = '#progress'; } }
  } catch (e) { }
}
