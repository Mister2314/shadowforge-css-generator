import { useEffect, useRef, useState, useMemo } from "react";

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

const PRESETS: Record<string, LayerState> = {
  subtle: {
    offsetX: "0",
    offsetY: "1",
    blur: "3",
    spread: "0",
    color: "#000000",
    opacity: "0.12",
    inset: false,
  },
  medium: {
    offsetX: "0",
    offsetY: "4",
    blur: "6",
    spread: "-1",
    color: "#000000",
    opacity: "0.1",
    inset: false,
  },
  large: {
    offsetX: "0",
    offsetY: "10",
    blur: "15",
    spread: "-3",
    color: "#000000",
    opacity: "0.1",
    inset: false,
  },
  colored: {
    offsetX: "0",
    offsetY: "10",
    blur: "15",
    spread: "-3",
    color: "#667eea",
    opacity: "0.4",
    inset: false,
  },
};

const LAYER_URL_PREFIX = "l";

function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

function hexToRgba(hex: string, opacity: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const red = parseInt(h.substring(0, 2), 16);
  const green = parseInt(h.substring(2, 4), 16);
  const blue = parseInt(h.substring(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function layerToShadowString(layer: LayerState): string {
  return `${layer.inset ? "inset " : ""}${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${hexToRgba(layer.color, layer.opacity)}`;
}

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

  if ([x, y, b, s, c, o].some((v) => v === null) || x === null || y === null || b === null || s === null || c === null || o === null) return null;

  const color = `#${c}`;
  if (!isValidHexColor(color)) return null;

  return {
    offsetX: x,
    offsetY: y,
    blur: b,
    spread: s,
    color,
    opacity: o,
    inset: i === "1",
  };
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

function applyPresetToLayer(layer: LayerState, presetName: string): LayerState {
  const preset = PRESETS[presetName];
  return preset ? { ...preset } : layer;
}

function clampValue(value: string, min: number, max: number): string {
  const n = parseFloat(value);
  if (isNaN(n)) return String(min);
  return String(Math.max(min, Math.min(max, n)));
}

function springValue(current: number, target: number, stiffness = 0.18): number {
  return current + (target - current) * stiffness;
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
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("CSS copied!");

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

  // sync displayValues to active layer on change
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
        const keys: (keyof DisplayVals)[] = [
          "offsetX",
          "offsetY",
          "blur",
          "spread",
          "opacity",
        ];
        for (const k of keys) {
          const numericKeys = ["offsetX", "offsetY", "blur", "spread", "opacity"] as const;
          type NumericKey = (typeof numericKeys)[number];
          const nk = k as NumericKey;
          const cur = dv[nk] as number;
          const tgt = targetVals[nk] as number;
          const next = springValue(cur, tgt);
          if (Math.abs(next - cur) > 0.005) {
            dv[nk] = next;
            changed = true;
          } else {
            dv[nk] = tgt;
          }
        }
        // color and inset snap immediately
        dv.color = targetVals.color;
        dv.inset = targetVals.inset;
        if (changed) {
          rafId = requestAnimationFrame(tick);
        }
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
    const urlParams = layersToURLParams(layers);
    Object.entries(urlParams).forEach(([k, v]) => params.set(k, v));
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newURL);
  }, [layers]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "c") {
          const target = event.target as HTMLElement;
          if (
            target.tagName !== "INPUT" &&
            target.tagName !== "TEXTAREA"
          ) {
            event.preventDefault();
            void copyCSS();
          }
        } else if (event.key === "r") {
          event.preventDefault();
          setLayers([DEFAULT_LAYER]);
          setActiveLayerIndex(0);
        } else if (event.key === "d") {
          // duplicate layer
          event.preventDefault();
          duplicateLayer();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // CSS output (INVARIANT: byte-identical for single layer)
  const cssOutput = useMemo(() => {
    const shadowStrings = layers.map(layerToShadowString);
    return `box-shadow: ${shadowStrings.join(", ")};`;
  }, [layers]);

  // Preview shadow string (from spring-animated display values for the active layer)
  const previewShadowString = useMemo(() => {
    const dv = displayValues;
    return `${dv.inset ? "inset " : ""}${dv.offsetX.toFixed(2)}px ${dv.offsetY.toFixed(2)}px ${dv.blur.toFixed(2)}px ${dv.spread.toFixed(2)}px ${hexToRgba(dv.color, dv.opacity.toFixed(2))}`;
  }, [displayValues]);

  function setLayerValue<K extends keyof LayerState>(
    index: number,
    key: K,
    value: LayerState[K]
  ) {
    setLayers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  function applyPreset(presetName: string) {
    setLayers((prev) => {
      const next = [...prev];
      next[activeLayerIndex] = applyPresetToLayer(next[activeLayerIndex], presetName);
      return next;
    });
  }

  function addLayer() {
    setLayers((prev) => [...prev, { ...DEFAULT_LAYER }]);
    setActiveLayerIndex((prev) => prev + 1);
  }

  function duplicateLayer() {
    setLayers((prev) => {
      const copy = { ...prev[activeLayerIndex] };
      const next = [...prev.slice(0, activeLayerIndex + 1), copy, ...prev.slice(activeLayerIndex + 1)];
      return next;
    });
    setActiveLayerIndex((prev) => prev + 1);
  }

  function removeLayer(index: number) {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((_, i) => i !== index));
    setActiveLayerIndex((prev) => Math.min(prev, layers.length - 2));
  }

  function moveLayer(from: number, to: number) {
    setLayers((prev) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
    setActiveLayerIndex(to);
  }
  void moveLayer;

  async function copyCSS() {
    try {
      await navigator.clipboard.writeText(cssOutput);
      setMessageText("CSS copied!");
    } catch {
      setMessageText("CSS copied (fallback)!");
    }
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 1600);
  }

  function resetAll() {
    setLayers([DEFAULT_LAYER]);
    setActiveLayerIndex(0);
  }

  const active = layers[activeLayerIndex];

  return (
    <>
      <div className="container">
        <header className="header">
          <h1>Shadowforge</h1>
          <p>CSS Shadow Instrument</p>
        </header>

        <main className="main-content">
          {/* Preview panel (above on mobile via CSS order) */}
          <section className="panel preview-panel" aria-label="Shadow preview">
            <h2>Specimen</h2>
            <div className="preview-area">
              <div
                className="preview-box"
                style={{ boxShadow: previewShadowString }}
                role="img"
                aria-label={`Shadow preview: ${cssOutput}`}
              >
                Preview
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
              <label htmlFor="cssOutput" className="css-label">
                Generated CSS
              </label>
              <textarea
                id="cssOutput"
                readOnly
                value={cssOutput}
                spellCheck={false}
                aria-label="Generated box-shadow CSS"
              />
              <div className="button-group">
                <button
                  className={`btn primary ${showMessage ? "copied" : ""}`}
                  onClick={copyCSS}
                  aria-label="Copy CSS to clipboard"
                >
                  {showMessage ? "Copied ✓" : "Copy CSS"}
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
                    +
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
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    className="preset-btn"
                    onClick={() => applyPreset(name)}
                    aria-label={`Apply ${name} preset`}
                  >
                    <div className={`preset-preview ${name}-shadow`} />
                    <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
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