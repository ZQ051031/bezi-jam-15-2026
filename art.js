import { CEILING, FLOOR, WIDTH, HEIGHT, spikeTeeth, TOOTH_HEIGHT } from './engine.js';

const MINT = '#81f5df';
const AMBER = '#ffca85';
const ROSE = '#ff7581';
const mono = '11px monospace';

export function chamber(canvas, level) {
  const ctx = canvas.getContext('2d');
  const plate = document.createElement('canvas');
  plate.width = WIDTH;
  plate.height = HEIGHT;
  const bg = plate.getContext('2d');
  const fill = bg.createLinearGradient(0, 0, WIDTH, HEIGHT);
  fill.addColorStop(0, '#172f41');
  fill.addColorStop(.57, '#0d1b2a');
  fill.addColorStop(1, '#112b38');
  bg.fillStyle = fill;
  bg.fillRect(0, 0, WIDTH, HEIGHT);
  bg.strokeStyle = '#233e5080';
  bg.beginPath();
  for (let x = 8.5; x < WIDTH; x += 24) {
    bg.moveTo(x, CEILING); bg.lineTo(x, FLOOR);
  }
  for (let y = 56.5; y < FLOOR; y += 24) {
    bg.moveTo(0, y); bg.lineTo(WIDTH, y);
  }
  bg.stroke();
  bg.font = mono;
  for (let x = 56; x < WIDTH; x += 104) {
    bg.fillStyle = '#436777';
    bg.fillText(String(x).padStart(3, '0'), x, 62);
    bg.fillRect(x, 65, 1, 5);
  }
  for (const [id, [left, right]] of Object.entries(level.bands ?? {})) {
    const color = id === 'light' ? AMBER : MINT;
    bg.fillStyle = color + '18';
    bg.fillRect(left, CEILING, right - left, FLOOR - CEILING);
    bg.strokeStyle = color + '9a';
    bg.setLineDash([5, 5]);
    bg.strokeRect(left, CEILING, right - left, FLOOR - CEILING);
    bg.setLineDash([]);
    bg.fillStyle = color;
    bg.fillText({ light: 'BEAM SHADOW', field: 'INTERLOCK FIELD', west: 'WEST FIELD', east: 'EAST FIELD' }[id], left + 10, 89);
  }
  bg.fillStyle = '#263a49';
  bg.fillRect(0, 0, WIDTH, CEILING);
  bg.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
  bg.fillStyle = '#658593';
  bg.fillRect(0, CEILING - 2, WIDTH, 2);
  bg.fillRect(0, FLOOR, WIDTH, 2);
  bg.fillStyle = '#576f7b';
  for (let x = 16; x < WIDTH; x += 40) {
    bg.fillRect(x, 16, 11, 2);
    bg.fillRect(x, 382, 11, 2);
  }
  for (const [ranges, top] of [[level.top, true], [level.bottom, false]]) {
    for (const [left, right] of ranges) {
      const y = top ? CEILING : FLOOR;
      const h = top ? TOOTH_HEIGHT : -TOOTH_HEIGHT;
      bg.fillStyle = '#652e40';
      bg.fillRect(left, top ? y - 8 : y, right - left, 8);
      bg.strokeStyle = ROSE;
      for (const [baseLeft, tip, baseRight] of spikeTeeth(left, right)) {
        bg.beginPath();
        bg.moveTo(baseLeft, y);
        bg.lineTo(tip, y + h);
        bg.lineTo(baseRight, y);
        bg.closePath();
        bg.fill();
        bg.stroke();
      }
    }
  }
  for (const [x, y, width, height] of level.blocks ?? []) {
    bg.fillStyle = '#7e593e';
    bg.fillRect(x, y, width, height);
    bg.strokeStyle = AMBER;
    bg.strokeRect(x + .5, y + .5, width - 1, height - 1);
    bg.fillStyle = '#281f22';
    bg.fillRect(x + 5, y + 7, width - 10, 4);
  }
  if (level.marker) {
    const [left, right] = level.marker;
    bg.fillStyle = AMBER;
    bg.fillRect(left, FLOOR - 4, right - left, 4);
    bg.fillText('PULSE HERE', left - 20, FLOOR - 14);
  }
  const start = FLOOR - 11;
  bg.strokeStyle = '#6c95a8';
  bg.strokeRect(27.5, start - 29.5, 55, 31);
  bg.fillStyle = '#9bb5c7';
  bg.fillText('ENTRY', 38, start - 37);

  return (run, trail, clock) => {
    ctx.drawImage(plate, 0, 0);
    const exitY = level.exit === 'top' ? CEILING + 17 : FLOOR - 17;
    const glow = ctx.createRadialGradient(787, exitY, 8, 787, exitY, 64);
    glow.addColorStop(0, '#54efca55');
    glow.addColorStop(1, '#54efca00');
    ctx.fillStyle = glow;
    ctx.fillRect(723, exitY - 64, 128, 128);
    ctx.fillStyle = '#184739';
    ctx.strokeStyle = MINT;
    ctx.beginPath();
    ctx.roundRect(765, exitY - 17, 54, 34, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MINT;
    ctx.font = 'bold 11px monospace';
    ctx.fillText('EXIT', 779, exitY + 4);
    ctx.fillRect(774 + Math.sin(clock * 3) * 3, exitY - 11, 4, 2);

    for (let i = 0; i < trail.length; i++) {
      const [x, y] = trail[i];
      ctx.fillStyle = run.gravity < 0 ? AMBER : MINT;
      ctx.globalAlpha = .13 * (i + 1) / trail.length;
      ctx.fillRect(x - 5, y - 5, 10, 10);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(Math.round(run.x), Math.round(run.y));
    ctx.scale(run.face, run.gravity);
    ctx.lineWidth = 2;
    ctx.strokeStyle = run.status === 'lost' ? ROSE : run.gravity < 0 ? AMBER : MINT;
    ctx.fillStyle = '#1a4952';
    ctx.beginPath();
    ctx.roundRect(-10, -9, 20, 18, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#def9ee';
    ctx.fillRect(-2, -4, 3, 5);
    ctx.fillRect(4, -4, 3, 5);
    ctx.fillStyle = MINT;
    ctx.fillRect(-6, 9, 4, 2);
    ctx.fillRect(3, 9, 4, 2);
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-8, -13);
    ctx.stroke();
    ctx.restore();
  };
}
