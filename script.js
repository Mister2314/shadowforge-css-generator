const controls = {
  offsetX: document.getElementById("offsetX"),
  offsetXNum: document.getElementById("offsetXNum"),
  offsetY: document.getElementById("offsetY"),
  offsetYNum: document.getElementById("offsetYNum"),
  blur: document.getElementById("blur"),
  blurNum: document.getElementById("blurNum"),
  spread: document.getElementById("spread"),
  spreadNum: document.getElementById("spreadNum"),
  shadowColor: document.getElementById("shadowColor"),
  shadowColorHex: document.getElementById("shadowColorHex"),
  opacity: document.getElementById("opacity"),
  opacityNum: document.getElementById("opacityNum"),
  inset: document.getElementById("inset"),
};

const previewBox = document.getElementById("previewBox");
const cssOutput = document.getElementById("cssOutput");

function syncInputs(rangeId, numberId) {
  controls[rangeId].addEventListener("input", function () {
    controls[numberId].value = controls[rangeId].value;
    updateShadow();
  });

  controls[numberId].addEventListener("input", function () {
    controls[rangeId].value = controls[numberId].value;
    updateShadow();
  });
}

syncInputs("offsetX", "offsetXNum");
syncInputs("offsetY", "offsetYNum");
syncInputs("blur", "blurNum");
syncInputs("spread", "spreadNum");
syncInputs("opacity", "opacityNum");

controls.shadowColor.addEventListener("input", function () {
  controls.shadowColorHex.value = controls.shadowColor.value;
  updateShadow();
});

controls.shadowColorHex.addEventListener("input", function () {
  if (isValidHexColor(controls.shadowColorHex.value)) {
    controls.shadowColor.value = controls.shadowColorHex.value;
    updateShadow();
  }
});
controls.inset.addEventListener("change", updateShadow);

function isValidHexColor(hex) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}
function hexToRgba(hex, opacity) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const red = parseInt(hex.substring(0, 2), 16);
  const green = parseInt(hex.substring(2, 4), 16);
  const blue = parseInt(hex.substring(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function updateShadow() {
  const offsetX = controls.offsetX.value;
  const offsetY = controls.offsetY.value;
  const blur = controls.blur.value;
  const spread = controls.spread.value;
  const color = controls.shadowColor.value;
  const opacity = controls.opacity.value;
  const isInset = controls.inset.checked;
  const rgbaColor = hexToRgba(color, opacity);
  const insetText = isInset ? "inset " : "";
  const shadowValue = `${insetText}${offsetX}px ${offsetY}px ${blur}px ${spread}px ${rgbaColor}`;
  previewBox.style.boxShadow = shadowValue;
  cssOutput.value = `box-shadow: ${shadowValue};`;
}

async function copyCSS() {
  try {
    await navigator.clipboard.writeText(cssOutput.value);
    showSuccessMessage();
  } catch (error) {
    cssOutput.select();
    cssOutput.setSelectionRange(0, 99999);
    // document.execCommand('copy');
    showSuccessMessage();
  }
}
function showSuccessMessage() {
  const message = document.getElementById("successMessage");
  message.classList.add("show");
  setTimeout(function () {
    message.classList.remove("show");
  }, 3000);
}

function resetShadow() {
  controls.offsetX.value = controls.offsetXNum.value = 0;
  controls.offsetY.value = controls.offsetYNum.value = 10;
  controls.blur.value = controls.blurNum.value = 15;
  controls.spread.value = controls.spreadNum.value = -3;
  controls.shadowColor.value = controls.shadowColorHex.value = "#000000";
  controls.opacity.value = controls.opacityNum.value = 0.3;
  controls.inset.checked = false;
  updateShadow();
}

const presets = {
  subtle: {
    offsetX: 0,
    offsetY: 1,
    blur: 3,
    spread: 0,
    color: "#000000",
    opacity: 0.12,
    inset: false,
  },
  medium: {
    offsetX: 0,
    offsetY: 4,
    blur: 6,
    spread: -1,
    color: "#000000",
    opacity: 0.1,
    inset: false,
  },
  large: {
    offsetX: 0,
    offsetY: 10,
    blur: 15,
    spread: -3,
    color: "#000000",
    opacity: 0.1,
    inset: false,
  },
  colored: {
    offsetX: 0,
    offsetY: 10,
    blur: 15,
    spread: -3,
    color: "#667eea",
    opacity: 0.4,
    inset: false,
  },
};

function applyPreset(presetName) {
  const preset = presets[presetName];
  if (preset) {
    controls.offsetX.value = controls.offsetXNum.value = preset.offsetX;
    controls.offsetY.value = controls.offsetYNum.value = preset.offsetY;
    controls.blur.value = controls.blurNum.value = preset.blur;
    controls.spread.value = controls.spreadNum.value = preset.spread;
    controls.shadowColor.value = controls.shadowColorHex.value = preset.color;
    controls.opacity.value = controls.opacityNum.value = preset.opacity;
    controls.inset.checked = preset.inset;
    updateShadow();
  }
}

document.addEventListener("keydown", function (event) {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case "c":
        if (
          event.target.tagName !== "INPUT" &&
          event.target.tagName !== "TEXTAREA"
        ) {
          event.preventDefault();
          copyCSS();
        }
        break;
      case "r":
        event.preventDefault();
        resetShadow();
        break;
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  updateShadow();
  console.log("Shadow Generator loaded successfully!");
});
