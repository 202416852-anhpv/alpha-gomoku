# Alpha Gomoku

A Gomoku (Five-in-a-Row) game where you play against an AI opponent on a 15×15 board.

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Vite 8** — Build tool
- **Tailwind CSS 4** — Styling
- **Husky** + **commitlint** — Git hooks

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

## How to Play

- You are **X (blue)**, AI is **O (red)**
- Click any empty cell to place your stone
- The first to get 5 in a row (horizontally, vertically, or diagonally) wins
- Click **Play Again** when the game ends

## AI Engine

The AI runs entirely on the client side inside a **Web Worker** (no backend):

- **Minimax search** with alpha-beta pruning and iterative deepening (up to depth 20)
- **5‑second time limit** per move; search stops and returns the best result found
- **Heuristic evaluation** with pattern scoring (open-four, half-four, open-three, double threats, broken patterns)
- **Move ordering** for more efficient pruning
- **Quiescence search** — extends search by one ply when half-four threats exist, mitigating the horizon effect
- **Immediate win/block** — instant win or opponent threat blocking is checked before full search

## Project Structure

```
frontend/
├── src/
│   ├── types/game.ts             — Type definitions (Player, BoardState, GameResult)
│   ├── utils/
│   │   ├── aiWorker.ts           — Web Worker entry point
│   │   ├── gameEngine.ts         — Win/draw detection
│   │   ├── heuristic.ts          — Board evaluation & pattern scoring
│   │   └── minimax.ts            — Minimax search with pruning & threat detection
│   ├── components/
│   │   ├── Board.tsx             — 15×15 game board grid
│   │   └── Square.tsx            — Individual cell
│   ├── App.tsx                   — Main game component (state, UI, worker orchestration)
│   ├── main.tsx                  — React entry point
│   └── index.css                 — Tailwind import
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── index.html
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
└── package.json
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run lint` | Run ESLint on all source files |
| `npm run preview` | Preview the production build locally |
