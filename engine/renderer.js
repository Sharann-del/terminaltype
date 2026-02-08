'use strict';

const DEFAULT_HEX_THEME = {
  bg: '#1a1b26',
  main: '#9ece6a',
  sub: '#5c5c70',
  text: '#cccccc',
  error: '#e03e3e',
  errorExtra: '#ff6b6b',
  caret: '#ffffff',
  typed: '#9ece6a',
};

function hexToAnsi(hex, isBg = false) {
  if (!hex || typeof hex !== 'string') return '';
  const m = hex.match(/^#?([a-fA-F0-9]{6})$/);
  if (!m) return '';
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  const prefix = isBg ? 48 : 38;
  return `\x1b[${prefix};2;${r};${g};${b}m`;
}

function getResolvedTheme(hexTheme) {
  const h = hexTheme || DEFAULT_HEX_THEME;
  return {
    text: hexToAnsi(h.text),
    correct: hexToAnsi(h.typed),
    incorrect: hexToAnsi(h.error),
    dim: hexToAnsi(h.sub),
    caret: '\x1b[4m' + hexToAnsi(h.caret),
    accent: hexToAnsi(h.main),
    reset: '\x1b[0m',
    bg: '', // themes only change text colors; background is never applied
  };
}

const THEME = getResolvedTheme(DEFAULT_HEX_THEME);


const ASCII_ART_TITLE = [
  '████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗     ████████╗██╗   ██╗██████╗ ███████╗',
  '╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║     ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝',
  '   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║        ██║    ╚████╔╝ ██████╔╝█████╗  ',
  '   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║        ██║     ╚██╔╝  ██╔═══╝ ██╔══╝  ',
  '   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗   ██║      ██║   ██║     ███████╗',
  '   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝   ╚═╝      ╚═╝   ╚═╝     ╚══════╝',
];

const BOX = {
  tl: '┌',
  tr: '┐',
  bl: '└',
  br: '┘',
  h: '─',
  v: '│',
};

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

/** Uniform content width for all box screens (content only; box adds 2 for borders). */
function getUniformContentWidth(cols) {
  const c = cols || 80;
  return c >= 84 ? 80 : Math.max(72, c - 4);
}

const INNER_PADDING = 2;

function boxAround(contentLines, theme, minWidth = 0) {
  const width = Math.max(minWidth, ...contentLines.map((l) => visibleLength(l)));
  const border = BOX.tl + BOX.h.repeat(width + 2) + BOX.tr;
  const out = [theme.dim + border + theme.reset];
  for (const line of contentLines) {
    const pad = width - visibleLength(line);
    out.push(
      theme.dim + BOX.v + theme.reset + ' ' + line + ' '.repeat(Math.max(0, pad)) + ' ' + theme.dim + BOX.v + theme.reset
    );
  }
  out.push(theme.dim + BOX.bl + BOX.h.repeat(width + 2) + BOX.br + theme.reset);
  return out;
}

function boxAroundWithPadding(contentLines, theme, totalBoxWidth, innerPadding = INNER_PADDING) {
  const innerWidth = totalBoxWidth - 2 - 2 * innerPadding;
  const border = BOX.tl + BOX.h.repeat(totalBoxWidth - 2) + BOX.tr;
  const out = [theme.dim + border + theme.reset];
  for (const line of contentLines) {
    const pad = innerWidth - visibleLength(line);
    out.push(
      theme.dim +
        BOX.v +
        theme.reset +
        ' '.repeat(innerPadding) +
        line +
        ' '.repeat(Math.max(0, pad)) +
        ' '.repeat(innerPadding) +
        theme.dim +
        BOX.v +
        theme.reset
    );
  }
  out.push(theme.dim + BOX.bl + BOX.h.repeat(totalBoxWidth - 2) + BOX.br + theme.reset);
  return out;
}

function hideCursor() {
  process.stdout.write('\x1b[?25l');
}

function showCursor() {
  process.stdout.write('\x1b[?25h');
}

function renderWordWithState(word, typingState, lineIdx, wordIndex, theme, blindMode = false, caretOptions = null) {
  const { correct, incorrect, dim, caret, reset } = theme;
  let out = '';
  const isCurrent = typingState.isCurrentWord(lineIdx, wordIndex);
  const isComplete = typingState.isWordComplete(lineIdx, wordIndex);
  const showError = !blindMode;

  const isPaceCaretPos = (i) => {
    if (!caretOptions || !caretOptions.paceCaretPosition) return false;
    const p = caretOptions.paceCaretPosition;
    return p.lineIdx === lineIdx && p.wordIdx === wordIndex && p.charIdx === i;
  };
  const isPaceCaretAfterWord = () => {
    if (!caretOptions || !caretOptions.paceCaretPosition) return false;
    const p = caretOptions.paceCaretPosition;
    return p.lineIdx === lineIdx && p.wordIdx === wordIndex && p.charIdx === word.length;
  };

  for (let i = 0; i < word.length; i++) {
    const ch = word[i] || ' ';
    if (isPaceCaretPos(i)) {
      const style = caretOptions.paceCaretStyle || dim;
      const paceChar = caretOptions.paceCaretChar;
      if (paceChar && paceChar !== ' ') {
        out += style + paceChar + reset + dim + ch + reset;
      } else {
        out += style + ch + reset;
      }
    } else {
      const status = typingState.getCharStatus(lineIdx, wordIndex, i);
      if (status === 'caret') {
        const style = (caretOptions && caretOptions.mainCaretStyle) || caret;
        const caretChar = (caretOptions && caretOptions.mainCaretChar) || null;
        if (caretChar === 'underline') {
          out += ANSI_UNDERLINE + style + ch + reset;
        } else if (caretChar && caretChar !== ' ') {
          out += style + caretChar + reset + dim + ch + reset;
        } else {
          out += style + ch + reset;
        }
      } else if (status === 'correct') {
        out += isComplete ? dim + correct + ch + reset : correct + ch + reset;
      } else if (status === 'incorrect') {
        if (showError) {
          out += isComplete ? dim + incorrect + ch + reset : incorrect + ch + reset;
        } else {
          out += isComplete ? dim + correct + ch + reset : correct + ch + reset;
        }
      } else {
        out += isCurrent ? theme.text + ch + reset : dim + ch + reset;
      }
    }
  }
  if (isPaceCaretAfterWord()) {
    const style = caretOptions.paceCaretStyle || dim;
    const paceChar = caretOptions.paceCaretChar;
    if (paceChar && paceChar !== ' ') {
      out += style + paceChar + reset + dim + ' ' + reset;
    } else {
      out += style + ' ' + reset;
    }
  } else if (isCurrent && typingState.getCharStatus(lineIdx, wordIndex, word.length) === 'caret') {
    const style = (caretOptions && caretOptions.mainCaretStyle) || caret;
    const caretChar = (caretOptions && caretOptions.mainCaretChar) || null;
    if (caretChar === 'underline') {
      out += ANSI_UNDERLINE + style + ' ' + reset;
    } else if (caretChar && caretChar !== ' ') {
      out += style + caretChar + reset + dim + ' ' + reset;
    } else {
      out += style + ' ' + reset;
    }
  }
  return out;
}

function renderLine(lineWords, lineIdx, typingState, theme, blindMode = false, caretOptions = null) {
  return lineWords
    .map((word, wordIndex) => renderWordWithState(word, typingState, lineIdx, wordIndex, theme, blindMode, caretOptions))
    .join(' ');
}

function renderTapeLine(typingState, theme, blindMode, scrollOffset, viewportWidth, mainCaretCharIndex, paceCaretCharIndex, caretConfig) {
  const { correct, incorrect, dim, caret, reset, text } = theme;
  const showError = !blindMode;
  const start = Math.max(0, Math.floor(scrollOffset));
  const tapeLength = typingState.getTapeLength();
  const mainCaretChar = (caretConfig && caretConfig.caretStyle && caretConfig.caretStyle !== 'off') ? caretConfig.caretStyle : null;
  const paceCaretChar = (caretConfig && caretConfig.paceCaretStyle && caretConfig.paceCaretStyle !== 'off') ? caretConfig.paceCaretStyle : null;
  let out = '';
  for (let localPos = 0; localPos < viewportWidth; localPos++) {
    const tapeCharIndex = start + localPos;
    const isMainCaret = mainCaretCharIndex === tapeCharIndex;
    const isPaceCaret = paceCaretCharIndex != null && paceCaretCharIndex !== mainCaretCharIndex && paceCaretCharIndex === tapeCharIndex;
    if (tapeCharIndex < tapeLength) {
      const { char: ch, status } = typingState.getTapeCharAt(tapeCharIndex);
      const charToShow = ch || ' ';
      if (isMainCaret) {
        if (mainCaretChar === 'underline') {
          out += ANSI_UNDERLINE + caret + charToShow + reset;
        } else if (mainCaretChar) {
          out += caret + mainCaretChar + reset + dim + charToShow + reset;
        } else {
          out += caret + charToShow + reset;
        }
      } else if (isPaceCaret) {
        if (paceCaretChar) {
          out += dim + caret + paceCaretChar + reset + dim + charToShow + reset;
        } else {
          out += dim + caret + charToShow + reset;
        }
      } else if (status === 'caret') {
        out += caret + charToShow + reset;
      } else if (status === 'correct') {
        out += correct + charToShow + reset;
      } else if (status === 'incorrect') {
        out += showError ? incorrect + charToShow + reset : correct + charToShow + reset;
      } else {
        out += text + charToShow + reset;
      }
    } else {
      if (isMainCaret) {
        if (mainCaretChar === 'underline') {
          out += ANSI_UNDERLINE + caret + ' ' + reset;
        } else if (mainCaretChar) {
          out += caret + mainCaretChar + reset + dim + ' ' + reset;
        } else {
          out += caret + ' ' + reset;
        }
      } else if (isPaceCaret) {
        if (paceCaretChar) {
          out += dim + caret + paceCaretChar + reset + dim + ' ' + reset;
        } else {
          out += dim + caret + ' ' + reset;
        }
      } else {
        out += dim + ' ' + reset;
      }
    }
  }
  return out;
}

function buildProgressBar(progress, width, theme) {
  const filled = Math.round(progress * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return theme.dim + bar + theme.reset;
}

function formatTimeForDisplay(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
}

function statColorWpm(wpm, theme) {
  if (wpm >= 40) return theme.correct;
  if (wpm > 0 && wpm < 20) return theme.incorrect;
  return theme.dim;
}

function statColorAccuracy(accuracyPercent, theme) {
  const p = parseFloat(accuracyPercent);
  if (p >= 95) return theme.correct;
  if (p < 90) return theme.incorrect;
  return theme.dim;
}

function buildLiveStatsContent(options) {
  const { snapshot, progress, wordLimit, typingState, theme, appearanceConfig, boxContentWidth } = options;
  const sep = theme.dim + '  ·  ' + theme.reset;
  const parts = [];

  const wpmColor = statColorWpm(snapshot.wpm, theme);
  const accColor = statColorAccuracy(snapshot.accuracy, theme);
  const burstWpm = snapshot.burstWpm != null ? snapshot.burstWpm : 0;
  const burstColor = statColorWpm(burstWpm, theme);

  if (appearanceConfig.liveSpeed && appearanceConfig.liveSpeed !== 'off') {
    const wpmStr = String(snapshot.wpm).padStart(3);
    if (appearanceConfig.liveSpeed === 'text') {
      parts.push(wpmColor + `wpm ${wpmStr}` + theme.reset);
    } else {
      parts.push(wpmColor + wpmStr + theme.reset);
    }
  }
  if (appearanceConfig.liveAccuracy && appearanceConfig.liveAccuracy !== 'off') {
    const accStr = snapshot.accuracy + '%';
    if (appearanceConfig.liveAccuracy === 'text') {
      parts.push(accColor + `acc ${accStr}` + theme.reset);
    } else {
      parts.push(accColor + accStr + theme.reset);
    }
  }
  if (appearanceConfig.liveBurst && appearanceConfig.liveBurst !== 'off') {
    if (appearanceConfig.liveBurst === 'text') {
      parts.push(burstColor + `burst ${String(burstWpm).padStart(3)}` + theme.reset);
    } else {
      parts.push(burstColor + String(burstWpm).padStart(3) + theme.reset);
    }
  }

  const headerLine = parts.length ? parts.join(sep) : '';

  const statsContent = [];
  const progressBarWidth = typeof boxContentWidth === 'number' && boxContentWidth > 0 ? boxContentWidth : 40;
  const progressPct = Math.round(progress * 100);
  const showProgressBar = appearanceConfig.liveProgressBar && appearanceConfig.liveProgressBar !== 'off';
  if (headerLine) statsContent.push(headerLine);
  if (showProgressBar) {
    if (appearanceConfig.liveProgressBar === 'bar') {
      if (statsContent.length) statsContent.push(' ');
      statsContent.push(buildProgressBar(progress, progressBarWidth, theme));
    } else if (appearanceConfig.liveProgressBar === 'text') {
      if (statsContent.length) statsContent.push(' ');
      statsContent.push(theme.dim + `Progress: ${progressPct}%` + theme.reset);
    } else {
      if (statsContent.length) statsContent.push(' ');
      const miniWidth = Math.min(20, progressBarWidth);
      statsContent.push(buildProgressBar(progress, miniWidth, theme) + ' ' + theme.dim + progressPct + '%' + theme.reset);
    }
  }
  return { statsContent, progressWidth: progressBarWidth };
}

function renderTestScreen(options) {
  const {
    typingState,
    stats,
    timeLimitSeconds,
    wordLimit,
    caretPhase,
    appearanceConfig = {},
    themeConfig,
    behaviorConfig = {},
    caretConfig = {},
    keymapConfig = {},
    mainCaretPosition = null,
    mainCaretCharIndex = null,
    paceCaretPosition = null,
    tapeScrollOffset = 0,
    lastKeyPressed = null,
  } = options;
  const theme = getResolvedTheme(themeConfig || DEFAULT_HEX_THEME);
  const blindMode = behaviorConfig.blindMode === 'on';
  const tapeMode = keymapConfig.tapeMode || 'off';
  let keymapMode = keymapConfig.keymapMode || 'off';
  if (keymapMode === 'static' || keymapMode === 'next') keymapMode = 'react';
  const tapeWidthPct = Math.max(50, Math.min(100, keymapConfig.tapeMargin ?? 100)) / 100;
  const useTape = (tapeMode === 'letter' || tapeMode === 'word') && typeof typingState.getTapeLength === 'function' && typeof typingState.getTapeCharAt === 'function';

  let resolvedMainPosition = mainCaretPosition;
  let resolvedPacePosition = paceCaretPosition;
  if (!resolvedMainPosition && typeof typingState.getLogicalCaretCharIndex === 'function' && typeof typingState.getPositionFromCharIndex === 'function') {
    const logicalIdx = typingState.getLogicalCaretCharIndex();
    resolvedMainPosition = typingState.getPositionFromCharIndex(logicalIdx);
  }
  let caretOptions = null;
  if (caretConfig && (resolvedMainPosition || resolvedPacePosition)) {
    const mainChar = (caretConfig.caretStyle && caretConfig.caretStyle !== 'off') ? caretConfig.caretStyle : ' ';
    const paceChar = (caretConfig.paceCaretStyle && caretConfig.paceCaretStyle !== 'off') ? caretConfig.paceCaretStyle : ' ';
    caretOptions = {
      mainCaretPosition: resolvedMainPosition || null,
      paceCaretPosition: resolvedPacePosition || null,
      mainCaretStyle: theme.caret,
      mainCaretChar: mainChar,
      paceCaretStyle: theme.dim + theme.caret,
      paceCaretChar: paceChar,
    };
  }

  // Only show stats that are explicitly enabled in settings (no defaults)
  const live = {
    liveProgressBar: appearanceConfig.liveProgressBar ?? 'bar',
    liveSpeed: appearanceConfig.liveSpeed ?? 'off',
    liveAccuracy: appearanceConfig.liveAccuracy ?? 'off',
    liveBurst: appearanceConfig.liveBurst ?? 'off',
  };
  const [lineTop, lineCenter, lineBottom] = typingState.getLines();
  const snapshot = stats.getSnapshot();
  const elapsed = snapshot.elapsedSeconds;
  const progress =
    wordLimit != null && typeof typingState.getTotalWordsTyped === 'function'
      ? Math.min(1, typingState.getTotalWordsTyped() / wordLimit)
      : Math.min(1, timeLimitSeconds > 0 ? elapsed / timeLimitSeconds : 0);

  let typingContent;
  let typingBoxWidth;
  if (useTape) {
    const cols = process.stdout.columns || 80;
    const fullWidth = Math.max(20, cols - 6);
    const viewportWidth = Math.max(20, Math.floor(fullWidth * tapeWidthPct));
    const tapeLength = typingState.getTapeLength();
    const tapeCaretCharIndex = mainCaretCharIndex != null
      ? mainCaretCharIndex
      : (typingState.getLogicalCaretCharIndex ? typingState.getLogicalCaretCharIndex() : 0);
    let paceCaretCharIndex = null;
    if (resolvedPacePosition != null && typeof typingState.getCharIndexFromStart === 'function') {
      paceCaretCharIndex = typingState.getCharIndexFromStart(resolvedPacePosition.lineIdx, resolvedPacePosition.wordIdx, resolvedPacePosition.charIdx);
    }
    const tapeLine = renderTapeLine(typingState, theme, blindMode, tapeScrollOffset, viewportWidth, tapeCaretCharIndex, paceCaretCharIndex, caretConfig);
    typingContent = [tapeLine];
    typingBoxWidth = viewportWidth;
  } else {
    const line0 = renderLine(lineTop, 0, typingState, theme, blindMode, caretOptions);
    const line1 = renderLine(lineCenter, 1, typingState, theme, blindMode, caretOptions);
    const line2 = renderLine(lineBottom, 2, typingState, theme, blindMode, caretOptions);
  const lines = [line0, line1, line2];
    typingContent = [line0, line1, line2];
    typingBoxWidth = Math.max(...lines.map((l) => visibleLength(l)));
  }

  const colsForLayout = process.stdout.columns || 80;
  const contentWidth = getUniformContentWidth(colsForLayout);
  const boxContentWidth = useTape ? typingBoxWidth : Math.max(contentWidth, typingBoxWidth);
  const { statsContent, progressWidth } = buildLiveStatsContent({
    snapshot,
    progress,
    wordLimit,
    timeLimitSeconds,
    typingState,
    theme,
    appearanceConfig: live,
    boxContentWidth,
  });
  const uniformBoxContentWidth = useTape
    ? Math.max(typingBoxWidth, progressWidth)
    : Math.max(contentWidth, typingBoxWidth, progressWidth);
  const statsBox = statsContent.length > 0 ? boxAround(statsContent, theme, uniformBoxContentWidth) : [];
  const typingBox = boxAround(typingContent, theme, uniformBoxContentWidth);

  const highlightKey = keymapMode === 'react' ? lastKeyPressed : null;
  const keymapLines = keymapMode === 'react'
    ? buildKeymapPreview(keymapConfig.keymapStyle || 'staggered', theme, highlightKey)
    : [];
  const keymapWidth = keymapLines.length ? Math.max(...keymapLines.map((l) => visibleLength(l))) : 0;

  const cols = colsForLayout;
  const termHeight = process.stdout.rows || 24;
  const statsBoxHeight = statsBox.length;
  const typingBoxHeight = typingBox.length;
  const keymapBlockHeight = keymapLines.length ? 1 + keymapLines.length : 0;
  const totalHeight = statsBoxHeight + (statsBoxHeight ? 2 : 0) + typingBoxHeight + keymapBlockHeight;
  const startRow = Math.max(1, Math.floor((termHeight - totalHeight) / 2) + 1);

  const boxWidth = statsBox.length ? visibleLength(statsBox[0]) : visibleLength(typingBox[0]);
  const pad = Math.max(0, Math.floor((cols - boxWidth) / 2));
  const keymapPad = keymapWidth ? Math.max(0, Math.floor((cols - keymapWidth) / 2)) : 0;

  let out = '\x1b[?25l\x1b[2J\x1b[H';
  let row = startRow;
  for (const line of statsBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(pad) + line + '\n';
    row++;
  }
  if (statsBox.length) row += 2;
  for (const line of typingBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(pad) + line + '\n';
    row++;
  }
  if (keymapLines.length) {
    row += 1;
    for (const line of keymapLines) {
      out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(keymapPad) + line + '\n';
      row++;
    }
  }
  out += theme.reset;
  process.stdout.write(out);
}

function visibleLength(str) {
  return str.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, '').length;
}

function truncateToVisible(str, maxVisible, suffix = '…') {
  if (visibleLength(str) <= maxVisible) return str;
  let visible = 0;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\x1b' && str[i + 1] === '[') {
      const start = i;
      i += 2;
      while (i < str.length && /[?0-9;]/.test(str[i])) i++;
      if (i < str.length && /[a-zA-Z]/.test(str[i])) i++;
      out += str.slice(start, i);
      i--;
      continue;
    }
    out += str[i];
    visible++;
    if (visible >= maxVisible) {
      out += '\x1b[0m' + suffix;
      break;
    }
  }
  return out;
}

function wrapPlainText(text, maxWidth) {
  if (maxWidth < 1) return [text];
  const lines = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxWidth) {
      lines.push(remaining);
      break;
    }
    let segment = remaining.slice(0, maxWidth + 1);
    const lastSpace = segment.lastIndexOf(' ');
    const breakAt =
      lastSpace > 0 ? lastSpace : maxWidth;
    lines.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  return lines.length ? lines : [''];
}

const MAIN_MENU_OPTIONS = ['Time', 'Words', 'Zen mode', 'Custom', 'Settings'];
const TIME_OPTIONS = [15, 30, 45, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

const SETTINGS_CATEGORIES = [
  { id: 'behavior', label: 'Behavior' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'caret', label: 'Caret' },
  { id: 'keymap', label: 'Keymap' },
  { id: 'theme', label: 'Theme' },
];

const BEHAVIOR_OPTIONS = [
  {
    key: 'quickRestart',
    label: 'Quick Restart',
    values: ['off', 'tab', 'enter'],
    description: 'Restart test with chosen key without returning to menu. Esc always goes back.',
  },
];

const CARET_STYLE_VALUES = ['off', '|', '█', '▯', '_', 'underline'];
const ANSI_UNDERLINE = '\x1b[4m';

const CARET_OPTIONS = [
  {
    key: 'caretStyle',
    label: 'Caret Style',
    values: CARET_STYLE_VALUES,
    description: 'Character or style at the typing position. Underline = underline next char. Off = no visible caret.',
  },
  {
    key: 'paceCaret',
    label: 'Pace Caret',
    values: ['off', 'avg', 'pb', 'last', 'daily', 'custom'],
    description: 'Show a second caret at your target pace. Off = disabled.',
  },
  {
    key: 'paceCaretStyle',
    label: 'Pace Caret Style',
    values: CARET_STYLE_VALUES,
    description: 'Style of the pace caret (same options as main caret).',
  },
  {
    key: 'paceCaretCustomWpm',
    label: 'Pace Caret WPM',
    type: 'slider',
    min: 10,
    max: 120,
    step: 5,
    unit: ' wpm',
    description: 'Target WPM when Pace Caret is set to Custom. Used only when Pace Caret = custom.',
  },
];

const APPEARANCE_OPTIONS = [
  {
    key: 'liveProgressBar',
    label: 'Live Progress Bar',
    values: ['off', 'bar', 'text', 'mini'],
    description: 'Progress display during test. Bar = full bar, text = percentage, mini = compact.',
  },
  {
    key: 'liveSpeed',
    label: 'Live Speed',
    values: ['off', 'text', 'mini'],
    description: 'Show live WPM. Text = "45 wpm", mini = compact.',
  },
  {
    key: 'liveAccuracy',
    label: 'Live Accuracy',
    values: ['off', 'text', 'mini'],
    description: 'Show live accuracy percentage.',
  },
  {
    key: 'liveBurst',
    label: 'Live Burst',
    values: ['off', 'text', 'mini'],
    description: 'Show burst WPM (recent speed). Text = "52 burst", mini = compact.',
  },
  {
    key: 'tapeMode',
    label: 'Tape Mode',
    values: ['off', 'letter'],
    description: 'Show typed keys on a tape. Off = disabled, letter = per key.',
  },
  {
    key: 'tapeMargin',
    label: 'Tape Box Width',
    type: 'slider',
    min: 50,
    max: 100,
    step: 5,
    unit: '%',
    description: 'Width of the tape area (50-100% of available width). Default 100%.',
  },
];

const KEYMAP_OPTIONS = [
  {
    key: 'keymapMode',
    label: 'Keymap',
    values: ['off', 'react'],
    description: 'Show keyboard. Off = hidden. React = highlight on keypress.',
  },
  {
    key: 'keymapStyle',
    label: 'Keymap Style',
    values: ['staggered', 'matrix', 'split'],
    description: 'Keyboard layout: staggered (standard), matrix (aligned), split (two halves).',
  },
];

const SETTINGS_OPTIONS_BY_CATEGORY = {
  behavior: BEHAVIOR_OPTIONS,
  appearance: APPEARANCE_OPTIONS,
  caret: CARET_OPTIONS,
  keymap: KEYMAP_OPTIONS,
  theme: null,
};

const THEME_PRESET_NAMES = ['default', 'serika', 'dark', 'light', 'nord', 'custom'];

const THEME_COLOR_PALETTE = [
  '#1a1b26', '#0d1117', '#ffffff', '#2e3440', '#e9e9e0', '#181818', '#282c34',
  '#9ece6a', '#e9b873', '#58a6ff', '#0969da', '#88c0d0', '#a3be8c', '#b48ead',
  '#cccccc', '#c9d1d9', '#323437', '#5c5c70', '#6e7681', '#4c566a', '#656d76',
  '#e03e3e', '#f85149', '#cf222e', '#bf616a', '#c23c3c', '#ff6b6b', '#d08770',
  '#ffffff', '#d8dee9', '#1f2328',
];

const THEME_COLOR_OPTIONS = [
  { key: 'text', label: 'Main text' },
  { key: 'typed', label: 'Correct letter' },
  { key: 'error', label: 'Wrong letter' },
  { key: 'main', label: 'Highlight' },
];

const THEME_PRESETS_HEX = {
  default: { ...DEFAULT_HEX_THEME },
  serika: { bg: '#e9e9e0', main: '#e9b873', sub: '#8b7355', text: '#323437', error: '#c23c3c', errorExtra: '#d44f4f', caret: '#323437', typed: '#323437' },
  dark: { bg: '#0d1117', main: '#58a6ff', sub: '#6e7681', text: '#c9d1d9', error: '#f85149', errorExtra: '#ff7b72', caret: '#c9d1d9', typed: '#3fb950' },
  light: { bg: '#ffffff', main: '#0969da', sub: '#656d76', text: '#1f2328', error: '#cf222e', errorExtra: '#d1242f', caret: '#1f2328', typed: '#1a7f37' },
  nord: { bg: '#2e3440', main: '#88c0d0', sub: '#4c566a', text: '#d8dee9', error: '#bf616a', errorExtra: '#d08770', caret: '#d8dee9', typed: '#a3be8c' },
};

function getThemeOptionCount(themeConfig) {
  if (!themeConfig) return 1;
  return themeConfig.activePreset === 'custom' ? 1 + THEME_COLOR_OPTIONS.length : 1;
}

function buildThemePreview(hexTheme, theme) {
  const h = hexTheme || DEFAULT_HEX_THEME;
  const t = getResolvedTheme(h);
  const lines = [];
  lines.push(t.text + '  Main text   ' + t.reset + ' ' + theme.dim + 'text' + theme.reset);
  lines.push(t.correct + '  Correct     ' + t.reset + ' ' + theme.dim + 'typed' + theme.reset);
  lines.push(t.incorrect + '  Wrong       ' + t.reset + ' ' + theme.dim + 'error' + theme.reset);
  lines.push(t.accent + '  Highlight   ' + t.reset + ' ' + theme.dim + 'main' + theme.reset);
  return lines;
}

const HELP_LINES = [
  '  ↑ / ↓     Select option',
  '  Enter     Confirm / Start test',
  '  Enter     During test: restart test (new words, except in Custom)',
  '  q         Quit',
];

function renderEntryAndMainMenu(selectedIndex, themeConfig) {
  const theme = getResolvedTheme(themeConfig || DEFAULT_HEX_THEME);
  const idx = Math.max(0, Math.min(selectedIndex, MAIN_MENU_OPTIONS.length - 1));
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const contentWidth = Math.max(getUniformContentWidth(cols), Math.max(...ASCII_ART_TITLE.map((l) => l.length)));

  const titleContent = ASCII_ART_TITLE.map((line) => theme.accent + line + theme.reset);

  const menuContent = [
    theme.text + 'Select mode (↑↓ move, Enter select)' + theme.reset,
    '',
    ...MAIN_MENU_OPTIONS.map((label, i) =>
      i === idx ? theme.accent + '  > ' + label + theme.reset : theme.text + '    ' + label + theme.reset
    ),
  ];
  const menuBox = boxAround(menuContent, theme, contentWidth);

  const helpContent = [theme.dim + 'Help' + theme.reset, '', ...HELP_LINES.map((l) => theme.dim + l.trim() + theme.reset)];
  const helpBox = boxAround(helpContent, theme, contentWidth);

  const boxWidth = contentWidth + 2;
  const pad = Math.max(0, Math.floor((cols - boxWidth) / 2));
  const titlePad = Math.max(0, Math.floor((cols - contentWidth) / 2));
  const totalBlockHeight = titleContent.length + 2 + menuBox.length + 2 + helpBox.length;
  const startRow = Math.max(1, Math.floor((termHeight - totalBlockHeight) / 2) + 1);

  let out = '\x1b[2J\x1b[H';
  let row = startRow;
  for (const line of titleContent) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(titlePad) + line + '\n';
    row++;
  }
  row += 2;
  for (const line of menuBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(pad) + line + '\n';
    row++;
  }
  row += 2;
  for (const line of helpBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(pad) + line + '\n';
    row++;
  }
  process.stdout.write(out);
}

function renderTimeSubmenu(selectedIndex, themeConfig) {
  const theme = getResolvedTheme(themeConfig || DEFAULT_HEX_THEME);
  const idx = Math.max(0, Math.min(selectedIndex, TIME_OPTIONS.length - 1));
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const contentWidth = getUniformContentWidth(cols);
  const content = [
    theme.text + 'Time · Select duration (↑↓ move, Enter start, Esc back)' + theme.reset,
    '',
    ...TIME_OPTIONS.map((seconds, i) => {
      const label = `${seconds} seconds`;
      return i === idx
        ? theme.accent + '  > ' + label + theme.reset
        : theme.text + '    ' + label + theme.reset;
    }),
  ];
  const boxLines = boxAround(content, theme, contentWidth);
  const pad = Math.max(0, Math.floor((cols - (contentWidth + 2)) / 2));
  const startRow = Math.max(1, Math.floor((termHeight - boxLines.length) / 2) + 1);
  let out = '\x1b[2J\x1b[H';
  for (let i = 0; i < boxLines.length; i++) {
    out += '\x1b[' + (startRow + i) + ';1H\x1b[K' + ' '.repeat(pad) + boxLines[i] + '\n';
  }
  process.stdout.write(out);
}

function renderWordsSubmenu(selectedIndex, themeConfig) {
  const theme = getResolvedTheme(themeConfig || DEFAULT_HEX_THEME);
  const idx = Math.max(0, Math.min(selectedIndex, WORD_OPTIONS.length - 1));
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const contentWidth = getUniformContentWidth(cols);
  const content = [
    theme.text + 'Words · Select count (↑↓ move, Enter start, Esc back)' + theme.reset,
    '',
    ...WORD_OPTIONS.map((n, i) => {
      const label = `${n} words`;
      return i === idx
        ? theme.accent + '  > ' + label + theme.reset
        : theme.text + '    ' + label + theme.reset;
    }),
  ];
  const boxLines = boxAround(content, theme, contentWidth);
  const pad = Math.max(0, Math.floor((cols - (contentWidth + 2)) / 2));
  const startRow = Math.max(1, Math.floor((termHeight - boxLines.length) / 2) + 1);
  let out = '\x1b[2J\x1b[H';
  for (let i = 0; i < boxLines.length; i++) {
    out += '\x1b[' + (startRow + i) + ';1H\x1b[K' + ' '.repeat(pad) + boxLines[i] + '\n';
  }
  process.stdout.write(out);
}

function renderCustomInputScreen(prompt, inputText, cursorOffset, themeConfig) {
  const theme = getResolvedTheme(themeConfig || DEFAULT_HEX_THEME);
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const totalBoxWidth = getUniformContentWidth(cols) + 2;
  const innerWidth = totalBoxWidth - 2 - 2 * INNER_PADDING;

  const line1 = theme.text + 'Custom · Type or paste your text, then Enter to start the test.' + theme.reset;
  const line2 = theme.dim + 'Esc = back to menu (clears input)' + theme.reset;
  const promptLine = theme.text + prompt + theme.reset;

  const wrappedLine1 = wrapPlainText(line1.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, ''), innerWidth).map(
    (plain) => theme.text + plain + theme.reset
  );
  const wrappedLine2 = wrapPlainText(line2.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, ''), innerWidth).map(
    (plain) => theme.dim + plain + theme.reset
  );
  const wrappedPrompt = wrapPlainText(promptLine.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, ''), innerWidth).map(
    (plain) => theme.text + plain + theme.reset
  );

  const inputWrapped = wrapPlainText(inputText, innerWidth);
  let charCount = 0;
  const inputContentLines = inputWrapped.map((line, i) => {
    const lineStart = charCount;
    charCount += line.length;
    const lineEnd = charCount;
    const hasCursor = cursorOffset >= lineStart && cursorOffset <= lineEnd;
    if (!hasCursor) {
      return theme.text + line + theme.reset;
    }
    const posInLine = cursorOffset - lineStart;
    return (
      theme.text +
      line.slice(0, posInLine) +
      theme.reset +
      theme.caret +
      ' ' +
      theme.reset +
      theme.text +
      line.slice(posInLine) +
      theme.reset
    );
  });
  if (inputWrapped.length === 0) {
    inputContentLines.push(theme.caret + ' ' + theme.reset);
  }

  const content = ['', ...wrappedLine1, ...wrappedLine2, '', ...wrappedPrompt, '', ...inputContentLines, ''];
  const boxLines = boxAroundWithPadding(content, theme, totalBoxWidth);
  const pad = Math.max(0, Math.floor((cols - visibleLength(boxLines[0])) / 2));
  const startRow = Math.max(1, Math.floor((termHeight - boxLines.length) / 2) + 1);
  let out = '\x1b[2J\x1b[H';
  for (let i = 0; i < boxLines.length; i++) {
    out += '\x1b[' + (startRow + i) + ';1H\x1b[K' + ' '.repeat(pad) + boxLines[i] + '\n';
  }
  process.stdout.write(out);
  showCursor();
}

function renderZenTestScreen(stats, typedSoFar, caretPhase, themeConfig) {
  const theme = getResolvedTheme(themeConfig || DEFAULT_HEX_THEME);
  const snapshot = stats.getSnapshot();
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const contentWidth = getUniformContentWidth(cols);
  const totalBoxWidth = contentWidth + 2;

  const headerContent = [
    theme.accent +
      `wpm ${String(snapshot.wpm).padStart(3)}  ·  acc ${snapshot.accuracy}%  ·  ${snapshot.timeFormatted}` +
      theme.reset,
    theme.dim + 'Enter to end test' + theme.reset,
  ];
  const headerBox = boxAround(headerContent, theme, contentWidth);

  const innerWidth = totalBoxWidth - 2 - 2 * INNER_PADDING;
  const typedWrapped = wrapPlainText(typedSoFar, innerWidth);
  const lastLineFull = typedWrapped.length > 0 && typedWrapped[typedWrapped.length - 1].length >= innerWidth;
  const typingContentLines = typedWrapped.map((line, i) => {
    const isLast = i === typedWrapped.length - 1;
    const showCursorOnThisLine = isLast && !lastLineFull;
    return theme.text + line + theme.reset + (showCursorOnThisLine ? theme.caret + ' ' + theme.reset : '');
  });
  if (typedWrapped.length === 0) {
    typingContentLines.push(theme.caret + ' ' + theme.reset);
  } else if (lastLineFull) {
    typingContentLines.push(theme.caret + ' ' + theme.reset);
  }
  const typingBox = boxAroundWithPadding(typingContentLines, theme, totalBoxWidth);

  const pad = Math.max(0, Math.floor((cols - totalBoxWidth) / 2));
  const totalBlockHeight = headerBox.length + 2 + typingBox.length;
  const startRow = Math.max(1, Math.floor((termHeight - totalBlockHeight) / 2) + 1);

  let out = '\x1b[?25l\x1b[2J\x1b[H';
  let row = startRow;
  for (const line of headerBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(pad) + line + '\n';
    row++;
  }
  row += 2;
  for (const line of typingBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(pad) + line + '\n';
    row++;
  }
  process.stdout.write(out);
}

function getTestTypeLabel(testMode, timeLimitSeconds, wordLimit) {
  if (testMode === 'zen') return 'Zen';
  if (testMode === 'custom') return 'Custom';
  if (testMode === 'time' && timeLimitSeconds != null) return `Time · ${timeLimitSeconds}s`;
  if (testMode === 'words' && wordLimit != null) return `Words · ${wordLimit}`;
  return testMode || 'Test';
}

function renderResultsScreen(options) {
  const { stats, themeConfig, testMode, timeLimitSeconds, wordLimit } = options;
  const effectiveHex = themeConfig && themeConfig.activePreset !== undefined
    ? (themeConfig.activePreset === 'custom'
      ? { ...DEFAULT_HEX_THEME, ...(themeConfig.custom || {}) }
      : (THEME_PRESETS_HEX[themeConfig.activePreset] || DEFAULT_HEX_THEME))
    : (themeConfig || DEFAULT_HEX_THEME);
  const theme = getResolvedTheme(effectiveHex);
  const s = stats.getSnapshot();
  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const contentWidth = getUniformContentWidth(cols);
  const testTypeLabel = getTestTypeLabel(testMode, timeLimitSeconds, wordLimit);

  process.stdout.write('\x1b[?25l\x1b[2J\x1b[H');
  const showDuration = testMode !== 'words' && testMode !== 'custom';
  const bold = '\x1b[1m';
  const content = [
    theme.accent + 'test complete' + theme.reset,
    '',
    theme.accent + bold + `wpm           ${s.wpm}` + theme.reset,
    theme.accent + bold + `accuracy      ${s.accuracy}%` + theme.reset,
    '',
    theme.text + `raw wpm       ${theme.accent}${Math.round(s.rawWpm)}${theme.reset}`,
    theme.text + `errors        ${theme.accent}${s.errorsIncludingCorrected ?? s.totalErrors}${theme.reset}`,
    theme.text + `test          ${theme.accent}${testTypeLabel}${theme.reset}`,
    ...(showDuration ? [theme.text + `duration      ${theme.accent}${s.timeFormatted}${theme.reset}`] : []),
    '',
    theme.dim + '[ Enter ]  Retry test     [ Esc ]  Main menu' + theme.reset,
  ];
  const boxLines = boxAround(content, theme, contentWidth);
  const boxWidth = contentWidth + 2;
  const pad = Math.max(0, Math.floor((cols - boxWidth) / 2));
  const startRow = Math.max(1, Math.floor((termHeight - boxLines.length) / 2) + 1);
  let out = '';
  for (let i = 0; i < boxLines.length; i++) {
    out += '\x1b[' + (startRow + i) + ';1H\x1b[K' + ' '.repeat(pad) + boxLines[i] + '\n';
  }
  process.stdout.write(out + (typeof theme.reset === 'string' ? theme.reset : ''));
}

const SETTINGS_LEFT_WIDTH = 20;
const SETTINGS_RIGHT_MIN_WIDTH = 38;
const SETTINGS_RIGHT_MAX_WIDTH = 64;
// Minimum right panel width so Theme preset line shows "default · serika · dark · light · nord · custom" fully
const THEME_PRESET_LINE_PLAIN = '  Preset   ' + THEME_PRESET_NAMES.join(' · ');
const MIN_RIGHT_WIDTH_FOR_THEME = THEME_PRESET_LINE_PLAIN.length + 3; // +2 border, +1 so inner content width (rightInnerWidth-1) fits full line
const SETTINGS_PANEL_GAP = 3;

const KEYMAP_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

function buildKeymapPreview(style, theme, highlightKey) {
  const dim = theme.dim;
  const accent = theme.accent;
  const reset = theme.reset;
  const h = (k) => (highlightKey && String(k).toLowerCase() === String(highlightKey).toLowerCase() ? accent : dim) + k + reset;
  const lines = [];
  if (style === 'staggered') {
    const prefixes = ['  ', '   ', '    ', '     '];
    KEYMAP_ROWS.forEach((row, i) => lines.push(prefixes[i] + row.map(h).join(' ')));
  } else if (style === 'matrix') {
    KEYMAP_ROWS.forEach((row) => lines.push(row.map(h).join(' ')));
  } else {
    const prefixes = ['', ' ', '  ', '   '];
    const splitAt = [7, 6, 6, 6];
    KEYMAP_ROWS.forEach((row, i) => {
      const left = row.slice(0, splitAt[i]);
      const right = row.slice(splitAt[i]);
      lines.push(prefixes[i] + left.map(h).join(' ') + '    ' + right.map(h).join(' '));
    });
  }
  return lines;
}

function renderSettingsScreen(options) {
  const {
    categoryIndex,
    panelFocus,
    rightOptionIndex,
    optionStates = [],
    behaviorConfig = {},
    caretConfig = {},
    appearanceConfig = {},
    keymapConfig = {},
    themeConfig,
  } = options;
  const effectiveHex = themeConfig && themeConfig.activePreset !== undefined
    ? (themeConfig.activePreset === 'custom'
      ? { ...DEFAULT_HEX_THEME, ...(themeConfig.custom || {}) }
      : (THEME_PRESETS_HEX[themeConfig.activePreset] || DEFAULT_HEX_THEME))
    : (themeConfig || DEFAULT_HEX_THEME);
  const theme = getResolvedTheme(effectiveHex);
  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  clearScreen();
  hideCursor();

  const catIdx = Math.max(0, Math.min(categoryIndex, SETTINGS_CATEGORIES.length - 1));
  const category = SETTINGS_CATEGORIES[catIdx];
  const isTheme = category.id === 'theme';
  const optionsList = isTheme
    ? Array(getThemeOptionCount(themeConfig))
    : (SETTINGS_OPTIONS_BY_CATEGORY[category.id] || []);
  const rightIdx = Math.max(0, Math.min(rightOptionIndex, Math.max(0, optionsList.length - 1)));
  const isBehavior = category.id === 'behavior';
  const isCaret = category.id === 'caret';
  const isAppearance = category.id === 'appearance';
  const isKeymap = category.id === 'keymap';

  const leftLines = [];
  for (let i = 0; i < SETTINGS_CATEGORIES.length; i++) {
    const cat = SETTINGS_CATEGORIES[i];
    const selected = panelFocus === 'left' && i === catIdx;
    const border = selected ? theme.accent : theme.dim;
    const top = border + BOX.tl + BOX.h.repeat(SETTINGS_LEFT_WIDTH - 2) + BOX.tr + theme.reset;
    const label = cat.label.padEnd(SETTINGS_LEFT_WIDTH - 4);
    const mid = border + BOX.v + theme.reset + ' ' + (selected ? theme.accent + label + theme.reset : theme.text + label + theme.reset) + ' ' + border + BOX.v + theme.reset;
    const bottom = border + BOX.bl + BOX.h.repeat(SETTINGS_LEFT_WIDTH - 2) + BOX.br + theme.reset;
    leftLines.push(top, mid, bottom);
  }

  const baseTotalWidth = getUniformContentWidth(cols);
  const minTotalForTheme = SETTINGS_LEFT_WIDTH + SETTINGS_PANEL_GAP + MIN_RIGHT_WIDTH_FOR_THEME;
  const totalSettingsWidth = Math.max(baseTotalWidth, isTheme ? minTotalForTheme : 0);
  const rightWidth = Math.max(SETTINGS_RIGHT_MIN_WIDTH, totalSettingsWidth - SETTINGS_LEFT_WIDTH - SETTINGS_PANEL_GAP);
  const rightInnerWidth = rightWidth - 2;
  const rightTitle = truncateToVisible(theme.accent + ' ' + category.label + ' ' + theme.reset, rightInnerWidth - 1);
  const rightTitleLine = theme.dim + BOX.v + theme.reset + ' ' + rightTitle + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(rightTitle))) + theme.dim + BOX.v + theme.reset;
  const rightBorderTop = theme.dim + BOX.tl + BOX.h.repeat(rightInnerWidth) + BOX.tr + theme.reset;
  const rightBorderBottom = theme.dim + BOX.bl + BOX.h.repeat(rightInnerWidth) + BOX.br + theme.reset;

  const rightLines = [rightBorderTop, rightTitleLine];

  if (isBehavior && optionsList.length > 0) {
    for (let i = 0; i < optionsList.length; i++) {
      const opt = optionsList[i];
      const currentValue = behaviorConfig[opt.key];
      const valueIdx = opt.values.indexOf(currentValue);
      const displayValue = valueIdx >= 0 ? currentValue : opt.values[0];
      const selected = panelFocus === 'right' && i === rightIdx;
      const prefix = selected ? theme.accent + '> ' + theme.reset : '  ';
      const valueParts = opt.values.map((v) => (v === displayValue ? theme.accent + v + theme.reset : theme.dim + v + theme.reset));
      const valueStr = valueParts.join(theme.dim + ' · ' + theme.reset);
      const lineContent = truncateToVisible(prefix + opt.label + '   ' + valueStr, rightInnerWidth);
      const padded = lineContent + ' '.repeat(Math.max(0, rightInnerWidth - visibleLength(lineContent)));
      rightLines.push(theme.dim + BOX.v + theme.reset + (selected ? theme.accent + padded + theme.reset : theme.text + padded + theme.reset) + theme.dim + BOX.v + theme.reset);
    }
    const selectedOpt = optionsList[rightIdx];
    const desc = selectedOpt && selectedOpt.description ? selectedOpt.description : '';
    if (desc) {
      const descPlain = desc.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, '');
      const descWrapped = wrapPlainText(descPlain, rightInnerWidth - 2);
      for (const line of descWrapped) {
        rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + theme.dim + line + ' '.repeat(Math.max(0, rightInnerWidth - 1 - line.length)) + theme.dim + BOX.v + theme.reset);
      }
    }
  } else if (isCaret && optionsList.length > 0) {
    for (let i = 0; i < optionsList.length; i++) {
      const opt = optionsList[i];
      const selected = panelFocus === 'right' && i === rightIdx;
      const prefix = selected ? theme.accent + '> ' + theme.reset : '  ';
      if (opt.type === 'slider') {
        const value = Math.min(opt.max, Math.max(opt.min, caretConfig[opt.key] ?? opt.min));
        const barLen = 10;
        const filled = Math.round(((value - opt.min) / (opt.max - opt.min || 1)) * barLen);
        const bar = theme.accent + '█'.repeat(filled) + theme.reset + theme.dim + '░'.repeat(barLen - filled) + theme.reset;
        const lineContent = truncateToVisible(prefix + opt.label + '   [' + bar + '] ' + value + (opt.unit || ''), rightInnerWidth);
        const padded = lineContent + ' '.repeat(Math.max(0, rightInnerWidth - visibleLength(lineContent)));
        rightLines.push(theme.dim + BOX.v + theme.reset + (selected ? theme.accent + padded + theme.reset : theme.text + padded + theme.reset) + theme.dim + BOX.v + theme.reset);
      } else {
        const currentValue = caretConfig[opt.key];
        const valueIdx = opt.values.indexOf(currentValue);
        const displayValue = valueIdx >= 0 ? currentValue : opt.values[0];
        const valueParts = opt.values.map((v) => (v === displayValue ? theme.accent + v + theme.reset : theme.dim + v + theme.reset));
        const valueStr = valueParts.join(theme.dim + ' · ' + theme.reset);
        const lineContent = truncateToVisible(prefix + opt.label + '   ' + valueStr, rightInnerWidth);
        const padded = lineContent + ' '.repeat(Math.max(0, rightInnerWidth - visibleLength(lineContent)));
        rightLines.push(theme.dim + BOX.v + theme.reset + (selected ? theme.accent + padded + theme.reset : theme.text + padded + theme.reset) + theme.dim + BOX.v + theme.reset);
      }
    }
    const selectedOpt = optionsList[rightIdx];
    const desc = selectedOpt && selectedOpt.description ? selectedOpt.description : '';
    if (desc) {
      const descPlain = desc.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, '');
      const descWrapped = wrapPlainText(descPlain, rightInnerWidth - 2);
      for (const line of descWrapped) {
        rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + theme.dim + line + ' '.repeat(Math.max(0, rightInnerWidth - 1 - line.length)) + theme.dim + BOX.v + theme.reset);
      }
    }
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + ' '.repeat(rightInnerWidth - 1) + theme.dim + BOX.v + theme.reset);
    const previewLabel = truncateToVisible(theme.dim + ' Preview ' + theme.reset, rightInnerWidth - 1);
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + previewLabel + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(previewLabel))) + theme.dim + BOX.v + theme.reset);
    const caretChar = (caretConfig.caretStyle && caretConfig.caretStyle !== 'off') ? caretConfig.caretStyle : ' ';
    const paceChar = (caretConfig.paceCaretStyle && caretConfig.paceCaretStyle !== 'off') ? caretConfig.paceCaretStyle : ' ';
    const caretStyled = caretChar === 'underline'
      ? ANSI_UNDERLINE + theme.caret + 'b' + theme.reset
      : (caretChar !== ' ' ? theme.caret + caretChar + theme.reset : ' ');
    const paceStyled = paceChar !== ' ' ? theme.dim + theme.caret + paceChar + theme.reset : ' ';
    const previewLine1 = truncateToVisible(caretChar === 'underline'
      ? '  The quick ' + caretStyled + 'rown fox'
      : '  The quick ' + caretStyled + 'brown fox', rightInnerWidth - 1);
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + theme.text + previewLine1 + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(previewLine1))) + theme.dim + BOX.v + theme.reset);
    const previewLine2 = truncateToVisible((caretConfig.paceCaret && caretConfig.paceCaret !== 'off')
      ? '  Pace: hello ' + paceStyled + 'world'
      : '  Pace: (off)', rightInnerWidth - 1);
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + theme.text + previewLine2 + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(previewLine2))) + theme.dim + BOX.v + theme.reset);
  } else if (isAppearance && optionsList.length > 0) {
    for (let i = 0; i < optionsList.length; i++) {
      const opt = optionsList[i];
      const selected = panelFocus === 'right' && i === rightIdx;
      const prefix = selected ? theme.accent + '> ' + theme.reset : '  ';
      if (opt.type === 'slider') {
        const value = Math.min(opt.max, Math.max(opt.min, appearanceConfig[opt.key] ?? opt.min));
        const barLen = 10;
        const filled = Math.round(((value - opt.min) / (opt.max - opt.min || 1)) * barLen);
        const bar = theme.accent + '█'.repeat(filled) + theme.reset + theme.dim + '░'.repeat(barLen - filled) + theme.reset;
        const lineContent = truncateToVisible(prefix + opt.label + '   [' + bar + '] ' + value + (opt.unit || ''), rightInnerWidth);
        const padded = lineContent + ' '.repeat(Math.max(0, rightInnerWidth - visibleLength(lineContent)));
        rightLines.push(theme.dim + BOX.v + theme.reset + (selected ? theme.accent + padded + theme.reset : theme.text + padded + theme.reset) + theme.dim + BOX.v + theme.reset);
      } else {
        const currentValue = appearanceConfig[opt.key];
        const valueIdx = opt.values.indexOf(currentValue);
        const displayValue = valueIdx >= 0 ? currentValue : opt.values[0];
        const valueParts = opt.values.map((v) => (v === displayValue ? theme.accent + v + theme.reset : theme.dim + v + theme.reset));
        const valueStr = valueParts.join(theme.dim + ' · ' + theme.reset);
        const lineContent = truncateToVisible(prefix + opt.label + '   ' + valueStr, rightInnerWidth);
        const padded = lineContent + ' '.repeat(Math.max(0, rightInnerWidth - visibleLength(lineContent)));
        rightLines.push(theme.dim + BOX.v + theme.reset + (selected ? theme.accent + padded + theme.reset : theme.text + padded + theme.reset) + theme.dim + BOX.v + theme.reset);
      }
    }
    const selectedOpt = optionsList[rightIdx];
    const desc = selectedOpt && selectedOpt.description ? selectedOpt.description : '';
    if (desc) {
      const descPlain = desc.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, '');
      const descWrapped = wrapPlainText(descPlain, rightInnerWidth - 2);
      for (const line of descWrapped) {
        rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + theme.dim + line + ' '.repeat(Math.max(0, rightInnerWidth - 1 - line.length)) + theme.dim + BOX.v + theme.reset);
      }
    }
  } else if (isKeymap && optionsList.length > 0) {
    for (let i = 0; i < optionsList.length; i++) {
      const opt = optionsList[i];
      const selected = panelFocus === 'right' && i === rightIdx;
      const prefix = selected ? theme.accent + '> ' + theme.reset : '  ';
      if (opt.type === 'slider') {
        const value = Math.min(opt.max, Math.max(opt.min, keymapConfig[opt.key] ?? opt.min));
        const pct = Math.round(((value - opt.min) / (opt.max - opt.min)) * 100);
        const barLen = 10;
        const filled = Math.round((value / (opt.max - opt.min || 1)) * barLen);
        const bar = theme.accent + '█'.repeat(filled) + theme.reset + theme.dim + '░'.repeat(barLen - filled) + theme.reset;
        const lineContent = truncateToVisible(prefix + opt.label + '   [' + bar + '] ' + value + (opt.unit || ''), rightInnerWidth);
        const padded = lineContent + ' '.repeat(Math.max(0, rightInnerWidth - visibleLength(lineContent)));
        rightLines.push(theme.dim + BOX.v + theme.reset + (selected ? theme.accent + padded + theme.reset : theme.text + padded + theme.reset) + theme.dim + BOX.v + theme.reset);
      } else {
        const currentValue = keymapConfig[opt.key];
        const valueIdx = opt.values.indexOf(currentValue);
        const displayValue = valueIdx >= 0 ? currentValue : opt.values[0];
        const valueParts = opt.values.map((v) => (v === displayValue ? theme.accent + v + theme.reset : theme.dim + v + theme.reset));
        const valueStr = valueParts.join(theme.dim + ' · ' + theme.reset);
        const lineContent = truncateToVisible(prefix + opt.label + '   ' + valueStr, rightInnerWidth);
        const padded = lineContent + ' '.repeat(Math.max(0, rightInnerWidth - visibleLength(lineContent)));
        rightLines.push(theme.dim + BOX.v + theme.reset + (selected ? theme.accent + padded + theme.reset : theme.text + padded + theme.reset) + theme.dim + BOX.v + theme.reset);
      }
    }
    const selectedOpt = optionsList[rightIdx];
    const desc = selectedOpt && selectedOpt.description ? selectedOpt.description : '';
    if (desc) {
      const descPlain = desc.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, '');
      const descWrapped = wrapPlainText(descPlain, rightInnerWidth - 2);
      for (const line of descWrapped) {
        rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + theme.dim + line + ' '.repeat(Math.max(0, rightInnerWidth - 1 - line.length)) + theme.dim + BOX.v + theme.reset);
      }
    }
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + ' '.repeat(rightInnerWidth - 1) + theme.dim + BOX.v + theme.reset);
    const previewLabel = truncateToVisible(theme.dim + ' Keymap Preview ' + theme.reset, rightInnerWidth - 1);
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + previewLabel + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(previewLabel))) + theme.dim + BOX.v + theme.reset);
    const keymapLines = buildKeymapPreview(keymapConfig.keymapStyle || 'staggered', theme);
    for (const line of keymapLines) {
      const lineFit = truncateToVisible(line, rightInnerWidth - 1);
      rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + lineFit + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(lineFit))) + theme.dim + BOX.v + theme.reset);
    }
  } else if (isTheme && themeConfig) {
    const effectiveHex = themeConfig.activePreset === 'custom'
      ? { ...DEFAULT_HEX_THEME, ...themeConfig.custom }
      : (THEME_PRESETS_HEX[themeConfig.activePreset] || DEFAULT_HEX_THEME);
    const presetSelected = rightIdx === 0;
    const prefixPreset = presetSelected ? theme.accent + '> ' + theme.reset : '  ';
    const presetValue = themeConfig.activePreset || 'default';
    const presetParts = THEME_PRESET_NAMES.map((v) => (v === presetValue ? theme.accent + v + theme.reset : theme.dim + v + theme.reset));
    const presetLine = prefixPreset + 'Preset   ' + presetParts.join(theme.dim + ' · ' + theme.reset);
    const presetLineFit = truncateToVisible(presetLine, rightInnerWidth - 1);
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + presetLineFit + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(presetLineFit))) + theme.dim + BOX.v + theme.reset);
    if (themeConfig.activePreset === 'custom') {
      for (let i = 0; i < THEME_COLOR_OPTIONS.length; i++) {
        const opt = THEME_COLOR_OPTIONS[i];
        const selected = panelFocus === 'right' && rightIdx === i + 1;
        const prefix = selected ? theme.accent + '> ' + theme.reset : '  ';
        const hexVal = (themeConfig.custom && themeConfig.custom[opt.key]) || DEFAULT_HEX_THEME[opt.key];
        const lineContent = truncateToVisible(prefix + opt.label + '   ' + theme.accent + hexVal + theme.reset, rightInnerWidth - 1);
        rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + lineContent + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(lineContent))) + theme.dim + BOX.v + theme.reset);
      }
    }
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + ' '.repeat(rightInnerWidth - 1) + theme.dim + BOX.v + theme.reset);
    const previewLabel = truncateToVisible(theme.dim + ' Preview ' + theme.reset, rightInnerWidth - 1);
    rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + previewLabel + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(previewLabel))) + theme.dim + BOX.v + theme.reset);
    const previewLines = buildThemePreview(effectiveHex, theme);
    for (const line of previewLines) {
      const lineFit = truncateToVisible(line, rightInnerWidth - 1);
      rightLines.push(theme.dim + BOX.v + theme.reset + ' ' + lineFit + ' '.repeat(Math.max(0, rightInnerWidth - 1 - visibleLength(lineFit))) + theme.dim + BOX.v + theme.reset);
    }
  } else {
    const catStates = optionStates[catIdx] || [];
    for (let i = 0; i < optionsList.length; i++) {
      const opt = optionsList[i];
      const active = catStates[i] === true;
      const bullet = active ? theme.accent + '●' + theme.reset : theme.dim + '○' + theme.reset;
      const selected = panelFocus === 'right' && i === rightIdx;
      const lineContent = truncateToVisible((selected ? theme.accent + '> ' + theme.reset : '  ') + bullet + ' ' + opt.label, rightInnerWidth);
      const padded = lineContent + ' '.repeat(Math.max(0, rightInnerWidth - visibleLength(lineContent)));
      rightLines.push(theme.dim + BOX.v + theme.reset + (selected ? theme.accent + padded + theme.reset : theme.text + padded + theme.reset) + theme.dim + BOX.v + theme.reset);
    }
  }
  rightLines.push(rightBorderBottom);

  const helpText = (isBehavior || isCaret || isAppearance || isKeymap || isTheme) && panelFocus === 'right'
    ? theme.dim + '↑/↓ j/k  Navigate   ←/→  Change value   Tab  Switch panel   r  Reset defaults   Esc  Back' + theme.reset
    : theme.dim + '↑/↓ or j/k  Navigate   Tab  Switch panel   Enter  Select/Toggle   r  Reset defaults   Esc  Back' + theme.reset;
  const helpBox = boxAround([helpText], theme, totalSettingsWidth);

  const panelHeight = Math.max(leftLines.length, rightLines.length);
  const startRow = Math.max(2, Math.floor((termHeight - panelHeight - 2 - helpBox.length) / 2) + 1);
  const leftCol = Math.max(1, Math.floor((cols - (SETTINGS_LEFT_WIDTH + SETTINGS_PANEL_GAP + rightWidth)) / 2));
  const rightCol = leftCol + SETTINGS_LEFT_WIDTH + SETTINGS_PANEL_GAP;

  let out = '\x1b[H\x1b[2J';
  for (let r = 0; r < panelHeight; r++) {
    out += '\x1b[' + (startRow + r) + ';' + leftCol + 'H\x1b[K';
    out += r < leftLines.length ? leftLines[r] : ' '.repeat(SETTINGS_LEFT_WIDTH);
    out += '\x1b[' + (startRow + r) + ';' + rightCol + 'H\x1b[K';
    if (r < rightLines.length) out += rightLines[r];
    out += '\n';
  }
  const helpStartRow = startRow + panelHeight + 2;
  const helpPad = Math.max(0, Math.floor((cols - visibleLength(helpBox[0])) / 2));
  for (let i = 0; i < helpBox.length; i++) {
    out += '\x1b[' + (helpStartRow + i) + ';1H\x1b[K' + ' '.repeat(helpPad) + helpBox[i] + '\n';
  }
  out += theme.reset;
  process.stdout.write(out);
}

function getSettingsOptionCount(categoryIndex, themeConfig) {
  const category = SETTINGS_CATEGORIES[categoryIndex];
  if (!category) return 0;
  if (category.id === 'theme') return getThemeOptionCount(themeConfig);
  const opts = SETTINGS_OPTIONS_BY_CATEGORY[category.id];
  return opts ? opts.length : 0;
}

module.exports = {
  THEME,
  clearScreen,
  hideCursor,
  showCursor,
  renderEntryAndMainMenu,
  renderTimeSubmenu,
  renderWordsSubmenu,
  renderCustomInputScreen,
  renderZenTestScreen,
  renderTestScreen,
  renderResultsScreen,
  renderSettingsScreen,
  getSettingsOptionCount,
  visibleLength,
  TIME_OPTIONS,
  WORD_OPTIONS,
  MAIN_MENU_OPTIONS,
  SETTINGS_CATEGORIES,
  BEHAVIOR_OPTIONS,
  CARET_OPTIONS,
  CARET_STYLE_VALUES,
  APPEARANCE_OPTIONS,
  KEYMAP_OPTIONS,
  buildKeymapPreview,
  getResolvedTheme,
  getThemeOptionCount,
  THEME_PRESET_NAMES,
  THEME_COLOR_OPTIONS,
  THEME_COLOR_PALETTE,
  THEME_PRESETS_HEX,
  DEFAULT_HEX_THEME,
};
