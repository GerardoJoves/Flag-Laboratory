document.body.innerHTML = `
  <style>
@font-face {
  font-family: 'Catrinity';
  src: url('./CatrinityFlags.otf') format('opentype');
}
    body {
      font-family: system-ui, sans-serif;
      padding: 40px;
      background: #f4f4f9;
    }
    .container {
      max-width: 800px;
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    input {
      font-size: 18px;
      padding: 10px;
      width: 100%;
      box-sizing: border-box;
      margin-top: 8px;
      margin-bottom: 20px;
    }
    .flag-display {
      font-family: 'Catrinity', 'Catrinity Flags', sans-serif;
      font-size: 140px;
      line-height: 1;
      text-align: center;
      min-height: 220px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 30px;
      white-space: pre;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flag-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
      position: relative;
    }
    .flag-node {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1em;
      height: 1em;
      transform-origin: 50% 50%;
      transition: transform 0.2s ease;
      position: absolute;
      top: 0;
      left: 0;
    }
    .hint {
      font-size: 13px;
      color: #666;
      margin-bottom: 12px;
      line-height: 1.5;
    }
  </style>
  <div class="container">
    <h2>Catrinity Layering & Transform Flag Parser</h2>
    <div class="hint">
      • <b>Spaces in code input:</b> Token separator (0px gap between base flags)<br>
      • <b>Layer Command:</b> <code>!layer</code> (stacks next token on top of current flag)<br>
      • <b>Scale Commands:</b> <code>!s25</code>, <code>!s50</code>, <code>!s75</code>, <code>!s150</code>, <code>!s200</code><br>
      • <b>Rotation/Flip:</b> <code>!r90</code>, <code>!r180</code>, <code>!r270</code>, <code>!fh</code>, <code>!fv</code>, <code>!reset</code>
    </div>
    <input type="text" id="code" placeholder="e.g., YU !layer !s50 !r90 CS" value="YU !layer !s50 CS" autofocus>
    <div class="flag-display" id="output"></div>
  </div>
`;

function processTokenToText(token) {
  if (!token) return '';

  // 1. LOWERCASE ONLY: ISO 3166-2 Subdivision Tag Sequences
  if (/^[a-z0-9]+$/.test(token)) {
    let sequence = '\u{1F3F4}';
    for (const char of token) {
      sequence += String.fromCodePoint(0xE0000 + char.charCodeAt(0));
    }
    sequence += '\u{E007F}';
    return sequence;
  }

  // 2. UPPERCASE & HEX: National Flags and Codepoints
  const hexClean = token.startsWith('#') ? token.slice(1) : token;

  // 2a. Hex / PUA Codepoints (e.g. #0020, 0020, 1F3F4, E000)
  if (/^[0-9A-F]{4,6}$/.test(hexClean) && !(/^[A-Z]{2}$/.test(token) && !token.startsWith('#'))) {
    const codePoint = parseInt(hexClean, 16);
    return String.fromCodePoint(codePoint);
  }

  // 2b. ISO 3166-1 Country Flags (2 uppercase letters)
  if (token.length === 2 && /^[A-Z]{2}$/.test(token)) {
    const base = 0x1F1E6;
    const char1 = token.charCodeAt(0) - 65 + base;
    const char2 = token.charCodeAt(1) - 65 + base;
    return String.fromCodePoint(char1, char2);
  }

  return '';
}

function updateFlag() {
  const inputVal = document.getElementById('code').value.trim();
  const outputEl = document.getElementById('output');
  outputEl.innerHTML = '';

  if (!inputVal) return;

  const tokens = inputVal.split(/\s+/);
  
  let currentWrapper = null;
  let isLayering = false;

  // Transform state tracker for active element
  let rotation = 0;
  let scale = 1.0;
  let flipH = false;
  let flipV = false;

  function resetTransforms() {
    rotation = 0;
    scale = 1.0;
    flipH = false;
    flipV = false;
  }

  for (const token of tokens) {
    if (token.startsWith('!')) {
      const cmd = token.toLowerCase();

      if (cmd === '!layer' || cmd === '!stack') {
        isLayering = true;
        resetTransforms(); // Fresh transform state for the incoming layer
      } else if (cmd === '!r90') {
        rotation = (rotation + 90) % 360;
      } else if (cmd === '!r180') {
        rotation = (rotation + 180) % 360;
      } else if (cmd === '!r270') {
        rotation = (rotation + 270) % 360;
      } else if (cmd === '!fh') {
        flipH = !flipH;
      } else if (cmd === '!fv') {
        flipV = !flipV;
      } else if (cmd.startsWith('!s')) {
        const percent = parseFloat(cmd.slice(2));
        if (!isNaN(percent)) scale = percent / 100;
      } else if (cmd === '!reset') {
        resetTransforms();
        isLayering = false;
      }
      continue;
    }

    const textContent = processTokenToText(token);
    if (!textContent) continue;

    // Create container if starting a new base flag token
    if (!isLayering || !currentWrapper) {
      currentWrapper = document.createElement('span');
      currentWrapper.className = 'flag-wrapper';
      outputEl.appendChild(currentWrapper);
    }

    // Create layer node inside current wrapper
    const span = document.createElement('span');
    span.className = 'flag-node';
    span.textContent = textContent;

    // Assemble dynamic transform stack
    const transforms = [];
    if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
    if (scale !== 1.0) transforms.push(`scale(${scale})`);
    if (flipH || flipV) transforms.push(`scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`);

    if (transforms.length > 0) {
      span.style.transform = transforms.join(' ');
    }

    currentWrapper.appendChild(span);

    // Reset state after rendering token layer
    resetTransforms();
    isLayering = false;
  }
}

const inputEl = document.getElementById('code');
inputEl.addEventListener('input', updateFlag);
updateFlag();
