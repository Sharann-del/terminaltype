'use strict';

const fs = require('fs');
const path = require('path');

const MAX_LINE_LEN = 70;

function loadWordlist(wordlistPath) {
  const fullPath = path.isAbsolute(wordlistPath)
    ? wordlistPath
    : path.join(process.cwd(), wordlistPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const all = content
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);
  const unique = [...new Set(all)];
  if (unique.length === 0) throw new Error('Wordlist is empty');
  return unique;
}

function createWordStream(words) {
  let index = 0;
  return function getNextWords(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(words[(index + i) % words.length]);
    }
    index = (index + n) % words.length;
    return out;
  };
}

function buildLine(getNextWords, maxLen) {
  const line = [];
  let len = 0;
  while (true) {
    const next = getNextWords(1);
    if (next.length === 0) break;
    const w = next[0];
    const need = len + (line.length ? 1 : 0) + w.length;
    if (line.length > 0 && need > maxLen) break;
    line.push(w);
    len += (line.length > 1 ? 1 : 0) + w.length;
  }
  return line;
}

function createLineBasedTypingState(wordlistPath) {
  const words = loadWordlist(wordlistPath);
  const getNextWords = createWordStream(words);

  let lineTop = [];
  let lineCenter = [];
  let lineBottom = [];
  let typedTop = [];
  let typedCenter = [];
  let currentRowIndex = 0;
  let wordIndex = 0;
  let charIndex = 0;

  function ensureLines() {
    if (lineTop.length === 0 && lineCenter.length === 0 && lineBottom.length === 0) {
      lineTop = buildLine(getNextWords, MAX_LINE_LEN);
      lineCenter = buildLine(getNextWords, MAX_LINE_LEN);
      lineBottom = buildLine(getNextWords, MAX_LINE_LEN);
      typedTop = Array.from({ length: lineTop.length }, () => []);
      typedCenter = Array.from({ length: lineCenter.length }, () => []);
    }
  }

  ensureLines();

  function getCharStatus(lineIdx, wordIdx, charIdx) {
    if (lineIdx === 0) {
      const t = typedTop[wordIdx];
      if (currentRowIndex === 1) {
        if (t && charIdx < t.length) return t[charIdx].correct ? 'correct' : 'incorrect';
        return 'untyped';
      }
      if (wordIdx < wordIndex) {
        if (t && charIdx < t.length) return t[charIdx].correct ? 'correct' : 'incorrect';
        return 'untyped';
      }
      if (wordIdx === wordIndex) {
        if (t && charIdx < t.length) return t[charIdx].correct ? 'correct' : 'incorrect';
        if (charIdx === (t ? t.length : 0)) return 'caret';
        return 'untyped';
      }
      return 'untyped';
    }
    if (lineIdx === 1) {
      const t = typedCenter[wordIdx];
      if (currentRowIndex !== 1) return 'untyped';
      if (wordIdx < wordIndex) {
        if (t && charIdx < t.length) return t[charIdx].correct ? 'correct' : 'incorrect';
        return 'untyped';
      }
      if (wordIdx === wordIndex) {
        if (t && charIdx < t.length) return t[charIdx].correct ? 'correct' : 'incorrect';
        if (charIdx === (t ? t.length : 0)) return 'caret';
        return 'untyped';
      }
      return 'untyped';
    }
    return 'untyped';
  }

  return {
    getLines() {
      ensureLines();
      return [lineTop, lineCenter, lineBottom];
    },

    getCurrentWordIndex() {
      return wordIndex;
    },

    getCharIndex() {
      return charIndex;
    },

    getCharStatus(lineIdx, wordIdx, charIdx) {
      return getCharStatus(lineIdx, wordIdx, charIdx);
    },

    isWordComplete(lineIdx, wordIdx) {
      if (lineIdx === 0) return currentRowIndex === 1 || wordIdx < wordIndex;
      if (lineIdx === 1) return currentRowIndex === 1 && wordIdx < wordIndex;
      return false;
    },

    isCurrentWord(lineIdx, wordIdx) {
      return lineIdx === currentRowIndex && wordIdx === wordIndex;
    },

    handleCharacter(char, stats) {
      const line = currentRowIndex === 0 ? lineTop : lineCenter;
      const typed = currentRowIndex === 0 ? typedTop : typedCenter;
      const word = line[wordIndex];
      if (!word) return { completed: false, scrolled: false };

      const expected = word[charIndex];
      const correct = char === expected;
      typed[wordIndex].push({ char, correct });
      if (correct) stats.recordCorrect();
      else stats.recordIncorrect();
      charIndex += 1;
      return { completed: false, scrolled: false };
    },

    handleSpace(stats) {
      const line = currentRowIndex === 0 ? lineTop : lineCenter;
      if (wordIndex === line.length - 1) {
        if (currentRowIndex === 0) {
          currentRowIndex = 1;
          wordIndex = 0;
          charIndex = 0;
          return { completed: false, scrolled: false };
        }
        lineTop = lineCenter;
        typedTop = typedCenter;
        lineCenter = lineBottom;
        typedCenter = Array.from({ length: lineCenter.length }, () => []);
        lineBottom = buildLine(getNextWords, MAX_LINE_LEN);
        wordIndex = 0;
        charIndex = 0;
        return { completed: false, scrolled: true };
      }
      wordIndex += 1;
      charIndex = 0;
      return { completed: false, scrolled: false };
    },

    handleBackspace(stats) {
      const typed = currentRowIndex === 0 ? typedTop : typedCenter;
      if (charIndex > 0) {
        const last = typed[wordIndex].pop();
        if (last.correct) stats.recordBackspaceOnCorrect();
        else stats.recordBackspaceOnError();
        charIndex -= 1;
        return true;
      }
      if (wordIndex > 0) {
        wordIndex -= 1;
        charIndex = typed[wordIndex].length;
        if (charIndex > 0) {
          const last = typed[wordIndex].pop();
          if (last.correct) stats.recordBackspaceOnCorrect();
          else stats.recordBackspaceOnError();
          charIndex -= 1;
        }
        return true;
      }
      return false;
    },

    isTestComplete(timeLimitSeconds, elapsedSeconds) {
      return elapsedSeconds >= timeLimitSeconds;
    },
  };
}

module.exports = {
  loadWordlist,
  createWordStream,
  buildLine,
  createLineBasedTypingState,
  MAX_LINE_LEN,
};
