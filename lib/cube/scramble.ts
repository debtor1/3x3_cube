import { ALL_MOVES, type Cube, applyMoves, solvedCube } from "./state";

const SCRAMBLE_LENGTH = 25;

/** 실제로 있을 수 있는 섞인 큐브 하나. 다 맞춰진 큐브에서 무작위로 돌려 만든다. */
export function randomCube(random: () => number = Math.random): Cube {
  const moves = Array.from(
    { length: SCRAMBLE_LENGTH },
    () => ALL_MOVES[Math.floor(random() * ALL_MOVES.length)]
  );

  return applyMoves(solvedCube(), moves);
}
