import type { BoardState } from "../types/game";
import Square from "./Square";

interface BoardProps {
  board: BoardState;
  onSquareClick: (row: number, col: number) => void;
}

export default function Board({ board, onSquareClick }: BoardProps) {
  const size = board.length;

  return (
    <div
      className="grid border-t border-l border-gray-400"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {board.map((row, rowIndex) =>
        row.map((cellValue, colIndex) => (
          <Square
            key={`${rowIndex}-${colIndex}`}
            value={cellValue}
            onClick={() => onSquareClick(rowIndex, colIndex)}
          />
        )),
      )}
    </div>
  );
}
