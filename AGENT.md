# AGENT.md

## Project Overview

A web-based Brainfuck interpreter, text encoder, and visual debugger. The app lets users write/paste Brainfuck code with syntax highlighting, execute it, step through it instruction-by-instruction with a visual memory debugger, and encode arbitrary text into optimized Brainfuck code. Licensed under GPLv3.

**Live demo:** http://brainfuck.net/

## Tech Stack

- **Bundler:** Parcel 2.9.1
- **Language:** TypeScript 5.0.4
- **JSX Runtime:** Custom `dom-chef` plugin (no React — renders directly to DOM nodes)
- **CSS:** PostCSS with `postcss-nested` and `postcss-url`
- **Icons:** Codicon (VS Code icon font)
- **Fonts:** Google Fonts (Roboto, Bebas Neue)
- **Node:** 18.x, **npm:** 9.x

## Project Structure

```
src/
├── index.html                  # Entry point — app shell with input/output areas
├── css/
│   ├── style.pcss              # All styles (PostCSS with nesting)
│   └── codicon.css             # VS Code icon font
├── fonts/
│   └── codicon.ttf             # Icon font binary
└── js/
    ├── script.tsx              # Main app logic (UI, debug, encoder, tooltips)
    ├── Brainfuck.ts            # Interpreter core (execution engine)
    ├── ModalElement.tsx        # <x-modal> custom element (Shadow DOM)
    ├── Selection.js            # Cursor save/restore for contenteditable
    └── plugins/
        └── dom-chef@5.1.0/
            └── index.ts        # JSX → DOM element factory (h function)
```

## Architecture

### JSX without React

The project uses a custom JSX factory (`dom-chef`) configured via `tsconfig.json` (`jsxFactory: "h"`, `jsxFragmentFactory: "DocumentFragment"`). JSX expressions produce real DOM nodes, not virtual DOM. There is no reconciliation or diffing — elements are created and appended directly.

### Key Modules

**`Brainfuck.ts`** — The interpreter. A `Brainfuck` class takes a code string and provides:
- `run()` — Execute all instructions, return output string
- `nextStep()` — Execute one instruction, return `false` when done
- `steps` getter — Lazily generates a full execution trace (array of snapshots with cell values, pointer position, output at each step)

Memory model: 30,000 cells of 8-bit unsigned integers (0–255, wrapping). Standard 8 instructions (`+ - > < [ ] . ,`), all other characters ignored.

**`script.tsx`** — The main application file. Handles:
- Syntax highlighting via regex-based colorization on a `contenteditable` div
- Run button: instantiates `Brainfuck`, calls `run()`, displays result
- Debug mode: generates step trace, renders cell grid with pointer, step/play controls
- Modals: "Learn Brainfuck" (instruction reference), ASCII table (0–255), text encoder
- Tooltips: hover over operator spans to see descriptions and repeat counts
- Text encoder: dynamic programming algorithm that precomputes an optimal lookup table (`map[256][256]`) for generating shortest Brainfuck code for any ASCII text

**`ModalElement.tsx`** — A custom HTML element (`<x-modal>`) using Shadow DOM. Supports open/close, click-outside-to-dismiss, ESC key, and optional auto-removal from DOM.

**`Selection.js`** — Utilities to save and restore cursor position in contenteditable elements. Needed because `innerHTML` replacement (for syntax highlighting) destroys cursor state.

### Data Flow

1. User types Brainfuck in the contenteditable input div
2. On each input event, `colorizeBF()` replaces innerHTML with syntax-highlighted spans (cursor is preserved via `Selection.js`)
3. **Run:** Creates `Brainfuck` instance → `run()` → output shown in output div
4. **Debug:** Creates `Brainfuck` instance → `.steps` generates full trace → UI renders cell grid, pointer, controls for stepping forward/backward/autoplay
5. **Encode:** On page load, a lookup table is precomputed over 2 iterations. The encoder converts input text to optimized Brainfuck using this table.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Parcel dev server (http://localhost:1234)
npm run build     # Production build to dist/
```

## Code Style

- EditorConfig: UTF-8, 4-space indent, LF line endings, trim trailing whitespace
- TypeScript with JSX (React mode pointing to custom factory)
- PostCSS with nested syntax (SCSS-like nesting)
- No linter or formatter configured
- No tests

## Common Patterns

- **DOM creation:** Use JSX (`<div className="foo">`) which compiles to `h("div", {className: "foo"})` and returns a real DOM element
- **Event handlers:** Inline via JSX attributes (`onclick={() => ...}`) or assigned after creation (`element.onclick = ...`)
- **Modals:** Create `new ModalElement(true)`, append content, call `.open()`. Pass `true` to auto-remove from DOM on close.
- **Syntax highlighting colors:** Each operator has CSS custom properties (`--r`, `--g`, `--b`) applied via `span[operator="X"]` selectors
