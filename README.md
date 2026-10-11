# ShadowForge — CSS Shadow Generator

**A zero-dependency `box-shadow` generator with live preview and copy-ready CSS output.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-mister2314.github.io/shadowforge--css--generator-2ea44f?style=flat-square&logo=vercel&logoColor=white)](https://mister2314.github.io/shadowforge-css-generator/)
![HTML5](https://img.shields.io/badge/HTML5-e34f26?style=flat-square&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572b6?style=flat-square&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-f7df1e?style=flat-square&logoColor=white)

<p align="center">
  <a href="https://mister2314.github.io/shadowforge-css-generator/">
    <img src="docs/preview.png" alt="ShadowForge — CSS Shadow Generator — desktop preview" width="100%">
  </a>
</p>

## Overview

`box-shadow` is easy to read and annoying to write. ShadowForge turns it into a control panel: drag the sliders until the preview looks right, then copy the generated CSS.

Every control exists twice — a range slider for feel and a number input for precision — and the two are kept in sync in both directions. The generator covers the full shadow syntax, including spread radius, colour, opacity and the `inset` flag, and updates the preview on every input event.

It is plain HTML, CSS and JavaScript with no build step and no dependencies, which is deliberate: the file you deploy is the file you edit.

## Features

- Sliders and number inputs kept in sync for offset X, offset Y, blur and spread
- Colour picker paired with a hex input, plus a separate opacity control
- `inset` toggle for inner shadows
- Live preview box that re-renders on every input event
- Generated CSS output with a copy-to-clipboard button
- Glassmorphism panel layout on a gradient background
- No dependencies, no build step — open `index.html` and it runs

## Tech Stack

| Layer | Technology |
| --- | --- |
| Markup | HTML5 |
| Styling | CSS3 (grid, custom properties, `backdrop-filter`) |
| Logic | Vanilla JavaScript |
| Deploy | GitHub Pages |

## Screenshots

| Desktop | Mobile |
| :---: | :---: |
| <img src="docs/preview.png" alt="Desktop view"> | <img src="docs/preview-mobile.png" alt="Mobile view" width="230"> |

## Getting Started

No build step and no dependencies — clone the repo and open the entry file, or serve the folder locally:

```bash
git clone https://github.com/Mister2314/shadowforge-css-generator.git
cd shadowforge-css-generator

# Option 1 — open it directly
start index.html      # Windows
open  index.html      # macOS

# Option 2 — serve it locally
npx serve .
```

## Project Structure

```
index.html — control panel markup and the preview box
script.js — control registry, two-way binding, CSS generation, clipboard
style.css — layout, glass panels and control styling
```

## Notes

The interesting constraint was keeping slider and number input honest: each pair writes to the same source of truth and re-renders the other, so dragging a slider moves the number and typing a number moves the slider.

## Author

**Xəyal Hüseynli** — Junior Front-End Developer

[Portfolio](https://hypnosdev.vercel.app) · [GitHub](https://github.com/Mister2314) · [LinkedIn](https://www.linkedin.com/in/x%C9%99yal-h%C3%BCseynli-3487b91ba/) · [xeyalhuseynli06@gmail.com](mailto:xeyalhuseynli06@gmail.com)
