export const WIDTH = 840;
export const HEIGHT = 400;
export const CEILING = 32;
export const FLOOR = 368;
export const TOOTH_HEIGHT = 15;

export function* spikeTeeth(left, right) {
  const count = Math.ceil((right - left) / 15);
  const width = (right - left) / count;
  for (let i = 0; i < count; i++) {
    const x = left + i * width;
    yield [x + 1, x + width / 2, x + width - 1];
  }
}

export const PARTS = {
  hold:   { name: 'Hold switch', symbol: 'F', inputs: [], help: 'High while you hold F.' },
  pulse:  { name: 'Pulse switch', symbol: '↯', inputs: [], help: 'One tick when you press F.' },
  field:  { name: 'Field sensor', symbol: '◇', inputs: [], help: 'High inside the cyan field.' },
  light:  { name: 'Light sensor', symbol: '☼', inputs: [], help: 'High outside the amber shadow.' },
  west:   { name: 'West sensor', symbol: 'W', inputs: [], help: 'High inside the west cyan field.' },
  east:   { name: 'East sensor', symbol: 'E', inputs: [], help: 'High inside the east cyan field.' },
  toggle: { name: 'Toggle', symbol: '⏦', inputs: ['pulse'], help: 'Each rising edge swaps its stored bit.' },
  and:    { name: 'AND gate', symbol: '&', inputs: ['A', 'B'], help: 'High only when both pins are high.' },
  not:    { name: 'Inverter', symbol: '¬', inputs: ['A'], help: 'Turns low into high and high into low.' },
  timer:  { name: 'Timer', symbol: '◷', inputs: ['pulse'], help: 'Stretches one pulse to 1.7 seconds.' },
  or:     { name: 'OR gate', symbol: '≥1', inputs: ['A', 'B'], help: 'High when either pin is high.' },
  flux:   { name: 'Gravity coil', symbol: '⇅', inputs: ['drive'], help: 'High pulls up. Low pulls down.' },
};

export const LEVELS = [
  {
    name: 'First Contact', chapter: 'WIRING / 01', intro: 'The extraction hatch is on the ceiling. Give the coil a signal you can hold.',
    tip: 'Drag or click parts to place them. Link a part’s right pin to a left pin. Run, hold F to rise, and move right.',
    parts: ['hold', 'flux'], bottom: [[240, 700]], top: [], exit: 'top',
  },
  {
    name: 'Memory Cell', chapter: 'LATCH / 02', intro: 'A pulse is too short to lift you. Build a circuit that remembers it.',
    tip: 'Put the Toggle between the pulse and coil. Tap F near the start, then tap again before the ceiling spikes.',
    parts: ['pulse', 'toggle', 'flux'], bottom: [[225, 440]], top: [[645, 830]], exit: 'bottom',
  },
  {
    name: 'Deadman’s Field', chapter: 'INTERLOCK / 03', intro: 'The safety interlock only unlocks the coil when the hold switch and field sensor feed it through an AND gate.',
    tip: 'The AND gate needs both signals. Rise over the first pit; release F early to duck the overhead teeth, then rise again.',
    parts: ['hold', 'field', 'and', 'flux'], bands: { field: [125, 705] }, requiresInterlock: true,
    bottom: [[245, 355], [584, 700]], top: [[458, 514], [758, 830]], exit: 'bottom',
  },
  {
    name: 'Negative Space', chapter: 'POLARITY / 04', intro: 'The light sensor goes quiet in shadow. Make the coil wake up there instead.',
    tip: 'The Inverter swaps high and low. The shadow does the flipping for you. Time a jump at the low step.',
    parts: ['light', 'not', 'flux'], bands: { light: [195, 572] },
    bottom: [[318, 541]], top: [[10, 182], [696, 830]], blocks: [[716, 326, 31, 42]], exit: 'bottom',
  },
  {
    name: 'Borrowed Seconds', chapter: 'TIMING / 05', intro: 'This room grants a short burst of reverse gravity. Decide where to spend it.',
    tip: 'Wire a pulse through the Timer. Tap F near the amber calibration marks, then keep moving. A new tap resets the timer.',
    parts: ['pulse', 'timer', 'flux'], marker: [177, 204],
    bottom: [[280, 430]], top: [[603, 830]], blocks: [[685, 334, 38, 34]], exit: 'bottom',
  },
  {
    name: 'The Double Inversion', chapter: 'ROUTING / 06', intro: 'Two fields, one coil. Cross both without touching the teeth between them.',
    tip: 'The OR gate accepts either field. Jump the orange inspection block on the floor between the two fields.',
    parts: ['west', 'east', 'or', 'flux'], bands: { west: [130, 308], east: [540, 725] },
    bottom: [[205, 313], [610, 721]], top: [[415, 511]], blocks: [[460, 330, 28, 38]], exit: 'bottom',
  },
];

export function machine(parts, wires, coilArmed = true) {
  const memory = Object.create(null);
  return (controls, x, bands = {}) => {
    const values = Object.create(null);
    const read = id => {
      if (!parts.includes(id)) return false;
      if (id in values) return values[id];
      const input = pin => read(wires[id + ':' + pin]);
      const state = memory[id] ??= { previous: false, bit: false, ticks: 0 };
      let value = false;
      if (id === 'hold') value = controls.hold;
      if (id === 'pulse') value = controls.pulse;
      if (id in bands) {
        const [start, end] = bands[id];
        value = id === 'light' ? x < start || x >= end : x >= start && x < end;
      }
      if (id === 'toggle' || id === 'timer') {
        const current = input('pulse');
        if (current && !state.previous) {
          state.bit = !state.bit;
          state.ticks = 104;
        }
        state.previous = current;
        value = id === 'toggle' ? state.bit : state.ticks > 0;
        if (state.ticks > 0) state.ticks--;
      }
      if (id === 'and') value = input('A') && input('B');
      if (id === 'or') value = input('A') || input('B');
      if (id === 'not') value = Boolean(wires['not:A']) && !input('A');
      if (id === 'flux') value = coilArmed && input('drive');
      values[id] = Boolean(value);
      return values[id];
    };
    parts.forEach(read);
    return values;
  };
}

export function wouldCycle(wires, from, to) {
  return from === to || Object.entries(wires).some(([pin, source]) =>
    pin.split(':')[0] === from && wouldCycle(wires, source, to));
}

const SIZE = 11;
export function startRun(level, parts, wires) {
  const gateInputs = [wires['and:A'], wires['and:B']];
  const coilArmed = !level.requiresInterlock || (
    ['hold', 'field', 'and'].every(part => parts.includes(part)) &&
    wires['flux:drive'] === 'and' && gateInputs.includes('hold') && gateInputs.includes('field')
  );
  return {
    x: 55, y: FLOOR - SIZE, vx: 0, vy: 0, gravity: 1, grounded: true,
    face: 1, ticks: 0, status: 'running', values: {}, coilArmed, read: machine(parts, wires, coilArmed),
  };
}

function intersects(x, y, [bx, by, width, height]) {
  return x + SIZE > bx && x - SIZE < bx + width && y + SIZE > by && y - SIZE < by + height;
}

function hitsSpikes({ x, y }, ranges, depth) {
  const reach = 1 - Math.max(0, depth(y)) / TOOTH_HEIGHT;
  if (reach <= 0) return false;
  for (const [start, end] of ranges) {
    if (x + SIZE <= start || x - SIZE >= end) continue;
    for (const [left, tip, right] of spikeTeeth(start, end)) {
      if (x + SIZE > tip + (left - tip) * reach && x - SIZE < tip + (right - tip) * reach) return true;
    }
  }
  return false;
}

export function step(run, level, controls) {
  if (run.status !== 'running') return;
  run.ticks++;
  run.values = run.read(controls, run.x, level.bands);
  const gravity = run.values.flux ? -1 : 1;
  if (gravity !== run.gravity) run.grounded = false;
  run.gravity = gravity;
  const direction = Number(Boolean(controls.right)) - Number(Boolean(controls.left));
  if (direction) run.face = direction;
  const target = direction * 3.25;
  run.vx += (target - run.vx) * (direction ? 0.28 : 0.36);
  if (controls.jump && run.grounded) {
    run.vy = -8.5 * gravity;
    run.grounded = false;
  }
  const blocks = level.blocks ?? [];
  run.x = Math.max(SIZE + 10, Math.min(WIDTH - SIZE - 10, run.x + run.vx));
  for (const block of blocks) {
    if (intersects(run.x, run.y, block)) {
      run.x = run.vx > 0 ? block[0] - SIZE : block[0] + block[2] + SIZE;
      run.vx = 0;
    }
  }
  run.vy = Math.max(-12, Math.min(12, run.vy + 0.56 * gravity));
  run.y += run.vy;
  run.grounded = false;
  if (run.y >= FLOOR - SIZE || run.y <= CEILING + SIZE) {
    run.y = Math.max(CEILING + SIZE, Math.min(FLOOR - SIZE, run.y));
    run.grounded = Math.sign(run.vy) === gravity;
    run.vy = 0;
  }
  for (const block of blocks) {
    if (intersects(run.x, run.y, block)) {
      run.y = run.vy > 0 ? block[1] - SIZE : block[1] + block[3] + SIZE;
      run.grounded = Math.sign(run.vy) === gravity;
      run.vy = 0;
    }
  }
  if (hitsSpikes(run, level.top, y => y - SIZE - CEILING) ||
      hitsSpikes(run, level.bottom, y => FLOOR - y - SIZE)) {
    run.status = 'lost';
  } else if (run.x >= 765 && (level.exit === 'top' ? run.y <= CEILING + 18 : run.y >= FLOOR - 18)) {
    run.status = 'won';
  }
}
