/* Onscreen piano keyboard renderer.
   Used by Play tab, Scales tab, etc. */
const Keyboard = (() => {
  const WHITE_PATTERN = [0,2,4,5,7,9,11];              // C D E F G A B offsets
  const BLACK_AFTER   = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 }; // white idx -> black offset

  function render(container, opts = {}) {
    const {
      startOctave = 3,
      endOctave   = 5,
      onNoteDown  = () => {},
      onNoteUp    = () => {},
      showLabels  = true,
    } = opts;

    container.innerHTML = '';
    const noteEls = {}; // midi -> element[]

    for (let oct = startOctave; oct <= endOctave; oct++) {
      const octWrap = document.createElement('div');
      octWrap.className = 'octave';
      octWrap.style.position = 'relative';
      octWrap.style.display = 'flex';

      WHITE_PATTERN.forEach((off, wi) => {
        const midi = (oct + 1) * 12 + off;
        const white = document.createElement('div');
        white.className = 'pkey white';
        if (showLabels && off === 0) white.textContent = 'C' + oct;
        (noteEls[midi] ||= []).push(white);
        bind(white, midi);
        octWrap.appendChild(white);

        if (BLACK_AFTER[off] != null) {
          const bmidi = (oct + 1) * 12 + BLACK_AFTER[off];
          const black = document.createElement('div');
          black.className = 'pkey black';
          (noteEls[bmidi] ||= []).push(black);
          bind(black, bmidi);
          octWrap.appendChild(black);
        }
      });
      container.appendChild(octWrap);
    }

    function bind(el, midi) {
      let down = false;
      const on = (e) => {
        e.preventDefault();
        if (down) return;
        down = true;
        onNoteDown(midi, 100);
      };
      const off = (e) => {
        if (!down) return;
        down = false;
        onNoteUp(midi);
      };
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup',   off);
      el.addEventListener('mouseleave', off);
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend',   off);
    }

    return {
      highlight(midis, cls = 'highlight') {
        Object.values(noteEls).flat().forEach(el => el.classList.remove(cls));
        (midis || []).forEach(m => (noteEls[m] || []).forEach(el => el.classList.add(cls)));
      },
      activate(midi) { (noteEls[midi] || []).forEach(el => el.classList.add('active')); },
      deactivate(midi) { (noteEls[midi] || []).forEach(el => el.classList.remove('active')); },
      clearActive() {
        Object.values(noteEls).flat().forEach(el => el.classList.remove('active'));
      },
      elements: noteEls,
    };
  }

  return { render };
})();
