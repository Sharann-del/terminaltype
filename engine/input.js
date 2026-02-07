'use strict';

const readline = require('readline');

function setupRawInput(onKey) {
  if (!process.stdin.isTTY) {
    throw new Error('Not a TTY. Run in a terminal.');
  }
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();

  process.stdin.on('keypress', (str, key) => {
    if (!key) {
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
    if (key.name === 'return' || key.name === 'enter') {
      onKey({ type: 'enter' });
      return;
    }
    if (key.name === 'escape') {
      onKey({ type: 'escape' });
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
