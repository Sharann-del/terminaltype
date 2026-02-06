'use strict';

const THEME = {
  text: '\x1b[38;2;204;204;204m',
  correct: '\x1b[38;2;158;206;106m',
  incorrect: '\x1b[38;2;224;62;62m',
  dim: '\x1b[38;2;92;92;112m',
  caret: '\x1b[4m\x1b[38;2;255;255;255m',
  accent: '\x1b[38;2;158;206;106m',
  reset: '\x1b[0m',
};

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function hideCursor() {
  process.stdout.write('\x1b[?25l');
}

function showCursor() {
  process.stdout.write('\x1b[?25h');
}

function renderWordWithState(word, typingState, lineIdx, wordIndex, theme) {
  const { correct, incorrect, dim, caret, reset } = theme;
  let out = '';
  const isCurrent = typingState.isCurrentWord(lineIdx, wordIndex);
  const isComplete = typingState.isWordComplete(lineIdx, wordIndex);

  for (let i = 0; i < word.length; i++) {
    const ch = word[i] || ' ';
    const status = typingState.getCharStatus(lineIdx, wordIndex, i);
    if (status === 'caret') {
      out += caret + ch + reset;
    } else if (status === 'correct') {
      out += isComplete ? dim + correct + ch + reset : correct + ch + reset;
    } else if (status === 'incorrect') {
      out += isComplete ? dim + incorrect + ch + reset : incorrect + ch + reset;
    } else {
      out += isCurrent ? theme.text + ch + reset : dim + ch + reset;
    }
  }
  if (isCurrent && typingState.getCharStatus(lineIdx, wordIndex, word.length) === 'caret') {
    out += caret + ' ' + reset;
  }
  return out;
}

function renderLine(lineWords, lineIdx, typingState, theme) {
  return lineWords
    .map((word, wordIndex) => renderWordWithState(word, typingState, lineIdx, wordIndex, theme))
    .join(' ');
}

function buildProgressBar(progress, width, theme) {
  const filled = Math.round(progress * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return theme.dim + bar + theme.reset;
}

function renderTestScreen(options) {
  const {
    typingState,
    stats,
    timeLimitSeconds,
    caretPhase,
  } = options;
  const theme = THEME;
  const [lineTop, lineCenter, lineBottom] = typingState.getLines();
  const snapshot = stats.getSnapshot();
  const elapsed = snapshot.elapsedSeconds;
  const progress = Math.min(1, elapsed / timeLimitSeconds);

  const line0 = renderLine(lineTop, 0, typingState, theme);
  const line1 = renderLine(lineCenter, 1, typingState, theme);
  const line2 = renderLine(lineBottom, 2, typingState, theme);
  const lines = [line0, line1, line2];

  const progressWidth = 40;
  const progressBar = buildProgressBar(progress, progressWidth, theme);
  const header =
    theme.accent +
    `  wpm ${String(snapshot.wpm).padStart(3)}  ·  acc ${snapshot.accuracy}%  ·  ${snapshot.timeFormatted}  ` +
    theme.reset;
  const progressLine = '  ' + progressBar;

  const topPadding = 2;
  const blockHeight = topPadding + 2 + 3;
  const termHeight = process.stdout.rows || 24;
  const startRow = Math.max(1, Math.floor((termHeight - blockHeight) / 2) + 1);

  const cols = process.stdout.columns || 80;
  let out = '\x1b[?25l\x1b[2J\x1b[H';
  let row = startRow;
  out += '\x1b[' + row + ';1H\x1b[K\x1b[0m' + header + '\n';
  row++;
  out += theme.text;
  const progressPad = Math.max(0, Math.floor((cols - visibleLength(progressLine)) / 2));
  out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(progressPad) + progressLine + '\n';
  row++;
  for (let i = 0; i < topPadding; i++) {
    out += '\x1b[' + row + ';1H\x1b[K\n';
    row++;
  }
  for (let i = 0; i < lines.length; i++) {
    const pad = Math.max(0, Math.floor((cols - visibleLength(lines[i])) / 2));
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(pad) + lines[i] + '\n';
    row++;
  }
  out += theme.reset + '\x1b[?25h';
  process.stdout.write(out);
}

function visibleLength(str) {
  return str.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, '').length;
}

const TIME_OPTIONS = [15, 30, 45, 60];

function renderTimeSelectScreen(selectedIndex) {
  const theme = THEME;
  const idx = Math.max(0, Math.min(selectedIndex, TIME_OPTIONS.length - 1));
  clearScreen();
  hideCursor();
  const optionLines = TIME_OPTIONS.map((seconds, i) => {
    const label = `  ${seconds} seconds`;
    return i === idx
      ? theme.accent + '  > ' + label + theme.reset
      : theme.text + '    ' + label + theme.reset;
  });
  const lines = [
    '',
    theme.text + '  Select test duration (↑↓ to move, Enter to start):' + theme.reset,
    '',
    ...optionLines,
    '',
    theme.dim + '  Use arrow keys and Enter  ' + theme.reset,
    '',
  ];
  const out = '\x1b[H\n' + theme.text + lines.join('\n') + theme.reset;
  process.stdout.write(out);
  showCursor();
}

function renderResultsScreen(options) {
  const { stats } = options;
  const theme = THEME;
  const s = stats.getSnapshot();

  clearScreen();
  hideCursor();
  const lines = [
    '',
    theme.accent + '  test complete  ' + theme.reset,
    '',
    theme.text + `  wpm        ${theme.accent}${s.wpm}${theme.reset}`,
    theme.text + `  raw wpm    ${theme.accent}${Math.round(s.rawWpm)}${theme.reset}`,
    theme.text + `  accuracy   ${theme.accent}${s.accuracy}%${theme.reset}`,
    theme.text + `  errors     ${theme.accent}${s.totalErrors}${theme.reset}`,
    theme.text + `  time       ${theme.accent}${s.timeFormatted}${theme.reset}`,
    '',
    theme.dim + '  Press Ctrl+C to exit  ' + theme.reset,
    '',
  ];
  const out = '\x1b[H\n' + theme.text + lines.join('\n') + theme.reset;
  process.stdout.write(out);
  showCursor();
}

module.exports = {
  THEME,
  clearScreen,
  hideCursor,
  showCursor,
  renderTimeSelectScreen,
  renderTestScreen,
  renderResultsScreen,
  visibleLength,
};
