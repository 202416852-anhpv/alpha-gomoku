import type { BoardState } from "../types/game";

const WIN = 10000000;
const OPEN_FOUR = 1000000;
const HALF_FOUR = 800000;
const OPEN_THREE = 100000;
const HALF_THREE = 20000;
const OPEN_TWO = 5000;
const HALF_TWO = 1000;

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const evaluateBoard = (board: BoardState): number => {
  const size = board.length;
  let score = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const player = board[row][col];
      if (!player) continue;

      for (const [dr, dc] of DIRECTIONS) {
        let fwCount = 0;
        for (let i = 1; i < 5; i++) {
          const nr = row + dr * i;
          const nc = col + dc * i;
          if (
            nr >= 0 &&
            nr < size &&
            nc >= 0 &&
            nc < size &&
            board[nr][nc] === player
          ) {
            fwCount++;
          } else break;
        }

        let bwCount = 0;
        for (let i = 1; i < 5; i++) {
          const nr = row - dr * i;
          const nc = col - dc * i;
          if (
            nr >= 0 &&
            nr < size &&
            nc >= 0 &&
            nc < size &&
            board[nr][nc] === player
          ) {
            bwCount++;
          } else break;
        }

        const consecutive = 1 + fwCount + bwCount;

        const fwR = row + dr * (fwCount + 1);
        const fwC = col + dc * (fwCount + 1);
        const bwR = row - dr * (bwCount + 1);
        const bwC = col - dc * (bwCount + 1);

        const fwdOpen =
          fwR >= 0 &&
          fwR < size &&
          fwC >= 0 &&
          fwC < size &&
          board[fwR][fwC] === null;
        const bwdOpen =
          bwR >= 0 &&
          bwR < size &&
          bwC >= 0 &&
          bwC < size &&
          board[bwR][bwC] === null;

        const openEnds = (fwdOpen ? 1 : 0) + (bwdOpen ? 1 : 0);

        let cellScore = 0;
        if (consecutive >= 5) cellScore = WIN;
        else if (consecutive === 4)
          cellScore = openEnds === 2 ? OPEN_FOUR : openEnds === 1 ? HALF_FOUR : 0;
        else if (consecutive === 3)
          cellScore = openEnds === 2 ? OPEN_THREE : openEnds === 1 ? HALF_THREE : 0;
        else if (consecutive === 2)
          cellScore = openEnds === 2 ? OPEN_TWO : openEnds === 1 ? HALF_TWO : 0;

        score += player === "O" ? cellScore : -cellScore;
      }
    }
  }

  return score;
};
