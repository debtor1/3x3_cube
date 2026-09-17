export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export type Color = Face;
export type Cube = readonly Color[];
export type Move = { readonly face: Face; readonly clockwise: boolean };
export type Vec3 = readonly [number, number, number];

export const FACES: readonly Face[] = ["U", "R", "F", "D", "L", "B"];

export const ALL_MOVES: readonly Move[] = FACES.flatMap((face) => [
  { face, clockwise: true },
  { face, clockwise: false },
]);

const FACE_NORMAL: Record<Face, Vec3> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

// 한 면을 정면으로 봤을 때의 (행, 열)을 큐브 중심 기준 좌표로 옮긴다.
// U는 위에서, D는 아래에서, B는 뒤에서 보므로 축의 부호가 면마다 다르다.
function faceletPosition(face: Face, row: number, col: number): Vec3 {
  switch (face) {
    case "U":
      return [col - 1, 1, row - 1];
    case "D":
      return [col - 1, -1, 1 - row];
    case "F":
      return [col - 1, 1 - row, 1];
    case "B":
      return [1 - col, 1 - row, -1];
    case "R":
      return [1, 1 - row, 1 - col];
    case "L":
      return [-1, 1 - row, col - 1];
  }
}

// 각 면을 정면에서 봤을 때 시계 방향으로 90도 돌리는 좌표 변환.
const ROTATE: Record<Face, (v: Vec3) => Vec3> = {
  U: ([x, y, z]) => [-z, y, x],
  D: ([x, y, z]) => [z, y, -x],
  R: ([x, y, z]) => [x, z, -y],
  L: ([x, y, z]) => [x, -z, y],
  F: ([x, y, z]) => [y, -x, z],
  B: ([x, y, z]) => [-y, x, z],
};

/** 한 조각이 그 면을 시계 방향으로 돌렸을 때 옮겨 가는 자리. */
export function rotatePosition(position: Vec3, face: Face): Vec3 {
  return ROTATE[face](position);
}

export type Sticker = { readonly position: Vec3; readonly normal: Vec3 };

const STICKERS: readonly Sticker[] = FACES.flatMap((face) =>
  Array.from({ length: 9 }, (_, i) => ({
    position: faceletPosition(face, Math.floor(i / 3), i % 3),
    normal: FACE_NORMAL[face],
  }))
);

const key = (position: Vec3, normal: Vec3) =>
  `${position.join(",")}|${normal.join(",")}`;

const INDEX_BY_STICKER = new Map(
  STICKERS.map((sticker, index) => [key(sticker.position, sticker.normal), index])
);

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function turnPermutation(face: Face): readonly number[] {
  const rotate = ROTATE[face];
  const normal = FACE_NORMAL[face];

  return STICKERS.map((sticker, index) => {
    if (dot(sticker.position, normal) !== 1) return index;

    const moved = key(rotate(sticker.position), rotate(sticker.normal));
    const destination = INDEX_BY_STICKER.get(moved);
    if (destination === undefined) {
      throw new Error(`회전 결과가 큐브 밖으로 나갔습니다: ${face} ${index}`);
    }
    return destination;
  });
}

const PERMUTATION: Record<Face, readonly number[]> = {
  U: turnPermutation("U"),
  R: turnPermutation("R"),
  F: turnPermutation("F"),
  D: turnPermutation("D"),
  L: turnPermutation("L"),
  B: turnPermutation("B"),
};

export function solvedCube(): Cube {
  return FACES.flatMap((face) => Array<Color>(9).fill(face));
}

export function faceletsOf(cube: Cube, face: Face): Color[] {
  const start = FACES.indexOf(face) * 9;
  return cube.slice(start, start + 9);
}

export function faceletIndex(face: Face, row: number, col: number): number {
  return FACES.indexOf(face) * 9 + row * 3 + col;
}

export function stickerAt(index: number): Sticker {
  return STICKERS[index];
}

/** 조각의 어느 자리, 어느 방향을 향한 스티커인지로 칸 번호를 찾는다. */
export function stickerIndexOf(position: Vec3, normal: Vec3): number | undefined {
  return INDEX_BY_STICKER.get(key(position, normal));
}

/** 큐브를 이루는 스물여섯 조각의 자리. 화면에 그릴 때 쓴다. */
export const CUBIE_POSITIONS: readonly Vec3[] = (() => {
  const positions: Vec3[] = [];
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        if (x === 0 && y === 0 && z === 0) continue;
        positions.push([x, y, z]);
      }
    }
  }
  return positions;
})();

export function isOnLayer(position: Vec3, face: Face): boolean {
  return dot(position, FACE_NORMAL[face]) === 1;
}

export const FACE_NORMALS: Record<Face, Vec3> = FACE_NORMAL;

export function invertMove(move: Move): Move {
  return { face: move.face, clockwise: !move.clockwise };
}

export function applyMove(cube: Cube, move: Move): Cube {
  const permutation = PERMUTATION[move.face];
  const turns = move.clockwise ? 1 : 3;
  let next = cube;

  for (let turn = 0; turn < turns; turn += 1) {
    const current = next;
    const rotated = [...current];
    permutation.forEach((destination, source) => {
      rotated[destination] = current[source];
    });
    next = rotated;
  }

  return next;
}

export function applyMoves(cube: Cube, moves: readonly Move[]): Cube {
  return moves.reduce<Cube>(applyMove, cube);
}

export function movesEqual(a: Move, b: Move): boolean {
  return a.face === b.face && a.clockwise === b.clockwise;
}

// 한 조각이 차지하는 스티커 칸들. 좌표에서 파생하므로 손으로 적은 표가 없다.
function slotsSharingPiece(zeroAxes: number): readonly (readonly number[])[] {
  const byPosition = new Map<string, number[]>();

  STICKERS.forEach((sticker, index) => {
    const zeros = sticker.position.filter((value) => value === 0).length;
    if (zeros !== zeroAxes) return;

    const positionKey = sticker.position.join(",");
    byPosition.set(positionKey, [...(byPosition.get(positionKey) ?? []), index]);
  });

  return [...byPosition.values()];
}

/** 모서리 조각 열두 개가 차지하는 스티커 칸 짝. */
export const EDGE_SLOTS: readonly (readonly [number, number])[] = slotsSharingPiece(
  1
).map(([a, b]) => [a, b] as const);

/** 꼭짓점 조각 여덟 개가 차지하는 스티커 칸 셋. */
export const CORNER_SLOTS: readonly (readonly number[])[] = slotsSharingPiece(0);
