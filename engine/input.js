'use strict';

const readline = require('readline');

let keypressEventsEmitted = false;

function setupRawInput(onKey) {
  if (!process.stdin.isTTY) {
    throw new Error('Not a TTY. Run in a terminal.');
  }
  if (!keypressEventsEmitted) {
    readline.emitKeypressEvents(process.stdin);
    keypressEventsEmitted = true;
  }
  process.stdin.removeAllListeners('keypress');
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();

  const isShiftEnterSequence = (s) =>
    (typeof s === 'string' && (s === '\x1b[13;2~' || s === '\x1b[13~' || s === '[13;2~' || s === '[13~' || s === '13~'));

  process.stdin.on('keypress', (str, key) => {
    if (key && key.sequence && isShiftEnterSequence(key.sequence)) {
      onKey({ type: 'shiftEnter' });
      return;
    }
    if (!key) {
      if (str === '\u001b' || str === '\x1b') {
        onKey({ type: 'escape' });
        return;
      }
      if (isShiftEnterSequence(str)) {
        onKey({ type: 'shiftEnter' });
        return;
      }
      if (str) onKey({ type: 'char', char: str });
      return;
    }
    if (key.ctrl && key.name === 'c') {
      onKey({ type: 'exit' });
      return;
    }
    if (key.name === 'backspace') {
      onKey({ type: 'backspace' });
      return;
    }
    if (key.name === 'up') {
      onKey({ type: 'arrowUp' });
      return;
    }
    if (key.name === 'down') {
      onKey({ type: 'arrowDown' });
      return;
    }
    if (key.name === 'left') {
      onKey({ type: 'arrowLeft' });
      return;
    }
    if (key.name === 'right') {
      onKey({ type: 'arrowRight' });
      return;
    }
    if (key.name === 'return' || key.name === 'enter') {
      onKey({ type: key.shift ? 'shiftEnter' : 'enter' });
      return;
    }
    if (key.name === 'escape') {
      onKey({ type: 'escape' });
      return;
    }
    if (key.name === 'tab') {
      onKey({ type: 'tab' });
      return;
    }
    if (key.name === 'space') {
      onKey({ type: 'char', char: ' ' });
      return;
    }
    if (str && str.length === 1 && !key.ctrl && !key.meta && !key.alt) {
      onKey({ type: 'char', char: str });
    }
  });
}

function restoreTerminal() {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdin.removeAllListeners('keypress');
}

module.exports = { setupRawInput, restoreTerminal };
