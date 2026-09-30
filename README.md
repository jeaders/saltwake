# 🎣 Saltwake

Sail a fishing boat across the whole ocean. Net, harpoon and sonar your way to the top of the harbour board.

**Saltwake** is a browser-based 2D fishing and exploration game where you captain a boat across a seamless open ocean, cast nets and harpoons, discover rare fish, manage combos, and upgrade your vessel. No app store required — play instantly in any modern browser, or install it on your phone as a PWA.

![CI](https://github.com/jeaders/saltwake/actions/workflows/ci.yml/badge.svg)
![Vite](https://img.shields.io/badge/Vite-7.3.2-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

## 🎮 Gameplay

### Core Loop
1. **Sail** across a wrapping ocean world with day/night cycle
2. **Fish** using nets, harpoons, sonar, and bait
3. **Discover** rare species and fill your journal
4. **Earn** gold to upgrade hull, tools, engine, and boost
5. **Explore** ports on foot and complete missions
6. **Survive** predator attacks and reach the highest score

### Game Modes
- **🕹️ Free Voyage**: no timer, explore at your own pace, discover every port
- **⏱️ Challenge**: score attack with a shrinking clock — how high can you combo?

### Signature Mechanics
- **Day/Night Cycle**: rare glow fish worth +25% at night
- **Combo System**: chain catches for multipliers up to ×8
- **Frenzy Rewards**: double points bursts during big hauls
- **Sonar Marking**: mark rare fish through obstacles
- **On-Foot Exploration**: leave your boat, walk shores, interact with ports
- **World Atlas**: plan routes, set waypoints, discover new regions
- **Shipyard**: customize hull, paint, and upgrades
- **Journal**: field guide with species data, habitats, and catch stats

## 🕹️ Controls

### Keyboard
| Key | Action |
|-----|--------|
| WASD / Arrows | Move boat |
| Space | Cast net |
| X / K / 2 | Harpoon |
| C / L / 3 | Sonar |
| Shift / B / V | Boost |
| E | Dock / Interact |
| I | Journal |
| Tab / G | World atlas |
| Q | Cruise autopilot |
| Z | Precision steering |
| F | Bait |
| H | Repel predators |
| P / Esc | Pause |
| M | Mute |
| R | Restart |
| +/- | Zoom |

### Touch & Gamepad
- **Touch**: virtual joystick + context-aware buttons
- **Gamepad**: left stick moves, A/B/X/Y/LB/RB trigger tools, Start pauses

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Typecheck
npm run typecheck
```

## 📦 Tech Stack

- **React 19** — UI framework
- **TypeScript 5.9** — type safety
- **Vite 7** — build tooling
- **Tailwind CSS 4** — styling
- **Canvas 2D** — game rendering
- **WebAudio API** — synthesized audio (no assets)
- **PWA Manifest** — installable on mobile

## 🌐 Publishing

### Play in Browser
Open `dist/index.html` after `npm run build`, or deploy the `dist/` folder to:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any static host

### Install as PWA
Open the game in Chrome/Safari and use **Add to Home Screen**. The manifest and meta tags are already configured.

### iOS & Android (Capacitor)
For native app store deployment, wrap the existing web build with Capacitor:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init saltwake com.jeaders.saltwake
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

See [EXPO.md](./EXPO.md) for full instructions.

## 📸 Screenshots

> Add gameplay screenshots here.

```
        ~  ~  ~
     ~              ~
   ~    SALTWAKE    ~
  ~   La tua nave,  ~
 ~      il tuo mare   ~
   ~              ~
        ~  ~  ~
```

## 🗺️ Roadmap

- [ ] More species and regions
- [ ] Weather system
- [ ] Multiplayer sailing
- [ ] Leaderboards
- [ ] Achievements

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

## 👤 Credits

Built by [Jeaders](https://github.com/jeaders).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
