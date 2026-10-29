# Fortress Frenzy — Maximcine Studios

A landscape medieval artillery game for browser and Android, with 30 campaign missions, local progress, destructible castles, unit upgrades, cosmetic skins and optional online duels.

## Run the game

Install Node.js 20 or later. Open Command Prompt or a terminal in this extracted project folder:

```sh
npm install
npm run dev
```

Open the address printed by Vite. Tap through the start screen, choose the illustrated **PLAY** button and select **CAMPAIGN**. The original menu art is retained with clickable Play, Upgrades, Shop and Options buttons.

## Campaign and coin unlocks

- Missions **1–5 are free and available immediately**.
- Missions **6–30 start locked** on a new save. Tap a locked card to see its price and balance before confirming.
- Each paid mission is a separate, one-time purchase using **earned game coins**. Mission 6 costs **300 gold**; the price increases by **25 gold per mission**, up to **900 gold** for Mission 30. Gold and coins refer to the same earned currency. Prices are defined by `unlockCost` in `src/campaign.js`.
- Any paid mission can be unlocked if you can afford it; completing its predecessor is not required. More advanced missions are harder.
- Winning a mission does **not** automatically unlock a paid mission. After victory, **UNLOCK NEXT** opens a confirmation, while **NEXT MISSION** starts a mission already available.
- Cancelling never spends coins. Insufficient funds cannot grant access. Buying an already-owned mission never charges again.
- Once unlocked, starting, retrying and replaying that mission are free. Unlocks save locally on this browser/device and survive reloads.
- A first victory pays 50–340 coins depending on mission number. Completed-mission replays pay 20 coins. Quick Battle victories pay 40 coins. There are no real-money coin purchases in this build.
- Stars depend on surviving commander health: one for completing the objective, two at 50% health, three at 80%. The best rating is retained.
- Mission pages show 1–10, 11–20 and 21–30. Use Previous and Next below the grid.

Existing 12-mission saves keep their coins, upgrades, skins, stars and access to previously available missions. The revised campaign extends the same `ff_save_v1` save key. **Reset Progress** explicitly clears coins, upgrades, skins and mission unlocks; it requires a second confirming tap.

## Mission scenery and castles

Every mission has a different combination of scenery, atmosphere and castle geometry:

| Realm | Battlefield | Castle style |
| --- | --- | --- |
| Emerald Valley | Forest, river and royal keep | Battlement fortress |
| Frostfall Mountains | Snow, ice falls and mountain castle | Twin towers |
| Sunspire Oasis | Desert, palms and sandstone palace | Stepped palace |
| Ashen Caldera | Volcanic fortress and lava | Open gatehouse |
| Tidewatch Coast | Harbor, cliffs and sea castle | Coastal watchtower |
| Thornveil Woods | Enchanted forest and luminous fortress | Three-spire keep |

The six realms cycle through daylight, golden dusk, misty rain, twilight and moonlit siege, creating **30 distinct visual combinations**. Castle rows, widths, roof details, stone colors and actual destructible block layouts also change between missions. Geometry is used by hit detection; it is not only a backdrop swap. Cosmetic weather does not alter projectile physics.

Difficulty rises gently across all 30 missions: enemy health and damage increase, firing intervals shorten and aim becomes more accurate. New enemy unit types appear gradually. Player base health stays at 100; bought upgrades still apply in offline play. Health-preservation missions enforce their printed minimum, timed missions enforce their countdown, and boss missions include the final ruler at Mission 30. Timers stop while paused.

The distant castle is scenery. The two foreground stone outposts and their commanders are the damageable gameplay targets. This remains a 2D artillery game in the splash artwork's medieval style.

## Controls

- **Aim + / Aim −:** tap for a one-degree adjustment, or hold to keep aiming up/down. You can also touch/click and drag on the battlefield to set the angle. Aiming does not fire.
- **FIRE:** shoots the selected unit at the current angle. The button shows READY or the remaining cooldown. For Fairy it changes to **REPAIR**.
- **Keyboard:** Up/Down arrow keys aim; Space fires; keys 1–8 select units.
- The live dotted trajectory and impact marker use the selected unit's actual ballistic path and visible castle geometry. Aim above the target to compensate for gravity. Two-finger touch supports holding an aim button while pressing Fire.
- Tap a unit icon or use keyboard keys **1–8**. Cooldowns are independent and shown under each icon.
- Destroy the enemy commander above the castle to win. Castle blocks absorb shots and area effects damage nearby blocks.
- Fairy repairs your own commander and surviving blocks. Crow fires twice. Archer pierces a block. Napalmer has an immediate burn-damage bonus. Bomber and Catapult deal area damage.
- Pause/resume is available offline. Exit Battle, large Main Menu buttons and Escape return to the menu. Android Back also returns from game/submenus and exits only from the main menu.

## Browser production build

```sh
npm run build
npm run preview
```

`dist/` includes the latest prebuilt web game. Serve it with an HTTP server; opening `index.html` with `file://` is not supported. Art and scripts are bundled locally, with no external font/image requests required by the game.

## Build Android without opening Android Studio

Keep your working `android/local.properties` when replacing old project files. It must contain the valid local SDK path, for example:

```properties
sdk.dir=C:/Users/your-name/AppData/Local/Android/Sdk
```

With Node.js, Java and the Android SDK already configured, run from the extracted project folder:

```bat
npm install
npm run build
npm run cap:sync
cd android
gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

Application ID stays `com.maximcinestudios.castlesiege` to preserve compatibility with existing installations. Display name is Fortress Frenzy. A signed release APK/AAB is not supplied. Machine-specific SDK paths, node_modules, old APKs and build caches are omitted from the ZIP. This project does not require administrator access to build when the SDK and Java are already available to your user account.

## Online duels

Choose **Play → Online Duel**. Enter a player name, connect to the game server, then choose **Find Opponent**, **Create Private Room** or **Join Room** using a friend's six-character code. Both players must press Ready Up. The battle uses server-authoritative base unit stats, synchronized health/results and a 15-second reconnect window.

For local testing, run once from the project folder:

```bat
npm install
npm run setup:server
```

Run the server in one terminal:

```bat
npm run server
```

Run `npm run dev` in a second terminal, then open two game windows. Vite proxies development Socket.IO connections to the server on port 3000. Alternatively run `npm run build` and open `http://localhost:3000` while the Node server is running; it serves both the built game and multiplayer connections.

Public internet play requires a separately hosted HTTPS server. No public server is deployed by this ZIP. The in-game server address can be saved on each device, or `VITE_SERVER_URL` can set the default before a release APK build. See **ONLINE_SETUP.md** for two-phone testing, command-line setup, reconnect behavior and deployment. A Dockerfile and sample environment settings are included. Deploy from the project root so the server can import the shared combat code.

Names and server addresses are saved separately from campaign progress. Online matches are unranked, with no accounts, cloud saves or online coin rewards in this release. Offline gold, unlocks, missions and upgrades are retained.

## Validation

```sh
npm test
npm run test:online
node tests/online-smoke.js
npm run build
```

Twenty core automated checks and seven online integration checks pass for combat, navigation, all 30 castle geometries and playable trajectories, visual-variant uniqueness, difficulty limits, coin balances, repeat purchases, insufficient funds, old-save migration, objectives and resets. Browser checks cover purchase cancellation, a permanent Mission 6 unlock, free replay, insufficient funds for Mission 30, direct-route lock protection, different realm rendering, saved access after reload, an actual Mission 5 victory followed by the paid next-mission confirmation, and phone touch unlocking/entry/firing. Android assets are synced from the final production build; native installation still needs device verification.

## Assets and implementation

Original splash and menu artwork are retained. Project art uses built-in image generation with the splash/world as references, plus native Phaser geometry for destructible masonry, weather, banners and effects.

- `src/images/bg-battle-medieval.png`: original medieval battlefield background.
- `src/images/knights-sheet.png`: red, blue, gold and green knight atlas.
- `src/images/realm-atlas.png`: new two-column, three-row atlas of six medieval realm backgrounds. The generation prompt specified forest, snow, desert, volcanic, coastal and enchanted scenes, with consistent combat ground and no text/UI/characters.
- `src/worldVariants.js`: realm/atmosphere palettes and per-mission castle profiles.
- `src/campaign.js`: mission definitions, price curve, access checks, objectives, save migration and rewards.
- `src/shared/gameState.js`: real mission castle block layouts and collision targets.
- `src/render/medievalWorld.js`: realm art, material/roof details, knights and weather.

Backgrounds are bundled from optimized WebP copies to reduce download and mobile loading size. Full PNG source artwork is retained in `src/images/`.

### Unlock price update

Mission 6: 300 gold; Mission 10: 400 gold; Mission 20: 650 gold; Mission 30: 900 gold. Quick Battle wins still pay 40 gold, and existing balances and already-unlocked missions are retained. At a zero balance, Mission 6 takes eight Quick Battle victories (320 gold); missions and replay rewards also contribute. Starting gold remains 150.

### Dedicated aim and fire update

Large Aim +/− buttons sit on the left of the battle dock, and a Fire button sits on the right. The angle readout, outlined trajectory dots, impact ring and cooldown indicator give feedback before firing. Weapons retain their original projectile speed and damage; this update does not add a power multiplier. Aim is clamped from 15 degrees below horizontal to 75 degrees above it, and mirrors correctly for an online player on either side. Pause and finished matches block both aiming and firing.

Browser checks passed for aim taps/holds, drag aiming without accidental shots, firing, cooldown blocking, unit selection, Space/arrow keys, Repair, paused controls, phone touch and simultaneous two-finger aim/fire.

### Online matchmaking revision

Online Lobby adds saved player/server fields, public queue cancellation, private codes and clear connection status. Drafting includes both players' Ready status. The server blocks shots before readiness, during network interruptions and after a finished game; validates room membership and cooldowns; resolves authoritative healing/damage; and cleans up expired rooms. Recovery restores the same room, castle health, cooldowns and aim angle. Deliberate departure or failure to recover awards the opponent a win.

A paired browser test used a desktop and scaled touch client to create/join a private code, ready both players, land shots from opposite sides, recover a transport drop with health preserved and show the same victory result. It also exercised public matchmaking and returning the opponent to the lobby when a player left drafting. No browser page errors occurred. The public server must still be hosted; ONLINE_SETUP.md documents the deployment steps.

## Fortress menu styling
Upgrade, Options and Play choices share splash-inspired blue-and-gold framed panels, raised touch buttons and bold outlined labels. Upgrade and Options use the splash artwork as their backdrop. Upgrade purchases, sound settings, reset confirmation and navigation retain their existing behavior.

## Coin pack shop and start feedback
Tap to Start shows a brief pressed animation before opening the menu. The Royal Market includes 300 / 800 / 1,800 / 4,000 gold packs and a separate castle skin category. Android Play Billing integration fetches local prices, verifies signed completed purchases, saves receipt/coins before consumption and retries unfinished delivery. Configure the Play products and licensing public key using COIN_PURCHASE_SETUP.md. Real checkout and an Android build must be tested in Play internal testing before release. Coin balances remain local. Android minimum is API 23.

The Shop opens with Gold Packs and Castle Skins categories. Gold Packs shows USD preview prices ($0.99, $1.99, $3.99, $7.99); live Google Play prices override previews. Android back returns from a category to the Shop landing page.

## Longer offline battles
Campaign and Quick Battle commander health is now 225. Campaign enemy health starts at 225 and increases 2.5% of base health per mission, reaching 388 in mission 30. A base Wrecker takes five direct commander hits in mission 1, seven in mission 10, eight in mission 20 and nine in mission 30. Misses, splash, other units, upgrades and repair alter actual shot counts. Online balance is unchanged. Existing saves need no migration.
