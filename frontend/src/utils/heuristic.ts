import type { BoardState } from "../types/game";

const WINNING_LENGTH = 5;
const WIN = 10000000;
const OPEN_FOUR = 1000000;
const HALF_FOUR = 800000;
const OPEN_THREE = 100000;
const HALF_THREE = 20000;
const OPEN_TWO = 5000;
const HALF_TWO = 1000;

const BROKEN_FOUR_2 = 600000;
const BROKEN_FOUR_1 = 300000;
const BROKEN_THREE_2 = 50000;
const BROKEN_THREE_1 = 15000;

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

function getGapScore(total: number, openEnds: number): number {
  if (total >= WINNING_LENGTH) return WIN;
  if (total === 4 && openEnds === 2) return BROKEN_FOUR_2;
  if (total === 4 && openEnds === 1) return BROKEN_FOUR_1;
  if (total === 4 && openEnds === 0) return HALF_FOUR;
  if (total === 3 && openEnds === 2) return BROKEN_THREE_2;
  if (total === 3 && openEnds === 1) return BROKEN_THREE_1;
  if (total === 3 && openEnds === 0) return HALF_THREE;
  return 0;
}

type ScanResult = { count: number; open: boolean };

function scanDirection(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: string,
  allowGap: boolean,
): ScanResult {
  const size = board.length;
  let count = 0;
  let gapUsed = false;
  let lastIdx = 0;

  for (let i = 1; i < WINNING_LENGTH; i++) {
    const nr = row + dr * i;
    const nc = col + dc * i;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
    if (board[nr][nc] === player) {
      count++;
      lastIdx = i;
    } else if (board[nr][nc] === null && allowGap && !gapUsed) {
      gapUsed = true;
    } else {
      break;
    }
  }

  const ci = lastIdx + 1;
  const nr = row + dr * ci;
  const nc = col + dc * ci;
  const open =
    nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null;

  return { count, open };
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
        const fwCont = scanDirection(board, row, col, dr, dc, player, false);
        const bwCont = scanDirection(board, row, col, -dr, -dc, player, false);
        const consecutive = 1 + fwCont.count + bwCont.count;
        const contOpen = (fwCont.open ? 1 : 0) + (bwCont.open ? 1 : 0);
        const scoreContinuous = getLineScore(consecutive, contOpen);

        const fwGap = scanDirection(board, row, col, dr, dc, player, true);
        const totalA = 1 + fwGap.count + bwCont.count;
        const openA = (fwGap.open ? 1 : 0) + (bwCont.open ? 1 : 0);

        const bwGap = scanDirection(board, row, col, -dr, -dc, player, true);
        const totalB = 1 + fwCont.count + bwGap.count;
        const openB = (fwCont.open ? 1 : 0) + (bwGap.open ? 1 : 0);

        const gapTotal = totalA >= totalB ? totalA : totalB;
        const gapOpen = totalA >= totalB ? openA : openB;
        const hasGap = gapTotal > consecutive;
        const scoreGap = hasGap ? getGapScore(gapTotal, gapOpen) : 0;

        const cellScore = Math.max(scoreContinuous, scoreGap);

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
