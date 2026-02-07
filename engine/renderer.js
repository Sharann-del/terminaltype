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


const ASCII_ART_TITLE = [
  '███╗   ███╗ ██████╗ ███╗   ██╗██╗  ██╗███████╗██╗   ██╗████████╗██╗   ██╗██████╗ ███████╗    ████████╗██╗   ██╗██╗',
  '████╗ ████║██╔═══██╗████╗  ██║██║ ██╔╝██╔════╝╚██╗ ██╔╝╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝    ╚══██╔══╝██║   ██║██║',
  '██╔████╔██║██║   ██║██╔██╗ ██║█████╔╝ █████╗   ╚████╔╝    ██║    ╚████╔╝ ██████╔╝█████╗         ██║   ██║   ██║██║',
  '██║╚██╔╝██║██║   ██║██║╚██╗██║██╔═██╗ ██╔══╝    ╚██╔╝     ██║     ╚██╔╝  ██╔═══╝ ██╔══╝         ██║   ██║   ██║██║',
  '██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║  ██╗███████╗   ██║      ██║      ██║   ██║     ███████╗       ██║   ╚██████╔╝██║',
  '╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝   ╚═╝      ╚═╝      ╚═╝   ╚═╝     ╚══════╝       ╚═╝    ╚═════╝ ╚═╝',
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
    wordLimit,
    caretPhase,
  } = options;
  const theme = THEME;
  const [lineTop, lineCenter, lineBottom] = typingState.getLines();
  const snapshot = stats.getSnapshot();
  const elapsed = snapshot.elapsedSeconds;
  const progress =
    wordLimit != null && typeof typingState.getTotalWordsCompleted === 'function'
      ? Math.min(1, typingState.getTotalWordsCompleted() / wordLimit)
      : Math.min(1, timeLimitSeconds > 0 ? elapsed / timeLimitSeconds : 0);

  const line0 = renderLine(lineTop, 0, typingState, theme);
  const line1 = renderLine(lineCenter, 1, typingState, theme);
  const line2 = renderLine(lineBottom, 2, typingState, theme);
  const lines = [line0, line1, line2];

  const progressWidth = 40;
  const progressBar = buildProgressBar(progress, progressWidth, theme);
  const wordsInfo =
    wordLimit != null && typeof typingState.getTotalWordsCompleted === 'function'
      ? `  ${typingState.getTotalWordsCompleted()}/${wordLimit} words`
      : '';
  const header =
    theme.accent +
    `wpm ${String(snapshot.wpm).padStart(3)}  ·  acc ${snapshot.accuracy}%  ·  ${snapshot.timeFormatted}${wordsInfo}` +
    theme.reset;

  const statsContent = [header, ' ', progressBar];
  const statsBox = boxAround(statsContent, theme, progressWidth + 4);

  const typingContent = [line0, line1, line2];
  const typingBox = boxAround(typingContent, theme, Math.max(...lines.map((l) => visibleLength(l))));

  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;
  const statsBoxHeight = statsBox.length;
  const typingBoxHeight = typingBox.length;
  const totalHeight = statsBoxHeight + 2 + typingBoxHeight;
  const startRow = Math.max(1, Math.floor((termHeight - totalHeight) / 2) + 1);

  const statsPad = Math.max(0, Math.floor((cols - visibleLength(statsBox[0])) / 2));
  const typingPad = Math.max(0, Math.floor((cols - visibleLength(typingBox[0])) / 2));

  let out = '\x1b[?25l\x1b[2J\x1b[H';
  let row = startRow;
  for (const line of statsBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(statsPad) + line + '\n';
    row++;
  }
  row += 2;
  for (const line of typingBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(typingPad) + line + '\n';
    row++;
  }
  out += theme.reset + '\x1b[?25h';
  process.stdout.write(out);
}

function visibleLength(str) {
  return str.replace(/\x1b\[[?0-9;]*[a-zA-Z]/g, '').length;
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

const MAIN_MENU_OPTIONS = ['Time', 'Words', 'Zen mode', 'Custom'];
const TIME_OPTIONS = [15, 30, 45, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

const HELP_LINES = [
  '  ↑ / ↓     Select option',
  '  Enter     Confirm / Start test',
  '  Enter     During test: restart test (new words, except in Custom)',
  '  Ctrl+C    Quit',
];

function renderEntryAndMainMenu(selectedIndex) {
  const theme = THEME;
  const idx = Math.max(0, Math.min(selectedIndex, MAIN_MENU_OPTIONS.length - 1));
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
  const titleWidth = Math.max(...ASCII_ART_TITLE.map((l) => l.length));

  const titleContent = ASCII_ART_TITLE.map((line) => theme.accent + line + theme.reset);
  const titleBox = boxAround(titleContent, theme, titleWidth);
  const titlePad = Math.max(0, Math.floor((cols - visibleLength(titleBox[0])) / 2));

  const menuContent = [
    theme.text + 'Select mode (↑↓ move, Enter select)' + theme.reset,
    '',
    ...MAIN_MENU_OPTIONS.map((label, i) =>
      i === idx ? theme.accent + '  > ' + label + theme.reset : theme.text + '    ' + label + theme.reset
    ),
  ];
  const menuBox = boxAround(menuContent, theme, 36);
  const menuPad = Math.max(0, Math.floor((cols - visibleLength(menuBox[0])) / 2));

  const helpContent = [theme.dim + 'Help' + theme.reset, '', ...HELP_LINES.map((l) => theme.dim + l.trim() + theme.reset)];
  const helpBox = boxAround(helpContent, theme, 44);
  const helpPad = Math.max(0, Math.floor((cols - visibleLength(helpBox[0])) / 2));

  let out = '\x1b[H\n';
  for (const line of titleBox) {
    out += ' '.repeat(titlePad) + line + '\n';
  }
  out += '\n';
  for (const line of menuBox) {
    out += ' '.repeat(menuPad) + line + '\n';
  }
  out += '\n';
  for (const line of helpBox) {
    out += ' '.repeat(helpPad) + line + '\n';
  }
  process.stdout.write(out);
  showCursor();
}

function renderTimeSubmenu(selectedIndex) {
  const theme = THEME;
  const idx = Math.max(0, Math.min(selectedIndex, TIME_OPTIONS.length - 1));
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
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
  const boxLines = boxAround(content, theme, 48);
  const pad = Math.max(0, Math.floor((cols - visibleLength(boxLines[0])) / 2));
  const out = '\x1b[H\n\n' + boxLines.map((l) => ' '.repeat(pad) + l).join('\n') + '\n';
  process.stdout.write(out);
  showCursor();
}

function renderWordsSubmenu(selectedIndex) {
  const theme = THEME;
  const idx = Math.max(0, Math.min(selectedIndex, WORD_OPTIONS.length - 1));
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
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
  const boxLines = boxAround(content, theme, 44);
  const pad = Math.max(0, Math.floor((cols - visibleLength(boxLines[0])) / 2));
  const out = '\x1b[H\n\n' + boxLines.map((l) => ' '.repeat(pad) + l).join('\n') + '\n';
  process.stdout.write(out);
  showCursor();
}

function renderCustomInputScreen(prompt, inputText, cursorOffset) {
  const theme = THEME;
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
  const totalBoxWidth = Math.min(72, Math.max(40, cols - 4));
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
  const out = '\x1b[H\n\n' + boxLines.map((l) => ' '.repeat(pad) + l).join('\n') + '\n';
  process.stdout.write(out);
  showCursor();
}

function renderZenTestScreen(stats, typedSoFar, caretPhase) {
  const theme = THEME;
  const snapshot = stats.getSnapshot();
  clearScreen();
  hideCursor();
  const cols = process.stdout.columns || 80;
  const termHeight = process.stdout.rows || 24;

  const headerContent = [
    theme.accent +
      `wpm ${String(snapshot.wpm).padStart(3)}  ·  acc ${snapshot.accuracy}%  ·  ${snapshot.timeFormatted}` +
      theme.reset,
    theme.dim + 'Enter to end test' + theme.reset,
  ];
  const headerBox = boxAround(headerContent, theme, 42);

  const totalBoxWidth = Math.min(72, Math.max(40, cols - 4));
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

  const headerPad = Math.max(0, Math.floor((cols - visibleLength(headerBox[0])) / 2));
  const typingPad = Math.max(0, Math.floor((cols - visibleLength(typingBox[0])) / 2));
  const startRow = Math.max(2, Math.floor(termHeight / 2) - Math.ceil(typingBox.length / 2) - 2);

  let out = '\x1b[?25l\x1b[2J\x1b[H';
  let row = startRow;
  for (const line of headerBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(headerPad) + line + '\n';
    row++;
  }
  row += 2;
  for (const line of typingBox) {
    out += '\x1b[' + row + ';1H\x1b[K' + ' '.repeat(typingPad) + line + '\n';
    row++;
  }
  out += '\x1b[?25h';
  process.stdout.write(out);
}

function renderResultsScreen(options) {
  const { stats } = options;
  const theme = THEME;
  const s = stats.getSnapshot();
  const cols = process.stdout.columns || 80;

  clearScreen();
  hideCursor();
  const content = [
    theme.accent + 'test complete' + theme.reset,
    '',
    theme.text + `wpm        ${theme.accent}${s.wpm}${theme.reset}`,
    theme.text + `raw wpm    ${theme.accent}${Math.round(s.rawWpm)}${theme.reset}`,
    theme.text + `accuracy   ${theme.accent}${s.accuracy}%${theme.reset}`,
    theme.text + `errors     ${theme.accent}${s.totalErrors}${theme.reset}`,
    theme.text + `time       ${theme.accent}${s.timeFormatted}${theme.reset}`,
    '',
    theme.dim + 'Enter  return to menu   ·   Ctrl+C  quit' + theme.reset,
  ];
  const boxLines = boxAround(content, theme, 32);
  const pad = Math.max(0, Math.floor((cols - visibleLength(boxLines[0])) / 2));
  const out = '\x1b[H\n\n' + boxLines.map((l) => ' '.repeat(pad) + l).join('\n') + '\n';
  process.stdout.write(out);
  showCursor();
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
  visibleLength,
  TIME_OPTIONS,
  WORD_OPTIONS,
  MAIN_MENU_OPTIONS,
};
