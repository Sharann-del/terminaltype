# monkeytypetui

A Monkeytype-inspired typing test for the Unix terminal.

Fast. Minimal. Real-time. No browser required.

---

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

---

### npm (macOS / Linux)

```bash
npm install -g monkeytypetui
```

Run:

```bash
monkeytypetui
```

---

## Usage

Basic:

```bash
monkeytypetui
```

With options:

```bash
monkeytypetui --time 30
monkeytypetui --words 50
```

### Options

| Option | Description |
|--------|------------|
| `--time <seconds>` | Set test duration |
| `--words <count>` | Set number of words |

Defaults:
- 60 seconds
- 30 words

---

## Features

- Real-time keystroke capture
- Live WPM calculation
- Live accuracy tracking
- ANSI colored feedback
- Minimal terminal UI
- Installable via npm and Homebrew

---

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

---

## License

MIT
