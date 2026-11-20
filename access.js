'use strict';
/* DynamCore – access control (option C: personal, device-bound activation).
   - Every phone gets a random device code (stored on the phone).
   - The coach signs "device code + name + end date" on coach.html with a private key that only exists in the coach's browser.
   - The app checks that signature with the public key in key.js (made by the coach page). No key.js = app stays locked.
   - A forwarded app gets a different device code; a forwarded activation code does not match the other phone.
   Activation data is kept apart from the athlete data: back-ups and "erase everything" do not touch it. */

/* ===== SWITCH: the lock is PARKED. Set to true (and upload your own key.js from coach.html) to turn it on. ===== */
const ACCESS_ENABLED = false;

const ACT = { state: 'checking', info: null, err: '' };
const ACCESS_KEYS = { device: 'dc:device', act: 'dc:act' };
const acc = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
};
const b64uBytes = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }
};
function deviceCode() {
  let d = acc.get(ACCESS_KEYS.device);
  if (!d) {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(12));
    const s = [...r].map(x => A[x % A.length]).join('');
    d = `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
    acc.set(ACCESS_KEYS.device, d);
  }
  return d;
}
async function verifyToken(token) {
  if (typeof DC_KEY === 'undefined' || !window.crypto || !crypto.subtle) return { ok: false, why: 'nokey' };
  const m = /DCA1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)/.exec(token || '');
  if (!m) return { ok: false, why: 'format' };
  let pay;
  try { pay = JSON.parse(new TextDecoder().decode(b64uBytes.dec(m[1]))); } catch (e) { return { ok: false, why: 'format' }; }
  try {
    const key = await crypto.subtle.importKey('jwk', DC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const good = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64uBytes.dec(m[2]), new TextEncoder().encode(m[1]));
    if (!good) return { ok: false, why: 'sig' };
  } catch (e) { return { ok: false, why: 'sig' }; }
  if (pay.d !== deviceCode()) return { ok: false, why: 'device', pay };
  if (typeof DC_REVOKED !== 'undefined' && DC_REVOKED.includes(pay.d)) return { ok: false, why: 'revoked', pay };
  if (pay.e && pay.e < DN.iso(DN.today())) return { ok: false, why: 'expired', pay };
  return { ok: true, pay, token: `DCA1.${m[1]}.${m[2]}` };
}
async function checkActivation() {
  if (!ACCESS_ENABLED) { ACT.state = 'ok'; return; }
  deviceCode();
  if (typeof DC_KEY === 'undefined') { ACT.state = 'nokey'; return; }
  const tok = acc.get(ACCESS_KEYS.act);
  if (!tok) { ACT.state = 'locked'; return; }
  const r = await verifyToken(tok);
  if (r.ok) { ACT.state = 'ok'; ACT.info = r.pay; }
  else { ACT.state = r.why === 'expired' ? 'expired' : r.why === 'revoked' ? 'revoked' : 'locked'; ACT.info = r.pay || null; }
}
function vLock() {
  const code = deviceCode(), L = lang();
  const why = ACT.state === 'expired' ? `<div class="card warnc"><p>${t('acc_expired', { d: ACT.info && ACT.info.e ? DN.fmtY(DN.parse(ACT.info.e)) : '' })}</p></div>`
    : ACT.state === 'revoked' ? `<div class="card warnc"><p>${t('acc_revoked')}</p></div>`
    : ACT.state === 'nokey' ? `<div class="card warnc"><p>${t('acc_nokey')}</p></div>` : '';
  const hasData = !!P;
  return `<div class="wz"><picture class="logo-big"><source srcset="icons/logo-light.png" media="(prefers-color-scheme: dark)"><img src="icons/logo-dark.png" alt="DynamVic Cycling coach"></picture>
    <h1 class="h1">${t('acc_title')}</h1><p class="lead">${t('acc_lead')}</p>${why}
    ${hasData ? `<p class="small muted">${t('acc_keepdata')}</p>` : ''}
    <section class="card"><span class="eyebrow">${t('acc_step1')}</span><div class="devcode" id="devcode">${code}</div>
      <div class="row"><button class="btn" data-act="accsend">${t('acc_send')}</button><button class="btn ghost" data-act="acccopy">${t('acc_copy')}</button><span class="msg" id="accmsg"></span></div></section>
    <section class="card"><span class="eyebrow">${t('acc_step2')}</span>
      <textarea id="acccode" placeholder="${t('acc_paste')}" autocomplete="off"></textarea>
      <button class="btn wide" data-act="accgo">${t('acc_activate')}</button><p class="msg" id="accerr"></p></section>
    <div class="row">${['nl', 'en'].map(x => `<button class="chip" data-act="acclang" data-v="${x}" aria-pressed="${L === x}">${x === 'nl' ? 'Nederlands' : 'English'}</button>`).join('')}</div></div>`;
}
function accInfoCard() {
  if (!ACCESS_ENABLED) return '';
  if (ACT.state !== 'ok' || !ACT.info) return '';
  return `<p class="small muted">${t('acc_info', { n: esc(ACT.info.n || ''), d: ACT.info.e ? DN.fmtY(DN.parse(ACT.info.e)) : t('acc_noend') })} · ${t('acc_device')}: <code>${deviceCode()}</code></p>`;
}
function accExpiryWarning() {
  if (!ACCESS_ENABLED) return '';
  if (ACT.state !== 'ok' || !ACT.info || !ACT.info.e) return '';
  const left = DN.parse(ACT.info.e) - DN.today();
  return left <= 14 ? `<div class="card warnc"><p>${t('acc_soon', { n: left, d: DN.fmtY(DN.parse(ACT.info.e)) })}</p></div>` : '';
}
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act^="acc"]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'acccopy') copyText(deviceCode(), $('#accmsg'), $('#devcode'));
  if (a === 'accsend') {
    const txt = t('acc_msg', { c: deviceCode(), n: (P && P.name) || '' });
    try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    copyText(txt, $('#accmsg'), null);
  }
  if (a === 'acclang') { UI.lockLang = el.dataset.v; if (P) { P.lang = el.dataset.v; saveAll(); } document.documentElement.lang = el.dataset.v; route(); }
  if (a === 'accgo') {
    const r = await verifyToken($('#acccode').value), m = $('#accerr');
    if (r.ok) { acc.set(ACCESS_KEYS.act, r.token); ACT.state = 'ok'; ACT.info = r.pay; location.hash = P ? '#week' : '#wizard'; route(); return; }
    m.className = 'msg bad';
    m.textContent = t({ nokey: 'acc_nokey', format: 'acc_err_format', sig: 'acc_err_sig', device: 'acc_err_device', expired: 'acc_err_expired', revoked: 'acc_revoked' }[r.why] || 'acc_err_sig');
  }
});
