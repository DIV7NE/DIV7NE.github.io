'use strict';
// Preview only: answers the site's /api/ requests in the browser, the admin ones too. Nothing is sent anywhere;
// what is entered is kept in this browser's localStorage, so the admin and the booking page see the same data.
(() => {
  const catalog = {"placeholderPrices":false,"retentionDays":730,"schedule":{"timezone":"Europe/Ljubljana","stepMin":15,"minNoticeHours":12,"horizonDays":60,"days":{}},"slots":{"removal":{"rank":1,"exclusive":true},"base":{"rank":2,"exclusive":true},"art":{"rank":3,"exclusive":true},"repair":{"rank":4,"exclusive":false},"other":{"rank":5,"exclusive":false}},"categories":[{"id":"naravni","name":"Naravni nohti","note":"Utrjevanje naravnih nohtkov, brez podaljševanja. Storitev vključuje pripravo nohtov in obnohtne kožice, ter nanos gela, primernega za tvoje nohtke. Ne vključuje nanosa barve, poslikav ali dodatkov.","services":[{"id":"nar-s","name":"Naravni nohti · S","min":60,"eur":35,"slot":"base"},{"id":"nar-m","name":"Naravni nohti · M","min":75,"eur":40,"slot":"base"}]},{"id":"podaljsevanje","name":"Podaljševanje","note":"Podaljševanje nohtov na šablono. Storitev vključuje pripravo nohtov in obnohtne kožice ter podaljševanje. Ne vključuje nanosa barve, poslikav ali dodatkov.","services":[{"id":"pod-sm","name":"Podaljševanje · S/M","min":120,"eur":45,"slot":"base"},{"id":"pod-lxl","name":"Podaljševanje · L/XL","min":135,"eur":50,"slot":"base"},{"id":"pod-xxl","name":"Podaljševanje · XXL","min":150,"eur":60,"slot":"base"}]},{"id":"nailart","name":"Nail art","note":"Izberi glede na zahtevnost dizajna.","services":[{"id":"art-1","name":"Nail art · Lih tolk da je","title":"Lih tolk da je","level":1,"min":15,"eur":5,"slot":"art","desc":"Minimalen, enovit dizajn.","detail":"Enobarvno lakiranje, klasičen french, cat-eye, krom ali perla čez celotne nohte, posamični kristalčki, enostavna poslikava največ štirih nohtov, enostaven blooming gel, enobarvna aura."},{"id":"art-2","name":"Nail art · Čist mal","title":"Čist mal","level":2,"min":30,"eur":10,"slot":"art","desc":"Simpl s preprostimi dodatki.","detail":"Kombinacije minimalnih dizajnov, preproste oblike (pike, črte, zvezde, srčki), enostaven izoliran krom, vzorci iz kristalčkov ali okraski (charms), enostavna poslikava več nohtov, enostavni 3D elementi (kapljice, črte), marble, enostavni in živalski vzorci, tortoiseshell."},{"id":"art-3","name":"Nail art · Neki vmes","title":"Neki vmes","level":3,"min":45,"eur":20,"slot":"art","desc":"Mal več, a ne preveč, z zahtevnejšimi dodatki.","detail":"Zahtevnejše kombinacije dizajnov ali french z dodatki, risana pisava, zahtevnejši izoliran krom, zahtevnejša poslikava, posamezni zahtevni 3D elementi na največ dveh nohtih (rože, nail hugger, zapestnice), zahtevni vzorci.","surcharge":"Časovno doplačilo po 4 urah: 10 €/30 min"},{"id":"art-4","name":"Nail art · Ekstra","title":"Ekstra","level":4,"min":60,"eur":30,"slot":"art","desc":"Za tiste, ki želijo maksimalnost.","detail":"Kompleksne kombinacije zahtevnih dodatkov, izjemno natančne poslikave, več zahtevnih elementov na več nohtih, več vsega.","surcharge":"Časovno doplačilo po 5 urah: 15 €/30 min"}]},{"id":"odstranjevanje","name":"Odstranjevanje","services":[{"id":"odst-moje","name":"Odstranjevanje mojega dela","desc":"V primeru zelo slabega stanja nohtov, ko odstranjevanje materiala zahteva več natančnosti in pozornosti.","min":15,"eur":10,"slot":"removal"},{"id":"odst-tuje","name":"Odstranjevanje tujega dela","desc":"Korekcij na tuje delo ne izvajam. V primeru, da imate na nohtih material od drugod, se le-tega pred storitvijo odstrani.","min":30,"eur":15,"slot":"removal"},{"id":"odst-urejanje","name":"Odstranjevanje in urejanje","desc":"Popolno odstranjevanje materiala z nego naravnih nohtov in rok.","min":45,"eur":20,"slot":"removal"}]},{"id":"popravilo","name":"Popravilo nohta","note":"Po 48 urah po izvedeni storitvi. Cena velja za popravilo enega nohta.","services":[{"id":"pop-lazje","name":"Lažje popravilo","desc":"Praske, odkrušeni deli materiala, manjkajoči kristalčki ipd.","min":15,"eur":3,"slot":"repair"},{"id":"pop-zahtevno","name":"Zahtevno popravilo","desc":"Huje poškodovani in/ali dvignjeni nohti ter manjkajoči zahtevnejši elementi, ki zahtevajo dlje časa za popravilo.","min":15,"eur":5,"slot":"repair"}]},{"id":"ostalo","name":"Ostalo","services":[{"id":"man-klasicna","name":"Manikira brez lakiranja (m/ž)","desc":"Klasično urejanje naravnih nohtov in obnohtne kožice ter nega.","min":45,"eur":20,"slot":"base"}]},{"id":"drugo","name":"Druga storitev","note":"Če česa ni v ceniku, mi pošlji povpraševanje. Te storitve ne moreš izbrati skupaj z drugimi.","services":[{"id":"drugo","name":"Druga storitev","desc":"Tega ne rezerviraš takoj: pošlješ povpraševanje, jaz pa ti odgovorim in se dogovoriva za ceno in termin. Če se s ceno ne strinjava, te storitve ne izvedem in zanjo ne plačaš.","min":0,"eur":0,"slot":"other","custom":true}]}],"priceNote":"DDV ni obračunan na podlagi prvega odstavka 94. člena ZDDV-1 (nisem zavezanka za DDV), zato se k cenam ne prišteje. Cenik velja od 1. 10. 2026. Pridržujem si pravico do spremembe ponudbe in cen.","fees":{"name":"Termini po dogovoru","items":[{"name":"Izven delovnega časa","eur":15},{"name":"Nedelje in prazniki","eur":30}]},"onSite":{"name":"Rekonstrukcija nohta","note":"To ne izbereš ob naročanju. Če se med delom pokaže, da je potrebna, te o tem in o ceni vprašam in jo izvedem samo s tvojim strinjanjem, preden se začne. Če se ne strinjaš, se ne izvede in zanjo ne plačaš.","items":[{"name":"Rekonstrukcija nohta","desc":"Dvigovanje navzdol rastočega nohta ali zapolnjevanje manjkajočih stranic.","eur":1,"unit":"po nohtu"}]},"priceDisclaimer":"Cena, ki jo izbereš ob naročanju termina, ne pomeni nujno, da bo cela storitev stala točno toliko. Narava dela je nepredvidljiva, zato se lahko cena po dogovoru rahlo spremeni. Do spremembe pride samo s tvojim strinjanjem, preden se dodatno delo izvede. Če se ne strinjaš, se dodatno delo ne izvede in zanj ne plačaš. Seveda se trudim, da se držim vsega dogovorjenega."};
  const { resolveSelection, freeStarts, availability, dateKey, parseDate, toMin } = window.msSlots;
  const KEY = 'ms-demo-v1';
  const pad = (n) => String(n).padStart(2, '0');
  const endTime = (time, min) => { const t = toMin(time) + min; return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`; };
  const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const services = () => catalog.categories.flatMap((c) => c.services);

  // First visit: weekdays 09:00–18:00 open, two sample bookings and one inquiry, so every screen has something to show.
  function seed() {
    const days = {}, work = [];
    for (let i = 0, d = new Date(); i <= catalog.schedule.horizonDays; i++, d.setDate(d.getDate() + 1)) {
      if (d.getDay() % 6) { days[dateKey(d)] = [['09:00', '18:00']]; if (i > 0) work.push(dateKey(d)); }
    }
    const s = services().filter((x) => !x.custom);
    const b = (date, time, sv, name, phone) => ({ id: id(), created: new Date().toISOString(), date, time, min: sv.min, eur: sv.eur, services: [sv.name], name, phone, email: '', note: '' });
    return {
      days, prices: {},
      bookings: [
        b(work[0], '10:00', s[0], 'Ana Primer', '040 111 222'),
        b(work[1], '14:00', s[Math.min(3, s.length - 1)], 'Nina Vzorec', '041 333 444'),
        { id: id(), created: new Date().toISOString(), request: true, services: ['Druga storitev'], name: 'Eva Povpraševanje', phone: '031 555 666', email: '', note: 'Želim poročni dizajn z bleščicami.' },
      ],
    };
  }
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db || !db.days || !Array.isArray(db.bookings)) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* private window: lives until the tab closes */ } };
  save();
  const sync = () => {
    catalog.schedule.days = db.days;
    for (const s of services()) if (db.prices[s.id]) [s.eur, s.min] = db.prices[s.id];
  };
  sync();

  const clash = (date, time, min, ignore) => db.bookings.find((b) => b.date === date && b.id !== ignore && toMin(time) < toMin(b.time) + b.min && toMin(time) + min > toMin(b.time));
  const today = () => dateKey(new Date());
  const admin = {
    state: () => [200, {
      today: today(),
      bookings: db.bookings.filter((b) => b.date).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
      requests: db.bookings.filter((b) => b.request && !b.done),
      services: catalog.categories.flatMap((c) => c.services.map((s) => ({ id: s.id, name: s.name, min: s.min, eur: s.eur, custom: !!s.custom, category: c.name }))),
      days: db.days, horizonDays: catalog.schedule.horizonDays, mail: false, siteUrl: '', ics: '/calendar.ics',
    }],
    'bookings/add'(x) {
      if (!x.date || !x.time) return [400, { error: 'Vpiši datum in uro.' }];
      if (!x.title) return [400, { error: 'Vpiši storitev.' }];
      if (!x.name || x.name.trim().length < 2) return [400, { error: 'Vpiši ime stranke.' }];
      const hit = clash(x.date, x.time, x.min, null);
      if (hit && x.force !== true) return [409, { error: `Prekriva se z: ${hit.time}–${endTime(hit.time, hit.min)} ${hit.name}.`, conflict: true }];
      db.bookings.push({ id: id(), created: new Date().toISOString(), source: 'admin', date: x.date, time: x.time, min: x.min, eur: x.eur, services: [x.title], name: x.name, phone: x.phone || '', email: x.email || '', note: x.note || '' });
      const r = x.requestId && db.bookings.find((b) => b.request && b.id === x.requestId);
      if (r) r.done = true;
      return [201, { ok: true }];
    },
    'bookings/move'(x) {
      const b = db.bookings.find((y) => y.id === x.id && y.date);
      if (!b) return [404, { error: 'Tega termina ni več.' }];
      const hit = clash(x.date, x.time, b.min, b.id);
      if (hit && x.force !== true) return [409, { error: `Prekriva se z: ${hit.time}–${endTime(hit.time, hit.min)} ${hit.name}.`, conflict: true }];
      b.date = x.date; b.time = x.time;
      return [200, { ok: true }];
    },
    'bookings/cancel'(x) { db.bookings = db.bookings.filter((b) => b.id !== x.id); return [200, { ok: true }]; },
    'bookings/price'(x) {
      const b = db.bookings.find((y) => y.id === x.id);
      if (!b) return [404, { error: 'Tega termina ni več.' }];
      b.finalEur = x.finalEur; b.finalNote = x.finalNote || ''; b.finalAt = new Date().toISOString();
      return [200, { ok: true }];
    },
    'requests/done'(x) { const r = db.bookings.find((b) => b.id === x.id); if (r) r.done = true; return [200, { ok: true }]; },
    'catalog/service'(x) {
      if (!Number.isInteger(x.eur) || x.eur < 0 || x.eur > 1000) return [400, { error: 'Cena mora biti celo število med 0 in 1000.' }];
      if (!Number.isInteger(x.min) || x.min < 5 || x.min > 600 || x.min % 5) return [400, { error: 'Trajanje mora biti v korakih po 5 minut (5 do 600).' }];
      db.prices[x.id] = [x.eur, x.min];
      return [200, { ok: true }];
    },
    'catalog/day'(x) {
      const until = x.until === undefined ? x.date : x.until;
      if (!x.date || x.date < today() || until < x.date) return [400, { error: 'Datum ni veljaven.' }];
      const dates = [];
      for (let d = parseDate(x.date); dateKey(d) <= until; d.setDate(d.getDate() + 1)) dates.push(dateKey(d));
      if (dates.length > 92) return [400, { error: 'Naenkrat lahko spremeniš največ 92 dni.' }];
      for (const date of dates) { if (x.ranges && x.ranges.length) db.days[date] = x.ranges; else delete db.days[date]; }
      const booked = new Set(db.bookings.filter((b) => b.date).map((b) => b.date));
      return [200, { ok: true, days: dates.length, booked: dates.filter((d) => booked.has(d)).length }];
    },
  };

  const real = window.fetch.bind(window);
  const reply = ([status, body]) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (input, opts = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (!url.pathname.startsWith('/api/')) return real(input, opts);
    const route = url.pathname.slice(4);
    const method = (opts.method || 'GET').toUpperCase();
    let body = {};
    if (method === 'POST') { try { body = JSON.parse(opts.body || ''); } catch { return reply([400, { error: 'Neveljavna zahteva.' }]); } }
    if (route.startsWith('/admin/')) {
      if (window.msDemoLocked) return new Promise(() => {}); // the password screen is showing
      const name = route.slice(7);
      const fn = Object.hasOwn(admin, name) && (name === 'state' ? method === 'GET' : method === 'POST') ? admin[name] : null;
      if (!fn) return reply([404, { error: 'Strani ni mogoče najti.' }]);
      const out = fn(body);
      if (out[0] < 300 && name !== 'state') { save(); sync(); }
      return reply(out);
    }
    if (method === 'GET' && route === '/services') {
      const { placeholderPrices, categories, slots, fees, onSite, priceNote, priceDisclaimer, withdrawalConsent } = catalog;
      return reply([200, { placeholderPrices, categories, slots, fees, onSite, priceNote, priceDisclaimer, withdrawalConsent: !!withdrawalConsent }]);
    }
    if (method === 'GET' && route === '/availability') {
      let sel;
      try { sel = resolveSelection(catalog, (url.searchParams.get('services') || '').split(',').filter(Boolean)); } catch (e) { return reply([400, { error: e.message }]); }
      return reply([200, { min: sel.min, days: availability(catalog, db.bookings, sel.min, new Date(), catalog.schedule.horizonDays) }]);
    }
    if (method === 'POST' && route === '/bookings') {
      let sel;
      try { sel = resolveSelection(catalog, body.services); } catch (e) { return reply([400, { error: e.message }]); }
      if (sel.custom && String(body.note || '').trim().length < 5) return reply([400, { error: 'Pri storitvi po dogovoru v opombi opiši, kaj želiš.' }]);
      const who = { name: String(body.name || ''), phone: String(body.phone || ''), email: String(body.email || ''), note: String(body.note || '') };
      const names = sel.services.map((s) => s.name);
      if (sel.custom) {
        db.bookings.push({ id: id(), created: new Date().toISOString(), request: true, services: names, ...who });
        save();
        return reply([201, { ok: true, demo: true, request: true, services: names }]);
      }
      if (!freeStarts(catalog.schedule, db.bookings, String(body.date), sel.min, new Date()).includes(body.time)) return reply([409, { error: 'Ta termin ni več na voljo. Izberi drugega.' }]);
      db.bookings.push({ id: id(), created: new Date().toISOString(), date: body.date, time: body.time, min: sel.min, eur: sel.eur, services: names, ...who });
      save();
      return reply([201, { ok: true, demo: true, date: body.date, time: body.time, min: sel.min, eur: sel.eur, services: names }]);
    }
    return reply([404, { error: 'Strani ni mogoče najti.' }]);
  };
})();
