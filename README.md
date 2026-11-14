# DragonBlood

A first-person dragon kingdom game, running in the browser as a 3D prototype (three.js).

Kill a mother dragon on foot, pull her egg from the lava nest, and outrun the wild dragons that want it. Hatch the egg, feed your dragon, imprint on it, ride it on Sky Patrol missions, and grow your village into a kingdom.

## Play

Open `index.html` in a modern browser. It needs an internet connection the first time, to load three.js and the fonts from their CDNs. Your progress saves in the browser's localStorage.

## Controls

| Action | Key |
| --- | --- |
| Move / sprint | WASD / Shift |
| Strike / block | Click or F / right mouse |
| Use / interact | E |
| Dragon breath | Q |
| Dragon powers | 1–4 |
| Scroll | Z |
| Salve | H |
| Kingdom breakdown | Tab |
| Ride: land/take off, grab, dive | R, G, Shift |

It also has touch controls on phones and tablets.

## Notes

- `TEST_MODE` in `index.html` is currently `true`. That gives you max gear, unlimited gold and material, and two fully grown dragons. Set it to `false` for normal progression.
- This is a single-player prototype of the core loop. Multiplayer, factions, and the other planned systems aren't built yet.
