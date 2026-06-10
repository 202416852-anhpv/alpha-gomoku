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

function getCandidates(board: BoardState): { row: number; col: number }[] {
  const size = board.length;
  const set = new Set<number>();
  const moves: { row: number; col: number }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === null) continue;
      for (const [dr, dc] of DIRECTIONS) {
        for (let i = 1; i <= 2; i++) {
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

function findForcedBlocks(board: BoardState): { row: number; col: number }[] {
  const size = board.length;
  const blockSet = new Set<number>();
  const blocks: { row: number; col: number }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] !== "X") continue;

      for (const [dr, dc] of DIRECTIONS) {
        let fwCount = 0;
        for (let i = 1; i < 5; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === "X")
            fwCount++;
          else break;
        }

        let bwCount = 0;
        for (let i = 1; i < 5; i++) {
          const nr = r - dr * i;
          const nc = c - dc * i;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === "X")
            bwCount++;
          else break;
        }

        const total = 1 + fwCount + bwCount;
        if (total !== 4) continue;

        const feR = r + dr * (fwCount + 1);
        const feC = c + dc * (fwCount + 1);
        const fwdOpen =
          feR >= 0 && feR < size && feC >= 0 && feC < size &&
          board[feR][feC] === null;

        const beR = r - dr * (bwCount + 1);
        const beC = c - dc * (bwCount + 1);
        const bwdOpen =
          beR >= 0 && beR < size && beC >= 0 && beC < size &&
          board[beR][beC] === null;

        if (fwdOpen && !bwdOpen) {
          const key = feR * size + feC;
          if (!blockSet.has(key)) {
            blockSet.add(key);
            blocks.push({ row: feR, col: feC });
          }
        } else if (!fwdOpen && bwdOpen) {
          const key = beR * size + beC;
          if (!blockSet.has(key)) {
            blockSet.add(key);
            blocks.push({ row: beR, col: beC });
          }
        }
      }
    }
  }

  return blocks;
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

  // Scan board for existing opponent half-fours and force block
  const forcedBlocks = findForcedBlocks(board);

  if (forcedBlocks.length === 1) {
    return forcedBlocks[0];
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
