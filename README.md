# Alpha Gomoku

A Gomoku (Five-in-a-Row) game powered by Minimax AI with alpha-beta pruning.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** (build tool)
- **Tailwind CSS 4** (styling)
- **Husky** + **commitlint** (git hooks)

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

## Features

- 15×15 board, Human (X) vs AI (O)
- Minimax search with iterative deepening (up to depth 20, 5s timeout)
- Heuristic evaluation with threat detection (open-four, half-four, open-three, double threats)
- Alpha-beta pruning with move ordering
- Quiescence search for threat extension

## Project Structure

```
src/
├── types/game.ts            — Type definitions
├── utils/
│   ├── gameEngine.ts        — Win/draw detection
│   ├── heuristic.ts         — Board evaluation
│   └── minimax.ts           — AI search algorithm
└── components/
    ├── Board.tsx             — Game board
    └── Square.tsx            — Cell component
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check & build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |
