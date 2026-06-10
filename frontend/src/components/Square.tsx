import type { Player } from "../types/game";

interface SquareProps {
  value: Player | null;
  onClick: () => void;
}

export default function Square({ value, onClick }: SquareProps) {
  const isX = value === "X";

  const textColor = value ? (isX ? "text-blue-600" : "text-red-600") : "";

  return (
    <button
      onClick={onClick}
      className={`flex justify-center items-center text-2xl font-bold aspect-square border-r border-b border-gray-400 ${textColor}`}
    >
      {value}
    </button>
  );
}
