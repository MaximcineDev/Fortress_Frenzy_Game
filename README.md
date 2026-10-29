# Fortress Frenzy — Maximcine Studios

A landscape medieval artillery game for browser and Android, with 30 campaign missions, local progress, destructible castles, unit upgrades, cosmetic skins and optional online duels.

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

## World Tour scenery and castles

The campaign now visits 30 cities, starting with Lagos, Abuja, Accra, Abidjan, Dakar, Cairo, Addis Ababa, Nairobi, Johannesburg and Cape Town, then continuing worldwide. Each destination has its own illustrated landmark backdrop, palette, terrain and fortress layout. Five bundled city atlases match the game’s colourful painted style. See WORLD_TOUR_AND_PROFILE.md for the complete itinerary. Landmarks are scenery; the two foreground castles and commanders remain the damageable gameplay targets.

Difficulty and unlock progression carry over. Offline commander health starts at 225; mission enemy health grows gently to 388. Timed missions and minimum-health objectives remain enforced, and timers stop while paused. The new campaign reuses existing mission IDs, preserving previously earned stars and purchased access.

## Player profile

After Tap to Start, new players enter a name and choose a flag. Returning players go to the menu; the Player Profile badge opens the editor. All 249 ISO country/territory flags are bundled as images with search and paging. There is no location detection. Names and flags appear in the HUD and on the castles, and travel through the online server's room, match and recovery snapshots. Rebuild the app and redeploy the included server to use online flags.

## Controls

- **Aim + / Aim −:** tap for a one-degree adjustment, or hold to keep aiming up/down. You can also touch/click and drag on the battlefield to set the angle. Aiming does not fire.
- **FIRE:** shoots the selected unit at the current angle. The button shows READY or the remaining cooldown. For Fairy it changes to **REPAIR**.
- **Keyboard:** Up/Down arrow keys aim; Space fires; keys 1–8 select units.
- The live dotted trajectory and impact marker use the selected unit's actual ballistic path and visible castle geometry. Aim above the target to compensate for gravity. Two-finger touch supports holding an aim button while pressing Fire.
- Tap a unit icon or use keyboard keys **1–8**. Cooldowns are independent and shown under each icon.
- Destroy the enemy commander above the castle to win. Castle blocks absorb shots and area effects damage nearby blocks.
- Fairy repairs your own commander and surviving blocks. Crow fires twice. Archer pierces a block. Napalmer has an immediate burn-damage bonus. Bomber and Catapult deal area damage.
- Pause/resume is available offline. Exit Battle, large Main Menu buttons and Escape return to the menu. Android Back also returns from game/submenus and exits only from the main menu.

## AdMob integration
Rewarded gold doubling is optional on successful offline results. Interstitials are limited to four completed offline battles and five minutes between displayed full-screen ads, with a five-minute startup grace; they show only at result-screen navigation boundaries and only when cached. Online battles have no ads. Debug builds use Google demo units; signed release builds select the supplied live IDs. UMP consent, Options privacy entry point, ad pause/restore and durable idempotent reward delivery are included. Follow ADMOB_SETUP.md for console setup, device tests and release configuration.
