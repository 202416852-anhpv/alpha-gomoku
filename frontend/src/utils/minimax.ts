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
const CANDIDATE_DISTANCE = 2;

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

type DirectionInfo = {
  total: number;
  openEnds: number;
  fwdEmpty: { row: number; col: number } | null;
  bwdEmpty: { row: number; col: number } | null;
  gapPos: { row: number; col: number } | null;
};

function analyzeDirection(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player,
  allowGap: boolean = false,
): DirectionInfo {
  const size = board.length;

  function scan(
    dirDr: number,
    dirDc: number,
    useGap: boolean,
  ): {
    count: number;
    gapPos: { row: number; col: number } | null;
    open: boolean;
  } {
    let count = 0;
    let gapPos: { row: number; col: number } | null = null;
    let gapUsed = false;
    let lastIdx = 0;

    for (let i = 1; i < WINNING_LENGTH; i++) {
      const nr = row + dirDr * i;
      const nc = col + dirDc * i;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
      if (board[nr][nc] === player) {
        count++;
        lastIdx = i;
      } else if (board[nr][nc] === null && useGap && !gapUsed) {
        gapUsed = true;
        gapPos = { row: nr, col: nc };
      } else {
        break;
      }
    }

    const ci = lastIdx + 1;
    const nr = row + dirDr * ci;
    const nc = col + dirDc * ci;
    const open =
      nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null;

    return { count, gapPos, open };
  }

  const fwdA = scan(dr, dc, allowGap);
  const bwdA = scan(-dr, -dc, false);
  const totalA = 1 + fwdA.count + bwdA.count;

  const fwdB = scan(dr, dc, false);
  const bwdB = scan(-dr, -dc, allowGap);
  const totalB = 1 + fwdB.count + bwdB.count;

  let fwCount: number, bwCount: number;
  let gapPos: { row: number; col: number } | null;
  let fwdOpen: boolean, bwdOpen: boolean;

  if (totalA >= totalB) {
    fwCount = fwdA.count;
    bwCount = bwdA.count;
    gapPos = fwdA.gapPos;
    fwdOpen = fwdA.open;
    bwdOpen = bwdA.open;
  } else {
    fwCount = fwdB.count;
    bwCount = bwdB.count;
    gapPos = bwdB.gapPos;
    fwdOpen = fwdB.open;
    bwdOpen = bwdB.open;
  }

  const total = 1 + fwCount + bwCount;
  const openEnds = (fwdOpen ? 1 : 0) + (bwdOpen ? 1 : 0);

  const feR = row + dr * (fwCount + 1);
  const feC = col + dc * (fwCount + 1);
  const fwdEmpty = fwdOpen ? { row: feR, col: feC } : null;

  const beR = row - dr * (bwCount + 1);
  const beC = col - dc * (bwCount + 1);
  const bwdEmpty = bwdOpen ? { row: beR, col: beC } : null;

  return { total, openEnds, fwdEmpty, bwdEmpty, gapPos };
}

const THREAT_WIN = 10;
const THREAT_OPEN_FOUR = 9;
const THREAT_HALF_FOUR = 8;
const THREAT_OPEN_THREE = 7;
const THREAT_HALF_THREE = 3;
const THREAT_NONE = 0;

function classifyThreat(total: number, openEnds: number): number {
  if (total >= WINNING_LENGTH) return THREAT_WIN;
  if (total === 4 && openEnds >= 1)
    return openEnds === 2 ? THREAT_OPEN_FOUR : THREAT_HALF_FOUR;
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
      const { total, openEnds } = analyzeDirection(
        board, row, col, dr, dc, player, true,
      );
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

function findThreats(board: BoardState, player: Player = "X"): {
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
      if (board[r][c] !== player) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const { total, openEnds, fwdEmpty, bwdEmpty, gapPos } =
          analyzeDirection(board, r, c, dr, dc, player, true);

        if (total === 4 && openEnds >= 1) {
          if (openEnds === 2) {
            for (const e of [fwdEmpty!, bwdEmpty!]) {
              const key = e.row * size + e.col;
              if (!halfFourSet.has(key)) {
                halfFourSet.add(key);
                halfFour.push(e);
              }
            }
          } else {
            const target = fwdEmpty ?? bwdEmpty!;
            const key = target.row * size + target.col;
            if (!halfFourSet.has(key)) {
              halfFourSet.add(key);
              halfFour.push(target);
            }
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

        if (total === 4 && gapPos && openEnds === 0) {
          const key = gapPos.row * size + gapPos.col;
          if (!halfFourSet.has(key)) {
            halfFourSet.add(key);
            halfFour.push(gapPos);
          }
        }

        if (total === 3 && gapPos && openEnds === 0) {
          const key = gapPos.row * size + gapPos.col;
          if (!halfFourSet.has(key) && !openThreeSet.has(key)) {
            openThreeSet.add(key);
            openThree.push(gapPos);
          }
        }
      }
    }
  }

  return { halfFour, openThree };
}

function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  winningLength: number,
  inQuiescence: boolean = false,
): number {
  const result = checkGameResult(board, winningLength);
  if (result === "O") return TERMINAL_SCORE + depth;
  if (result === "X") return -TERMINAL_SCORE - depth;
  if (result === "Draw") return 0;

  const currentPlayer = isMaximizing ? ("O" as Player) : ("X" as Player);
  const opponent = isMaximizing ? ("X" as Player) : ("O" as Player);

  if (depth === 0) {
    if (!inQuiescence) {
      const { halfFour } = findThreats(board, currentPlayer);
      if (halfFour.length > 0) {
        return minimax(
          board, 1, alpha, beta, isMaximizing, winningLength, true,
        );
      }
    }
    return evaluateBoard(board);
  }

  const opponentThreats = findThreats(board, opponent);
  let moves = getCandidates(board);

  if (opponentThreats.halfFour.length > 0) {
    const blockSet = new Set<number>();
    for (const t of opponentThreats.halfFour) {
      blockSet.add(t.row * board.length + t.col);
    }
    const filtered = moves.filter((m) =>
      blockSet.has(m.row * board.length + m.col),
    );
    if (filtered.length > 0) {
      moves = filtered;
      orderMoves(board, moves, currentPlayer);
    } else {
      return isMaximizing ? -TERMINAL_SCORE + depth : TERMINAL_SCORE - depth;
    }
  } else {
    orderMoves(board, moves, currentPlayer);

    if (opponentThreats.openThree.length > 0) {
      const blockSet = new Set<number>();
      for (const t of opponentThreats.openThree) {
        blockSet.add(t.row * board.length + t.col);
      }
      moves.sort((a, b) => {
        const aB = blockSet.has(a.row * board.length + a.col) ? -1 : 1;
        const bB = blockSet.has(b.row * board.length + b.col) ? -1 : 1;
        return aB - bB;
      });
    }

    const ourThreats = findThreats(board, currentPlayer);
    if (ourThreats.halfFour.length > 0) {
      const threatSet = new Set<number>();
      for (const t of ourThreats.halfFour) {
        threatSet.add(t.row * board.length + t.col);
      }
      moves.sort((a, b) => {
        const aT = threatSet.has(a.row * board.length + a.col) ? -1 : 1;
        const bT = threatSet.has(b.row * board.length + b.col) ? -1 : 1;
        return aT - bT;
      });
    }
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const { row, col } of moves) {
      board[row][col] = "O";
      const evalScore = minimax(
        board, depth - 1, alpha, beta, false, winningLength, inQuiescence,
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
        board, depth - 1, alpha, beta, true, winningLength, inQuiescence,
      );
      board[row][col] = null;
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
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

  const { halfFour, openThree } = findThreats(board, "X");

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

  if (halfFour.length > 0) {
    return pickBest(halfFour);
  }

  if (openThree.length > 0) {
    return pickBest(openThree);
  }

  const defensiveDouble = findDoubleThreats(board, candidates, "X");
  if (defensiveDouble.length > 0) return pickBest(defensiveDouble);

  const offensiveDouble = findDoubleThreats(board, candidates, "O");
  if (offensiveDouble.length > 0) return pickBest(offensiveDouble);

  let bestMove = candidates[0];

  for (let depth = 1; depth <= 20; depth++) {
    let currentBestMove = candidates[0];
    let currentBestScore = -Infinity;
    let completed = true;

    orderMoves(board, candidates, "O");

    for (const { row, col } of candidates) {
      board[row][col] = "O";
      const score = minimax(
        board, depth - 1, -Infinity, Infinity, false, winningLength,
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
