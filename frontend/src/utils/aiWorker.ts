import { getBestMove } from "./minimax";
import type { BoardState } from "../types/game";

interface WorkerMessage {
  board: BoardState;
  winningLength: number;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { board, winningLength } = e.data;
  const result = getBestMove(board, winningLength);
  self.postMessage(result);
};
