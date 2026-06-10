export type Player = "X" | "O";

export type SquareValue = Player | null;

export type BoardState = SquareValue[][];

export type GameResult = Player | "Draw" | null;
