import { useEffect, useRef, useState, useMemo, useCallback } from "react";

type LayerState = {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
  opacity: string;
  inset: boolean;
};

const DEFAULT_LAYER: LayerState = {
  offsetX: "0",
  offsetY: "10",
  blur: "15",
  spread: "-3",
  color: "#000000",
  opacity: "0.3",
  inset: false,
};

type Preset = { name: string; layers: LayerState[] };

const PRESETS: Preset[] = [
  {
    name: "Subtle",
    layers: [
      { offsetX: "0", offsetY: "1", blur: "3", spread: "0", color: "#000000", opacity: "0.12", inset: false },
    ],
  },
  {
    name: "Card",
    layers: [
      { offsetX: "0", offsetY: "1", blur: "2", spread: "0", color: "#0f172a", opacity: "0.07", inset: false },
      { offsetX: "0", offsetY: "4", blur: "8", spread: "-2", color: "#0f172a", opacity: "0.1", inset: false },
    ],
  },
  {
    name: "Float",
    layers: [
      { offsetX: "0", offsetY: "2", blur: "4", spread: "-1", color: "#0f172a", opacity: "0.08", inset: false },
      { offsetX: "0", offsetY: "8", blur: "16", spread: "-4", color: "#0f172a", opacity: "0.12", inset: false },
      { offsetX: "0", offsetY: "24", blur: "48", spread: "-12", color: "#0f172a", opacity: "0.14", inset: false },
    ],
  },
  {
    name: "Glow",
    layers: [
      { offsetX: "0", offsetY: "0", blur: "0", spread: "0", color: "#667eea", opacity: "0", inset: false },
      { offsetX: "0", offsetY: "4", blur: "14", spread: "-2", color: "#667eea", opacity: "0.35", inset: false },
    ],
  },
];

const LAYER_URL_PREFIX = "l";

type Format = "css" | "vars" | "tw" | "scss";

const FORMATS: { id: Format; label: string }[] = [
  { id: "css", label: "CSS" },
  { id: "vars", label: "CSS vars" },
  { id: "tw", label: "Tailwind" },
  { id: "scss", label: "SCSS" },
];

type PreviewBg = { id: string; label: string; css: string };

const PREVIEW_BGS: PreviewBg[] = [
  { id: "bench", label: "Bench", css: "" }, // themed default from CSS
  { id: "light", label: "Light", css: "#e9e7e1" },
  { id: "dark", label: "Dark", css: "#14161d" },
  { id: "moss", label: "Moss", css: "#3c4a41" },
];

function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function hexToRgba(hex: string, opacity: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function layerToShadowString(layer: LayerState): string {
  return `${layer.inset ? "inset " : ""}${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${hexToRgba(layer.color, layer.opacity)}`;
}

function shadowStrings(layers: LayerState[]): string {
  return layers.map(layerToShadowString).join(", ");
}

function formatOutput(format: Format, layers: LayerState[]): string {
  const body = shadowStrings(layers);
  if (format === "css") return `box-shadow: ${body};`;
  if (format === "vars") return `--shadow-elevated: ${body};\n\nbox-shadow: var(--shadow-elevated);`;
  if (format === "tw") return `shadow-[${body.replace(/ /g, "_")}]`;
  return `$shadow-elevated: ${body};\n\nbox-shadow: $shadow-elevated;`;
}

// ---------- import: parse a pasted box-shadow declaration ----------

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function colorTokenToLayer(token: string, layer: LayerState): boolean {
  const rgba = token.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (rgba) {
    const toHex = (n: string) => Math.round(Math.max(0, Math.min(255, parseFloat(n)))).toString(16).padStart(2, "0");
    layer.color = `#${toHex(rgba[1])}${toHex(rgba[2])}${toHex(rgba[3])}`;
    layer.opacity = rgba[4] !== undefined ? rgba[4] : "1";
    return true;
  }
  const hsl = token.match(/hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (hsl) {
    // convert HSL to hex
    const h = parseFloat(hsl[1]) / 360;
    const s = parseFloat(hsl[2]) / 100;
    const l = parseFloat(hsl[3]) / 100;
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      const a = s * Math.min(l, 1 - l);
      const v = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
      return Math.round(v * 255).toString(16).padStart(2, "0");
    };
    layer.color = `#${f(0)}${f(8)}${f(4)}`;
    layer.opacity = hsl[4] !== undefined ? hsl[4] : "1";
    return true;
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(token)) {
    let hex = token;
    if (hex.length === 5 || hex.length === 9) {
      // hex with alpha: split off alpha
      const alpha = hex.slice(-2);
      layer.opacity = String(Math.round(parseInt(alpha, 16) / 255 * 100) / 100);
      hex = hex.slice(0, 7);
    }
    if (!isValidHexColor(hex)) return false;
    layer.color = hex;
    return true;
  }
  return false;
}

function parseBoxShadow(css: string): LayerState[] | null {
  const match = css.match(/box-shadow\s*:\s*([^;}]+)/i);
  const body = match ? match[1] : css.trim();
  if (!body) return null;
  const parts = splitTopLevel(body);
  if (parts.length === 0 || parts.length > 12) return null;
  const layers: LayerState[] = [];
  for (const part of parts) {
    const layer: LayerState = {
      offsetX: "0", offsetY: "0", blur: "0", spread: "0",
      color: "#000000", opacity: "1", inset: false,
    };
    let tokens = part.trim().split(/\s+/);
    if (tokens[0] === "inset") {
      layer.inset = true;
      tokens = tokens.slice(1);
    }
    const colorTokenIdx = tokens.findIndex((t) => /rgba?\(|hsla?\(|#/.test(t));
    if (colorTokenIdx >= 0) {
      if (!colorTokenToLayer(tokens[colorTokenIdx], layer)) return null;
      tokens = tokens.filter((_, i) => i !== colorTokenIdx);
    }
    const nums = tokens.map((t) => {
      const m = t.match(/^(-?[\d.]+)(?:px)?$/);
      return m ? m[1] : null;
    });
    if (nums.some((n) => n === null) || nums.length < 2 || nums.length > 4) return null;
    const values = nums as string[];
    layer.offsetX = values[0];
    layer.offsetY = values[1];
    layer.blur = values[2] ?? "0";
    layer.spread = values[3] ?? "0";
    layers.push(layer);
  }
  return layers.length > 0 ? layers : null;
}

// ---------- URL + storage codecs ----------

function layerStateToURLParams(prefix: string, layer: LayerState): Record<string, string> {
  return {
    [`${prefix}x`]: layer.offsetX,
    [`${prefix}y`]: layer.offsetY,
    [`${prefix}b`]: layer.blur,
    [`${prefix}s`]: layer.spread,
    [`${prefix}c`]: layer.color.replace("#", ""),
    [`${prefix}o`]: layer.opacity,
    [`${prefix}i`]: layer.inset ? "1" : "0",
  };
}

function urlParamsToLayerState(prefix: string, params: URLSearchParams): LayerState | null {
  const x = params.get(`${prefix}x`);
  const y = params.get(`${prefix}y`);
  const b = params.get(`${prefix}b`);
  const s = params.get(`${prefix}s`);
  const c = params.get(`${prefix}c`);
  const o = params.get(`${prefix}o`);
  const i = params.get(`${prefix}i`);
  if (x === null || y === null || b === null || s === null || c === null || o === null) return null;
  const color = `#${c}`;
  if (!isValidHexColor(color)) return null;
  return { offsetX: x, offsetY: y, blur: b, spread: s, color, opacity: o, inset: i === "1" };
}

function parseURLLayers(params: URLSearchParams): LayerState[] {
  const layers: LayerState[] = [];
  let idx = 1;
  while (true) {
    const layer = urlParamsToLayerState(`${LAYER_URL_PREFIX}${idx}`, params);
    if (!layer) break;
    layers.push(layer);
    idx++;
  }
  if (layers.length === 0) {
    const single = urlParamsToLayerState("", params);
    if (single) layers.push(single);
  }
  return layers;
}

function layersToURLParams(layers: LayerState[]): Record<string, string> {
  const params: Record<string, string> = {};
  if (layers.length === 1) {
    Object.assign(params, layerStateToURLParams("", layers[0]));
  } else {
    layers.forEach((layer, i) => {
      Object.assign(params, layerStateToURLParams(`${LAYER_URL_PREFIX}${i + 1}`, layer));
    });
  }
  return params;
}

function getStoredSession(): LayerState[] | null {
  try {
    const raw = localStorage.getItem("shadowforge.session.v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((l: unknown) => {
      const layer = l as LayerState;
      return (
        typeof layer.offsetX === "string" &&
        typeof layer.offsetY === "string" &&
        typeof layer.blur === "string" &&
        typeof layer.spread === "string" &&
        typeof layer.color === "string" &&
        typeof layer.opacity === "string" &&
        typeof layer.inset === "boolean"
      );
    });
  } catch {
    return null;
  }
}

function saveSession(layers: LayerState[]) {
  try {
    localStorage.setItem("shadowforge.session.v1", JSON.stringify(layers));
  } catch {
    // ignore quota/private mode
  }
}

function clampValue(value: string, min: number, max: number): string {
  const n = parseFloat(value);
  if (isNaN(n)) return String(min);
  return String(Math.max(min, Math.min(max, n)));
}

function springValue(current: number, target: number, stiffness = 0.18): number {
  return current + (target - current) * stiffness;
}

// ---------- theme ----------

type Theme = "dark" | "light";

function getStoredTheme(): Theme | null {
  try {
    const t = document.documentElement.dataset.theme;
    if (t === "dark" || t === "light") return t;
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  // -------- init: URL > localStorage > default --------
  const [layers, setLayers] = useState<LayerState[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromURL = parseURLLayers(params);
    if (fromURL.length > 0) return fromURL;
    const fromStorage = getStoredSession();
    if (fromStorage && fromStorage.length > 0) return fromStorage;
    return [DEFAULT_LAYER];
  });

  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [format, setFormat] = useState<Format>("css");
  const [bgId, setBgId] = useState("bench");
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? "dark");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("Copied");

  // undo/redo history (coalesces rapid slider drags)
  const historyRef = useRef<{ past: LayerState[][]; future: LayerState[][] }>({ past: [], future: [] });
  const lastCommitRef = useRef(0);
  const [, forceRender] = useState(0);

  const commit = useCallback((next: (prev: LayerState[]) => LayerState[]) => {
    setLayers((prev) => {
      const now = Date.now();
      if (now - lastCommitRef.current > 400) {
        historyRef.current.past.push(prev);
        if (historyRef.current.past.length > 50) historyRef.current.past.shift();
        historyRef.current.future = [];
      }
      lastCommitRef.current = now;
      return next(prev);
    });
    forceRender((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const prev = h.past[h.past.length - 1];
    setLayers((current) => {
      h.future.push(current);
      if (h.future.length > 50) h.future.shift();
      return prev;
    });
    h.past.pop();
    setActiveLayerIndex((i) => Math.min(i, prev.length - 1));
    lastCommitRef.current = 0;
    forceRender((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const next = h.future[h.future.length - 1];
    setLayers((current) => {
      h.past.push(current);
      return next;
    });
    h.future.pop();
    setActiveLayerIndex((i) => Math.min(i, next.length - 1));
    lastCommitRef.current = 0;
    forceRender((n) => n + 1);
  }, []);

  // Spring-animated display values for the preview (instrument feel)
  type DisplayVals = {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    opacity: number;
    color: string;
    inset: boolean;
  };
  const [displayValues, setDisplayValues] = useState<DisplayVals>({
    offsetX: 0,
    offsetY: 10,
    blur: 15,
    spread: -3,
    opacity: 0.3,
    color: "#000000",
    inset: false,
  });
  const prefersReducedMotionRef = useRef(false);

  const activeLayer = layers[activeLayerIndex] ?? DEFAULT_LAYER;
  const targetVals = useMemo(
    () => ({
      offsetX: parseFloat(activeLayer.offsetX),
      offsetY: parseFloat(activeLayer.offsetY),
      blur: parseFloat(activeLayer.blur),
      spread: parseFloat(activeLayer.spread),
      opacity: parseFloat(activeLayer.opacity),
      color: activeLayer.color,
      inset: activeLayer.inset,
    }),
    [activeLayer]
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  // spring loop
  useEffect(() => {
    if (prefersReducedMotionRef.current) {
      setDisplayValues({ ...targetVals });
      return;
    }
    let rafId: number | null = null;
    let cancelled = false;
    function tick() {
      if (cancelled) return;
      setDisplayValues((prev) => {
        const dv = { ...prev };
        let changed = false;
        const keys: (keyof DisplayVals)[] = ["offsetX", "offsetY", "blur", "spread", "opacity"];
        for (const k of keys) {
          const cur = dv[k] as number;
          const tgt = targetVals[k] as number;
          const next = springValue(cur, tgt);
          if (Math.abs(next - cur) > 0.005) {
            dv[k] = next as never;
            changed = true;
          } else {
            dv[k] = tgt as never;
          }
        }
        dv.color = targetVals.color;
        dv.inset = targetVals.inset;
        if (changed) rafId = requestAnimationFrame(tick);
        return dv;
      });
    }
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [targetVals]);

  // Persist session on any layer change
  useEffect(() => {
    saveSession(layers);
  }, [layers]);

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(layersToURLParams(layers)).forEach(([k, v]) => params.set(k, v));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [layers]);

  // theme application (dataset set pre-paint by inline script; this syncs toggles)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("shadowforge.theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey) {
        const target = event.target as HTMLElement;
        const inField = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
        if (event.key === "c" && !inField) {
          event.preventDefault();
          void copyCurrent();
        } else if (event.key === "r") {
          event.preventDefault();
          resetAll();
        } else if (event.key === "d") {
          event.preventDefault();
          duplicateLayer();
        } else if (event.key === "z" && !event.shiftKey) {
          event.preventDefault();
          undo();
        } else if ((event.key === "z" && event.shiftKey) || event.key === "y") {
          event.preventDefault();
          redo();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  // Output
  const cssOutput = useMemo(() => formatOutput("css", layers), [layers]);
  const formattedOutput = useMemo(() => formatOutput(format, layers), [format, layers]);

  // Preview shadow (spring-animated, active layer only) + flat layers for context
  const previewShadowString = useMemo(() => {
    const dv = displayValues;
    const activeStr = `${dv.inset ? "inset " : ""}${dv.offsetX.toFixed(2)}px ${dv.offsetY.toFixed(2)}px ${dv.blur.toFixed(2)}px ${dv.spread.toFixed(2)}px ${hexToRgba(dv.color, dv.opacity.toFixed(2))}`;
    const rest = layers
      .filter((_, i) => i !== activeLayerIndex)
      .map(layerToShadowString);
    return [...rest, activeStr].join(", ");
  }, [displayValues, layers, activeLayerIndex]);

  function setLayerValue<K extends keyof LayerState>(index: number, key: K, value: LayerState[K]) {
    commit((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  function applyPreset(preset: Preset) {
    commit(() => preset.layers.map((l) => ({ ...l })));
    setActiveLayerIndex(0);
  }

  function addLayer() {
    commit((prev) => [...prev, { ...DEFAULT_LAYER }]);
    setActiveLayerIndex(layers.length);
  }

  function duplicateLayer() {
    commit((prev) => {
      const copy = { ...prev[activeLayerIndex] };
      return [...prev.slice(0, activeLayerIndex + 1), copy, ...prev.slice(activeLayerIndex + 1)];
    });
    setActiveLayerIndex((prev) => prev + 1);
  }

  function removeLayer(index: number) {
    if (layers.length <= 1) return;
    commit((prev) => prev.filter((_, i) => i !== index));
    setActiveLayerIndex((prev) => Math.max(0, Math.min(prev, layers.length - 2)));
  }

  function resetAll() {
    commit(() => [{ ...DEFAULT_LAYER }]);
    setActiveLayerIndex(0);
  }

  function runImport() {
    const parsed = parseBoxShadow(importText);
    if (!parsed) {
      setImportStatus("Couldn't read that. Paste a valid box-shadow declaration, e.g. box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);");
      return;
    }
    commit(() => parsed);
    setActiveLayerIndex(0);
    setImportStatus(`Imported ${parsed.length} layer${parsed.length === 1 ? "" : "s"}.`);
  }

  const showToast = useCallback((text: string) => {
    setMessageText(text);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 1600);
  }, []);

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard blocked — still confirm, textarea fallback lets user copy manually
    }
    showToast(label);
  }

  async function copyCurrent() {
    await copyText(formattedOutput, format === "tw" ? "Tailwind copied!" : `${FORMATS.find((f) => f.id === format)?.label ?? "CSS"} copied!`);
  }

  async function copyLink() {
    await copyText(window.location.href, "Link copied!");
  }

  const active = layers[activeLayerIndex];
  const bg = PREVIEW_BGS.find((b) => b.id === bgId) ?? PREVIEW_BGS[0];

  return (
    <>
      <div className="container">
        <header className="header">
          <div>
            <h1>Shadowforge</h1>
            <p>CSS Shadow Instrument</p>
          </div>
          <div className="header-actions">
            <button
              className="btn ghost small"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo (Ctrl+Z)"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              className="btn ghost small"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo (Ctrl+Shift+Z)"
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
            <button className="btn ghost small" onClick={copyLink} aria-label="Copy shareable link">
              Copy link
            </button>
            <button
              className="btn ghost small"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              aria-pressed={theme === "light"}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        <main className="main-content">
          {/* Preview panel (above on mobile via CSS order) */}
          <section className="panel preview-panel" aria-label="Shadow preview">
            <div className="panel-title-row">
              <h2>Specimen</h2>
              <div className="bg-switch" role="group" aria-label="Preview background">
                {PREVIEW_BGS.map((b) => (
                  <button
                    key={b.id}
                    className={`bg-chip ${bgId === b.id ? "active" : ""}`}
                    onClick={() => setBgId(b.id)}
                    aria-pressed={bgId === b.id}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="preview-area"
              style={bg.css ? { backgroundColor: bg.css } : undefined}
            >
              <div
                className="preview-box"
                style={{ boxShadow: previewShadowString }}
                role="img"
                aria-label={`Shadow preview: ${cssOutput}`}
              >
                Card
              </div>
            </div>

            <div className="readout-row">
              <span className="readout">X: <span className="value">{displayValues.offsetX.toFixed(2)}px</span></span>
              <span className="readout">Y: <span className="value">{displayValues.offsetY.toFixed(2)}px</span></span>
              <span className="readout">Blur: <span className="value">{displayValues.blur.toFixed(2)}px</span></span>
              <span className="readout">Spread: <span className="value">{displayValues.spread.toFixed(2)}px</span></span>
              <span className="readout">Opacity: <span className="value">{Math.round(displayValues.opacity * 100)}%</span></span>
            </div>

            <div className="css-section">
              <div className="panel-title-row">
                <span className="css-label" id="format-label">Output</span>
                <div className="format-tabs" role="group" aria-labelledby="format-label">
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      className={`format-tab ${format === f.id ? "active" : ""}`}
                      onClick={() => setFormat(f.id)}
                      aria-pressed={format === f.id}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="cssOutput"
                readOnly
                value={formattedOutput}
                spellCheck={false}
                aria-label={`Generated shadow as ${format}`}
              />
              <div className="button-group">
                <button
                  className={`btn primary ${showMessage ? "copied" : ""}`}
                  onClick={copyCurrent}
                  aria-label="Copy output to clipboard"
                >
                  {showMessage ? "Copied ✓" : "Copy"}
                </button>
                <button className="btn secondary" onClick={resetAll} aria-label="Reset to defaults">
                  Reset
                </button>
              </div>
            </div>
          </section>

          {/* Controls panel */}
          <section className="panel controls-panel" aria-label="Shadow controls">
            <header className="panel-header">
              <h2>Controls</h2>
              <div className="layer-tabs" role="tablist" aria-label="Shadow layers">
                {layers.map((_, i) => (
                  <span
                    key={i}
                    className={`layer-tab ${i === activeLayerIndex ? "active" : ""}`}
                  >
                    <button
                      onClick={() => setActiveLayerIndex(i)}
                      role="tab"
                      aria-selected={i === activeLayerIndex}
                      className="layer-tab-btn"
                    >
                      Layer {i + 1}
                    </button>
                    {layers.length > 1 && (
                      <button
                        className="layer-close"
                        onClick={() => removeLayer(i)}
                        aria-label={`Remove layer ${i + 1}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {layers.length < 6 && (
                  <button className="layer-tab add-tab" onClick={addLayer} aria-label="Add layer">
                    <span className="layer-tab-btn">+</span>
                  </button>
                )}
              </div>
            </header>

            <div className="control-group">
              <label htmlFor="offsetX" className="control-label">
                Horizontal Offset
              </label>
              <div className="control-row">
                <input
                  type="range"
                  id="offsetX"
                  min={-50}
                  max={50}
                  step={1}
                  value={active.offsetX}
                  onChange={(e) => setLayerValue(activeLayerIndex, "offsetX", e.target.value)}
                  className="slider"
                  aria-label="Horizontal offset"
                />
                <input
                  type="number"
                  id="offsetXNum"
                  min={-50}
                  max={50}
                  step={1}
                  value={active.offsetX}
                  onChange={(e) => setLayerValue(activeLayerIndex, "offsetX", clampValue(e.target.value, -50, 50))}
                  className="number-input"
                  aria-label="Horizontal offset value"
                />
                <span className="unit">px</span>
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="offsetY" className="control-label">
                Vertical Offset
              </label>
              <div className="control-row">
                <input
                  type="range"
                  id="offsetY"
                  min={-50}
                  max={50}
                  step={1}
                  value={active.offsetY}
                  onChange={(e) => setLayerValue(activeLayerIndex, "offsetY", e.target.value)}
                  className="slider"
                  aria-label="Vertical offset"
                />
                <input
                  type="number"
                  id="offsetYNum"
                  min={-50}
                  max={50}
                  step={1}
                  value={active.offsetY}
                  onChange={(e) => setLayerValue(activeLayerIndex, "offsetY", clampValue(e.target.value, -50, 50))}
                  className="number-input"
                  aria-label="Vertical offset value"
                />
                <span className="unit">px</span>
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="blur" className="control-label">
                Blur Radius
              </label>
              <div className="control-row">
                <input
                  type="range"
                  id="blur"
                  min={0}
                  max={100}
                  step={1}
                  value={active.blur}
                  onChange={(e) => setLayerValue(activeLayerIndex, "blur", e.target.value)}
                  className="slider"
                  aria-label="Blur radius"
                />
                <input
                  type="number"
                  id="blurNum"
                  min={0}
                  max={100}
                  step={1}
                  value={active.blur}
                  onChange={(e) => setLayerValue(activeLayerIndex, "blur", clampValue(e.target.value, 0, 100))}
                  className="number-input"
                  aria-label="Blur radius value"
                />
                <span className="unit">px</span>
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="spread" className="control-label">
                Spread Radius
              </label>
              <div className="control-row">
                <input
                  type="range"
                  id="spread"
                  min={-50}
                  max={50}
                  step={1}
                  value={active.spread}
                  onChange={(e) => setLayerValue(activeLayerIndex, "spread", e.target.value)}
                  className="slider"
                  aria-label="Spread radius"
                />
                <input
                  type="number"
                  id="spreadNum"
                  min={-50}
                  max={50}
                  step={1}
                  value={active.spread}
                  onChange={(e) => setLayerValue(activeLayerIndex, "spread", clampValue(e.target.value, -50, 50))}
                  className="number-input"
                  aria-label="Spread radius value"
                />
                <span className="unit">px</span>
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="shadowColor" className="control-label">
                Shadow Color
              </label>
              <div className="color-control">
                <input
                  type="color"
                  id="shadowColor"
                  value={active.color}
                  onChange={(e) => setLayerValue(activeLayerIndex, "color", e.target.value)}
                  aria-label="Shadow color picker"
                />
                <input
                  type="text"
                  id="shadowColorHex"
                  value={active.color}
                  placeholder="#000000"
                  onChange={(e) => {
                    const hex = e.target.value;
                    if (isValidHexColor(hex)) {
                      setLayerValue(activeLayerIndex, "color", hex);
                    }
                  }}
                  className="number-input"
                  aria-label="Shadow color hex"
                />
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="opacity" className="control-label">
                Opacity
              </label>
              <div className="control-row">
                <input
                  type="range"
                  id="opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={active.opacity}
                  onChange={(e) => setLayerValue(activeLayerIndex, "opacity", e.target.value)}
                  className="slider"
                  aria-label="Opacity"
                />
                <input
                  type="number"
                  id="opacityNum"
                  min={0}
                  max={1}
                  step={0.05}
                  value={active.opacity}
                  onChange={(e) => setLayerValue(activeLayerIndex, "opacity", clampValue(e.target.value, 0, 1))}
                  className="number-input"
                  aria-label="Opacity value"
                />
              </div>
            </div>

            <div className="control-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="inset"
                  checked={active.inset}
                  onChange={(e) => setLayerValue(activeLayerIndex, "inset", e.target.checked)}
                  className="checkbox"
                  aria-label="Inner shadow (inset)"
                />
                <span>Inner Shadow (Inset)</span>
              </label>
            </div>

            <div className="control-group presets-row">
              <label className="control-label">Presets</label>
              <div className="presets">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className="preset-btn"
                    onClick={() => applyPreset(preset)}
                    aria-label={`Apply ${preset.name} preset (${preset.layers.length} layer${preset.layers.length === 1 ? "" : "s"})`}
                  >
                    <div
                      className="preset-preview"
                      style={{ boxShadow: shadowStrings(preset.layers) }}
                      aria-hidden="true"
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="layer-actions">
              {layers.length > 1 && (
                <button
                  className="btn secondary small"
                  onClick={duplicateLayer}
                  aria-label="Duplicate active layer"
                >
                  Duplicate Layer
                </button>
              )}
            </div>

            <details className="import-details" open={importOpen} onToggle={(e) => setImportOpen((e.target as HTMLDetailsElement).open)}>
              <summary>Import an existing shadow</summary>
              <p className="import-hint">
                Paste any <code>box-shadow</code> declaration — hex, rgb or hsl, one layer or many.
              </p>
              <textarea
                className="import-input"
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportStatus(null);
                }}
                placeholder="box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 8px rgba(15, 23, 42, 0.1);"
                aria-label="box-shadow CSS to import"
                spellCheck={false}
              />
              <div className="import-row">
                <button className="btn secondary small" onClick={runImport} aria-label="Import pasted shadow">
                  Import
                </button>
                {importStatus && <span className="import-status" role="status">{importStatus}</span>}
              </div>
            </details>
          </section>
        </main>
      </div>

      <div
        className={`toast ${showMessage ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {messageText}
      </div>
    </>
  );
}
