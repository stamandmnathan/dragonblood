# DragonBlood

A first-person dragon kingdom game, running in the browser as a 3D prototype (three.js).

Kill a mother dragon on foot. Pull her egg from the lava nest. Outrun the wild dragons that want it. Hatch the egg. Feed your dragon. Imprint on it. Ride it on Sky Patrol missions. Grow your village into a kingdom.

## Play

Open `index.html` in a modern browser. The first load needs an internet connection to get three.js and the fonts from their CDNs. The browser saves your progress in localStorage.

## Layout

| Path | Role |
| --- | --- |
| `index.html` | Markup and page shell |
| `css/styles.css` | Game styles |
| `js/game.js` | Game logic (three.js) |

## Controls

| Action | Key |
| --- | --- |
| Move / sprint / jump | WASD / Shift / Space |
| Strike / block | Click or F / right mouse |
| Use / interact | E |
| Dragon breath | Q |
| Dragon powers | 1–4 |
| Scroll | Z |
| Salve | H |
| Kingdom panel | Tab |
| Ride: land or take off, grab, dive | R, G, Shift |

On a phone or tablet, use the touch controls.

Press the Menu button in the game for a full control guide (on foot, Dragon Power, and riding).

## Notes

- `TEST_MODE` in `js/game.js` is currently `true`. That gives you max gear, unlimited gold and material, and grown dragons for testing. Set it to `false` for normal progression.
- Only one dragon (your active one) can be ridden as a flying mount for now.
- This is a single-player prototype of the core loop. Multiplayer, factions, and the other planned systems are not built yet.
