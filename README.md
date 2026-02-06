# 🐒 monkeytypetui

> A Monkeytype-inspired typing test built for the Unix terminal.

`monkeytypetui` is a fast, minimal, real-time typing test that runs entirely inside your terminal — no browser required.

Built with Node.js. Distributed via npm and Homebrew.

---

## ✨ Features

- ⚡ Real-time keystroke capture (no Enter required)
- 🎯 Live WPM calculation
- 📊 Live accuracy tracking
- ⏱ Configurable test duration
- 🎨 Colored feedback (correct / incorrect characters)
- 🧠 Monkeytype-inspired minimal interface
- 💻 Runs entirely inside the terminal
- 🍺 Installable via Homebrew
- 📦 Installable via npm

---

## 📦 Installation

### 🍺 macOS (Homebrew)

```bash
brew tap sharann-del/monkeytypetui
brew install monkeytypetui
```

Run:

```bash
monkeytypetui
```

---

### 📦 npm (macOS / Linux)

```bash
npm install -g monkeytypetui
```

Run:

```bash
monkeytypetui
```

---

## 🚀 Usage

Basic:

```bash
monkeytypetui
```

With options:

```bash
monkeytypetui --time 30
monkeytypetui --words 50
```

---

## ⚙️ Options

| Option | Description |
|--------|------------|
| `--time <seconds>` | Set test duration |
| `--words <count>` | Set number of words |

Defaults:
- 60 seconds
- 30 words

---

## 🧠 How It Works

- Loads words from `wordlist.txt`
- Starts timer on first keypress
- Tracks:
  - Correct characters
  - Incorrect characters
  - Raw WPM
  - Adjusted WPM
  - Accuracy %
- Ends after configured duration
- Displays summary statistics

WPM formula:

```
(correct_characters / 5) / (elapsed_time_minutes)
```

Accuracy formula:

```
(correct_characters / total_typed_characters) * 100
```

---

## 🏗 Project Structure

```
monkeytypetui/
│
├── index.js
├── package.json
├── wordlist.txt
└── engine/
    ├── input.js
    ├── renderer.js
    ├── stats.js
    └── typing.js
```

- `input.js` → Raw key capture
- `renderer.js` → ANSI rendering engine
- `stats.js` → WPM & accuracy logic
- `typing.js` → Word & typing state management

---

## 🛠 Requirements

- Node.js ≥ 14
- macOS or Linux
- Terminal with ANSI color support

---

## 🔄 Updating

If installed via Homebrew:

```bash
brew update
brew upgrade monkeytypetui
```

If installed via npm:

```bash
npm update -g monkeytypetui
```

---

## 🧪 Development

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

## 📜 License

MIT License

---

## 👨‍💻 Author

Sharann M  
GitHub: https://github.com/sharann-del

---

## ⭐ Support

If you like this project:

- Star the repo
- Share it
- Open issues
- Suggest features

---

## 🚀 Future Roadmap

- Custom themes
- Persistent high scores
- Config file support
- Zen mode
- Sound feedback
- Performance graph after test
- Leaderboard system
