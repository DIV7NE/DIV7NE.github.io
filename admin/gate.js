'use strict';
// Preview only: a password screen for the demo admin. A static host cannot check passwords, so the page compares a
// PBKDF2 hash of what was typed with the one baked in at build time. ponytail: keeps casual visitors out, nothing
// more; anyone can read the page files, and the data behind it is sample data in their own browser anyway.
(() => {
  const SALT = '75226140d3d9a2f667165bb89f8d1dca', HASH = '318170febc7d5f4ce30e07e16b977d6aaae88db50bc50369051aaf6b72528ce0', ROUNDS = 300000;
  if (sessionStorage.getItem('ms-demo-admin') === HASH) return;
  window.msDemoLocked = true;
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  async function derive(pw) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(SALT), iterations: ROUNDS }, key, 256));
  }
  document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    app.innerHTML = '<form class="form" autocomplete="off"><label>Geslo <input type="password" name="pw" required autofocus></label>'
      + '<p class="error" hidden>Geslo ni pravilno.</p><div class="acts"><button type="submit" class="btn btn-pink">Vstopi</button></div></form>';
    const f = app.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (await derive(f.elements.pw.value) === HASH) { sessionStorage.setItem('ms-demo-admin', HASH); location.reload(); return; }
      f.querySelector('.error').hidden = false;
      f.elements.pw.value = '';
    });
  });
})();
