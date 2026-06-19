---
audience: agent
category: scope
type: Codemap
last_verified: 2026-06-19
load-when: Pixel UI, design tokens, copy examples, or visual UX constraints.
---
# Scope — Look & Feel (8-Bit Retro-Hybrid)

Part of the product spec. Hub: [`SCOPE.md`](../SCOPE.md).

## Look & Feel — 8-Bit Retro-Hybrid

**Richtung (festgelegt):** Wie ein **8-Bit-Pixelspiel** in Farbe und Form — aber **Retro-Hybrid** für Festival-Betrieb: große Touch-Flächen, lesbar in Sonne, keine Mini-Pixel-Schriften im Fließtext.

**Stimmung:** **Morgendämmerung / Vogelzug** — Süd (warm) → Nord (kühl), Wald & Himmel.

### Design-Prinzipien

| Prinzip | Umsetzung |
|---------|-----------|
| Pixel-Identität | Pixel-Font für **Überschriften, Buttons, Punkte, Feldnummern**; System-Font nur für längere Texte (Regeln, Aufgaben) |
| Formen | **Eckig** — `border-radius: 0` oder max. `4px`; „Stepped“-Schatten (2–4px offset), keine weichen Material-Schatten |
| Buttons | Chunky, 3–4px **Pixel-Rahmen**, Pressed-State (1px nach unten/rechts), Primary = warm, Secondary = Waldgrün |
| Icons | 16×16 oder 24×24 **Pixel-Art** (Sprite-Sheet oder SVG mit `shape-rendering: crispEdges`) |
| Spielbrett | **Pixel-Art Vogelzug** — scrollbare Karte, Team-Marker als kleine Vogel-Sprites |
| Feedback | Punkte +/- als **Pixel-Popup** (rot/grün), kurze 8-Bit-Animation (CSS, 2–4 Frames) |
| Nuxt UI | Basis-Layout; **eigene** `PixelButton`, `PixelCard`, `PixelDialog` — Nuxt UI nur wo es passt (z.B. Form-Inputs mit Override) |

### Farbpalette „Dawn Forest“ (Entwurf Tokens)

| Token | Hex (Entwurf) | Verwendung |
|-------|---------------|------------|
| `sky-dawn` | `#6B5B95` → Gradient zu `#E8A87C` | Hintergrund Himmel (Süd oben / Nord unten optional) |
| `forest-dark` | `#2D4A3E` | Primär-Text, Rahmen |
| `forest-mid` | `#4A7C59` | Buttons Secondary, Brett-Wiese |
| `forest-light` | `#8FBC8F` | Flächen, erfolgreiche States |
| `sunrise` | `#FFB347` | Primary CTA (`ROLL DICE`, `SCAN STATION`) |
| `sunset` | `#E8784A` | Akzent, Warnungen |
| `pixel-white` | `#F4F1DE` | Karten-Hintergrund (nicht reines #FFF — weniger Blendung outdoor) |
| `pixel-black` | `#1A1C2C` | Rahmen, Schatten |
| `score-plus` | `#6BCB77` | Punkte gewonnen |
| `score-minus` | `#E85D5D` | Punkte verloren |
| `gold` | `#FFD700` | Ziel erreicht, Highscore-Spitze |

**Kontrast:** WCAG AA für Fließtext; Buttons min. 44×44px Touch — **Lesbarkeit > purer Retro**.

### Typografie

| Rolle | Font (Vorschlag) | Größe mobil |
|-------|------------------|-------------|
| Display / Logo | `Press Start 2P` oder `Silkscreen` | 14–18px |
| UI / Buttons | `Press Start 2P` | 12–14px |
| Body / Aufgaben | `Inter` oder System sans | 16–18px |
| Zahlen (Würfel, Punkte) | Pixel-Font | groß, zentriert |

### Komponenten-Bildsprache

```text
┌─────────────────────────────┐  ← 4px pixel border (#1A1C2C)
│  ▶ SCAN STATION             │  ← Press Start 2P, sunrise fill
└─────────────────────────────┘
     ▓▓ shadow offset 4px
```

- **Würfel-Animation:** 6 Frames Pixel-Würfel oder CSS-Rotate mit Pixel-Sprite
- **Team-Marker auf Brett:** kleiner Vogel (2–3 Farben), eigene Farbe pro Team optional V1
- **Hinweis-Stufen:** drei „Tipp-Icons“ (Feder / Fußspur / Karte) als Pixel-Sprites
- **QR-Screen:** Scan-Rahmen als Pixel-Ecken (nicht moderner Rounded Scanner)

### Screens nach Rolle

| Bereich | Look |
|---------|------|
| `/play`, `/join` | Volle Spiel-Ästhetik — Brett dominiert |
| `/leaderboard` | Pixel-Brett mini + Rangliste als „High-Score-Tabelle“ (Arcade) |
| `/crew` | Gleiche Tokens, etwas **ruhiger** (weniger Deko, schnelle Buttons) |
| `/admin` | Gleiche Farben, **mehr** Lesefont — Funktion vor Deko |

### UX + 8-Bit (Punkte-Feedback)

- Minus: roter Pixel-Text `−50` floatet nach oben + kurzer „damage“ sound optional V1
- Plus: grüner `+115` beim Zug-Abschluss
- Buttons mit Minus-Aktion: Label immer `−XX Punkte` in `score-minus` Farbe

### Technik (Nuxt)

- `web/app/assets/css/pixel-theme.css` — CSS-Variablen
- `app.config.ts` / Nuxt UI `ui` overrides wo möglich
- Komponenten: `web/app/components/pixel/*`
- Spielbrett: `GameBoard.vue` + statisches PNG/WebP **oder** Canvas/SVG Pixel-Grid
- `image-rendering: pixelated` für Sprites

### Bewusst nicht MVP

- Vollständiger CRT-Scanline-Overlay (optional V1, Toggle)
- 8-Bit-Musik/SFX (V1 — braucht User-Geste wegen Autoplay)
- Individuelle Team-Avatare
- Animierter Parallax-Hintergrund

### Offen für Feinschliff

- Finales Logo „Zugvögel“ / „99“ als Pixel-Wordmark
- Referenz-Screenshot-Moodboard (1 Seite)
- Dark mode (vermutlich nein — Outdoor-Festival)

---
