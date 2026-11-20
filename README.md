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
| `js/core/` | Static data tables, the save (`S`) and stats derived from it |
| `js/engine/` | three.js renderer, camera, dragon and weapon models, animation and effects (`fx.js`, Legendary spell effects in `spell-fx.js`) |
| `js/player/` | Player movement, combat and arrows |
| `js/scenes/` | One file per scene: hub, egg hunt, feed, Sky Patrol, tutorial, Holy Tree trial; `kingdom-stages.js` builds the kingdom for each stage of growth |
| `js/systems/` | Missions, seasons, holy bark, scrolls, Dragon Power, squire |
| `js/ui/` | Panels, HUD, input, loadout and title screen |
| `js/main.js` | Main loop and boot (loads last) |

The scripts are plain `<script>` tags (not modules), so the game still runs from `file://`. They share one global scope and load in the order listed in `index.html`. At load time a file can only use what the files above it define.

## Tutorial

A new village starts with a tutorial. You can skip it from the Menu.

1. **On foot:** move, sprint, fight weak nest guards and drink a salve. Then sneak into a sleeping mother dragon's nest and take one of four eggs: Lightning, Poison, Fire or Ice. Escape through the portal while she spits fire at you.
2. **Riding:** the egg is now a fully grown dragon. Step by step you go through every key: mount, take off, speed, steer, climb and descend, dive, breath, bite, unseating riders, breaking free when a rider snatches you, parachuting, grabbing and delivering a crate, landing, dismounting, blocking and striking soldiers, Dragon Power, sending your dragon away and calling it back, and the kingdom panel.

## Practice range

Open it from the Mission Gate. Walk up to a tablet at the camp and press E:

- **Armory tablet:** use any of the 15 weapons. You go back to your own weapon when you leave.
- **Dragon tablet:** summon a loaner dragon of any element, rarity and flight level, or ride one of your own.
- **Spell tablet:** slot practice Legendary scrolls that never run out, and refill Dragon Power.
- **Enemy tablet:** spawn training dummies (they show your damage per second), critters, soldiers, armored knights and enemy rider dragons. You can also clear them all, make enemies harmless, turn on invincibility, refill everything, or leave.

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

- `TEST_MODE` in `js/core/state.js` is currently `true`. That gives you max gear, unlimited gold and material, and grown dragons for testing. Set it to `false` for normal progression.
- Only one dragon (your active one) can be ridden as a flying mount for now.
- This is a single-player prototype of the core loop. Multiplayer, factions, and the other planned systems are not built yet.
