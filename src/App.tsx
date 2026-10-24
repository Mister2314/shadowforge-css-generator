import { useEffect, useState } from "react";

type ShadowState = {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
  opacity: string;
  inset: boolean;
};

const DEFAULT_STATE: ShadowState = {
  offsetX: "0",
  offsetY: "10",
  blur: "15",
  spread: "-3",
  color: "#000000",
  opacity: "0.3",
  inset: false,
};

const presets: Record<string, ShadowState> = {
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

export default function App() {
  const [state, setState] = useState<ShadowState>(DEFAULT_STATE);
  const [showMessage, setShowMessage] = useState(false);

  const shadowValue = `${state.inset ? "inset " : ""}${state.offsetX}px ${state.offsetY}px ${state.blur}px ${state.spread}px ${hexToRgba(state.color, state.opacity)}`;
  const cssOutput = `box-shadow: ${shadowValue};`;

  function set<K extends keyof ShadowState>(key: K, value: ShadowState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function copyCSS() {
    try {
      await navigator.clipboard.writeText(cssOutput);
      showSuccessMessage();
    } catch {
      showSuccessMessage();
    }
  }

  function showSuccessMessage() {
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 3000);
  }

  function applyPreset(name: string) {
    const preset = presets[name];
    if (preset) {
      setState(preset);
    }
  }

  useEffect(() => {
    console.log("Shadow Generator loaded successfully!");

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
          setState(DEFAULT_STATE);
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="container">
        <div className="header">
          <h1>Shadowforge CSS Generator</h1>
          <p>Create beautiful CSS shadows easily</p>
        </div>

        <div className="main-content">
          <div className="panel">
            <h2>Shadow Controls</h2>
            <div className="control-group">
              <label htmlFor="offsetX">Horizontal Offset (X)</label>
              <div className="control-row">
                <input
                  type="range"
                  id="offsetX"
                  min={-50}
                  max={50}
                  value={state.offsetX}
                  onChange={(e) => set("offsetX", e.target.value)}
                />
                <input
                  type="number"
                  id="offsetXNum"
                  min={-50}
                  max={50}
                  value={state.offsetX}
                  onChange={(e) => set("offsetX", e.target.value)}
                />
                <span>px</span>
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="offsetY">Vertical Offset (Y)</label>
              <div className="control-row">
                <input
                  type="range"
                  id="offsetY"
                  min={-50}
                  max={50}
                  value={state.offsetY}
                  onChange={(e) => set("offsetY", e.target.value)}
                />
                <input
                  type="number"
                  id="offsetYNum"
                  min={-50}
                  max={50}
                  value={state.offsetY}
                  onChange={(e) => set("offsetY", e.target.value)}
                />
                <span>px</span>
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="blur">Blur Radius</label>
              <div className="control-row">
                <input
                  type="range"
                  id="blur"
                  min={0}
                  max={50}
                  value={state.blur}
                  onChange={(e) => set("blur", e.target.value)}
                />
                <input
                  type="number"
                  id="blurNum"
                  min={0}
                  max={50}
                  value={state.blur}
                  onChange={(e) => set("blur", e.target.value)}
                />
                <span>px</span>
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="spread">Spread Radius</label>
              <div className="control-row">
                <input
                  type="range"
                  id="spread"
                  min={-25}
                  max={25}
                  value={state.spread}
                  onChange={(e) => set("spread", e.target.value)}
                />
                <input
                  type="number"
                  id="spreadNum"
                  min={-25}
                  max={25}
                  value={state.spread}
                  onChange={(e) => set("spread", e.target.value)}
                />
                <span>px</span>
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="shadowColor">Shadow Color</label>
              <div className="color-control">
                <input
                  type="color"
                  id="shadowColor"
                  value={state.color}
                  onChange={(e) => set("color", e.target.value)}
                />
                <input
                  type="text"
                  id="shadowColorHex"
                  value={state.color}
                  placeholder="#000000"
                  onChange={(e) => {
                    const hex = e.target.value;
                    if (isValidHexColor(hex)) {
                      set("color", hex);
                    }
                  }}
                />
              </div>
            </div>

            <div className="control-group">
              <label htmlFor="opacity">Opacity</label>
              <div className="control-row">
                <input
                  type="range"
                  id="opacity"
                  min={0}
                  max={1}
                  step={0.1}
                  value={state.opacity}
                  onChange={(e) => set("opacity", e.target.value)}
                />
                <input
                  type="number"
                  id="opacityNum"
                  min={0}
                  max={1}
                  step={0.1}
                  value={state.opacity}
                  onChange={(e) => set("opacity", e.target.value)}
                />
              </div>
            </div>

            <div className="control-group">
              <div className="checkbox-control">
                <input
                  type="checkbox"
                  id="inset"
                  checked={state.inset}
                  onChange={(e) => set("inset", e.target.checked)}
                />
                <label htmlFor="inset">Inner Shadow (Inset)</label>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Preview</h2>

            <div className="preview-area">
              <div className="preview-box" style={{ boxShadow: shadowValue }}>
                Preview Box
              </div>
            </div>

            <div className="css-section">
              <label htmlFor="cssOutput">Generated CSS Code:</label>
              <textarea id="cssOutput" readOnly value={cssOutput}></textarea>

              <div className="button-group">
                <button className="btn primary" onClick={copyCSS}>
                  Copy CSS
                </button>
                <button
                  className="btn secondary"
                  onClick={() => setState(DEFAULT_STATE)}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="panel presets-section">
          <h2>Quick Presets</h2>
          <div className="presets">
            <button className="preset-btn" onClick={() => applyPreset("subtle")}>
              <div className="preset-preview subtle-shadow"></div>
              <span>Subtle</span>
            </button>
            <button className="preset-btn" onClick={() => applyPreset("medium")}>
              <div className="preset-preview medium-shadow"></div>
              <span>Medium</span>
            </button>
            <button className="preset-btn" onClick={() => applyPreset("large")}>
              <div className="preset-preview large-shadow"></div>
              <span>Large</span>
            </button>
            <button className="preset-btn" onClick={() => applyPreset("colored")}>
              <div className="preset-preview colored-shadow"></div>
              <span>Colored</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={showMessage ? "success-message show" : "success-message"}
      >
        ✅ CSS copied to clipboard!
      </div>
    </>
  );
}
