# Saltwake

Sail a fishing boat across the whole ocean. Net, harpoon and sonar your way to the top of the harbour board.

A browser-based 2D fishing and exploration game built with React, TypeScript, Vite, and Tailwind CSS. No external assets required — audio and visuals are generated at runtime.

## Features

- **Open-world sailing** across a procedurally wrapped ocean
- **Fishing tools**: net, harpoon, sonar, and bait
- **On-foot exploration** at ports and along shores
- **Day/night cycle** with rare glow fish at night
- **Combo system** and Frenzy rewards
- **Upgrades**: hull, net, harpoon, sonar, engine, boost, repair
- **High scores** saved locally
- **Touch, keyboard, and gamepad** input
- **PWA-ready** with manifest and meta tags

## How to play

### Keyboard
- **WASD / Arrows**: move the boat
- **Space**: cast net
- **X / K / 2**: harpoon
- **C / L / 3**: sonar
- **Shift / B / V**: boost
- **E**: dock / interact
- **I**: journal
- **Tab / G**: world atlas
- **Q**: cruise autopilot
- **Z**: precision steering
- **F**: bait
- **H**: repel predators
- **P / Esc**: pause
- **M**: mute
- **R**: restart
- **+/-**: zoom

### Touch / Gamepad
Virtual joystick and touch buttons appear automatically on touch devices. Connected gamepads are supported.

### Game modes
- **Free voyage**: no timer, explore at your own pace
- **Challenge**: score attack with a shrinking clock

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Typecheck
npm run typecheck
```

The production build outputs a single bundled HTML file in `dist/` via `vite-plugin-singlefile`.

## Publishing

### GitHub
1. Push this repository to GitHub
2. Enable GitHub Pages (source: `gh-pages` branch or GitHub Actions)
3. Use the `dist/` folder as the publish directory

### Expo / App Store
See [EXPO.md](./EXPO.md) for the recommended path to iOS and Android using Capacitor.

## Screenshots

```
        ~  ~  ~
     ~              ~
   ~    SALTWAKE    ~
  ~   La tua nave,  ~
 ~      il tuo mare   ~
   ~              ~
        ~  ~  ~
```

## License

MIT — see [LICENSE](./LICENSE) for details.

## Credits

Built by [Jeaders](https://github.com/jeaders).
