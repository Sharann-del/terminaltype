'use strict';

/**
 * Typing test stats.
 * - timeSeconds = test duration; totalTypedChars = all characters currently in buffer; correctChars = correct; totalErrors = uncorrected (net) errors; errorsIncludingCorrected = all errors ever made (including those fixed with backspace).
 * - 1 word = 5 characters.
 * - rawWPM = (totalTypedChars / 5) / (timeSeconds / 60)  — uses all typed characters.
 * - wpm (net) = (correctChars / 5) / (timeSeconds / 60)  — uses only correct characters; lower than rawWPM if uncorrected errors remain.
 * - accuracy = (correctChars / (correctChars + errorsIncludingCorrected)) * 100  — corrected errors still count against accuracy; cannot be 100% if any error was made then fixed.
 * - characters (displayed) = correctChars / totalTypedChars (final buffer). errors (displayed) = errorsIncludingCorrected (total errors made, including corrected).
 */

function createStats() {
  let startTime = null;
  let correctCharacters = 0;
  let totalTypedCharacters = 0;
  let totalErrors = 0;
  let errorsIncludingCorrected = 0;
  let currentWordStartTime = null;
  let lastBurstWpm = 0;
  const wpmSamples = [];
  let lastWpmSampleTime = -1;

  return {
    start() {
      if (startTime === null) {
        startTime = Date.now();
      }
      currentWordStartTime = currentWordStartTime ?? Date.now();
      return startTime;
    },

    sampleWpm(force = false) {
      const elapsed = this.getElapsedSeconds();
      if (elapsed <= 0) return;
      if (force || elapsed - lastWpmSampleTime >= 1 || wpmSamples.length === 0) {
        wpmSamples.push({ t: Math.round(elapsed * 10) / 10, wpm: this.getWPM() });
        lastWpmSampleTime = elapsed;
      }
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
      errorsIncludingCorrected += 1;
    },

    recordBackspaceOnCorrect() {
      correctCharacters = Math.max(0, correctCharacters - 1);
      totalTypedCharacters = Math.max(0, totalTypedCharacters - 1);
    },

    recordBackspaceOnError() {
      totalTypedCharacters = Math.max(0, totalTypedCharacters - 1);
      totalErrors = Math.max(0, totalErrors - 1);
    },

    recordSpace(correctWord) {
      totalTypedCharacters += 1;
      if (correctWord) correctCharacters += 1;
    },

    recordWordCompleted(wordLength) {
      if (currentWordStartTime == null || wordLength <= 0) return;
      const elapsedWordSec = (Date.now() - currentWordStartTime) / 1000;
      if (elapsedWordSec > 0) {
        lastBurstWpm = Math.round((wordLength / 5) / (elapsedWordSec / 60));
      }
      currentWordStartTime = Date.now();
    },

    getBurstWPM() {
      return lastBurstWpm;
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
      const totalAttempts = correctCharacters + errorsIncludingCorrected;
      if (totalAttempts === 0) return 100;
      return (correctCharacters / totalAttempts) * 100;
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

    getErrorsIncludingCorrected() {
      return errorsIncludingCorrected;
    },

    getWpmTimeSeries() {
      return wpmSamples.slice();
    },

    getConsistency() {
      if (wpmSamples.length < 2) return 100;
      const mean = wpmSamples.reduce((s, p) => s + p.wpm, 0) / wpmSamples.length;
      if (mean <= 0) return 100;
      const variance = wpmSamples.reduce((s, p) => s + (p.wpm - mean) ** 2, 0) / wpmSamples.length;
      const std = Math.sqrt(variance);
      const cv = (std / mean) * 100;
      return Math.round(Math.max(0, 100 - Math.min(100, cv)));
    },

    getSnapshot() {
      const elapsed = this.getElapsedSeconds();
      const correct = this.getCorrectCharacters();
      const correctedErrors = this.getErrorsIncludingCorrected();
      const totalAttempted = correct + correctedErrors;
      return {
        wpm: Math.round(this.getWPM()),
        rawWpm: Math.round(this.getRawWPM()),
        accuracy: this.getAccuracy().toFixed(1),
        burstWpm: this.getBurstWPM(),
        consistency: this.getConsistency(),
        correctCharacters: correct,
        totalTypedCharacters: this.getTotalTypedCharacters(),
        totalCharactersAttempted: totalAttempted,
        totalErrors: this.getTotalErrors(),
        errorsIncludingCorrected: correctedErrors,
        elapsedSeconds: elapsed,
        timeFormatted: formatTime(elapsed),
        wpmTimeSeries: this.getWpmTimeSeries(),
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
