/* Podcast checklist with persistent state. */
const Podcast = (() => {
  const ITEMS = [
    'Close doors and windows. Turn off fans, AC, dehumidifiers.',
    'Put phone on Do Not Disturb. Silence desktop notifications.',
    'Plug the AME2 into USB-C. Set it as input + output in your OS and recording app.',
    'Connect closed-back headphones to the AME2 headphone out.',
    'Engage 48V phantom only if the mic is a condenser.',
    'Set Mic 1 gain while speaking at normal volume — peaks in yellow only.',
    'Check Mic 2 (if used) matches Mic 1 in loudness at the same distance.',
    'Record a 30-second test take and listen back for hiss, clipping, room noise.',
    'Drink water. Warm up your voice: lip trills, yawn-sigh, tongue twisters.',
    'Open your outline / show notes / timer in a second window.',
    'Start recording. Announce the take number and slate claps for sync if multicam.',
  ];
  function render() {
    const list = document.getElementById('podcast-checklist');
    if (!list) return;
    const done = Store.get('podcast-checklist', {});
    list.innerHTML = ITEMS.map((item, i) => `
      <li data-i="${i}" class="${done[i] ? 'done' : ''}">
        <input type="checkbox" ${done[i] ? 'checked' : ''}/>
        <span>${item}</span>
      </li>
    `).join('');
    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        const i = li.dataset.i;
        const d = Store.get('podcast-checklist', {});
        d[i] = !d[i];
        Store.set('podcast-checklist', d);
        li.classList.toggle('done', !!d[i]);
        li.querySelector('input').checked = !!d[i];
      });
    });
  }
  return { render };
})();
