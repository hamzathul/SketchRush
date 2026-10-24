# SketchRush

A real-time multiplayer drawing and guessing game. Create a private room, share the six-character code, and take turns sketching while everyone else races to guess in chat.

Built with Next.js, Socket.IO, React, TypeScript, Tailwind CSS, Zustand and a canvas/perfect-freehand rendering engine.

## Features

- Private 6-character room codes — no accounts, profiles or matchmaking
- 2–16 players per game, spectator mode for late arrivals
- 3 word choices per turn (easy / medium / hard) with difficulty-based scoring
- Pen, marker, highlighter, eraser and bucket fill
- 14-color palette plus a custom color picker
- Live stroke sync, undo, clear and PNG download
- Focus mode for a full-window drawing canvas (press `Esc` to exit)
- Timed rounds, letter hints, guess streaks and speed bonuses
- Room chat, emoji reactions, sound toggle and unread indicators
- Lobby chat and host controls (difficulty, rounds, draw time, hints, player limit, custom words, room lock, kick, transfer host)
- Reconnect and refresh recovery — players return to their seat with the canvas intact
- Responsive desktop, portrait and landscape layouts with safe-area padding, touch-friendly controls and a mobile chat drawer/side sheet
- Installable PWA with maskable icons, app shortcuts, an offline fallback and a landing-page install card
- Rematch and back-to-lobby flows

## How to play

1. Enter a nickname and create a room.
2. Share the room code or invite link with 1–15 friends.
3. The host starts the game.
4. The artist picks one of three words and draws it before the timer runs out.
5. Everyone else types guesses in chat. The first correct guess ends the turn.
6. Score points for speed, streaks and word difficulty. The artist earns points per correct guesser plus a team bonus.
7. After the final round, the podium decides who wins. Vote for a rematch or return to the lobby.

One **round** means every player gets one turn to draw. With two players, one round is two turns.

## PWA and mobile

SketchRush is installable from Chrome/Edge (use the install card or the browser menu) and can be added to the iOS Home Screen via **Share → Add to Home Screen**. The manifest defines standalone display, theme colors, maskable icons and shortcuts for creating a room or opening the rules.

The service worker is registered only in production. It precaches the offline page and icons, uses network-first navigation with an `/offline.html` fallback, and cache-first/stale-while-revalidate for static assets. API, Socket.IO and React Server Component requests are never cached, so live games always use the network.

To try the install prompt and offline mode locally, run a production build:

```bash
npm run build
npm start
```

On phones, the game adapts to both orientations. Landscape play uses compact chrome with a single scrollable toolbar and a chat side sheet; portrait play uses a bottom chat drawer. Safe-area insets keep controls clear of notches and home indicators.

## Local development

Requirements: Node.js 20.9+ (Node 22 recommended).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Next.js + the custom Socket.IO server with watch mode |
| `npm run build` | Create a production build |
| `npm start` | Run the production server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP / Socket.IO port |
| `NODE_ENV` | development | Set to `production` for production |
| `LOG_LEVEL` | `info` | Pino log level |

## Tests

Unit tests cover scoring, word selection, normalization/hints and settings validation.

```bash
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

The Playwright suite creates two real browser players, plays both turns of a one-round game, and covers drawing sync, bucket-fill snapshots, chat, reconnect/refresh, final scores, rematch, spectator promotion, recent rooms and PWA assets. The mobile project checks phone portrait and landscape layouts, overflow, the game canvas and the chat drawer/side sheet. Screenshots are written to `sketchrush-screenshots` in the OS temp directory so Next's dev server does not reload mid-test.

## Architecture

```
server.ts                  Custom Node HTTP server + Socket.IO
src/server/                Authoritative room/game state, validation, timers
src/lib/socket-events.ts   Typed client/server event contract
src/components/            Landing, lobby, game, canvas, chat and PWA UI
src/lib/                   Zustand store, scoring, words, canvas state
src/app/manifest.ts        Web app manifest and icon/shortcut metadata
public/sw.js               Service worker (offline shell and static caching)
public/offline.html        Self-contained offline fallback page
e2e/                       Playwright multiplayer, PWA and mobile tests
tests/                     Vitest unit tests
```

- **Server-authoritative:** the server owns rooms, turns, scores, words, hints and timers. Clients send intents and receive personalized state snapshots.
- **Canvas sync:** strokes are normalized to 0–1 coordinates, streamed in batches, and replayed for reconnects and late joiners. Bucket fill flattens the canvas into a compressed PNG snapshot.
- **In-memory:** there is no database. Rooms disappear on restart, deployment or when the Render free instance sleeps. This is intentional for a guest-only party game.
- **Single instance:** Socket.IO rooms are process-local. Do not horizontally scale without a shared adapter and room store.

## Deploying to Render

`render.yaml` is included for a Render Blueprint:

1. Push this project to GitHub.
2. In Render, choose **New → Blueprint** and select the repository.
3. Apply the blueprint. Render builds with `npm ci && npm run build` and starts with `npm start`.
4. Health checks use `/api/health`.

The service must run as **one instance** because game state lives in memory. On the free plan, the service sleeps after inactivity and active rooms are lost. WebSockets work through Render's proxy; keep-alive and Socket.IO ping timeouts are configured for it.

### Docker

```bash
docker build -t sketchrush .
docker run -p 3000:3000 -e NODE_ENV=production sketchrush
```

## Design notes and limits

- Guest-only; there is no authentication. Room codes and per-player resume tokens protect seats, not privacy.
- Messages are capped at 200 characters and rate-limited. Nicknames and chat are lightly profanity-filtered.
- Canvas payloads, strokes and points are validated and clamped server-side.
- Rooms are stored in memory and capped at 24 sockets / 16 players by default.
- No horizontal scaling, persistence or account system.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Socket.IO · Zustand · Zod · motion · perfect-freehand · Radix Dialog · canvas-confetti · sonner · Vitest · Playwright
