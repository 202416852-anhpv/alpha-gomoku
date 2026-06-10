import type { BoardState, GameResult } from "../types/game";

export const checkGameResult = (
  board: BoardState,
  winningLength: number,
): GameResult => {
  const size = board.length;
  const directions = [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: -1 },
  ];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const player = board[row][col];

      if (!player) continue;

      for (const { r: dr, c: dc } of directions) {
        let count = 1;

        for (let i = 1; i < winningLength; i++) {
          const nextRow = row + dr * i;
          const nextCol = col + dc * i;

          if (
            nextRow >= 0 &&
            nextRow < size &&
            nextCol >= 0 &&
            nextCol < size &&
            board[nextRow][nextCol] == player
          )
            count++;
          else break;
        }

        if (count === winningLength) return player;
      }
    }
  }

  const isDraw = board.every((row) => row.every((cell) => cell !== null));
  if (isDraw) return "Draw";

  return null;
};
