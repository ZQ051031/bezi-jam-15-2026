import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS, machine, startRun, step, wouldCycle } from '../engine.js';

const routes = [
  { wires: { 'flux:drive': 'hold' }, input: () => ({ hold: true }) },
  { wires: { 'toggle:pulse': 'pulse', 'flux:drive': 'toggle' }, pulse: [55, 490] },
  { wires: { 'and:A': 'hold', 'and:B': 'field', 'flux:drive': 'and' },
    input: ({ x }) => ({ hold: x < 380 || x >= 525 }) },
  { wires: { 'not:A': 'light', 'flux:drive': 'not' }, jump: [694] },
  { wires: { 'timer:pulse': 'pulse', 'flux:drive': 'timer' }, pulse: [188], jump: [647] },
  { wires: { 'or:A': 'west', 'or:B': 'east', 'flux:drive': 'or' }, jump: [438] },
];

function simulate(level, wires, route) {
  const run = startRun(level.parts, wires);
  let lastX = -Infinity;
  for (let n = 0; n < 850 && run.status === 'running'; n++) {
    const crossed = markers => markers?.some(x => lastX < x && run.x >= x);
    const input = {
      right: true, ...route.input?.(run),
      pulse: crossed(route.pulse), jump: crossed(route.jump),
    };
    lastX = run.x;
    step(run, level, input);
  }
  return run;
}

for (const [i, level] of LEVELS.entries()) {
  test(level.name + ': intended circuit reaches the hatch', () => {
    const route = routes[i];
    const run = simulate(level, route.wires, route);
    assert.equal(run.status, 'won', JSON.stringify({ x: run.x, y: run.y, ticks: run.ticks }));
    assert.equal(simulate(level, {}, route).status, 'lost');
  });
}

test('a toggle latches only on the rising edge, and a timer expires', () => {
  const toggle = machine(['pulse', 'toggle', 'flux'], routes[1].wires);
  assert.equal(toggle({ pulse: false }, 0).flux, false);
  assert.equal(toggle({ pulse: true }, 0).flux, true);
  assert.equal(toggle({ pulse: true }, 0).flux, true);
  assert.equal(toggle({ pulse: false }, 0).flux, true);
  assert.equal(toggle({ pulse: true }, 0).flux, false);
  const timer = machine(['pulse', 'timer', 'flux'], routes[4].wires);
  assert.equal(timer({ pulse: true }, 0).flux, true);
  for (let tick = 1; tick < 104; tick++) assert.equal(timer({}, 0).flux, true);
  assert.equal(timer({}, 0).flux, false);
});

test('a floating inverter does not power the coil, and cycles are rejected', () => {
  const read = machine(['light', 'not', 'flux'], { 'flux:drive': 'not' });
  assert.equal(read({}, 0).flux, false);
  assert.equal(wouldCycle({ 'not:A': 'hold', 'and:A': 'not' }, 'and', 'hold'), true);
  assert.equal(wouldCycle({}, 'and', 'and'), true);
  assert.equal(wouldCycle({ 'not:A': 'hold' }, 'not', 'flux'), false);
});
