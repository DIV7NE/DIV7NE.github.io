// Runs in <head> before first paint: turns motion on, picks the colour theme, and whether we arrive under a page wipe.
(() => {
  const root = document.documentElement;
  try { localStorage.removeItem('ms-motion'); } catch {}  // key from the removed on/off switch
  // Motion is always on by the owner's decision; the device's reduced-motion setting is deliberately not followed.
  root.dataset.motion = 'on';
  let theme = null;
  try { theme = localStorage.getItem('ms-theme'); } catch {}
  root.dataset.theme = theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  try { if (sessionStorage.getItem('ms-wipe')) root.classList.add('wiping'); } catch {}
})();
