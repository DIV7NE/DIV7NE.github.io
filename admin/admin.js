'use strict';
// Admin screens. Helpers (el, fmtDay, fmtDur, fmtEur, addMin) come from /main.js.

const app = document.getElementById('app');
const st = { tab: 'termini', data: null, msg: '', open: null, showPast: false, prefill: null, conflict: null, carry: null, week: 0, sel: null };
const TABS = [['termini', 'Termini'], ['urnik', 'Urnik'], ['povprasevanja', 'Povpraševanja'], ['cenik', 'Cenik'], ['ostalo', 'Koledar in kopije']];
const WEEK = [1, 2, 3, 4, 5, 6, 0];

async function call(name, body) {
  const res = await fetch(`/api/admin/${name}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}
async function reload(msg) {
  const r = await call('state');
  if (!r.ok) { app.replaceChildren(el('p', { class: 'error' }, 'Podatkov ni mogoče naložiti. Osveži stran.')); return; }
  st.data = r.body;
  if (msg !== undefined) st.msg = msg;
  render();
}
// Runs an action; on success reloads with a message, on failure shows the server's reason.
async function act(name, body, done) {
  const r = await call(name, body);
  if (r.ok) { st.open = null; st.conflict = null; await reload(typeof done === 'function' ? done(r.body) : done); return true; }
  st.conflict = r.body.conflict ? { name, body } : null;
  st.msg = r.body.error || 'Ni uspelo. Poskusi znova.';
  render();
  return false;
}

// a single control sits inside its label; a group (the service picker) gets a plain caption, since labels cannot nest
const field = (label, control, hint) => el('div', { class: 'field' }, /^(INPUT|TEXTAREA)$/.test(control.tagName) ? el('label', {}, label, control) : el('div', { class: 'group' }, el('span', { class: 'cap' }, label), control), hint ? el('p', { class: 'hint' }, hint) : null);
const input = (attrs) => el('input', attrs);
const check = (label, attrs) => el('label', { class: 'check' }, el('input', { type: 'checkbox', ...attrs }), label);
const val = (form, name) => form.elements[name]?.value.trim() ?? '';
const on = (form, name) => !!form.elements[name]?.checked;
const btn = (label, onclick, cls = 'link') => el('button', { type: 'button', class: cls, onclick }, label);

function render() {
  const d = st.data;
  const tabs = el('div', { class: 'tabs', role: 'tablist' }, ...TABS.map(([id, label]) => el('button', {
    type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(st.tab === id),
    onclick: () => { st.tab = id; st.msg = ''; st.open = null; st.conflict = null; st.sel = null; st.prefill = null; st.carry = null; render(); },
  }, label, id === 'povprasevanja' && d.requests.length ? el('b', {}, String(d.requests.length)) : null)));
  const view = { termini: viewBookings, urnik: viewSchedule, povprasevanja: viewRequests, cenik: viewPrices, ostalo: viewOther }[st.tab]();
  const flash = st.msg ? el('div', { class: 'flash', role: 'status' }, st.msg,
    st.conflict ? el('div', { class: 'acts' }, btn('Vseeno shrani', () => act(st.conflict.name, { ...st.conflict.body, force: true }, 'Shranjeno kljub prekrivanju.'), 'btn btn-sm')) : null) : null;
  app.replaceChildren(tabs, flash || '', view);
}

// ---- termini

function viewBookings() {
  const d = st.data;
  const wrap = el('div', {});
  const items = d.bookings.filter((b) => st.showPast || b.date >= d.today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  wrap.append(el('div', { class: 'acts' }, btn('+ Nov termin', () => { st.tab = 'urnik'; st.prefill = null; st.carry = null; st.msg = 'Izberi čas v tabeli, nato Vpiši termin.'; render(); }, 'btn btn-pink btn-sm'),
    btn(st.showPast ? 'Skrij pretekle' : 'Pokaži zadnjih 30 dni', () => { st.showPast = !st.showPast; render(); })));
  if (!items.length) wrap.append(el('p', { class: 'muted empty' }, 'Ni vpisanih terminov.'));
  let day = '';
  for (const b of items) {
    if (b.date !== day) { day = b.date; wrap.append(el('p', { class: `day-head${day === d.today ? ' today' : ''}` }, `${fmtDay(day)}${day === d.today ? ' · danes' : ''}`)); }
    wrap.append(bookingCard(b));
  }
  return wrap;
}

function bookingCard(b) {
  const open = st.open && st.open.id === b.id ? st.open.what : null;
  const toggle = (what) => () => { st.open = open === what ? null : { id: b.id, what }; st.msg = ''; st.conflict = null; render(); };
  const card = el('div', { class: 'card' },
    el('div', { class: 'card-top' },
      el('span', { class: 't' }, `${b.time} – ${addMin(b.time, b.min)}`),
      el('span', { class: 'mono' }, b.finalEur != null ? `dogovorjeno ${fmtEur(b.finalEur)} (cenik ${fmtEur(b.eur)})` : fmtEur(b.eur))),
    el('p', { class: 'who' }, el('b', {}, b.name), b.phone ? ' · ' : '', b.phone ? el('a', { href: `tel:${b.phone.replace(/[^+\d]/g, '')}` }, b.phone) : null, b.email ? ` · ${b.email}` : ''),
    el('p', { class: 'meta' }, [b.services.join(' + '), b.note, b.finalNote ? `Dogovor: ${b.finalNote}` : '', b.source === 'admin' ? 'vpisala ročno' : ''].filter(Boolean).join('\n')),
    el('div', { class: 'acts' }, btn('Prestavi', toggle('move')), btn('Končna cena', toggle('price')), btn('Odpovej', toggle('cancel'), 'link danger')));
  const mailNote = b.email && st.data.mail ? check('Obvesti stranko po e-pošti', { name: 'notify', checked: '' }) : null;
  if (open === 'move') {
    const f = el('form', { class: 'inline form' }, el('div', { class: 'row' },
      field('Nov datum', input({ type: 'date', name: 'date', value: b.date, required: '' })), field('Ura', input({ type: 'time', name: 'time', value: b.time, required: '' }))),
      mailNote, el('div', { class: 'acts' }, el('button', { type: 'submit', class: 'btn btn-pink btn-sm' }, 'Shrani nov termin')));
    f.addEventListener('submit', (e) => { e.preventDefault(); act('bookings/move', { id: b.id, date: val(f, 'date'), time: val(f, 'time'), notify: on(f, 'notify') }, 'Termin je prestavljen.'); });
    card.append(f);
  }
  if (open === 'price') {
    const f = el('form', { class: 'inline form' }, el('div', { class: 'row' },
      field('Končna cena (€)', input({ type: 'number', name: 'finalEur', min: '0', max: '10000', step: '0.5', value: String(b.finalEur ?? b.eur), required: '' })),
      field('Kaj sta se dogovorili (neobvezno)', input({ name: 'finalNote', maxlength: '200', value: b.finalNote || '' }))),
      el('p', { class: 'hint' }, 'Sem zapiši ceno, s katero se je stranka strinjala (npr. storitev po dogovoru ali dodatno delo).'),
      el('div', { class: 'acts' }, el('button', { type: 'submit', class: 'btn btn-pink btn-sm' }, 'Shrani ceno')));
    f.addEventListener('submit', (e) => { e.preventDefault(); act('bookings/price', { id: b.id, finalEur: Number(val(f, 'finalEur')), finalNote: val(f, 'finalNote') }, 'Končna cena je shranjena.'); });
    card.append(f);
  }
  if (open === 'cancel') {
    const f = el('form', { class: 'inline form' }, el('p', {}, `Odpovem termin ${b.time} (${b.name})? Termin se izbriše in postane spet prost.`),
      mailNote, el('div', { class: 'acts' }, el('button', { type: 'submit', class: 'btn btn-sm' }, 'Da, odpovej'), btn('Ne', toggle('cancel'))));
    f.addEventListener('submit', (e) => { e.preventDefault(); act('bookings/cancel', { id: b.id, notify: on(f, 'notify') }, 'Termin je odpovedan.'); });
    card.append(f);
  }
  return card;
}

// ---- nov termin: the form opens inside the schedule (`st.prefill` set) and returns to it

function viewNew() {
  const d = st.data;
  const p = st.prefill || {};
  const back = () => { st.prefill = null; st.msg = ''; st.conflict = null; render(); };
  const f = el('form', { class: 'form' });
  const picks = el('div', { class: 'picks' });
  let group = '';
  for (const s of d.services.filter((x) => !x.custom)) {
    if (s.category !== group) { group = s.category; picks.append(el('p', { class: 'grp' }, group)); }
    picks.append(check(`${s.name} (${fmtDur(s.min)}, ${fmtEur(s.eur)})`, { name: 'svc', value: s.id }));
  }
  picks.addEventListener('change', () => {
    const chosen = [...f.querySelectorAll('[name=svc]:checked')].map((c) => d.services.find((s) => s.id === c.value));
    if (!chosen.length) return;
    f.elements.title.value = chosen.map((s) => s.name).join(' + ');
    f.elements.min.value = chosen.reduce((t, s) => t + s.min, 0);
    f.elements.eur.value = chosen.reduce((t, s) => t + s.eur, 0);
  });
  f.append(
    p.requestId ? el('p', { class: 'notice' }, `Vpisujem termin za povpraševanje: ${p.name}. Ko shraniš, se povpraševanje označi kot opravljeno.`) : '',
    el('div', { class: 'row' }, field('Datum', input({ type: 'date', name: 'date', min: d.today, required: '', value: p.date || '' })), field('Ura', input({ type: 'time', name: 'time', step: '300', required: '', value: p.time || '' }))),
    field('Storitve iz cenika (neobvezno, izpolni spodnja polja)', picks),
    field('Storitev', input({ name: 'title', maxlength: '160', required: '', value: p.title || '' })),
    el('div', { class: 'row' }, field('Trajanje (min)', input({ type: 'number', name: 'min', min: '5', max: '720', step: '5', required: '', value: p.min || '' })),
      field('Cena (€)', input({ type: 'number', name: 'eur', min: '0', max: '10000', step: '0.5', required: '', value: p.eur ?? '' }))),
    el('div', { class: 'row' }, field('Ime in priimek', input({ name: 'name', maxlength: '80', required: '', value: p.name || '' })), field('Telefon', input({ name: 'phone', type: 'tel', maxlength: '30', value: p.phone || '' }))),
    field('E-pošta (neobvezno)', input({ name: 'email', type: 'email', maxlength: '120', value: p.email || '' })),
    field('Opomba', el('textarea', { name: 'note', maxlength: '500' }, p.note || '')),
    d.mail ? check('Pošlji stranki potrditev po e-pošti (če je e-naslov vpisan)', { name: 'notify', checked: '' }) : '',
    el('div', { class: 'acts' }, el('button', { type: 'submit', class: 'btn btn-pink' }, 'Shrani termin'), btn('Nazaj na urnik', back)));
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    act('bookings/add', { date: val(f, 'date'), time: val(f, 'time'), title: val(f, 'title'), min: Number(val(f, 'min')), eur: Number(val(f, 'eur')), name: val(f, 'name'),
      phone: val(f, 'phone'), email: val(f, 'email'), note: val(f, 'note'), notify: on(f, 'notify') && !!val(f, 'email'), requestId: p.requestId },
    () => { st.prefill = null; st.carry = null; return 'Termin je vpisan.'; });
  });
  return el('div', {}, el('div', { class: 'acts back' }, btn('← Nazaj na urnik', back)), el('h2', {}, 'Nov termin'), el('p', { class: 'muted' }, 'Termin vpišeš sama: lahko kadar koli, tudi v času, ki je za stranke zaseden.'), f);
}

// ---- urnik

const GRID_FROM = 7 * 60, GRID_TO = 22 * 60, CELL = 30;
const ROWS = (GRID_TO - GRID_FROM) / CELL;
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayRanges = (date) => st.data.days[date] || [];
const overlaps = (list, date, from, to) => list.find((b) => b.date === date && mins(b.time) < to && mins(b.time) + b.min > from);
// The day's open ranges with [from, to) opened or closed; everything else on that day stays as it was.
function withCell(ranges, from, to, open) {
  const parts = [];
  for (const [a, b] of ranges.map((r) => r.map(mins))) {
    if (a < from) parts.push([a, Math.min(b, from)]);
    if (b > to) parts.push([Math.max(a, to), b]);
  }
  if (open) parts.push([from, to]);
  parts.sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const r of parts) { const last = out[out.length - 1]; if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else out.push(r); }
  return out.map((r) => r.map((m) => addMin('00:00', m)));
}
function weekDates() {
  const first = parseKey(st.data.today);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7) + 7 * st.week);
  return WEEK.map((_, i) => { const x = new Date(first); x.setDate(x.getDate() + i); return keyOf(x); });
}

// The selection is a set of cells ("day,row": day of the shown week, half-hour row) that grows until she acts on it
// or cancels. A click adds one cell (or takes it out again), a drag adds a block, Shift adds everything from the
// last clicked cell `a` to this one.
const cellOf = (node) => { const c = node && node.closest && node.closest('[data-cell]'); return c ? c.dataset.cell.split(',').map(Number) : null; };
const inSel = (d, r) => !!st.sel && st.sel.cells.has(`${d},${r}`);
function block(a, b) {
  const out = [];
  for (let d = Math.min(a[0], b[0]); d <= Math.max(a[0], b[0]); d++) for (let r = Math.min(a[1], b[1]); r <= Math.max(a[1], b[1]); r++) out.push(`${d},${r}`);
  return out;
}
// `base` is the selection to add to; with `toggle`, a block that is already fully selected is taken out instead.
function select(base, from, to, e, toggle) {
  const a = e.shiftKey && base ? base.a : from;
  const cells = new Set(base ? base.cells : []);
  const add = block(a, to);
  if (toggle && !e.shiftKey && add.every((k) => cells.has(k))) add.forEach((k) => cells.delete(k)); else add.forEach((k) => cells.add(k));
  st.sel = cells.size ? { cells, a } : null;
  st.msg = '';
}
function tapCell(c, e) {
  select(st.sel, c, c, e, true);
  render();
  app.querySelector(`[data-cell="${c}"]`)?.focus();
}
// Changes show at once and are saved in the order they were made, so quick ones cannot overwrite each other.
let saving = Promise.resolve();
function applySel(open) {
  const s = st.sel, d = st.data, week = weekDates();
  const changed = new Map();
  for (const [di, r] of [...s.cells].map((k) => k.split(',').map(Number))) {
    const date = week[di];
    if (date >= d.today) changed.set(date, withCell(changed.get(date) || dayRanges(date), GRID_FROM + r * CELL, GRID_FROM + (r + 1) * CELL, open));
  }
  for (const [date, ranges] of changed) {
    if (ranges.length) d.days[date] = ranges; else delete d.days[date];
    saving = saving.then(() => call('catalog/day', { date, ranges })).then((r) => (r.ok ? null : reload(r.body.error || 'Shranjevanje ni uspelo. Poskusi znova.')))
      .catch(() => { st.msg = 'Ni povezave: zadnja sprememba ni shranjena. Osveži stran.'; render(); });
  }
  st.sel = null;
  st.msg = !changed.size ? 'Preteklih dni ni mogoče spreminjati.' : `${open ? 'Prosto' : 'Zasedeno'}: ${selLabel(s)}.`;
  render();
}
// The one block the selection forms (days d0..d1, rows r0..r1), or null when it is scattered.
function selBlock(s) {
  const cells = [...s.cells].map((k) => k.split(',').map(Number));
  const ds = cells.map((c) => c[0]), rs = cells.map((c) => c[1]);
  const x = { d0: Math.min(...ds), d1: Math.max(...ds), r0: Math.min(...rs), r1: Math.max(...rs) };
  return (x.d1 - x.d0 + 1) * (x.r1 - x.r0 + 1) === cells.length ? x : null;
}
function selLabel(s) {
  const x = selBlock(s), dates = weekDates();
  if (!x) return `izbrana polja: ${s.cells.size}`;
  const days = x.d0 === x.d1 ? fmtDay(dates[x.d0]) : `${fmtDay(dates[x.d0], false)} – ${fmtDay(dates[x.d1], false)}`;
  return `${days}, ${addMin('00:00', GRID_FROM + x.r0 * CELL)}–${addMin('00:00', GRID_FROM + (x.r1 + 1) * CELL)}`;
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && st.sel) { st.sel = null; render(); }
  // Ctrl+A selects the whole shown week, unless she is typing in a field
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && st.tab === 'urnik' && st.data && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
    e.preventDefault();
    st.sel = { cells: new Set(block([0, 0], [6, ROWS - 1])), a: [0, 0] };
    st.msg = '';
    render();
  }
});

function viewSchedule() {
  if (st.prefill) return viewNew();
  const d = st.data;
  const dates = weekDates();
  const last = parseKey(d.today);
  last.setDate(last.getDate() + d.horizonDays);
  const grid = el('div', { class: 'sched' }, el('span', {}));
  dates.forEach((date, di) => {
    const day = parseKey(date);
    grid.append(el('button', {
      type: 'button', class: `sched-day${date === d.today ? ' today' : ''}`, 'aria-disabled': date < d.today ? 'true' : null, 'data-day': String(di), title: 'Izberi cel dan',
      onclick: (e) => {
        if (date < d.today) return;
        const from = e.shiftKey && st.sel ? [st.sel.a[0], 0] : [di, 0];
        select(st.sel && { ...st.sel, a: from }, from, [di, ROWS - 1], e, true);
        render(); app.querySelector(`[data-day="${di}"]`)?.focus();
      },
    }, el('span', {}, DAYS_SHORT[day.getDay()]), el('b', {}, `${day.getDate()}.`)));
  });
  for (let r = 0; r < ROWS; r++) {
    const t = GRID_FROM + r * CELL;
    const time = addMin('00:00', t);
    grid.append(el('span', { class: 'sched-time mono' }, t % 60 ? '' : time));
    dates.forEach((date, di) => {
      const open = dayRanges(date).some(([a, b]) => mins(a) <= t && mins(b) >= t + CELL);
      const booked = overlaps(d.bookings, date, t, t + CELL);
      const state = booked ? `termin: ${booked.name}` : open ? 'prosto' : 'zasedeno';
      grid.append(el('button', {
        type: 'button', class: `slot${booked ? ' busy' : open ? ' free' : ''}${date < d.today ? ' past' : ''}${inSel(di, r) ? ' sel' : ''}`,
        'data-cell': `${di},${r}`, 'aria-pressed': String(!!inSel(di, r)), 'aria-label': `${fmtDay(date, false)} ${time}, ${state}`, title: `${time}, ${state}`,
      }, booked && mins(booked.time) >= t ? booked.name : ''));
    });
  }
  // Mouse: press and drag across cells. Touch and keyboard: tap the first cell, then the last (dragging would fight page scrolling).
  let down = null, dragged = false, before = null;
  const paint = () => grid.querySelectorAll('[data-cell]').forEach((n) => { const [di, r] = cellOf(n); n.classList.toggle('sel', !!inSel(di, r)); });
  grid.addEventListener('pointerdown', (e) => {
    down = e.button === 0 ? cellOf(e.target) : null;
    dragged = false;
    before = st.sel;
    if (!down) return;
    // on the window, so that letting go outside the table still ends the drag
    window.addEventListener('pointerup', (up) => {
      const c = cellOf(up.target);
      if (dragged) render(); else if (down && c && String(c) === String(down)) tapCell(c, up);
      down = null; dragged = false;
    }, { once: true });
  });
  grid.addEventListener('pointerover', (e) => {
    const c = cellOf(e.target);
    if (!down || !c || e.pointerType !== 'mouse' || !(e.buttons & 1) || (!dragged && String(c) === String(down))) return;
    dragged = true;
    select(before, down, c, e, false);
    app.querySelector('.sel-pop')?.remove();
    paint();
  });
  grid.addEventListener('pointercancel', () => { down = null; dragged = false; });
  grid.addEventListener('click', (e) => { const c = cellOf(e.target); if (c && e.detail === 0) tapCell(c, e); });

  let pop = '';
  if (st.sel) {
    const s = st.sel;
    const x = selBlock(s);
    const one = x && x.d0 === x.d1 && dates[x.d0] >= d.today ? x : null;
    pop = el('div', { class: 'sel-pop', role: 'dialog', 'aria-label': 'Izbrani čas' },
      el('p', { class: 'sel-what' }, el('b', {}, selLabel(s))),
      el('div', { class: 'acts' },
        btn(el('span', { class: 'keyed' }, el('i', { class: 'slot key free' }), 'Prosto'), () => applySel(true), 'btn btn-sm'), btn(el('span', { class: 'keyed' }, el('i', { class: 'slot key' }), 'Zasedeno'), () => applySel(false), 'btn btn-sm'),
        one ? btn('Vpiši termin', () => { st.prefill = { ...st.carry, date: dates[one.d0], time: addMin('00:00', GRID_FROM + one.r0 * CELL), min: (one.r1 - one.r0 + 1) * CELL }; st.sel = null; st.msg = ''; render(); scrollTo(0, 0); }) : null,
        btn('Prekliči', () => { st.sel = null; render(); })));
  }
  const many = el('form', { class: 'form' },
    el('div', { class: 'row' }, field('Od dne', input({ type: 'date', name: 'date', min: d.today, required: '' })), field('Do dne', input({ type: 'date', name: 'until', min: d.today, required: '' }))),
    el('div', { class: 'acts' }, el('button', { type: 'submit', class: 'btn btn-sm' }, el('span', { class: 'keyed' }, el('i', { class: 'slot key' }), 'Označi kot zasedeno'))));
  many.addEventListener('submit', (e) => {
    e.preventDefault();
    st.sel = null;
    saving.then(() => act('catalog/day', { date: val(many, 'date'), until: val(many, 'until'), ranges: [] },
      (r) => `Zasedeno: ${r.days} ${r.days === 1 ? 'dan' : 'dni'}.${r.booked ? ` Pozor: na ${r.booked} ${r.booked === 1 ? 'dan' : 'dni'} že imaš vpisane termine, ki ostanejo.` : ''}`));
  });
  const a = parseKey(dates[0]), b = parseKey(dates[6]);
  const week = (step) => () => { st.week += step; st.sel = null; st.msg = ''; render(); };
  return el('div', {},
    st.carry ? el('div', { class: 'notice' }, `Vpisuješ termin za povpraševanje: ${st.carry.name}. Izberi čas v tabeli, nato Vpiši termin.`,
      el('div', { class: 'acts' }, btn('Prekliči', () => { st.carry = null; render(); }))) : '',
    el('p', { class: 'muted' }, 'Tu določiš, kdaj se stranke lahko same naročijo prek spleta. Vse je zasedeno, dokler časa sama ne označiš kot prostega. Tu tudi sama vpišeš termin za stranko: izberi čas in nato Vpiši termin.'),
    el('ul', { class: 'legend' },
      el('li', {}, el('i', { class: 'slot key free' }), el('span', {}, el('b', {}, 'Zeleno = prosto.'), ' Stranke se lahko naročijo.')),
      el('li', {}, el('i', { class: 'slot key' }), el('span', {}, el('b', {}, 'Sivo = zasedeno.'), ' Stranke se ne morejo naročiti.')),
      el('li', {}, el('i', { class: 'slot key busy' }), el('span', {}, el('b', {}, 'Roza = naročena stranka.'), ' Piše njeno ime.'))),
    el('p', { class: 'muted' }, 'Kako spremeniš: klikni ali tapni vsako uro, ki jo želiš izbrati (še en klik jo vzame iz izbire); klik na dan izbere cel dan. Odpre se okence, kjer izbereš Prosto ali Zasedeno. Shrani se samo. Na računalniku lahko tudi povlečeš z miško čez ure, s Shift + klik izbereš vse do tja, s Ctrl + A pa cel teden.'),
    el('div', { class: 'acts sched-nav' }, el('button', { type: 'button', class: 'link', disabled: st.week ? null : '', onclick: week(-1) }, '← prejšnji'),
      el('b', {}, `${a.getDate()}. ${a.getMonth() + 1}. – ${b.getDate()}. ${b.getMonth() + 1}. ${b.getFullYear()}`), btn('naslednji →', week(1))),
    grid,
    dates[0] > keyOf(last) ? el('p', { class: 'notice' }, `Stranke se lahko naročijo največ ${d.horizonDays} dni vnaprej, zato ta teden zanje še ni viden.`) : '',
    el('h2', {}, 'Več dni naenkrat'),
    el('p', { class: 'muted' }, 'Za dopust ali daljšo odsotnost: vse ure v teh dneh postanejo zasedene. Že vpisani termini ostanejo.'),
    many,
    pop);
}

// ---- povpraševanja

function viewRequests() {
  const d = st.data;
  if (!d.requests.length) return el('p', { class: 'muted' }, 'Ni odprtih povpraševanj.');
  return el('div', {}, el('p', { class: 'muted' }, 'Stranke, ki želijo storitev po dogovoru. Termin še ni rezerviran: odgovori jim, nato termin vpiši v urnik.'),
    ...d.requests.map((r) => el('div', { class: 'card' },
      el('div', { class: 'card-top' }, el('span', { class: 't' }, r.name), el('span', { class: 'mono muted' }, `prejeto ${fmtDay(r.created.slice(0, 10))}`)),
      el('p', { class: 'who' }, r.phone ? el('a', { href: `tel:${r.phone.replace(/[^+\d]/g, '')}` }, r.phone) : '', r.email ? ` · ${r.email}` : ''),
      el('p', { class: 'meta' }, r.note),
      el('div', { class: 'acts' },
        btn('Vpiši termin', () => { st.carry = { requestId: r.id, name: r.name, phone: r.phone, email: r.email, note: r.note, title: 'Druga storitev' }; st.prefill = null; st.tab = 'urnik'; st.msg = ''; render(); }, 'btn btn-sm'),
        btn('Označi kot opravljeno', () => act('requests/done', { id: r.id }, 'Povpraševanje je označeno kot opravljeno.'))))));
}

// ---- cenik

function viewPrices() {
  const d = st.data;
  const grid = el('div', { class: 'grid-table' });
  let group = '';
  for (const s of d.services.filter((x) => !x.custom)) {
    if (s.category !== group) {
      group = s.category;
      grid.append(el('p', { class: 'grp' }, group), el('span', { class: 'hd' }, 'storitev'), el('span', { class: 'hd' }, 'minut'), el('span', { class: 'hd' }, 'cena €'), el('span', { class: 'hd save' }, ''));
    }
    const min = input({ type: 'number', min: '5', max: '600', step: '5', value: String(s.min), 'aria-label': `Trajanje: ${s.name}` });
    const eur = input({ type: 'number', min: '0', max: '1000', step: '1', value: String(s.eur), 'aria-label': `Cena: ${s.name}` });
    grid.append(el('span', {}, s.name), min, eur, btn('Shrani', () => act('catalog/service', { id: s.id, min: Number(min.value), eur: Number(eur.value) }, `Shranjeno: ${s.name}.`), 'link save'));
  }
  return el('div', {}, el('p', { class: 'muted' }, 'Sprememba takoj velja na spletni strani. Trajanje določa, koliko časa termin zasede v koledarju.'), grid);
}

// ---- koledar in kopije

function viewOther() {
  const d = st.data;
  const url = location.origin + d.ics;
  const box = input({ value: url, readonly: '', 'aria-label': 'Naslov koledarja' });
  return el('div', {},
    el('h2', {}, 'Termini v koledarju na telefonu'),
    el('p', { class: 'muted' }, 'V koledarju na telefonu (Google Koledar, Apple Koledar) dodaj nov koledar "iz naslova URL" in prilepi ta naslov. Termini se potem osvežujejo sami. Naslov je kot geslo: ne deli ga. V koledarju so imena, telefoni in opombe strank; če uporabljaš Google Koledar, se ti podatki shranijo tudi pri Googlu.'),
    el('div', { class: 'copy' }, box, btn('Kopiraj', async () => { try { await navigator.clipboard.writeText(url); st.msg = 'Naslov je kopiran.'; } catch { box.select(); st.msg = 'Označeno: kopiraj ročno.'; } render(); }, 'btn btn-sm')),
    el('h2', {}, 'Varnostna kopija'),
    el('p', { class: 'muted' }, 'Strežnik vsak dan shrani kopijo in jih hrani 14 dni. Tu si lahko kopijo vseh terminov preneseš tudi sama.'),
    el('p', {}, el('a', { class: 'btn btn-sm', href: '/api/admin/export', download: '' }, 'Prenesi vse termine')),
    el('h2', {}, 'E-pošta'),
    el('p', { class: 'muted' }, d.mail ? 'E-pošta je nastavljena: stranke dobijo potrditev, ti pa obvestilo o novem terminu ali povpraševanju.' : 'E-pošta še ni nastavljena: stranke ne dobijo potrditve, ti pa ne obvestila. Termine in povpraševanja preverjaj tukaj.'),
    d.siteUrl ? '' : el('p', { class: 'muted' }, 'Naslov strani (SITE_URL) še ni nastavljen, zato v e-pošti ni povezave za spremembo termina.'));
}

reload('');
