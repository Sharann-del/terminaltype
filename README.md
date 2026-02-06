# monkeytypetui

A Monkeytype-inspired typing test for the Unix terminal.

Fast. Minimal. Real-time. No browser required.

## Installation

### Homebrew (macOS)

```bash
brew tap sharann-del/monkeytypetui
brew install monkeytypetui
```

Run:

```bash
monkeytypetui
```

### npm (macOS / Linux)

```bash
npm install -g monkeytypetui
```

Run:

```bash
monkeytypetui
```

## Update

If installed via Homebrew:

```bash
brew update
brew upgrade monkeytypetui
```

If installed via npm:

```bash
npm update -g monkeytypetui
```

## Usage

Basic:

```bash
monkeytypetui
```

With arguments:

```bash
monkeytypetui --time 30
monkeytypetui --words 50
```

Defaults:
- 60 seconds
- 30 words

## Features

- Real-time keystroke capture
- Live WPM calculation
- Live accuracy tracking
- ANSI colored feedback
- Minimal terminal interface

## Development

Clone the repository:

```bash
git clone https://github.com/sharann-del/monkeytypetui.git
cd monkeytypetui
```

Run locally:

```bash
node index.js
```
