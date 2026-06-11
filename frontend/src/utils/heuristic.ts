import type { BoardState } from "../types/game";

const WINNING_LENGTH = 5;
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

const THREAT_WEIGHTS: Record<string, number> = {
  "5": WIN,
  "4_2": OPEN_FOUR,
  "4_1": HALF_FOUR,
  "3_2": OPEN_THREE,
  "3_1": HALF_THREE,
  "2_2": OPEN_TWO,
  "2_1": HALF_TWO,
};

function getLineScore(consecutive: number, openEnds: number): number {
  if (consecutive >= WINNING_LENGTH) return THREAT_WEIGHTS["5"];
  const key = `${consecutive}_${openEnds}`;
  return THREAT_WEIGHTS[key] ?? 0;
}

export const evaluateBoard = (board: BoardState): number => {
  const size = board.length;
  let score = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const player = board[row][col];
      if (!player) continue;

      let threatCount = 0;

      for (const [dr, dc] of DIRECTIONS) {
        let fwCount = 0;
        for (let i = 1; i < WINNING_LENGTH; i++) {
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
        for (let i = 1; i < WINNING_LENGTH; i++) {
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
        const cellScore = getLineScore(consecutive, openEnds);

        if (cellScore >= HALF_FOUR) threatCount++;
        else if (cellScore >= OPEN_THREE) threatCount++;

        score += player === "O" ? cellScore : -cellScore;
      }

      if (threatCount >= 2) {
        const synergyBonus = threatCount === 2 ? HALF_FOUR : OPEN_FOUR;
        score += player === "O" ? synergyBonus : -synergyBonus;
      }
    }
  }

  return score;
};
