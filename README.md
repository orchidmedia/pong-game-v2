# Pong

A classic Pong game playable in any browser — no dependencies, single HTML file.

## Features

- **vs Computer** — Easy, Medium, Hard AI difficulty
- **2 Players** — local multiplayer on the same device
- **8-bit sounds** — Web Audio API synthesized sound effects with mute toggle
- **Online leaderboard** — sign in with Google or GitHub to save scores (Firebase); falls back to local storage when not configured
- **Responsive** — scales to any screen size; full touch controls for mobile & tablet
- **No install** — open `pong.html` in any modern browser

## How to Play

Open `pong.html` in any modern browser.

### Keyboard

| Action | P1 | P2 |
|--------|----|----|
| Move up | `W` | `↑` |
| Move down | `S` | `↓` |
| Start / Pause | `Space` | — |
| Back to menu | `Esc` | — |

### Touch (mobile / tablet)

- Drag the **left half** of the screen to control P1
- Drag the **right half** to control P2 (2-player mode)
- Tap the canvas to start or resume

## Rules

First to **7 points** wins. The ball speeds up slightly with each paddle hit.

---

## Firebase Setup (optional — for online leaderboard & login)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add a **Web app** and copy the config
3. Paste it into the `FIREBASE_CONFIG` object in `pong.html`
4. Enable **Authentication → Sign-in method → Google** (one click)
5. Enable **Authentication → Sign-in method → GitHub**:
   - Create a GitHub OAuth App at GitHub → Settings → Developer settings → OAuth Apps
   - Set the callback URL to the one Firebase shows you
   - Paste the Client ID and Secret into Firebase
6. Create a **Firestore database** (test mode is fine to start)

Without Firebase configured, the game works fully with local scores only.

---

## Roadmap — V2

- iOS & Android apps via Capacitor
- Real-time online multiplayer (Firebase Realtime Database)
