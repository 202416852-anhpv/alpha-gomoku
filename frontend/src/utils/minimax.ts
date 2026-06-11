import type { BoardState, Player } from "../types/game";
import { evaluateBoard } from "./heuristic";
import { checkGameResult } from "./gameEngine";

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const TERMINAL_SCORE = 100000000;
const WINNING_LENGTH = 5;
const CANDIDATE_DISTANCE = 3;

function getCandidates(board: BoardState): { row: number; col: number }[] {
  const size = board.length;
  const set = new Set<number>();
  const moves: { row: number; col: number }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === null) continue;
      for (const [dr, dc] of DIRECTIONS) {
        for (let i = 1; i <= CANDIDATE_DISTANCE; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (
            nr >= 0 &&
            nr < size &&
            nc >= 0 &&
            nc < size &&
            board[nr][nc] === null
          ) {
            const key = nr * size + nc;
            if (!set.has(key)) {
              set.add(key);
              moves.push({ row: nr, col: nc });
            }
          }
        }
      }
    }
  }

  if (moves.length === 0) {
    const center = Math.floor(size / 2);
    moves.push({ row: center, col: center });
  }

  return moves;
}

function moveScore(
  board: BoardState,
  row: number,
  col: number,
  player: Player,
): number {
  board[row][col] = player;
  const score = evaluateBoard(board);
  board[row][col] = null;
  return score;
}

function orderMoves(
  board: BoardState,
  moves: { row: number; col: number }[],
  player: Player,
): void {
  const scored = moves.map((m) => ({
    ...m,
    score: moveScore(board, m.row, m.col, player),
  }));
  scored.sort((a, b) => b.score - a.score);
  for (let i = 0; i < moves.length; i++) {
    moves[i] = scored[i];
  }
}

function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  winningLength: number,
): number {
  const result = checkGameResult(board, winningLength);
  if (result === "O") return TERMINAL_SCORE + depth;
  if (result === "X") return -TERMINAL_SCORE - depth;
  if (result === "Draw") return 0;
  if (depth === 0) return evaluateBoard(board);

  const moves = getCandidates(board);
  const player = isMaximizing ? ("O" as Player) : ("X" as Player);
  orderMoves(board, moves, player);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const { row, col } of moves) {
      board[row][col] = "O";
      const evalScore = minimax(
        board,
        depth - 1,
        alpha,
        beta,
        false,
        winningLength,
      );
      board[row][col] = null;
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const { row, col } of moves) {
      board[row][col] = "X";
      const evalScore = minimax(
        board,
        depth - 1,
        alpha,
        beta,
        true,
        winningLength,
      );
      board[row][col] = null;
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

type DirectionInfo = {
  total: number;
  openEnds: number;
  fwdEmpty: { row: number; col: number } | null;
  bwdEmpty: { row: number; col: number } | null;
};

function analyzeDirection(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player,
): DirectionInfo {
  const size = board.length;
  let fwCount = 0;
  for (let i = 1; i < WINNING_LENGTH; i++) {
    const nr = row + dr * i;
    const nc = col + dc * i;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
    if (board[nr][nc] === player) fwCount++;
    else break;
  }
  let bwCount = 0;
  for (let i = 1; i < WINNING_LENGTH; i++) {
    const nr = row - dr * i;
    const nc = col - dc * i;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
    if (board[nr][nc] === player) bwCount++;
    else break;
  }
  const total = 1 + fwCount + bwCount;

  const feR = row + dr * (fwCount + 1);
  const feC = col + dc * (fwCount + 1);
  const fwdOpen = feR >= 0 && feR < size && feC >= 0 && feC < size && board[feR][feC] === null;

  const beR = row - dr * (bwCount + 1);
  const beC = col - dc * (bwCount + 1);
  const bwdOpen = beR >= 0 && beR < size && beC >= 0 && beC < size && board[beR][beC] === null;

  const openEnds = (fwdOpen ? 1 : 0) + (bwdOpen ? 1 : 0);
  return {
    total,
    openEnds,
    fwdEmpty: fwdOpen ? { row: feR, col: feC } : null,
    bwdEmpty: bwdOpen ? { row: beR, col: beC } : null,
  };
}

const THREAT_WIN = 10;
const THREAT_OPEN_FOUR = 9;
const THREAT_HALF_FOUR = 8;
const THREAT_OPEN_THREE = 7;
const THREAT_HALF_THREE = 3;
const THREAT_NONE = 0;

function classifyThreat(total: number, openEnds: number): number {
  if (total >= WINNING_LENGTH) return THREAT_WIN;
  if (total === 4 && openEnds >= 1) return openEnds === 2 ? THREAT_OPEN_FOUR : THREAT_HALF_FOUR;
  if (total === 3 && openEnds === 2) return THREAT_OPEN_THREE;
  if (total === 3 && openEnds === 1) return THREAT_HALF_THREE;
  return THREAT_NONE;
}

function findDoubleThreats(
  board: BoardState,
  candidates: { row: number; col: number }[],
  player: Player = "X",
): { row: number; col: number }[] {
  const result: { row: number; col: number }[] = [];
  const seen = new Set<number>();
  const size = board.length;

  for (const { row, col } of candidates) {
    board[row][col] = player;
    let threatCounts = 0;

    for (const [dr, dc] of DIRECTIONS) {
      const { total, openEnds } = analyzeDirection(board, row, col, dr, dc, player);
      const t = classifyThreat(total, openEnds);
      if (t >= THREAT_OPEN_THREE) threatCounts++;
    }

    board[row][col] = null;

    const key = row * size + col;
    if (threatCounts >= 2 && !seen.has(key)) {
      seen.add(key);
      result.push({ row, col });
    }
  }

  return result;
}

function findThreats(board: BoardState): {
  halfFour: { row: number; col: number }[];
  openThree: { row: number; col: number }[];
} {
  const size = board.length;
  const halfFourSet = new Set<number>();
  const openThreeSet = new Set<number>();
  const halfFour: { row: number; col: number }[] = [];
  const openThree: { row: number; col: number }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== "X") continue;

      for (const [dr, dc] of DIRECTIONS) {
        const { total, openEnds, fwdEmpty, bwdEmpty } = analyzeDirection(board, r, c, dr, dc, "X");

        if (total === 4 && openEnds === 1) {
          const target = fwdEmpty ?? bwdEmpty!;
          const key = target.row * size + target.col;
          if (!halfFourSet.has(key)) {
            halfFourSet.add(key);
            halfFour.push(target);
          }
        }

        if (total === 3 && openEnds === 2) {
          const key1 = fwdEmpty!.row * size + fwdEmpty!.col;
          if (!halfFourSet.has(key1) && !openThreeSet.has(key1)) {
            openThreeSet.add(key1);
            openThree.push(fwdEmpty!);
          }
          const key2 = bwdEmpty!.row * size + bwdEmpty!.col;
          if (!halfFourSet.has(key2) && !openThreeSet.has(key2)) {
            openThreeSet.add(key2);
            openThree.push(bwdEmpty!);
          }
        }
      }
    }
  }

  return { halfFour, openThree };
}

export const getBestMove = (
  board: BoardState,
  winningLength: number,
): { row: number; col: number } => {
  const TIME_LIMIT = 5000;
  const startTime = performance.now();

  const candidates = getCandidates(board);

  for (const { row, col } of candidates) {
    board[row][col] = "O";
    const result = checkGameResult(board, winningLength);
    board[row][col] = null;
    if (result === "O") return { row, col };
  }

  for (const { row, col } of candidates) {
    board[row][col] = "X";
    const result = checkGameResult(board, winningLength);
    board[row][col] = null;
    if (result === "X") return { row, col };
  }

  const { halfFour, openThree } = findThreats(board);
  const totalThreats = halfFour.length + openThree.length;

  const pickBest = (moves: { row: number; col: number }[]) => {
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const s = moveScore(board, m.row, m.col, "O");
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return best;
  };

  if (totalThreats === 1) {
    if (halfFour.length > 0) return pickBest(halfFour);
    if (openThree.length > 0) return pickBest(openThree);
  }

  if (totalThreats === 0) {
    const defensiveDouble = findDoubleThreats(board, candidates, "X");
    if (defensiveDouble.length > 0) return pickBest(defensiveDouble);

    const offensiveDouble = findDoubleThreats(board, candidates, "O");
    if (offensiveDouble.length > 0) return pickBest(offensiveDouble);
  }

  let bestMove = candidates[0];

  for (let depth = 1; depth <= 20; depth++) {
    let currentBestMove = candidates[0];
    let currentBestScore = -Infinity;
    let completed = true;

    orderMoves(board, candidates, "O");

    for (const { row, col } of candidates) {
      board[row][col] = "O";
      const score = minimax(
        board,
        depth - 1,
        -Infinity,
        Infinity,
        false,
        winningLength,
      );
      board[row][col] = null;

      if (score > currentBestScore) {
        currentBestScore = score;
        currentBestMove = { row, col };
      }

      if (performance.now() - startTime > TIME_LIMIT) {
        completed = false;
        break;
      }
    }

    if (completed) {
      bestMove = currentBestMove;
    } else {
      break;
    }

    if (performance.now() - startTime > TIME_LIMIT) break;
  }

  return bestMove;
};
