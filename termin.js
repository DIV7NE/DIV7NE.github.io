'use strict';
// The customer's own booking, reached through the private link from the confirmation.
// Helpers (el, api, fmtDay, fmtDur, fmtEur, addMin, parseKey) come from /main.js.
(() => {
  const box = document.getElementById('termin');
  const q = new URLSearchParams(location.search);
  const id = q.get('id');
  const t = q.get('t');
  const st = { b: null, mode: 'view', days: [], shown: null, date: null, time: null, msg: '', err: '', busy: false };
  const phone = () => el('a', { href: 'tel:+38640856852' }, '+386 40 856 852');
  const post = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, t, ...body }) });
  const card = (b) => el('div', { class: 'first-slot' },
    el('span', { class: 'mono' }, b.services.join(' + ')),
    el('p', { class: 'when' }, fmtDay(b.date), el('br'), `${b.time} – ${addMin(b.time, b.min)}`),
    el('span', { class: 'mono' }, `${fmtDur(b.min)} · ${fmtEur(b.eur)}`));
  const actions = (...nodes) => el('div', { class: 'lead-actions' }, ...nodes);
  const button = (label, onclick, cls = 'btn') => el('button', { type: 'button', class: cls, onclick, disabled: st.busy ? '' : null }, label);

  function render() {
    const b = st.b;
    const out = [];
    if (st.err) out.push(el('p', { class: 'error', role: 'alert' }, st.err));
    if (st.msg) out.push(el('p', { class: 'notice', role: 'status' }, st.msg));
    if (st.mode === 'gone') {
      out.push(el('p', {}, 'Če želiš nov termin, ga lahko rezerviraš kadar koli.'), actions(el('a', { class: 'btn btn-pink', href: '/narocanje.html' }, 'Rezerviraj termin')));
    } else if (st.mode === 'view') {
      out.push(card(b));
      if (b.past) out.push(el('p', { class: 'muted' }, 'Ta termin je že mimo.'));
      else if (!b.changeable) out.push(el('p', { class: 'notice' }, `Do termina je manj kot ${b.changeHours} ur, zato sprememba prek spleta ni več mogoča. Pokliči me: `, phone(), '.'));
      else {
        out.push(el('p', { class: 'muted' }, `Termin lahko brezplačno prestaviš ali prekličeš do ${b.changeHours} ur pred začetkom.`),
          actions(button('Prestavi termin', startMove, 'btn btn-pink'), button('Prekliči termin', () => { st.mode = 'cancel'; st.msg = st.err = ''; render(); })));
      }
    } else if (st.mode === 'cancel') {
      out.push(card(b), el('p', {}, 'Res želiš preklicati ta termin? Čas se sprosti za druge.'),
        actions(button('Da, prekliči', cancel, 'btn btn-pink'), button('Ne, obdrži termin', () => { st.mode = 'view'; render(); })));
    } else if (st.mode === 'move') {
      out.push(el('p', { class: 'muted' }, `Zdaj: ${fmtDay(b.date)} ob ${b.time}. Izberi nov termin.`));
      if (!st.days.length) out.push(el('p', { class: 'notice' }, 'Trenutno ni drugega prostega termina. Pokliči me: ', phone(), '.'));
      else {
        const dayRow = el('div', { class: 'days', role: 'group', 'aria-label': 'Dnevi' });
        for (const d of st.days) {
          const date = parseKey(d.date);
          dayRow.append(el('button', { type: 'button', class: 'day', 'aria-pressed': String(d.date === st.shown), onclick: () => { st.shown = d.date; render(); } },
            el('span', { class: 'mono' }, DAYS_SHORT[date.getDay()]), el('b', {}, String(date.getDate())), el('span', { class: 'mono muted' }, MONTHS[date.getMonth()].slice(0, 3))));
        }
        const times = el('div', { class: 'times', role: 'group', 'aria-label': 'Ure' });
        for (const time of st.days.find((d) => d.date === st.shown).times) {
          times.append(el('button', { type: 'button', class: 'time', 'aria-pressed': String(st.date === st.shown && st.time === time), onclick: () => { st.date = st.shown; st.time = time; render(); } }, time));
        }
        out.push(dayRow, times);
      }
      out.push(actions(el('button', { type: 'button', class: 'btn btn-pink', onclick: move, disabled: st.time && !st.busy ? null : '' }, st.time ? `Potrdi: ${fmtDay(st.date)} ob ${st.time}` : 'Izberi uro'),
        button('Nazaj', () => { st.mode = 'view'; st.err = ''; render(); })));
    }
    box.replaceChildren(...out);
  }

  // Shows what went wrong; a refused change usually means the situation changed, so reload the booking too.
  async function failed(e) {
    st.busy = false;
    st.err = e.message;
    if (e.status === 404) { st.mode = 'gone'; st.b = null; return render(); }
    try { st.b = await api(`/api/booking?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`); } catch { /* keep what we have */ }
    st.mode = 'view';
    render();
  }

  async function startMove() {
    st.busy = true; st.msg = st.err = ''; render();
    try {
      const r = await api(`/api/booking/slots?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`);
      st.days = r.days; st.shown = r.days[0] ? r.days[0].date : null; st.date = st.time = null; st.mode = 'move'; st.busy = false;
      render();
    } catch (e) { failed(e); }
  }
  async function move() {
    st.busy = true; st.err = ''; render();
    try {
      const r = await post('/api/booking/move', { date: st.date, time: st.time });
      st.b = { ...st.b, date: r.date, time: r.time }; st.mode = 'view'; st.busy = false; st.msg = 'Termin je prestavljen.';
      render();
    } catch (e) { failed(e); }
  }
  async function cancel() {
    st.busy = true; st.err = ''; render();
    try {
      await post('/api/booking/cancel', {});
      st.b = null; st.mode = 'gone'; st.busy = false; st.msg = 'Termin je preklican.';
      render();
    } catch (e) { failed(e); }
  }

  if (!id || !t) { st.mode = 'gone'; st.err = 'Povezava do termina ni popolna. Odpri jo iz potrditve ali me pokliči.'; render(); return; }
  api(`/api/booking?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`).then((b) => { st.b = b; render(); }).catch((e) => { st.mode = 'gone'; st.err = e.message; render(); });
})();
