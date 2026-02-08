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

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

function createLimitedWordStream(words) {
  let index = 0;
  return function getNextWords(n) {
    const out = [];
    for (let i = 0; i < n && index < words.length; i++) {
      out.push(words[index++]);
    }
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
    if (line.length > 0 && need > maxLen) {
      line.push(w);
      len += (line.length > 1 ? 1 : 0) + w.length;
      break;
    }
    line.push(w);
    len += (line.length > 1 ? 1 : 0) + w.length;
  }
  return line;
}

function createLineBasedTypingState(wordlistPath, options = {}) {
  const { wordCount: wordLimit = null } = options;
  const allWords = shuffleArray(loadWordlist(wordlistPath));
  const words = wordLimit != null ? allWords.slice(0, wordLimit) : allWords;
  const getNextWords =
    wordLimit != null ? createLimitedWordStream(words) : createWordStream(words);
  return createLineBasedTypingStateFromWords(getNextWords, MAX_LINE_LEN, wordLimit);
}

function createLineBasedTypingStateFromWords(getNextWords, maxLineLen, wordLimit) {
  let lineTop = [];
  let lineCenter = [];
  let lineBottom = [];
  let typedTop = [];
  let typedCenter = [];
  let currentRowIndex = 0;
  let wordIndex = 0;
  let charIndex = 0;
  let wordsCompletedBeforeCurrentLine = 0;
  let lastRemovedTapeChars = 0;

  function ensureLines() {
    if (lineTop.length === 0 && lineCenter.length === 0 && lineBottom.length === 0) {
      lineTop = buildLine(getNextWords, maxLineLen);
      lineCenter = buildLine(getNextWords, maxLineLen);
      lineBottom = buildLine(getNextWords, maxLineLen);
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
      if (!word) return { completed: false, scrolled: false, correct: true };

      if (charIndex >= word.length) {
        stats.recordIncorrect();
        return { completed: false, scrolled: false, correct: false };
      }
      const expected = word[charIndex];
      const correct = char === expected;
      typed[wordIndex].push({ char, correct });
      if (correct) stats.recordCorrect();
      else stats.recordIncorrect();
      charIndex += 1;
      return { completed: false, scrolled: false, correct };
    },

    handleSpace(stats) {
      const line = currentRowIndex === 0 ? lineTop : lineCenter;
      const typed = currentRowIndex === 0 ? typedTop : typedCenter;
      const currentWord = line[wordIndex];
      const currentTyped = typed[wordIndex];
      const wordTypedCorrectly = currentWord && currentTyped && currentTyped.length === currentWord.length && currentTyped.every((t) => t.correct);
      if (currentWord && typeof stats.recordWordCompleted === 'function') {
        stats.recordWordCompleted(currentWord.length);
      }
      if (typeof stats.recordSpace === 'function') {
        stats.recordSpace(!!wordTypedCorrectly);
      }
      if (wordIndex === line.length - 1) {
        if (currentRowIndex === 0) {
          wordsCompletedBeforeCurrentLine = line.length;
          currentRowIndex = 1;
          wordIndex = 0;
          charIndex = 0;
          return { completed: false, scrolled: false };
        }
        wordsCompletedBeforeCurrentLine += line.length;
        const removedLen = lineTop.reduce((s, w) => s + w.length, 0) + lineTop.length;
        lastRemovedTapeChars = removedLen;
        lineTop = lineCenter;
        typedTop = typedCenter;
        lineCenter = lineBottom;
        typedCenter = Array.from({ length: lineCenter.length }, () => []);
        lineBottom = buildLine(getNextWords, maxLineLen);
        wordIndex = 0;
        charIndex = 0;
        return { completed: false, scrolled: true };
      }
      wordIndex += 1;
      charIndex = 0;
      return { completed: false, scrolled: false };
    },

    handleBackspace(stats, options = {}) {
      const { allowPreviousWord = true } = options;
      const typed = currentRowIndex === 0 ? typedTop : typedCenter;
      if (charIndex > 0) {
        const last = typed[wordIndex].pop();
        if (last.correct) stats.recordBackspaceOnCorrect();
        else stats.recordBackspaceOnError();
        charIndex -= 1;
        return true;
      }
      if (allowPreviousWord && wordIndex > 0) {
        wordIndex -= 1;
        charIndex = typed[wordIndex].length;
        return true;
      }
      return false;
    },

    currentWordHasErrors() {
      const typed = currentRowIndex === 0 ? typedTop : typedCenter;
      const t = typed[wordIndex];
      if (!t || t.length === 0) return false;
      return t.some((entry) => !entry.correct);
    },

    hasErrorInTypedLine() {
      const typed = currentRowIndex === 0 ? typedTop : typedCenter;
      for (let w = 0; w <= wordIndex; w++) {
        const tw = typed[w];
        if (!tw) continue;
        const limit = w === wordIndex ? charIndex : tw.length;
        for (let i = 0; i < limit; i++) {
          if (!tw[i].correct) return true;
        }
      }
      return false;
    },

    canBackspaceToPreviousWord() {
      if (this.hasErrorInTypedLine()) return true;
      ensureLines();
      const line = currentRowIndex === 0 ? lineTop : lineCenter;
      const typed = currentRowIndex === 0 ? typedTop : typedCenter;
      if (!line || wordIndex >= line.length) return false;
      for (let w = 0; w < wordIndex; w++) {
        const tw = typed[w];
        if (tw && tw.length < line[w].length) return true;
      }
      const expectedLen = line[wordIndex].length;
      if (charIndex > 0 && charIndex < expectedLen) return true;
      if (charIndex === 0 && wordIndex > 0) {
        const prevTyped = typed[wordIndex - 1];
        const prevExpected = line[wordIndex - 1].length;
        return prevTyped && prevTyped.length < prevExpected;
      }
      return false;
    },

    getCurrentRowIndex() {
      return currentRowIndex;
    },

    getCharIndexFromStart(lineIdx, wordIdx, charIdx) {
      ensureLines();
      const lines = [lineTop, lineCenter, lineBottom];
      let idx = 0;
      for (let l = 0; l < lineIdx; l++) {
        for (let w = 0; w < lines[l].length; w++) {
          idx += lines[l][w].length;
          if (w < lines[l].length - 1) idx += 1;
        }
        if (l < 2) idx += 1;
      }
      for (let w = 0; w < wordIdx; w++) {
        idx += lines[lineIdx][w].length;
        if (w < lines[lineIdx].length - 1) idx += 1;
      }
      idx += charIdx;
      return idx;
    },

    getLogicalCaretCharIndex() {
      return this.getCharIndexFromStart(currentRowIndex, wordIndex, charIndex);
    },

    getTapeLength() {
      ensureLines();
      const lines = [lineTop, lineCenter, lineBottom];
      let len = 0;
      for (let l = 0; l < 3; l++) {
        const line = lines[l];
        for (let w = 0; w < line.length; w++) {
          len += line[w].length;
          if (w < line.length - 1) len += 1;
        }
        if (l < 2) len += 1;
      }
      return len;
    },

    getTapeCharAt(flatCharIndex) {
      ensureLines();
      const lines = [lineTop, lineCenter, lineBottom];
      let idx = 0;
      for (let lineIdx = 0; lineIdx < 3; lineIdx++) {
        const line = lines[lineIdx];
        for (let wordIdx = 0; wordIdx < line.length; wordIdx++) {
          const word = line[wordIdx];
          for (let i = 0; i < word.length; i++) {
            if (idx === flatCharIndex) {
              return { char: word[i], status: getCharStatus(lineIdx, wordIdx, i) };
            }
            idx++;
          }
          if (wordIdx < line.length - 1) {
            if (idx === flatCharIndex) {
              const caretOnSpace =
                currentRowIndex === lineIdx && wordIndex === wordIdx && charIndex === word.length;
              const spaceStatus = caretOnSpace
                ? 'caret'
                : currentRowIndex > lineIdx || (currentRowIndex === lineIdx && wordIndex > wordIdx)
                  ? 'correct'
                  : 'untyped';
              return { char: ' ', status: spaceStatus };
            }
            idx++;
          }
        }
        if (lineIdx < 2) {
          if (idx === flatCharIndex) {
            const spaceStatus =
              currentRowIndex > lineIdx
                ? 'correct'
                : currentRowIndex === lineIdx && wordIndex === line.length - 1 && charIndex === line[line.length - 1].length
                  ? 'caret'
                  : 'untyped';
            return { char: ' ', status: spaceStatus };
          }
          idx++;
        }
      }
      return { char: ' ', status: 'untyped' };
    },

    getPositionFromCharIndex(targetIndex) {
      ensureLines();
      if (targetIndex <= 0) return { lineIdx: 0, wordIdx: 0, charIdx: 0 };
      const lines = [lineTop, lineCenter, lineBottom];
      let idx = 0;
      for (let lineIdx = 0; lineIdx < 3; lineIdx++) {
        const line = lines[lineIdx];
        for (let wordIdx = 0; wordIdx < line.length; wordIdx++) {
          const word = line[wordIdx];
          for (let charIdx = 0; charIdx <= word.length; charIdx++) {
            if (idx === targetIndex) return { lineIdx, wordIdx, charIdx };
            idx++;
          }
          if (wordIdx < line.length - 1) idx++;
        }
        if (lineIdx < 2) {
          if (idx === targetIndex) return { lineIdx: lineIdx + 1, wordIdx: 0, charIdx: 0 };
          idx++;
        }
      }
      const lastLine = lines[2];
      const lastWordIdx = lastLine.length - 1;
      const lastCharIdx = lastWordIdx >= 0 ? lastLine[lastWordIdx].length : 0;
      return { lineIdx: 2, wordIdx: Math.max(0, lastWordIdx), charIdx: lastCharIdx };
    },

    getTotalWordsCompleted() {
      return wordsCompletedBeforeCurrentLine + wordIndex;
    },

    getLastRemovedTapeChars() {
      const n = lastRemovedTapeChars;
      lastRemovedTapeChars = 0;
      return n;
    },

    getTotalWordsTyped() {
      const line = currentRowIndex === 0 ? lineTop : lineCenter;
      const word = line[wordIndex];
      if (word && charIndex >= word.length) {
        return wordsCompletedBeforeCurrentLine + wordIndex + 1;
      }
      return wordsCompletedBeforeCurrentLine + wordIndex;
    },

    isTestComplete(timeLimitSeconds, elapsedSeconds) {
      if (timeLimitSeconds != null && elapsedSeconds >= timeLimitSeconds) return true;
      if (wordLimit != null) {
        const totalTyped = this.getTotalWordsTyped();
        if (totalTyped >= wordLimit) return true;
      }
      return false;
    },
  };
}

function createCustomTypingState(customText) {
  const words = customText
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  if (words.length === 0) throw new Error('Custom text has no words');
  const getNextWords = createLimitedWordStream(words);
  return createLineBasedTypingStateFromWords(getNextWords, MAX_LINE_LEN, words.length);
}

function createZenTypingState() {
  let typedSoFar = '';
  return {
    getTypedSoFar() {
      return typedSoFar;
    },
    getLines() {
      return [[], [], []];
    },
    getCurrentWordIndex: () => 0,
    getCharIndex: () => typedSoFar.length,
    getCharStatus: () => 'untyped',
    isWordComplete: () => false,
    isCurrentWord: () => false,
    currentWordHasErrors: () => false,
    handleCharacter(char, stats) {
      typedSoFar += char;
      stats.recordCorrect();
      return { completed: false, scrolled: false, correct: true };
    },
    handleSpace(stats) {
      typedSoFar += ' ';
      stats.recordCorrect();
      return { completed: false, scrolled: false };
    },
    handleBackspace(stats, _options = {}) {
      if (typedSoFar.length === 0) return false;
      typedSoFar = typedSoFar.slice(0, -1);
      stats.recordBackspaceOnCorrect();
      return true;
    },
    isTestComplete() {
      return false;
    },
  };
}

module.exports = {
  loadWordlist,
  createWordStream,
  buildLine,
  createLineBasedTypingState,
  createLineBasedTypingStateFromWords,
  createCustomTypingState,
  createZenTypingState,
  MAX_LINE_LEN,
};