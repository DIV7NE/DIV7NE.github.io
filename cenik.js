'use strict';
// The price list as a page to read, drawn from the same catalog the booking page uses.
// Helpers (el, api, fmtDur, fmtEur) come from /main.js.
api('/api/services').then((cat) => {
  const box = document.getElementById('cenik');
  const out = [];
  const row = (left, right) => el('li', {}, el('span', {}, ...left), el('span', { class: 'mono' }, right));
  for (const c of cat.categories) {
    out.push(el('h2', {}, c.name));
    if (c.note) out.push(el('p', { class: 'muted' }, c.note));
    out.push(el('ul', { class: 'fees' }, ...c.services.map((s) => row(
      [s.title || s.name, s.desc ? el('span', { class: 'desc' }, s.desc) : null, s.detail ? el('span', { class: 'desc' }, s.detail) : null, s.surcharge ? el('span', { class: 'surcharge mono' }, s.surcharge) : null],
      s.custom ? 'po dogovoru' : `${fmtEur(s.eur)} · ${fmtDur(s.min)}`))));
  }
  if (cat.onSite) {
    out.push(el('h2', {}, cat.onSite.name), el('p', { class: 'muted' }, cat.onSite.note),
      el('ul', { class: 'fees' }, ...cat.onSite.items.map((f) => row([f.desc || f.name], `+ ${fmtEur(f.eur)}${f.unit ? ` ${f.unit}` : ''}`))));
  }
  if (cat.fees) out.push(el('h2', {}, cat.fees.name), el('ul', { class: 'fees' }, ...cat.fees.items.map((f) => row([f.name], `+ ${fmtEur(f.eur)}`))));
  if (cat.priceDisclaimer) out.push(el('p', { class: 'notice' }, cat.priceDisclaimer));
  if (cat.priceNote) out.push(el('p', { class: 'price-note mono' }, cat.priceNote));
  box.replaceChildren(...out);
}).catch(() => {
  document.getElementById('cenik').replaceChildren(el('p', { class: 'error' }, 'Cenika trenutno ni mogoče naložiti. Osveži stran ali mi piši na Instagram.'));
});
