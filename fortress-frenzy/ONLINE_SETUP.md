# Fortress Frenzy — Online play

## What is included

- Public 1v1 matchmaking with a cancellable waiting queue.
- Private rooms with six-character friend codes.
- Player display names, two-player Ready confirmation, shared health and results.
- Server-authoritative aiming, damage, healing, unit ownership and cooldowns. Offline upgrades do not affect online duels.
- Automatic recovery from short network interruptions, with a 15-second grace period. Shots are blocked while either player is disconnected. Recovered matches restore castle health, cooldowns and the same player sides.
- A forfeit win if the opponent leaves or cannot reconnect in time.
- Private rooms expire after 10 minutes without an opponent. Ready-up expires after 90 seconds. Finished room records are cleaned up after 60 seconds.

This is an unranked online mode. It has no accounts, ranked ladder, chat, cloud saves or online coin rewards. Existing offline campaign prices and rewards are unchanged.

## Test locally without Android Studio

From the extracted project folder, run once:

```bat
npm install
npm run setup:server
```

Start the game server in one terminal:

```bat
npm run server
```

Start Vite in another terminal:

```bat
npm run dev
```

Open the printed browser address in two windows. In each game choose **Play → Online Duel**. Enter different player names and connect. The default development address uses Vite's `/socket.io` proxy to the local server on port 3000.

Choose **Find Opponent** in both windows, or **Create Private Room** in one window and enter its code under **Join Room** in the other. Both players then press **Ready Up**. In battle, use Aim +/− or drag to aim, then Fire; keyboard arrows and Space also work.

To test the built web game without Vite:

```bat
npm run build
npm run server
```

Open `http://localhost:3000`. The same Node server serves the web game and Socket.IO connections. Server health is available at `/health`.

## Two phones on one network

Run the Node server on a machine reachable by both devices. Use that machine's LAN IP, not `localhost`, as the server address on each phone. `localhost` on a phone means the phone itself.

For browser-based phone testing, open the Node server's LAN web address (for example `http://192.168.1.10:3000`) on both phones. Both must be on the same reachable network, and the host's network policy/firewall must allow that port. You do not need to open Android Studio.

For the packaged Android app, use an HTTPS server for the straightforward release/test path. The app's web origin is HTTPS; plain HTTP socket connections can be blocked by WebView mixed-content rules. This build keeps the existing native security settings rather than enabling mixed content globally.

## Play across different networks

The server still needs to be hosted on a publicly reachable service supporting:

1. A long-running Node.js process.
2. HTTP plus WebSocket upgrades on `/socket.io`.
3. A public HTTPS address.

Deploy **from the project root**, because `server/server.js` imports the authoritative physics and units from `src/`. Uploading only the `server` directory is insufficient.

A generic deployment can run:

```sh
npm ci
npm --prefix server ci --omit=dev
npm run build
node server/server.js
```

The service should route its public HTTPS address to the app's `PORT` (default 3000). A Dockerfile is also included; it builds the web game and packages only the required server/source/build files for runtime. A local Docker installation is not required if your host builds from a Dockerfile.

Use one server instance for this release. Matchmaking, rooms and recovery sessions are held in memory; a restart ends them. Multiple independent instances do not share rooms. Let the hosting service terminate TLS and forward WebSocket upgrades. The optional `ALLOWED_ORIGIN` setting accepts a comma-separated list; include your web game's origin and `https://localhost` for the Capacitor app. Leaving it unset allows all origins for initial testing.

No server has been published or connected to a hosting account by this update. Enter your deployed HTTPS address in **Online Duel → Server Address** on each device, then Connect.

## Default server in a release APK

To avoid asking every player to enter the address, create `.env.local` in the project root before building:

```text
VITE_SERVER_URL=https://your-game-server.example
```

Then build using Command Prompt:

```bat
npm install
npm run build
npm run cap:sync
cd android
gradlew assembleDebug
```

Keep your existing `android/local.properties` SDK path. Display name and Android application ID are unchanged. Names and selected server addresses save locally, separately from coins and campaign progress.

## Reconnect behavior

A temporary transport failure triggers automatic reconnect attempts. During the grace period, the opponent sees a waiting screen and the server accepts no shots from either player. A successful recovery sends a full authoritative state, so health/cooldowns do not reset. The client keeps its last aim angle.

Choosing Leave Match is a deliberate forfeit and does not trigger recovery. If a server restarts, state is unavailable and players return to finding a fresh match. Keep the app in the foreground during competitive play; a long background suspension can outlast the grace period.

## Validation

```bat
npm test
npm run test:online
node tests/online-smoke.js
npm run build
```

The online integration tests require `npm run setup:server` first. They cover public queue cancellation, separate private rooms, invalid/full codes, room expiry, ready gates, unauthorized and malformed shots, authoritative damage/healing, cooldowns, mirrored shooting, shared victory, temporary disconnect recovery, forfeit timeout and health reporting.
