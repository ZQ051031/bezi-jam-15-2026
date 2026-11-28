import { LEVELS, PARTS, startRun, step, wouldCycle } from './engine.js';
import { chamber } from './art.js';

const $ = id => document.getElementById(id);
const layouts = {
  hold: [1, 1], pulse: [1, 1], field: [1, 2], light: [1, 1], west: [1, 1], east: [1, 2],
  toggle: [2, 1], and: [2, 1], not: [2, 1], timer: [2, 1], or: [2, 1], flux: [3, 1],
};
const designs = LEVELS.map(() => ({ parts: [], wires: {} }));
const inputs = new Set();
const controlled = new Set(['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'KeyF', 'KeyR', 'Escape']);
const storageKey = 'vectorwright-completed';
const complete = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved)) saved.filter(i => Number.isInteger(i) && i >= 0 && i < LEVELS.length).forEach(i => complete.add(i));
} catch {}

let levelIndex = 0;
let mode = 'menu';
let armed = null;
let pulse = false;
let jump = false;
let run;
let draw;
let trail = [];
let audio;
let sound = true;
let acc = 0;
let previous = 0;
let resultAction;
let shownSignals = '';

const current = () => LEVELS[levelIndex];
const design = () => designs[levelIndex];
const note = message => { $('board-status').textContent = message; };

const tones = {
  place: [[480, .06]], wire: [[640, .07], [910, .075]], remove: [[285, .07]],
  run: [[320, .075], [520, .095]], reverse: [[440, .1], [720, .11]],
  normal: [[540, .08], [330, .11]], jump: [[380, .085]],
  lost: [[220, .13], [118, .23]], won: [[520, .11], [670, .12], [860, .2]],
};

function playTone(name) {
  if (!sound || !window.AudioContext) return;
  audio ??= new AudioContext();
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  let at = audio.currentTime;
  for (const [pitch, length] of tones[name]) {
    const wave = audio.createOscillator();
    const envelope = audio.createGain();
    wave.type = name === 'lost' ? 'triangle' : 'sine';
    wave.frequency.value = pitch;
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(.08, at + .012);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    wave.connect(envelope).connect(audio.destination);
    wave.start(at);
    wave.stop(at + length);
    at += length * .74;
  }
}

function showMenu() {
  mode = 'menu';
  inputs.clear();
  $('game').hidden = true;
  $('menu').hidden = false;
  $('progress').textContent = complete.size + ' / ' + LEVELS.length + ' CLEARED';
  const next = LEVELS.findIndex((_, i) => !complete.has(i));
  $('continue').firstChild.textContent = complete.size === 0 ? 'Begin testing ' : next < 0 ? 'Replay chambers ' : 'Resume testing ';
  $('continue').onclick = () => openLevel(Math.max(0, next));
  $('levels').replaceChildren(...LEVELS.map((level, i) => {
    const card = document.createElement('button');
    card.className = 'level-card';
    card.innerHTML = '<span class="eyebrow"></span><strong></strong><small></small><span class="card-arrow" aria-hidden="true">↗</span>';
    card.children[0].textContent = level.chapter;
    card.children[1].textContent = level.name;
    card.children[2].textContent = complete.has(i) ? '✓ Test cleared' : 'Open schematic';
    card.onclick = () => openLevel(i);
    return card;
  }));
}

function resetRun() {
  run = startRun(current(), design().parts, design().wires);
  inputs.clear();
  pulse = jump = false;
  trail = [];
  acc = 0;
  $('result').hidden = true;
  updateReadout();
}

function openLevel(index) {
  levelIndex = index;
  $('chapter').textContent = 'CHAMBER ' + current().chapter.split(' / ')[1] + ' / ' + LEVELS.length.toString().padStart(2, '0');
  $('level-title').textContent = current().name;
  $('intro').textContent = current().intro;
  $('tip').textContent = current().tip;
  $('menu').hidden = true;
  $('game').hidden = false;
  draw = chamber($('world'), current());
  enterBuild();
  window.scrollTo(0, 0);
}

function enterBuild() {
  mode = 'build';
  armed = null;
  resetRun();
  renderBench();
  note(design().parts.length ? 'Select a right pin, then a left pin. Click a wired input alone to disconnect.' : 'Drag or click a tray part to place it.');
}

function enterRun() {
  mode = 'running';
  armed = null;
  resetRun();
  renderBench();
  if (!run.coilArmed) note('Interlock open: wire the hold switch and field sensor through the AND gate to unlock the coil.');
  else note(design().wires['flux:drive'] ? 'Circuit live. Mint traces carry a high signal.' : 'No drive wire: gravity will stay normal.');
  playTone('run');
}

function finish() {
  const won = run.status === 'won';
  mode = 'result';
  inputs.clear();
  if (won) {
    complete.add(levelIndex);
    try { localStorage.setItem(storageKey, JSON.stringify([...complete])); } catch {}
  }
  const all = won && complete.size === LEVELS.length;
  const next = levelIndex + 1 < LEVELS.length ? levelIndex + 1 : LEVELS.findIndex((_, i) => !complete.has(i));
  $('result-tag').textContent = won ? (all ? 'CAMPAIGN COMPLETE' : 'EXTRACTION CONFIRMED') : 'SIGNAL LOST';
  $('result-title').textContent = won ? (all ? 'Impossible, built.' : 'Chamber cleared.') : 'Courier offline.';
  $('result-text').textContent = won ? (all ? 'All six chambers cleared. Gravity is yours to wire.' : 'The courier escaped. Your clearance is saved.') : 'The courier touched a hazard. Try again or rewire.';
  $('result-main').textContent = won ? (all || next < 0 ? 'Chambers' : 'Next chamber →') : 'Retry run';
  resultAction = won ? () => all || next < 0 ? showMenu() : openLevel(next) : enterRun;
  $('result').hidden = false;
  $('result-main').focus({ preventScroll: true });
  playTone(won ? 'won' : 'lost');
}

function place(id) {
  if (mode !== 'build' || !current().parts.includes(id) || design().parts.includes(id)) return;
  design().parts.push(id);
  renderBench();
  note(PARTS[id].help + ' Select a right pin, then a left pin to wire.');
  playTone('place');
}

function selectOutput(id) {
  if (mode !== 'build') return;
  armed = armed === id ? null : id;
  $('nodes').querySelectorAll('.out').forEach(pin => pin.classList.toggle('armed', pin.dataset.out === armed));
  note(armed ? PARTS[id].name + ' armed. Select an input pin.' : 'Output deselected.');
}

function connect(from, to, pin) {
  if (mode !== 'build') return;
  const key = to + ':' + pin;
  if (from && (!design().parts.includes(from) || from === 'flux' || wouldCycle(design().wires, from, to))) {
    note('That connection would loop back or has no output.');
    return;
  }
  if (!from && !(key in design().wires)) {
    note('Select a right pin first, then this input.');
    return;
  }
  if (from) design().wires[key] = from;
  else delete design().wires[key];
  armed = null;
  renderBench();
  document.querySelector('[data-in="' + key + '"]').focus({ preventScroll: true });
  note(from ? PARTS[from].name + ' → ' + PARTS[to].name + ' (' + pin + ')' : 'Wire disconnected.');
  playTone(from ? 'wire' : 'remove');
}

function renderBench() {
  const building = mode === 'build';
  $('mode').textContent = building ? 'BUILD' : 'POWERED';
  $('mode').classList.toggle('active', !building);
  $('mode-action').innerHTML = building ? 'Run circuit <span aria-hidden="true">▶</span>' : 'Edit blueprint <span aria-hidden="true">↶</span>';
  $('clear').disabled = !building || !design().parts.length;
  $('empty-board').hidden = design().parts.length !== 0;
  $('tray').replaceChildren(...current().parts.map(id => {
    const part = PARTS[id];
    const button = document.createElement('button');
    button.className = 'part';
    button.innerHTML = '<b aria-hidden="true"></b> <span></span>';
    button.firstElementChild.textContent = part.symbol;
    button.lastElementChild.textContent = part.name;
    button.title = part.help;
    button.setAttribute('aria-label', 'Place ' + part.name);
    button.disabled = !building || design().parts.includes(id);
    button.draggable = !button.disabled;
    button.addEventListener('dragstart', event => {
      event.dataTransfer.setData('application/x-vectorwright-part', id);
      event.dataTransfer.effectAllowed = 'copy';
      $('board').classList.add('drop');
    });
    button.addEventListener('dragend', () => $('board').classList.remove('drop'));
    button.onclick = () => place(id);
    return button;
  }));
  $('nodes').replaceChildren(...design().parts.map(id => {
    const part = PARTS[id];
    const node = document.createElement('div');
    node.className = 'node ' + (id === 'flux' ? 'sink' : part.inputs.length ? 'logic' : 'source');
    node.dataset.node = id;
    node.style.gridColumn = layouts[id][0];
    node.style.gridRow = layouts[id][1];
    node.title = part.help;
    node.innerHTML = '<span class="node-symbol" aria-hidden="true"></span><span></span>';
    node.firstElementChild.textContent = part.symbol;
    node.lastElementChild.textContent = part.name;
    for (const [i, pin] of part.inputs.entries()) {
      const input = document.createElement('button');
      const key = id + ':' + pin;
      input.className = 'port in';
      input.classList.toggle('connected', key in design().wires);
      input.dataset.in = key;
      input.style.top = part.inputs.length === 1 ? '50%' : i === 0 ? '29%' : '72%';
      input.setAttribute('aria-label', part.name + ' ' + pin + ' input');
      input.disabled = !building;
      input.onclick = () => connect(armed, id, pin);
      if (part.inputs.length > 1) {
        const pinLabel = document.createElement('span');
        pinLabel.className = 'port-key';
        pinLabel.textContent = pin;
        input.append(pinLabel);
      }
      input.addEventListener('dragover', event => {
        if (building && event.dataTransfer.types.includes('application/x-vectorwright-wire')) event.preventDefault();
      });
      input.addEventListener('drop', event => {
        const source = event.dataTransfer.getData('application/x-vectorwright-wire');
        if (source) {
          event.preventDefault();
          connect(source, id, pin);
        }
      });
      node.append(input);
    }
    if (id !== 'flux') {
      const output = document.createElement('button');
      output.className = 'port out';
      output.dataset.out = id;
      output.setAttribute('aria-label', part.name + ' output');
      output.disabled = !building;
      output.draggable = building;
      output.onclick = () => selectOutput(id);
      output.addEventListener('dragstart', event => {
        event.dataTransfer.setData('application/x-vectorwright-wire', id);
        event.dataTransfer.effectAllowed = 'link';
      });
      node.append(output);
    }
    return node;
  }));
  shownSignals = '';
  paintWires();
}

function paintWires() {
  if (mode === 'menu') return;
  const drawing = $('wires');
  drawing.replaceChildren();
  const board = drawing.getBoundingClientRect();
  const center = element => {
    const r = element.getBoundingClientRect();
    return [r.left + r.width / 2 - board.left, r.top + r.height / 2 - board.top];
  };
  const svg = 'http://www.w3.org/2000/svg';
  for (const [key, source] of Object.entries(design().wires)) {
    const from = document.querySelector('[data-out="' + source + '"]');
    const to = document.querySelector('[data-in="' + key + '"]');
    const [x, y] = center(from);
    const [a, b] = center(to);
    const bend = Math.max(15, (a - x) * .42);
    const path = document.createElementNS(svg, 'path');
    path.setAttribute('d', 'M ' + x + ' ' + y + ' C ' + (x + bend) + ' ' + y + ', ' + (a - bend) + ' ' + b + ', ' + a + ' ' + b);
    const under = path.cloneNode();
    under.setAttribute('class', 'wire-under');
    path.setAttribute('class', run.values[source] ? 'wire live' : 'wire');
    drawing.append(under, path);
  }
  document.querySelectorAll('[data-node], [data-out], [data-in]').forEach(element => {
    const source = element.dataset.node ?? element.dataset.out ?? design().wires[element.dataset.in];
    element.classList.toggle('live', Boolean(run.values[source]));
  });
}

function updateReadout() {
  const inverted = run.gravity < 0;
  $('gravity').textContent = inverted ? '↑ INVERTED' : '↓ NORMAL';
  $('gravity').classList.toggle('active', inverted);
}

function tick() {
  const before = run.gravity;
  const jumped = jump && run.grounded;
  step(run, current(), {
    right: inputs.has('ArrowRight') || inputs.has('KeyD'),
    left: inputs.has('ArrowLeft') || inputs.has('KeyA'),
    hold: inputs.has('KeyF'), pulse, jump,
  });
  jump = pulse = false;
  if (before !== run.gravity) {
    playTone(run.gravity < 0 ? 'reverse' : 'normal');
    updateReadout();
  } else if (jumped) playTone('jump');
  if (run.ticks % 3 === 0 && (Math.abs(run.vx) > .3 || Math.abs(run.vy) > .3)) trail.push([run.x, run.y]);
  if (trail.length > 10) trail.shift();
  if (run.ticks % 3 === 0 && Math.abs(run.vx) <= .3 && Math.abs(run.vy) <= .3) trail.shift();
  const signals = design().parts.map(part => Number(Boolean(run.values[part]))).join('');
  if (signals !== shownSignals) {
    shownSignals = signals;
    paintWires();
  }
  if (run.status !== 'running') finish();
}

function frame(time) {
  if (mode === 'running') {
    acc += Math.min(time - previous, 75);
    while (acc >= 1000 / 60 && mode === 'running') {
      acc -= 1000 / 60;
      tick();
    }
  }
  if (mode !== 'menu') draw(run, trail, time / 1000);
  previous = time;
  requestAnimationFrame(frame);
}

$('home').onclick = $('back').onclick = showMenu;
$('sound').onclick = () => {
  sound = !sound;
  $('sound').textContent = sound ? 'Sound on' : 'Sound off';
  $('sound').setAttribute('aria-pressed', String(sound));
  if (sound) playTone('place');
};
$('mode-action').onclick = () => mode === 'build' ? enterRun() : enterBuild();
$('restart').onclick = () => mode === 'build' ? enterBuild() : enterRun();
$('clear').onclick = () => {
  designs[levelIndex] = { parts: [], wires: {} };
  enterBuild();
  playTone('remove');
};
$('result-main').onclick = () => resultAction();
$('result-build').onclick = enterBuild;
$('board').addEventListener('dragover', event => {
  if (mode === 'build' && event.dataTransfer.types.includes('application/x-vectorwright-part')) event.preventDefault();
});
$('board').addEventListener('drop', event => {
  const part = event.dataTransfer.getData('application/x-vectorwright-part');
  if (part) {
    event.preventDefault();
    $('board').classList.remove('drop');
    place(part);
  }
});
window.addEventListener('keydown', event => {
  if (mode === 'menu' || !controlled.has(event.code)) return;
  if (mode === 'running' || event.code === 'KeyR' || event.code === 'Escape') event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'KeyR') {
    if (mode === 'build') enterBuild();
    else enterRun();
  } else if (event.code === 'Escape') {
    if (mode === 'build') showMenu();
    else enterBuild();
  } else if (mode === 'running') {
    inputs.add(event.code);
    if (event.code === 'KeyF') pulse = true;
    if (event.code === 'Space') jump = true;
  }
});
window.addEventListener('keyup', event => inputs.delete(event.code));
window.addEventListener('blur', () => {
  inputs.clear();
  pulse = jump = false;
});
new ResizeObserver(paintWires).observe($('board'));
showMenu();
requestAnimationFrame(frame);
