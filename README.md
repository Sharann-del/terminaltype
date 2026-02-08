```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║     ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗         ║
║     ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║         ║
║        ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║         ║
║        ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║         ║
║        ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗    ║
║        ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝    ║
║                                                                          ║
║                   ████████╗██╗   ██╗██████╗ ███████╗                     ║
║                   ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝                     ║
║                      ██║    ╚████╔╝ ██████╔╝█████╗                       ║
║                      ██║     ╚██╔╝  ██╔═══╝ ██╔══╝                       ║
║                      ██║      ██║   ██║     ███████╗                     ║
║                      ╚═╝      ╚═╝   ╚═╝     ╚══════╝                     ║
║                                                                          ║
║             MonkeyType-inspired terminal typing test (TUI)               ║
║            Real-time WPM & accuracy · Clean interface · Fast             ║
║                                                                          ║
║                             Version: 4.1.1                               ║
║                              License: MIT                                ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```
![terminaltype](https://github.com/user-attachments/assets/91cfef78-b48e-4b80-9a4c-c14d41884334)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  TABLE OF CONTENTS                                                       │
│  ════════════════                                                        │
│                                                                          │
│  [01] Overview                                                           │
│  [02] Features                                                           │
│  [03] Installation                                                       │
│  [04] Usage                                                              │
│  [05] Test Modes                                                         │
│  [06] Settings                                                           │
│  [07] Configuration                                                      │
│  [08] Themes                                                             │
│  [09] Statistics & Results                                               │
│  [10] Project Structure                                                  │
│  [11] Update & Uninstall                                                 │
│  [12] License                                                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [01] OVERVIEW                                                            │
└──────────────────────────────────────────────────────────────────────────┘

  terminaltype is a MonkeyType-inspired terminal typing test with a clean
  TUI interface. Built for CLI-loving developers who want a fast, 
  distraction-free typing practice environment directly in the terminal.

  Real-time WPM and accuracy tracking, multiple test modes, customizable
  themes, and comprehensive statistics - all rendered with blessed and
  blessed-contrib for a polished terminal experience.

┌──────────────────────────────────────────────────────────────────────────┐
│ SYSTEM REQUIREMENTS                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│  • Node.js >= 14.0.0                                                     │
│  • Terminal with 256-color support recommended                           │
│  • Minimum terminal size: 80x24                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [02] FEATURES                                                            │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ TEST MODES ]───────────────────────────────────────────────────────────┐
│                                                                          │
│  TIME MODE       Timed test with configurable duration                   │
│                  Options: 15s, 30s, 45s, 60s, 120s                       │
│                                                                          │
│  WORDS MODE      Word-count based test                                   │
│                  Options: 10, 25, 50, 100 words                          │
│                                                                          │
│  ZEN MODE        Unlimited words, no timer                               │
│                  Stop with Escape key                                    │
│                                                                          │
│  CUSTOM MODE     Type your own custom text                               │
│                  Enter text via custom input screen                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ LIVE METRICS ]─────────────────────────────────────────────────────────┐
│                                                                          │
│  LIVE PROGRESS    Configurable progress display (bar/text/mini/off)      │
│  LIVE SPEED       Real-time WPM tracking (text/mini/off)                 │
│  LIVE ACCURACY    Live accuracy percentage (text/mini/off)               │
│  LIVE BURST       Burst WPM calculation (text/mini/off)                  │
│  TAPE MODE        Visual tape of typed keys (letter/off)                 │
│  KEYMAP           Optional on-screen keyboard display                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ STATISTICS & TRACKING ]────────────────────────────────────────────────┐
│                                                                          │
│  • WPM (words per minute) and raw WPM                                    │
│  • Accuracy percentage and consistency score                             │
│  • Correct/incorrect character counts                                    │
│  • Test type, duration, and timestamp                                    │
│  • Result history (up to 500 tests)                                      │
│  • Personal bests tracking                                               │
│  • Aggregate statistics (total tests, time, avg WPM, avg accuracy)       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ CUSTOMIZATION ]────────────────────────────────────────────────────────┐
│                                                                          │
│  THEMES           6 built-in presets + custom color themes               │
│                   Presets: default, serika, dark, light, nord, custom    │
│                                                                          │
│  KEYMAP LAYOUTS   Staggered, matrix, or split keyboard styles            │
│                                                                          │
│  QUICK RESTART    Instant test restart with Tab or Enter (configurable)  │
│                   Escape always returns to menu                          │
│                                                                          │
│  CONFIG STORAGE   Persistent settings in ~/.config/                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [03] INSTALLATION                                                        │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ NPM GLOBAL INSTALL ]───────────────────────────────────────────────────┐
│                                                                          │
│  npm install -g terminaltype                                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ HOMEBREW (macOS/Linux) ]───────────────────────────────────────────────┐
│                                                                          │
│  brew tap sharann-del/terminaltype                                       │
│  brew install terminaltype                                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ FROM SOURCE ]──────────────────────────────────────────────────────────┐
│                                                                          │
│  # Clone repository                                                      │
│  git clone https://github.com/yourusername/terminaltype.git              │
│  cd terminaltype                                                         │
│                                                                          │
│  # Install dependencies                                                  │
│  npm install                                                             │
│                                                                          │
│  # Link globally                                                         │
│  npm link                                                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ DEPENDENCIES ]─────────────────────────────────────────────────────────┐
│                                                                          │
│  blessed          Terminal UI framework                                  │
│  blessed-contrib  Additional blessed widgets                             │
│  conf             Configuration management                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [04] USAGE                                                               │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ BASIC USAGE ]──────────────────────────────────────────────────────────┐
│                                                                          │
│  # Launch application                                                    │
│  terminaltype                                                            │
│                                                                          │
│  # Or run from source                                                    │
│  node index.js                                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ COMMAND LINE OPTIONS ]─────────────────────────────────────────────────┐
│                                                                          │
│  --clear-data     Clear all stored settings and result history           │
│                                                                          │
│  Example:                                                                │
│  terminaltype --clear-data                                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ NAVIGATION ]───────────────────────────────────────────────────────────┐
│                                                                          │
│  MAIN MENU                                                               │
│  ──────────                                                              │
│  ↑/↓              Navigate menu options                                  │
│  Enter            Select option                                          │
│  Escape           Quit application                                       │
│                                                                          │
│  DURING TEST                                                             │
│  ────────────                                                            │
│  Type naturally   Input characters                                       │
│  Backspace        Delete character                                       │
│  Escape           Return to menu                                         │
│  Tab/Enter        Quick restart (if enabled in settings)                 │
│                                                                          │
│  SETTINGS                                                                │
│  ─────────                                                               │
│  ↑/↓              Navigate options                                       │
│  ←/→              Change values                                          │
│  Enter            Confirm selection                                      │
│  Escape           Return to menu                                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [05] TEST MODES                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ TIME MODE ]────────────────────────────────────────────────────────────┐
│                                                                          │
│  Timed typing test with fixed duration. Test automatically completes     │
│  when time expires.                                                      │
│                                                                          │
│  Available durations:                                                    │
│  • 15 seconds                                                            │
│  • 30 seconds                                                            │
│  • 45 seconds                                                            │
│  • 60 seconds                                                            │
│  • 120 seconds                                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ WORDS MODE ]───────────────────────────────────────────────────────────┐
│                                                                          │
│  Word-count based test. Test completes after typing specified number     │
│  of words correctly.                                                     │
│                                                                          │
│  Available word counts:                                                  │
│  • 10 words                                                              │
│  • 25 words                                                              │
│  • 50 words                                                              │
│  • 100 words                                                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ ZEN MODE ]─────────────────────────────────────────────────────────────┐
│                                                                          │
│  Unlimited practice mode with no time limit or word count. Type as       │
│  long as you want. Press Escape to finish and view results.              │
│                                                                          │
│  • Infinite word stream from wordlist                                    │
│  • No timer pressure                                                     │
│  • Stop whenever you choose                                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ CUSTOM MODE ]──────────────────────────────────────────────────────────┐
│                                                                          │
│  Type your own custom text. Enter text via custom input screen,          │
│  then practice typing exactly what you entered.                          │
│                                                                          │
│  • Paste your own content                                                │
│  • Practice specific passages                                            │
│  • Useful for code snippets or technical text                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [06] SETTINGS                                                            │
└──────────────────────────────────────────────────────────────────────────┘

  Access settings from the main menu to customize your typing experience.
  Settings are organized into four categories:

┌─[ BEHAVIOR ]─────────────────────────────────────────────────────────────┐
│                                                                          │
│  Quick Restart                                                           │
│  ──────────────                                                          │
│  Values: off | tab | enter                                               │
│                                                                          │
│  Allows instant test restart without returning to menu.                  │
│  • off: Disabled, test ends and returns to menu                          │
│  • tab: Press Tab to restart test                                        │
│  • enter: Press Enter to restart test                                    │
│                                                                          │
│  Note: Escape always returns to menu regardless of this setting          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ APPEARANCE ]───────────────────────────────────────────────────────────┐
│                                                                          │
│  Live Progress Bar                                                       │
│  ──────────────────                                                      │
│  Values: off | bar | text | mini                                         │
│  Shows test progress during typing                                       │
│                                                                          │
│  Live Speed                                                              │
│  ───────────                                                             │
│  Values: off | text | mini                                               │
│  Display real-time WPM                                                   │
│                                                                          │
│  Live Accuracy                                                           │
│  ──────────────                                                          │
│  Values: off | text | mini                                               │
│  Display real-time accuracy percentage                                   │
│                                                                          │
│  Live Burst                                                              │
│  ───────────                                                             │
│  Values: off | text | mini                                               │
│  Display burst WPM (recent typing speed)                                 │
│                                                                          │
│  Tape Mode                                                               │
│  ──────────                                                              │
│  Values: off | letter                                                    │
│  Show typed keys on a visual tape                                        │
│                                                                          │
│  Tape Box Width                                                          │
│  ───────────────                                                         │
│  Range: 50% to 100% (step: 5%)                                           │
│  Adjusts width of tape display area                                      │
│  Default: 75%                                                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ KEYMAP ]───────────────────────────────────────────────────────────────┐
│                                                                          │
│  Keymap                                                                  │
│  ──────                                                                  │
│  Values: off | react                                                     │
│  Toggle on-screen keyboard display                                       │
│  • off: No keyboard shown                                                │
│  • react: Show keyboard with reactive highlighting on keypress           │
│                                                                          │
│  Keymap Style                                                            │
│  ─────────────                                                           │
│  Values: staggered | matrix | split                                      │
│  Choose keyboard layout style                                            │
│  • staggered: Traditional keyboard layout                                │
│  • matrix: Grid-aligned keys                                             │
│  • split: Ergonomic split layout                                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ THEME ]────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Theme Preset                                                            │
│  ────────────                                                            │
│  Values: default | serika | dark | light | nord | custom                 │
│                                                                          │
│  Built-in presets:                                                       │
│  • default  - Balanced neutral theme                                     │
│  • serika   - Warm, cream-colored theme                                  │
│  • dark     - Dark mode theme                                            │
│  • light    - Light mode theme                                           │
│  • nord     - Nord color scheme                                          │
│  • custom   - Define your own colors                                     │
│                                                                          │
│  Custom Theme Colors (when preset = custom)                              │
│  ────────────────────────────────────────────────────────────────────    │
│  • Main text       Default text color                                    │
│  • Correct letter  Color for correctly typed characters                  │
│  • Wrong letter    Color for errors                                      │
│  • Highlight       Accent/highlight color                                │
│                                                                          │
│  Additional theme properties available in config file:                   │
│  • bg          - Background color                                        │
│  • sub         - Secondary text color                                    │
│  • errorExtra  - Extra error highlighting                                │
│  • caret       - Cursor color                                            │
│                                                                          │
│  Theme Color Palette                                                     │
│  ────────────────────                                                    │
│  Hex color picker with preset swatches available in UI                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [07] CONFIGURATION                                                       │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ CONFIG FILE LOCATION ]─────────────────────────────────────────────────┐
│                                                                          │
│  Linux/macOS:   ~/.config/terminaltype/config.json                       │
│                                                                          │
│  Windows:       %APPDATA%\terminaltype\config.json                       │
│                                                                          │
│  The config file is automatically created on first run and updated       │
│  whenever settings are changed through the UI.                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ CONFIG STRUCTURE ]─────────────────────────────────────────────────────┐
│                                                                          │
│  {                                                                       │
│    "configVersion": 1,                                                   │
│    "behavior": {                                                         │
│      "quickRestart": "off",                                              │
│      "testDifficulty": "normal",                                         │
│      "blindMode": false,                                                 │
│      "freedomMode": true,                                                │
│      "confidenceMode": "off"                                             │
│    },                                                                    │
│    "appearance": {                                                       │
│      "liveProgressBar": "bar",                                           │
│      "liveSpeed": "text",                                                │
│      "liveAccuracy": "text",                                             │
│      "liveBurst": "off",                                                 │
│      "tapeMode": "off",                                                  │
│      "tapeMargin": 75,                                                   │
│      "keymapMode": "off",                                                │
│      "keymapStyle": "staggered"                                          │
│    },                                                                    │
│    "theme": {                                                            │
│      "preset": "default",                                                │
│      "custom": {                                                         │
│        "bg": "#323437",                                                  │
│        "main": "#e2b714",                                                │
│        "sub": "#646669",                                                 │
│        "text": "#d1d0c5",                                                │
│        "error": "#ca4754",                                               │
│        "errorExtra": "#7e2a33",                                          │
│        "caret": "#e2b714",                                               │
│        "typed": "#e2b714"                                                │
│      }                                                                   │
│    },                                                                    │
│    "test": {                                                             │
│      "mode": "time",                                                     │
│      "timeLimit": 60,                                                    │
│      "wordCount": 50,                                                    │
│      "language": "english"                                               │
│    },                                                                    │
│    "results": [],                                                        │
│    "personalBests": {                                                    │
│      "time15": null,                                                     │
│      "time30": null,                                                     │
│      "time60": null,                                                     │
│      "words10": null,                                                    │
│      "words25": null,                                                    │
│      "words50": null                                                     │
│    },                                                                    │
│    "stats": {                                                            │
│      "totalTests": 0,                                                    │
│      "totalTime": 0,                                                     │
│      "avgWpm": 0,                                                        │
│      "avgAccuracy": 0                                                    │
│    }                                                                     │
│  }                                                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [08] THEMES                                                              │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ BUILT-IN THEME PRESETS ]───────────────────────────────────────────────┐
│                                                                          │
│  default                                                                 │
│  ───────                                                                 │
│  bg: #323437    main: #e2b714    sub: #646669    text: #d1d0c5           │
│  error: #ca4754    errorExtra: #7e2a33    caret: #e2b714                 │
│  typed: #e2b714                                                          │
│                                                                          │
│  serika                                                                  │
│  ──────                                                                  │
│  bg: #e1e1dd    main: #e2b714    sub: #979893    text: #323437           │
│  error: #ca4754    errorExtra: #7e2a33    caret: #e2b714                 │
│  typed: #e2b714                                                          │
│                                                                          │
│  dark                                                                    │
│  ────                                                                    │
│  bg: #1a1a1a    main: #4a9eff    sub: #666666    text: #e0e0e0           │
│  error: #ff4444    errorExtra: #991111    caret: #4a9eff                 │
│  typed: #4a9eff                                                          │
│                                                                          │
│  light                                                                   │
│  ─────                                                                   │
│  bg: #f5f5f5    main: #0066cc    sub: #888888    text: #2a2a2a           │
│  error: #cc0000    errorExtra: #ff9999    caret: #0066cc                 │
│  typed: #0066cc                                                          │
│                                                                          │
│  nord                                                                    │
│  ────                                                                    │
│  bg: #2e3440    main: #88c0d0    sub: #4c566a    text: #eceff4           │
│  error: #bf616a    errorExtra: #8b3e44    caret: #88c0d0                 │
│  typed: #88c0d0                                                          │
│                                                                          │
│  custom                                                                  │
│  ──────                                                                  │
│  Define your own colors through Settings UI or config file               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ THEME COLOR PROPERTIES ]───────────────────────────────────────────────┐
│                                                                          │
│  bg             Background color                                         │
│  main           Primary accent color (highlights, caret)                 │
│  sub            Secondary text (dimmed elements)                         │
│  text           Main text color (untyped words)                          │
│  error          Error highlighting color                                 │
│  errorExtra     Additional error emphasis                                │
│  caret          Cursor/caret color                                       │
│  typed          Color for correctly typed characters                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ CREATING CUSTOM THEMES ]───────────────────────────────────────────────┐
│                                                                          │
│  1. Set theme preset to "custom" in Settings                             │
│  2. Adjust colors through Settings UI using color picker                 │
│  3. Or manually edit config file with hex color values                   │
│                                                                          │
│  Example custom theme in config:                                         │
│                                                                          │
│  "theme": {                                                              │
│    "preset": "custom",                                                   │
│    "custom": {                                                           │
│      "bg": "#1e1e1e",                                                    │
│      "main": "#61afef",                                                  │
│      "sub": "#5c6370",                                                   │
│      "text": "#abb2bf",                                                  │
│      "error": "#e06c75",                                                 │
│      "errorExtra": "#be5046",                                            │
│      "caret": "#61afef",                                                 │
│      "typed": "#98c379"                                                  │
│    }                                                                     │
│  }                                                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [09] STATISTICS & RESULTS                                                │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ TEST RESULTS ]─────────────────────────────────────────────────────────┐
│                                                                          │
│  After completing a test, detailed results are displayed:                │
│                                                                          │
│  WPM                  Words per minute                                   │
│  Raw WPM              WPM including errors                               │
│  Accuracy             Percentage of correct characters                   │
│  Errors               Number of characters wrongly typed                 │
│  Test Type            Mode (time/words/zen/custom) and parameters        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ RESULT HISTORY ]───────────────────────────────────────────────────────┐
│                                                                          │
│  All completed tests are saved to the config file with full details:     │
│  • Timestamp                                                             │
│  • WPM and raw WPM                                                       │
│  • Accuracy                                                              │
│  • Errors (characters wrongly typed)                                     │
│  • Test configuration (mode, duration, word count)                       │
│                                                                          │
│  Maximum stored results: 500 tests                                       │
│  (configurable via MAX_RESULTS in configManager.js)                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ PERSONAL BESTS ]───────────────────────────────────────────────────────┐
│                                                                          │
│  Personal best WPM is tracked separately for each test type:             │
│                                                                          │
│  Time-based:                                                             │
│  • 15 seconds                                                            │
│  • 30 seconds                                                            │
│  • 60 seconds                                                            │
│                                                                          │
│  Word-based:                                                             │
│  • 10 words                                                              │
│  • 25 words                                                              │
│  • 50 words                                                              │
│                                                                          │
│  Personal bests are automatically updated when you achieve a new         │
│  record for any test type.                                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ AGGREGATE STATISTICS ]─────────────────────────────────────────────────┐
│                                                                          │
│  Overall performance metrics tracked across all tests:                   │
│                                                                          │
│  Total Tests          Number of completed typing tests                   │
│  Total Time           Cumulative time spent typing (seconds)             │
│  Average WPM          Mean WPM across all tests                          │
│  Average Accuracy     Mean accuracy across all tests                     │
│                                                                          │
│  These statistics are automatically updated after each test and          │
│  stored persistently in the config file.                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [10] PROJECT STRUCTURE                                                   │
└──────────────────────────────────────────────────────────────────────────┘

terminaltype/
├── index.js                  Main entry point, CLI handling, screen flow
├── package.json              Package manifest and dependencies
├── README.md                 This file
├── wordlist.txt              Default word list for typing tests
│
├── app/
│   └── AppState.js           Application state factory
│
├── core/
│   └── configManager.js      Configuration versioning and persistence
│
└── engine/
    ├── config.js             Runtime configuration management
    ├── input.js              Raw TTY input handling
    ├── renderer.js           TUI rendering and screen layouts
    ├── stats.js              Typing statistics calculation
    └── typing.js             Typing state management and word streams

┌─[ KEY FILES ]────────────────────────────────────────────────────────────┐
│                                                                          │
│  index.js                                                                │
│  ─────────                                                               │
│  Main application entry point. Handles:                                  │
│  • CLI argument parsing (--clear-data)                                   │
│  • Screen flow management (menu → test → results)                        │
│  • Integration of engine modules                                         │
│  • Wordlist loading from wordlist.txt                                    │
│                                                                          │
│  engine/renderer.js                                                      │
│  ───────────────────                                                     │
│  TUI rendering engine (~1200 lines). Handles:                            │
│  • Theme color conversion (hex to ANSI)                                  │
│  • Screen layouts for all modes                                          │
│  • ASCII art title                                                       │
│  • Box drawing and UI components                                         │
│  • Menu options and settings screens                                     │
│                                                                          │
│  engine/typing.js                                                        │
│  ─────────────────                                                       │
│  Typing state management. Provides:                                      │
│  • Wordlist loading and shuffling                                        │
│  • Line-based text layout (max 70 chars)                                 │
│  • Word stream generation (infinite/limited)                             │
│  • Custom text and zen mode support                                      │
│                                                                          │
│  engine/stats.js                                                         │
│  ────────────────                                                        │
│  Statistics tracking. Calculates:                                        │
│  • WPM with sampling                                                     │
│  • Accuracy percentage                                                   │
│  • Consistency score                                                     │
│  • Character counts (correct/incorrect)                                  │
│  • Error tracking (raw + corrected)                                      │
│                                                                          │
│  core/configManager.js                                                   │
│  ──────────────────────                                                  │
│  Configuration management. Handles:                                      │
│  • Config versioning (CONFIG_VERSION)                                    │
│  • Default settings for behavior, appearance, keymap                     │
│  • Theme presets and custom colors                                       │
│  • Result history (MAX_RESULTS: 500)                                     │
│  • Personal bests tracking                                               │
│  • Aggregate statistics                                                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ TECH STACK ]───────────────────────────────────────────────────────────┐
│                                                                          │
│  Runtime:        Node.js >= 14.0.0                                       │
│  UI Framework:   blessed (terminal UI)                                   │
│  Widgets:        blessed-contrib (enhanced widgets)                      │
│  Config:         conf (XDG-compliant config storage)                     │
│  Language:       JavaScript                                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [11] UPDATE & UNINSTALL                                                  │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ UPDATE ]───────────────────────────────────────────────────────────────┐
│                                                                          │
│  # Update via npm                                                        │
│  npm update -g terminaltype                                              │
│                                                                          │
│  # Or reinstall to force latest                                          │
│  npm install -g terminaltype@latest                                      │
│                                                                          │
│  # Update via Homebrew                                                   │
│  brew update                                                             │
│  brew upgrade terminaltype                                               │
│                                                                          │
│  # If installed from source                                              │
│  cd terminaltype                                                         │
│  git pull origin main                                                    │
│  npm install                                                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ UNINSTALL ]────────────────────────────────────────────────────────────┐
│                                                                          │
│  # Uninstall npm package                                                 │
│  npm uninstall -g terminaltype                                           │
│                                                                          │
│  # Uninstall via Homebrew                                                │
│  brew uninstall terminaltype                                             │
│  brew untap sharann-del/terminaltype                                     │
│                                                                          │
│  # Remove configuration and data (optional)                              │
│  # Linux/macOS:                                                          │
│  rm -rf ~/.config/terminaltype                                           │
│                                                                          │
│  # Windows:                                                              │
│  rmdir /s "%APPDATA%\terminaltype"                                       │
│                                                                          │
│  # Or use --clear-data flag before uninstalling                          │
│  terminaltype --clear-data                                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─[ CLEAR DATA ]───────────────────────────────────────────────────────────┐
│                                                                          │
│  Clear all stored settings and result history without uninstalling:      │
│                                                                          │
│  terminaltype --clear-data                                               │
│                                                                          │
│  This will:                                                              │
│  • Delete all saved test results                                         │
│  • Reset all settings to defaults                                        │
│  • Clear personal bests                                                  │
│  • Reset aggregate statistics                                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [12] LICENSE                                                             │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  MIT License                                                             │
│                                                                          │
│  Copyright (c) 2024 terminaltype                                         │
│                                                                          │
│  Permission is hereby granted, free of charge, to any person obtaining   │
│  a copy of this software and associated documentation files (the         │
│  "Software"), to deal in the Software without restriction, including     │
│  without limitation the rights to use, copy, modify, merge, publish,     │
│  distribute, sublicense, and/or sell copies of the Software, and to      │
│  permit persons to whom the Software is furnished to do so, subject to   │
│  the following conditions:                                               │
│                                                                          │
│  The above copyright notice and this permission notice shall be          │
│  included in all copies or substantial portions of the Software.         │
│                                                                          │
│  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,         │
│  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF      │
│  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND                   │
│  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS     │
│  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN      │
│  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN       │
│  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE        │
│  SOFTWARE.                                                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║                   Built for terminal typing enthusiasts                  ║
║                                                                          ║
║                       github.com/yourusername/terminaltype               ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```
