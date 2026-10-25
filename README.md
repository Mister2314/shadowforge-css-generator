# Shadowforge — CSS Shadow Instrument

A box-shadow workbench that behaves like a lab instrument: adjust a value, watch the
specimen settle into place, and copy code you'd actually commit — as plain CSS, CSS
custom properties, a Tailwind arbitrary-value class, or SCSS. No accounts, no tracking,
no dependencies beyond React itself.

**Live:** https://shadowforge-css-generator.vercel.app

## What it does

- **Layered shadows** — stack up to 6 shadow layers, duplicate, remove, and combine
  them into one comma-separated `box-shadow`. Real shadows have a sharp contact edge
  *and* a soft falloff; a single layer can only do one. Multi-layer presets (Card,
  Float) ship the layered technique out of the box.
- **Four output formats** — copy the exact `box-shadow:` declaration, a
  `--shadow-elevated` custom property, a Tailwind arbitrary-value class
  (`shadow-[…]`), or an SCSS `$shadow-elevated` variable. All computed from the same
  state, all one click.
- **Import existing shadows** — paste any `box-shadow` declaration (hex, rgb, hsl,
  one layer or many) into the import drawer and it's parsed back into editable
  layers. Round-trip: import → tweak → export in any format.
- **Preview on real surfaces** — switch the specimen background between bench,
  light, dark and moss so a shadow tuned on white doesn't fall apart on your
  dark-mode UI. The preview box eases toward each value change with a rAF spring
  (~0.18 lerp); the generated string is always exact — the animation is display-only.
- **Undo / redo** — a 50-step history with Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, plus
  header buttons. Rapid slider drags coalesce into a single step, so one drag =
  one undo.
- **Dark & light themes** — the system preference is respected on first paint (an
  inline script sets the theme before any CSS paints, so there's no flash), the
  toggle persists, and `color-scheme` follows. The light theme is a designed
  "daylight bench", not an inversion; interactive accent surfaces meet WCAG AA in
  both themes.
- **Shareable state** — the full tool state lives in the URL (`?x=20&y=30&b=15&s=-3&c=000000&o=0.3&i=0`;
  multi-layer states use `l1x=…&l2x=…`). *Copy link* puts it on your clipboard —
  no backend involved. Malformed parameters fall back to the stored session or
  defaults.
- **Session restore** — state persists to `localStorage` (`shadowforge.session.v1`),
  so a reload or accidental tab close keeps your work. URL parameters always win
  over storage.
- **Keyboard control** — every slider is a native range input: focus it and use
  ←/→ (↑/↓). Visible 2px focus rings on every control. `Ctrl/Cmd+C` copies the
  active format, `Ctrl/Cmd+R` resets, `Ctrl/Cmd+D` duplicates the active layer,
  `Ctrl/Cmd+Z` / `Shift+Z` undo/redo.
- **Reduced motion** — `prefers-reduced-motion: reduce` disables the preview spring
  and every transition; the page is complete and correct with animation off.
- **Mobile-first layout** — the specimen panel moves above the controls below 900px,
  touch targets are ≥44px on small screens, readouts compress to inline chips.
  Verified at 390 and 1280px with zero console errors and no horizontal overflow.

## The output contract

The generator's core promise is a **byte-identical output string** for a given input:

```css
box-shadow: 0px 10px 15px -3px rgba(0, 0, 0, 0.3);
```

Space-separated values, `rgba(r, g, b, o)` with `", "` separators, `inset ` prefix when
enabled, trailing semicolon. Multi-layer output joins the same per-layer strings with
`", "`. The other formats derive from the same per-layer strings — Tailwind replaces
spaces with underscores, CSS-vars/SCSS wrap the same body in a variable and a
`var()`/`$` reference. If you build on this repo, keep that format stable.

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
  localStorage codec, undo/redo history, import parser, spring loop, and the output
  formatters. `layerToShadowString` + `formatOutput` are the only code allowed to
  produce output text.
- The import parser handles hex/rgb/hsl colors, alpha (including `#rrggbbaa`), and
  2–4 numeric components per layer; anything else reports an honest failure instead
  of guessing.
- The dark-lab visual direction (one violet accent, mono readouts, machined panels)
  evolved from the original purple-gradient identity rather than replacing it.
  Theme tokens live in `src/style.css` under `:root` (dark) and `:root[data-theme="light"]`.
