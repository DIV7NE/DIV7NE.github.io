'use strict';
// Selection and slot logic shared by server.js and the static preview (tools/build-pages.mjs copies this file into
// the build, where it runs in the browser as window.msSlots).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.msSlots = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const pad = (n) => String(n).padStart(2, '0');
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const at = (key, min) => { const d = parseDate(key); d.setMinutes(min); return d; };

  // Validates a selection and returns it sorted in summary order, or throws.
  function resolveSelection(catalog, ids) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 12) throw new Error('Izberi vsaj eno storitev.');
    const all = new Map();
    for (const c of catalog.categories) for (const s of c.services) all.set(s.id, s);
    const seenSlots = new Set();
    const picked = [];
    for (const id of new Set(ids)) {
      const s = all.get(id);
      if (!s) throw new Error('Neznana storitev.');
      if (catalog.slots[s.slot].exclusive) {
        if (seenSlots.has(s.slot)) throw new Error('Iz iste skupine lahko izbereš samo eno storitev.');
        seenSlots.add(s.slot);
      }
      picked.push(s);
    }
    picked.sort((a, b) => catalog.slots[a.slot].rank - catalog.slots[b.slot].rank);
    return {
      services: picked,
      min: picked.reduce((t, s) => t + s.min, 0),
      eur: picked.reduce((t, s) => t + s.eur, 0),
    };
  }

  // Free start times ("HH:MM") on one date for an appointment of `duration` minutes.
  function freeStarts(schedule, bookings, key, duration, now) {
    if (schedule.closedDates.includes(key)) return [];
    const hours = schedule.hours[parseDate(key).getDay()];
    if (!hours) return [];
    const open = toMin(hours[0]);
    const close = toMin(hours[1]);
    const earliest = now.getTime() + schedule.minNoticeHours * 3600e3;
    const taken = bookings.filter((b) => b.date === key).map((b) => [toMin(b.time), toMin(b.time) + b.min]);
    const out = [];
    for (let t = open; t + duration <= close; t += schedule.stepMin) {
      if (at(key, t).getTime() < earliest) continue;
      if (taken.some(([s, e]) => t < e && t + duration > s)) continue;
      out.push(fromMin(t));
    }
    return out;
  }

  function availability(catalog, bookings, duration, now, days) {
    const result = [];
    const start = parseDate(dateKey(now));
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      const times = freeStarts(catalog.schedule, bookings, key, duration, now);
      if (times.length) result.push({ date: key, times });
    }
    return result;
  }

  return { dateKey, parseDate, resolveSelection, freeStarts, availability };
});
