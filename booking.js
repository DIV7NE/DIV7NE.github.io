'use strict';

const pane = document.getElementById('pane');
const summary = document.getElementById('summary');
const state = { step: 1, catalog: null, selected: [], avail: null, date: null, time: null, error: '', busy: false, open: false };

// On phones the summary is a fixed bottom sheet; keep the page's bottom padding equal to its height
// so the last field and buttons can always scroll clear of it.
const sheet = matchMedia('(max-width: 960px)');
const fitSheet = () => { document.querySelector('.book').style.paddingBottom = sheet.matches && !summary.hidden ? `${summary.offsetHeight + 32}px` : ''; };
new ResizeObserver(fitSheet).observe(summary);
sheet.addEventListener('change', fitSheet);

const byId = (id) => state.catalog.categories.flatMap((c) => c.services).find((s) => s.id === id);
const rank = (s) => state.catalog.slots[s.slot].rank;
const picked = () => state.selected.map(byId).sort((a, b) => rank(a) - rank(b));
const totals = () => picked().reduce((t, s) => ({ min: t.min + s.min, eur: t.eur + s.eur }), { min: 0, eur: 0 });

function toggle(id) {
  const s = byId(id);
  if (state.selected.includes(id)) state.selected = state.selected.filter((x) => x !== id);
  else {
    if (state.catalog.slots[s.slot].exclusive) state.selected = state.selected.filter((x) => byId(x).slot !== s.slot);
    state.selected.push(id);
  }
  state.avail = null;
  state.date = state.time = null;
  pane.querySelectorAll('.svc').forEach((b) => b.setAttribute('aria-pressed', String(state.selected.includes(b.dataset.id))));
  renderSummary();
}

function go(step) {
  state.step = step;
  state.error = step === 3 ? '' : state.error;
  document.querySelectorAll('.stepper li').forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle('on', n === step);
    li.classList.toggle('done', n < step);
  });
  renderPane();
  renderSummary();
  if (step > 1) scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
}

function renderPane() {
  pane.replaceChildren();
  const view = el('div', { class: 'pane' });
  if (state.error) view.append(el('p', { class: 'error', role: 'alert' }, state.error));
  if (state.step === 1) viewServices(view);
  if (state.step === 2) viewSlots(view);
  if (state.step === 3) viewForm(view);
  if (state.step === 4) viewDone(view);
  pane.append(view);
}

function viewServices(view) {
  if (state.catalog.placeholderPrices) view.append(el('p', { class: 'notice mono' }, 'Cene in trajanja so začasne, pravi cenik pride kmalu.'));
  if (state.catalog.priceDisclaimer) view.append(el('p', { class: 'notice' }, state.catalog.priceDisclaimer));
  for (const c of state.catalog.categories) {
    const list = el('ul', { class: 'svc-list' });
    for (const s of c.services) {
      const exclusive = state.catalog.slots[s.slot].exclusive;
      list.append(el('li', {}, el('button', {
        type: 'button', class: 'svc', 'data-id': s.id, 'aria-pressed': String(state.selected.includes(s.id)),
        onclick: () => toggle(s.id),
      },
        el('span', { class: `tick${exclusive ? '' : ' sq'}`, 'aria-hidden': 'true' }),
        el('span', { class: 'name' }, s.name, s.desc ? el('span', { class: 'desc' }, s.desc) : null, s.detail ? el('span', { class: 'desc' }, s.detail) : null, s.surcharge ? el('span', { class: 'surcharge mono' }, s.surcharge) : null),
        el('span', { class: 'dots', 'aria-hidden': 'true' }),
        el('span', { class: 'meta mono' }, `${fmtDur(s.min)} · ${fmtEur(s.eur)}`))));
    }
    view.append(el('section', { class: 'cat' }, el('h2', {}, c.name), c.note ? el('p', { class: 'note' }, c.note) : el('p', { class: 'note' }), list));
  }
  const { fees, onSite, priceNote } = state.catalog;
  if (onSite) {
    view.append(el('section', { class: 'cat' }, el('h2', {}, onSite.name), el('p', { class: 'note' }, onSite.note),
      el('ul', { class: 'fees' }, ...onSite.items.map((f) => el('li', {}, el('span', {}, f.desc || f.name), el('span', { class: 'mono' }, `+ ${fmtEur(f.eur)}${f.unit ? ` ${f.unit}` : ''}`))))));
  }
  if (fees) {
    view.append(el('section', { class: 'cat' }, el('h2', {}, fees.name),
      el('ul', { class: 'fees' }, ...fees.items.map((f) => el('li', {}, el('span', {}, f.name), el('span', { class: 'mono' }, `+ ${fmtEur(f.eur)}`))))));
  }
  if (priceNote) view.append(el('p', { class: 'price-note mono' }, priceNote));
}

async function loadSlots() {
  state.busy = true;
  state.error = '';
  renderSummary();
  try {
    state.avail = await api(`/api/availability?services=${state.selected.map(encodeURIComponent).join(',')}`);
    const first = state.avail.days[0];
    state.date = first ? first.date : null;
    state.time = first ? first.times[0] : null;
  } catch (e) {
    state.error = e.message;
  }
  state.busy = false;
  go(2);
}

function viewSlots(view) {
  const days = state.avail ? state.avail.days : [];
  if (!days.length) {
    view.append(el('div', { class: 'first-slot' },
      el('span', { class: 'mono' }, 'ni prostega termina'),
      el('p', { class: 'when' }, 'Trenutno ni prostora za tako dolg obisk.'),
      el('p', {}, 'Piši mi na ', el('a', { href: 'https://www.instagram.com/ms.nailartist.zip/', target: '_blank', rel: 'noopener' }, 'Instagram'), ', pa najdeva termin skupaj.')));
    return;
  }
  const first = days[0];
  const end = addMin(first.times[0], state.avail.min);
  view.append(el('div', { class: 'first-slot' },
    el('span', { class: 'mono' }, 'prvi prosti termin za tvoj obisk'),
    el('p', { class: 'when' }, `${fmtDay(first.date)}`, el('br'), `${first.times[0]} – ${end}`),
    el('button', { type: 'button', class: 'btn btn-sm', onclick: () => { state.date = first.date; state.time = first.times[0]; renderPane(); renderSummary(); } },
      state.date === first.date && state.time === first.times[0] ? 'Izbran ✓' : 'Izberi ta termin')));

  view.append(el('h2', { class: 'pick-head' }, 'Ali izberi drug termin'));
  const dayRow = el('div', { class: 'days', role: 'group', 'aria-label': 'Dnevi' });
  const timeGrid = el('div', { class: 'times', role: 'group', 'aria-label': 'Ure' });
  let shownDate = state.date;
  const drawTimes = () => {
    timeGrid.replaceChildren();
    for (const t of days.find((d) => d.date === shownDate).times) {
      timeGrid.append(el('button', {
        type: 'button', class: 'time', 'aria-pressed': String(state.date === shownDate && state.time === t),
        onclick: () => { state.date = shownDate; state.time = t; renderPane(); renderSummary(); },
      }, t));
    }
  };
  for (const d of days) {
    const date = parseKey(d.date);
    dayRow.append(el('button', {
      type: 'button', class: 'day', 'aria-pressed': String(d.date === shownDate),
      onclick: (e) => {
        shownDate = d.date;
        dayRow.querySelectorAll('.day').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        drawTimes();
      },
    }, el('span', { class: 'mono' }, DAYS_SHORT[date.getDay()]), el('b', {}, String(date.getDate())), el('span', { class: 'mono muted' }, `${MONTHS[date.getMonth()].slice(0, 3)}`)));
  }
  view.append(dayRow, timeGrid);
  drawTimes();
  requestAnimationFrame(() => dayRow.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }));
}

function viewForm(view) {
  const form = el('form', { class: 'form', id: 'book-form', novalidate: '' });
  const field = (id, label, input, hint) => el('div', { class: 'field' }, el('label', { for: id }, label), input, hint ? el('p', { class: 'hint', id: `${id}-hint` }, hint) : null);
  form.append(
    field('f-name', 'Ime in priimek', el('input', { id: 'f-name', name: 'name', autocomplete: 'name', required: '', maxlength: '80' })),
    field('f-phone', 'Telefon', el('input', { id: 'f-phone', name: 'phone', type: 'tel', autocomplete: 'tel', required: '', maxlength: '20', pattern: '\\+?[0-9 \\(\\)\\/\\-]{6,20}' })),
    field('f-email', 'E-pošta (neobvezno)', el('input', { id: 'f-email', name: 'email', type: 'email', autocomplete: 'email', maxlength: '120' })),
    field('f-note', 'Opomba ali inspiracija (neobvezno)', el('textarea', { id: 'f-note', name: 'note', maxlength: '500', 'aria-describedby': 'f-note-hint', placeholder: 'npr. želim kratke mandljeve oblike, inspiracija na IG …' }),
      'Prosim, ne vpisuj podatkov o zdravju (npr. bolezni nohtov ali kože). O tem se pogovoriva v salonu.'),
    el('div', { class: 'hp', 'aria-hidden': 'true' }, el('label', {}, 'Spletna stran', el('input', { name: 'website', tabindex: '-1', autocomplete: 'off' }))),
  );
  form.addEventListener('submit', submit);
  view.append(form);
  requestAnimationFrame(() => form.querySelector('input').focus({ preventScroll: true }));
}

async function submit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  state.busy = true;
  renderSummary();
  try {
    state.done = await api('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, services: state.selected, date: state.date, time: state.time }),
    });
    state.busy = false;
    summary.hidden = true;
    fitSheet();
    go(4);
  } catch (err) {
    state.busy = false;
    state.error = err.message;
    if (err.status === 409) return loadSlots();
    renderPane();
    renderSummary();
  }
}

function icsLink(b) {
  const stamp = (date, time) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ms nailartist//SL', 'BEGIN:VEVENT',
    `UID:${b.date}-${b.time}@ms-nailartist`,
    `DTSTART:${stamp(b.date, b.time)}`, `DTEND:${stamp(b.date, addMin(b.time, b.min))}`,
    'SUMMARY:Nohti pri ms://nailartist', `DESCRIPTION:${b.services.join(', ')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
}

function viewDone(view) {
  const b = state.done;
  document.querySelector('.book-grid').style.gridTemplateColumns = '1fr';
  view.append(el('div', { class: 'done' },
    el('span', { class: 'eyebrow mono' }, 'termin je rezerviran'),
    el('h2', {}, 'Se ', el('em', {}, 'vidiva'), '!'),
    b.demo ? el('p', { class: 'notice mono' }, 'To je predogled strani. Ta rezervacija ni shranjena.') : null,
    el('div', { class: 'first-slot' },
      el('span', { class: 'mono' }, b.services.join(' + ')),
      el('p', { class: 'when' }, fmtDay(b.date), el('br'), `${b.time} – ${addMin(b.time, b.min)}`),
      el('span', { class: 'mono' }, `${fmtDur(b.min)} · ${fmtEur(b.eur)}`)),
    el('p', { class: 'muted' }, 'Če bo kaj spremembe, te pokličem ali ti pišem. Če termina ne moreš, mi to čim prej sporoči, kot piše v ', el('a', { href: '/pogoji.html' }, 'pogojih poslovanja'), '.'),
    el('div', { class: 'hero-actions' },
      el('a', { class: 'btn btn-pink', href: icsLink(b), download: 'termin-ms-nailartist.ics' }, 'Dodaj v koledar'),
      el('a', { class: 'btn', href: '/' }, 'Nazaj na začetek'))));
  document.querySelectorAll('.stepper li').forEach((li) => { li.classList.remove('on'); li.classList.add('done'); });
}

function renderSummary() {
  if (state.step === 4) return;
  const items = picked();
  const t = totals();
  summary.classList.toggle('open', state.open);
  summary.replaceChildren();
  summary.append(el('button', { type: 'button', class: 'toggle mono', 'aria-expanded': String(state.open), onclick: () => { state.open = !state.open; renderSummary(); } },
    el('span', {}, items.length ? `${items.length} ${['storitev', 'storitvi', 'storitve', 'storitve'][Math.min(items.length, 4) - 1]} · ${fmtDur(t.min)} · ${fmtEur(t.eur)}` : 'Pregled termina'),
    el('span', {}, state.open ? 'skrij ↓' : 'pokaži ↑')));
  summary.append(el('h2', {}, 'Pregled termina'));

  if (!items.length) summary.append(el('p', { class: 'empty' }, 'Izberi storitve na levi. Čas in cena se seštevata sproti.'));
  else {
    const list = el('ul', { class: 'sum-list' });
    for (const s of items) {
      list.append(el('li', {},
        el('span', {}, s.name, el('span', { class: 'm mono' }, fmtDur(s.min)), s.surcharge ? el('span', { class: 'm surcharge-note mono' }, s.surcharge) : null),
        el('span', { class: 'mono' }, fmtEur(s.eur)),
        state.step === 1 ? el('button', { type: 'button', class: 'x', 'aria-label': `Odstrani ${s.name}`, onclick: () => toggle(s.id) }, '×') : el('span')));
    }
    summary.append(list);
    if (items.length > 1) summary.append(el('div', { class: 'sum-total' }, el('span', {}, `Skupaj · ${fmtDur(t.min)}`), el('span', { class: 'mono' }, fmtEur(t.eur))));
  }

  if (state.step >= 2 && state.date && state.time) {
    summary.append(el('div', { class: 'sum-slot' }, el('span', { class: 'mono muted' }, 'termin'),
      el('b', {}, `${fmtDay(state.date)}, ${state.time} – ${addMin(state.time, t.min)}`)));
  }

  if (state.step === 1) {
    summary.append(el('button', { type: 'button', class: 'btn btn-pink', disabled: items.length && !state.busy ? null : '', onclick: loadSlots },
      state.busy ? 'Iščem termin …' : 'Naprej', state.busy ? null : el('span', { class: 'arrow' }, '→')));
  } else if (state.step === 2) {
    summary.append(
      el('button', { type: 'button', class: 'btn btn-pink', disabled: state.time ? null : '', onclick: () => go(3) }, 'Naprej', el('span', { class: 'arrow' }, '→')),
      el('button', { type: 'button', class: 'back mono', onclick: () => go(1) }, '← uredi storitve'));
  } else if (state.step === 3) {
    summary.append(
      el('button', { type: 'submit', form: 'book-form', class: 'btn btn-pink', disabled: state.busy ? '' : null }, state.busy ? 'Rezerviram …' : 'Rezerviraj z obveznostjo plačila'),
      el('p', { class: 'consent' }, state.catalog.priceDisclaimer || ''),
      el('p', { class: 'consent' }, `Plačilo ${fmtEur(t.eur)} ob obisku. Termin lahko brezplačno prestavite ali prekličete do 24 ur pred začetkom; pozneje ali ob neprihodu se lahko zaračuna nadomestilo do 50 % vrednosti rezervirane storitve.`),
      el('p', { class: 'consent' }, 'Z rezervacijo termina potrjujete, da ste prebrali in se strinjate z ',
        el('a', { href: '/pogoji.html#informacije', target: '_blank', rel: 'noopener' }, 'informacijami za stranke'), ' in s ',
        el('a', { href: '/pogoji.html#pogoji', target: '_blank', rel: 'noopener' }, 'pogoji poslovanja'), '. Kako ravnam z vašimi podatki, piše v ',
        el('a', { href: '/zasebnost.html', target: '_blank', rel: 'noopener' }, 'izjavi o zasebnosti'), '.'),
      el('button', { type: 'button', class: 'back mono', onclick: () => go(2) }, '← spremeni termin'));
  }
}

api('/api/services').then((cat) => {
  state.catalog = cat;
  const pre = new URLSearchParams(location.search).get('izberi');
  if (pre && byId(pre)) state.selected.push(pre);
  go(1);
}).catch(() => {
  pane.replaceChildren(el('p', { class: 'error' }, 'Storitev trenutno ni mogoče naložiti. Osveži stran ali mi piši na Instagram.'));
});
