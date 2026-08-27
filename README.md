# Zatacka

Classic multiplayer curve combat. You only turn left or right. Your line never stops. Gaps open so others can slip through — or so you can. Last curve standing takes the round.

A modern take on **Achtung, die Kurve!** with local hot-seat and peer-to-peer internet matches.

## Play

- **Play now** — drop into a local match against bots
- **Local setup** — 2–6 players on one keyboard
- **Internet** — create a private room and send the 6-letter code. Peers connect directly over WebRTC; the server only introduces you. The room creator stays host and starts the match.

### Controls

| Player | Left | Right |
| --- | --- | --- |
| 1 | ← | → |
| 2 | A | D |
| 3 | J | L |
| 4 | Numpad 4 | Numpad 6 |
| 5 | C | V |
| 6 | N | M |

On a phone, two pads: hold left / right. Mouse buttons also steer player 1.

Everyone still alive scores when a curve dies. First to the target wins the match.

## Stack

- React 19, TanStack Start / Router, Vite, Tailwind CSS
- Canvas sim at 60 Hz, local + remote players
- WebRTC data-channel mesh for online play
- HTTP signaling at `/api/rtc` (embedded PGLite in preview; Neon when `DATABASE_URL` is set)

## Run

```bash
npm install
npm run dev
```

The app listens on `0.0.0.0:8080`. Auth is off; scores live in `localStorage`. Online rooms use the signaling endpoint in this repo — no extra service to stand up for local play.

```bash
npm run typecheck
npm run build
```

## Online rooms

1. Host taps **Create room** and shares the code
2. Guests enter the code and **Join**
3. Host taps **Start match** when everyone is seated

The creator remains host even if the lobby remounts. Guests cannot steal the host seat.

## License

MIT. The original *Achtung, die Kurve!* is a 1990s DOS classic; this is an independent remake.
