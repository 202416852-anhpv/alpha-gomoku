import { useState } from "react";
import { type BoardState, type GameResult } from "./types/game";
import { checkGameResult } from "./utils/gameEngine";
import Board from "./components/Board";
import { getBestMove } from "./utils/minimax";

export default function App() {
  const SIZE = 15;
  const WINNING_LENGTH = 5;
  const [board, setBoard] = useState<BoardState>(
    Array(SIZE)
      .fill(null)
      .map(() => Array(SIZE).fill(null)),
  );
  const gameResult: GameResult = checkGameResult(board, WINNING_LENGTH);
  const isGameOver = gameResult !== null;

  const handleSquareClick = (row: number, col: number) => {
    if (board[row][col] || isGameOver) return;

    const humanBoard = board.map((r) => [...r]);
    humanBoard[row][col] = "X";
    setBoard(humanBoard);

    const resultAfterHuman = checkGameResult(humanBoard, WINNING_LENGTH);

    if (resultAfterHuman === null) {
      setTimeout(() => {
        const AIMove = getBestMove(humanBoard, WINNING_LENGTH);

        const AIBoard = humanBoard.map((r) => [...r]);
        AIBoard[AIMove.row][AIMove.col] = "O";
        setBoard(AIBoard);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="mt-8 mb-8 text-2xl">Alpha Gomoku</h1>

      <div className="mb-8 border border-gray-400 rounded-md pl-4 pr-4 pt-4 pb-4 tracking-wider">
        {isGameOver ? (
          gameResult === "X" ? (
            <span className="text-green-600">YOU WIN</span>
          ) : gameResult === "O" ? (
            <span className="text-red-600">YOU LOSE</span>
          ) : (
            <span>MATCH DRAW</span>
          )
        ) : (
          <div>IN PROGRESS</div>
        )}
      </div>

      <div className="w-160 border border-black">
        <Board board={board} onSquareClick={handleSquareClick} />
      </div>
    </div>
  );
}
