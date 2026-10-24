# Shadowforge — CSS Shadow Instrument

A box-shadow generator that behaves like a lab instrument: adjust a value, watch the
specimen settle into place, copy an exact CSS string. No accounts, no tracking, no
dependencies beyond React itself.

**Live:** https://shadowforge-css-generator.vercel.app

## What it does

- **Live specimen preview** — the preview box eases toward each value change with a
  rAF spring (~0.18 lerp), so the shadow feels physically adjusted rather than snapped.
  The generated CSS string is always computed instantly from the exact state — the
  animation is display-only and never touches the output.
- **Layered shadows** — stack up to 6 shadow layers, duplicate, remove, and combine
  them into one comma-separated `box-shadow`. Layers are additive: a single layer
  produces the same one-shadow output the tool has always produced.
- **Keyboard control** — every slider is a native range input: focus it and use ←/→
  (↑/↓). Visible 2px focus rings on every control. `Ctrl/Cmd+C` copies, `Ctrl/Cmd+R`
  resets, `Ctrl/Cmd+D` duplicates the active layer.
- **Shareable state** — the full tool state lives in the URL (`?x=20&y=30&b=15&s=-3&c=000000&o=0.3&i=0`;
  multi-layer states use `l1x=…&l1y=…&l2x=…`). Send the link, get the exact shadow.
  Malformed parameters fall back to the stored session or defaults.
- **Session restore** — state persists to `localStorage` (`shadowforge.session.v1`), so a
  reload or accidental tab close keeps your work. URL parameters always win over storage.
- **Copy choreography** — the button confirms with a "Copied ✓" state and a toast slides
  in with an expo-out ease. All motion is `transform`/`opacity` only.
- **Reduced motion** — `prefers-reduced-motion: reduce` disables the preview spring and
  every transition; the page is complete and correct with animation off.
- **Mobile-first layout** — the specimen panel moves above the controls below 900px,
  thumb targets are ≥44px, and readouts compress to inline chips. Verified at 390, 768,
  1440 and 1920px with zero console errors and no horizontal overflow.

## The output contract

The generator's core promise is a **byte-identical output string** for a given input:

```css
box-shadow: 0px 10px 15px -3px rgba(0, 0, 0, 0.3);
```

Space-separated values, `rgba(r, g, b, o)` with `", "` separators, `inset ` prefix when
enabled, trailing semicolon. Multi-layer output joins the same per-layer strings with
`", "`. If you build on this repo, keep that format stable — tooling and docs may depend
on it.

## Development

```bash
npm install
npm run dev       # Vite dev server
npm run build     # tsc -b + vite build
npm run preview   # serve the production build
```

Stack: React 19, TypeScript (strict), Vite 6, plain CSS — no runtime libraries beyond
React. Deployed on Vercel.

## Architecture notes

- `src/App.tsx` holds the whole tool: state model (`LayerState[]`), URL codec,
  localStorage codec, spring loop, and the output formatter. The formatter
  (`layerToShadowString` + join) is the only code allowed to produce output text.
- Preview animation mirrors numeric values into `displayValues` state; the preview box
  renders from that mirror, never from the canonical state.
- The dark-lab visual direction (one violet accent, mono readouts, machined panels)
  evolved from the original purple-gradient identity rather than replacing it.
