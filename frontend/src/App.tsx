import { useState, useRef, useEffect } from "react";
import { type BoardState, type GameResult } from "./types/game";
import { checkGameResult } from "./utils/gameEngine";
import Board from "./components/Board";

export default function App() {
  const SIZE = 15;
  const WINNING_LENGTH = 5;
  const createEmptyBoard = () =>
    Array(SIZE)
      .fill(null)
      .map(() => Array(SIZE).fill(null)) as BoardState;

  const [board, setBoard] = useState<BoardState>(createEmptyBoard);
  const gameResult: GameResult = checkGameResult(board, WINNING_LENGTH);
  const isGameOver = gameResult !== null;
  const aiThinkingRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  const createWorker = () => {
    const worker = new Worker(
      new URL("./utils/aiWorker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e: MessageEvent<{ row: number; col: number }>) => {
      setTimeout(() => {
        setBoard((prev) => {
          const newBoard = prev.map((r) => [...r]);
          newBoard[e.data.row][e.data.col] = "O";
          return newBoard;
        });
        aiThinkingRef.current = false;
      }, 500);
    };

    return worker;
  };

  useEffect(() => {
    const worker = createWorker();
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const handleSquareClick = (row: number, col: number) => {
    if (board[row][col] || isGameOver || aiThinkingRef.current) return;

    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = "X";
    setBoard(newBoard);

    const resultAfterHuman = checkGameResult(newBoard, WINNING_LENGTH);
    if (resultAfterHuman === null) {
      aiThinkingRef.current = true;
      workerRef.current?.postMessage({
        board: newBoard,
        winningLength: WINNING_LENGTH,
      });
    }
  };

  const handleRestart = () => {
    workerRef.current?.terminate();
    workerRef.current = createWorker();
    setBoard(createEmptyBoard());
    aiThinkingRef.current = false;
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

      {isGameOver && (
        <button
          onClick={handleRestart}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Play Again
        </button>
      )}
    </div>
  );
}
