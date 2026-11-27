# Vectorwright

**Wire the impossible.** Vectorwright is a six-chamber puzzle-platformer built for [Bezi Jam 15](https://itch.io/jam/bezi-jam-15). Build a circuit on the blueprint board, power it up, and guide a tiny courier past the teeth to the mint extraction hatch.

- **UNREAL — Do the impossible:** Local gravity can point up. Walk on the ceiling, fall back to the floor, and jump away from whichever surface supports you.
- **BLUEPRINT — Build the impossible:** The courier can't flip gravity on its own. You place the switches, sensors, logic gates, and gravity coil, then wire them together. The actual signals control gravity in real time. The glowing traces show which wires are high.

The six hand-built chambers introduce a hold switch, a latching toggle, a field interlock, an inverter, a timed pulse, and finally a two-field router. All chambers are selectable from the menu; your clearances are saved in the current browser.

## Controls

| Action | Control |
| --- | --- |
| Place a part | Drag from the parts tray onto the blueprint, or click its tray button |
| Wire two parts | Click a right-hand output then a left-hand input, or drag the output onto the input |
| Remove a wire | Click its input without selecting an output first |
| Try your design | Choose **Run circuit**; choose **Edit blueprint** to reset the courier and keep your wiring |
| Move | **← / →** or **A / D** |
| Jump | **Space** |
| Signal | **F**; hold it for a hold switch or tap it for a pulse switch |
| Restart | **R** or **Restart**; wiring is kept |
| Back | **Esc** returns to Build during a run, or to chamber select from Build |

Each chamber has a field note with wiring and timing hints. Use a keyboard for the platforming section; the blueprint also supports button focus and keyboard activation.

## Run locally

From the repository root, run:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. No build step, runtime dependencies, network assets, or account required. The game uses vanilla JavaScript, Canvas 2D, inline SVG, and synthesized Web Audio.

## Prepare an itch.io web export

```sh
zip vectorwright.zip index.html style.css engine.js art.js game.js
```

Upload the ZIP as an HTML game and mark it **This file will be played in the browser**. The ZIP has `index.html` at the root. A 1280 × 780 desktop embed gives the chamber and blueprint room to sit side by side. No upload or submission is performed by these commands.

## Developer checks

With the local server running, use Node.js 22+ and a local Chrome/Chromium executable:

```sh
npm ci
CHROME_PATH="$(command -v google-chrome)" npm test
```

The tests check circuit behavior, simulate the intended route through every chamber, and exercise the actual browser UI and keyboard controls. Set `BASE_URL` to test another static host or `SHOTS_DIR` to save browser screenshots.
