'use strict';

function createStats() {
  let startTime = null;
  let correctCharacters = 0;
  let totalTypedCharacters = 0;
  let totalErrors = 0;

  return {
    start() {
      if (startTime === null) {
        startTime = Date.now();
      }
      return startTime;
    },

    getStartTime() {
      return startTime;
    },

    recordCorrect() {
      correctCharacters += 1;
      totalTypedCharacters += 1;
    },

    recordIncorrect() {
      totalTypedCharacters += 1;
      totalErrors += 1;
    },

    recordBackspaceOnCorrect() {
      correctCharacters = Math.max(0, correctCharacters - 1);
      totalTypedCharacters = Math.max(0, totalTypedCharacters - 1);
    },

    recordBackspaceOnError() {
      totalTypedCharacters = Math.max(0, totalTypedCharacters - 1);
      totalErrors = Math.max(0, totalErrors - 1);
    },

    getElapsedSeconds() {
      if (startTime === null) return 0;
      return (Date.now() - startTime) / 1000;
    },

    getWPM() {
      const elapsed = this.getElapsedSeconds();
      if (elapsed <= 0) return 0;
      return (correctCharacters / 5) / (elapsed / 60);
    },

    getRawWPM() {
      const elapsed = this.getElapsedSeconds();
      if (elapsed <= 0) return 0;
      return (totalTypedCharacters / 5) / (elapsed / 60);
    },

    getAccuracy() {
      if (totalTypedCharacters === 0) return 100;
      return (correctCharacters / totalTypedCharacters) * 100;
    },

    getCorrectCharacters() {
      return correctCharacters;
    },

    getTotalTypedCharacters() {
      return totalTypedCharacters;
    },

    getTotalErrors() {
      return totalErrors;
    },

    getSnapshot() {
      const elapsed = this.getElapsedSeconds();
      return {
        wpm: Math.round(this.getWPM()),
        rawWpm: Math.round(this.getRawWPM()),
        accuracy: this.getAccuracy().toFixed(1),
        correctCharacters: this.getCorrectCharacters(),
        totalTypedCharacters: this.getTotalTypedCharacters(),
        totalErrors: this.getTotalErrors(),
        elapsedSeconds: elapsed,
        timeFormatted: formatTime(elapsed),
      };
    },
  };
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

module.exports = { createStats, formatTime };
