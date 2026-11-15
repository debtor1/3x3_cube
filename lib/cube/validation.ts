import { COLOR_NAMES } from "./appearance";
import {
  CORNER_SLOTS,
  type Color,
  EDGE_SLOTS,
  FACES,
  solvedCube,
  stickerAt,
  type Vec3,
} from "./state";

export type CubeIssue = {
  /** 아이가 읽을 설명. */
  readonly message: string;
  /** 화면에서 짚어 줄 칸. */
  readonly facelets: readonly number[];
};

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly issues: readonly CubeIssue[] };

function countIssues(facelets: readonly Color[]): CubeIssue[] {
  const places = new Map<Color, number[]>();
  facelets.forEach((color, index) => {
    places.set(color, [...(places.get(color) ?? []), index]);
  });

  return FACES.flatMap((face) => {
    const found = places.get(face) ?? [];
    if (found.length === 9) return [];

    return [
      {
        message: `${COLOR_NAMES[face]}은 9칸이어야 하는데 ${found.length}칸이에요.`,
        facelets: found,
      },
    ];
  });
}

function centerIssues(facelets: readonly Color[]): CubeIssue[] {
  const centers = FACES.map((_, faceIndex) => faceIndex * 9 + 4);
  const colors = centers.map((index) => facelets[index]);

  if (new Set(colors).size === 6) return [];

  return [
    {
      message: "가운데 칸 여섯 개는 서로 다른 색이어야 해요.",
      facelets: centers,
    },
  ];
}

/** 실제 큐브에 있는 조각인지 본다. 같은 조각이 두 번 나오는 것도 걸러진다. */
function pieceIssues(
  facelets: readonly Color[],
  slots: readonly (readonly number[])[],
  describe: string
): CubeIssue[] {
  const solved = solvedCube();
  const remaining = new Map<string, number>();

  for (const slot of slots) {
    const piece = slot
      .map((index) => solved[index])
      .sort()
      .join("");
    remaining.set(piece, (remaining.get(piece) ?? 0) + 1);
  }

  return slots.flatMap((slot) => {
    const piece = slot
      .map((index) => facelets[index])
      .sort()
      .join("");
    const left = remaining.get(piece) ?? 0;

    if (left === 0) {
      return [{ message: `${describe}`, facelets: slot }];
    }

    remaining.set(piece, left - 1);
    return [];
  });
}

/** 같은 설명이 여러 번 뜨면 읽기 어려우니 한 줄로 묶고 짚어 줄 칸만 모은다. */
function mergeByMessage(issues: readonly CubeIssue[]): CubeIssue[] {
  const grouped = new Map<string, number[]>();

  for (const issue of issues) {
    grouped.set(issue.message, [
      ...(grouped.get(issue.message) ?? []),
      ...issue.facelets,
    ]);
  }

  return [...grouped].map(([message, facelets]) => ({ message, facelets }));
}

const det = (a: Vec3, b: Vec3, c: Vec3) =>
  a[0] * (b[1] * c[2] - b[2] * c[1]) -
  a[1] * (b[0] * c[2] - b[2] * c[0]) +
  a[2] * (b[0] * c[1] - b[1] * c[0]);

/** 꼭짓점 칸 셋을 위·아래를 향한 칸부터, 바깥에서 봤을 때 한 방향으로 도는 순서로 늘어놓는다. */
const ORDERED_CORNERS: readonly (readonly number[])[] = CORNER_SLOTS.map((slot) => {
  const first = slot.find((index) => stickerAt(index).normal[1] !== 0)!;
  const [second, third] = slot.filter((index) => index !== first);
  const normal = (index: number) => stickerAt(index).normal;
  return det(normal(first), normal(second), normal(third)) > 0
    ? [first, second, third]
    : [first, third, second];
});

/** 모서리 칸 둘 중 방향을 재는 기준 칸(위·아래를 향하면 그 칸, 아니면 앞·뒤를 향한 칸)을 앞에 둔다. */
const ORDERED_EDGES: readonly (readonly [number, number])[] = EDGE_SLOTS.map(([a, b]) => {
  const reference = (index: number) => {
    const [, y, z] = stickerAt(index).normal;
    return y !== 0 ? 2 : z !== 0 ? 1 : 0;
  };
  return reference(a) >= reference(b) ? [a, b] : [b, a];
});

function permutationIsOdd(homes: readonly number[]): boolean {
  if (homes.some((home) => home < 0)) return false;
  const seen = new Set<number>();
  let swaps = 0;
  for (let start = 0; start < homes.length; start++) {
    let length = 0;
    for (let at = start; !seen.has(at); at = homes[at]) {
      seen.add(at);
      length++;
    }
    if (length > 0) swaps += length - 1;
  }
  return swaps % 2 === 1;
}

/**
 * 조각은 모두 진짜여도 돌려서는 만들 수 없는 배치가 있다.
 * 꼭짓점 하나만 비틀렸거나, 모서리 하나만 뒤집혔거나, 두 조각만 자리가 바뀐 경우다.
 * 색을 잘못 옮겨 적었을 때 생기고, 그대로 두면 마지막 단계에서 큐브가 끝내 맞지 않는다.
 */
function solvabilityIssues(facelets: readonly Color[]): CubeIssue[] {
  // 큐브를 통째로 돌려 든 상태도 받을 수 있도록, 가운데 칸 색을 기준으로 다 맞춘 모습을 정한다.
  const centerOf = (face: number) => facelets[face * 9 + 4];
  const solved = facelets.map((_, index) => centerOf(Math.floor(index / 9)));
  const upDown = new Set([centerOf(FACES.indexOf("U")), centerOf(FACES.indexOf("D"))]);
  const frontBack = new Set([centerOf(FACES.indexOf("F")), centerOf(FACES.indexOf("B"))]);
  const isUpDown = (color: Color) => upDown.has(color);
  const isFrontBack = (color: Color) => frontBack.has(color);
  const issues: CubeIssue[] = [];

  // 위·아래를 향한 색부터 한 방향으로 읽은 꼭짓점 색. 거울에 비친 조각이면 순서가 달라진다.
  const readCorner = (colors: readonly Color[], isReference: (color: Color) => boolean) => {
    const turn = colors.findIndex(isReference);
    return turn < 0 ? "" : [0, 1, 2].map((k) => colors[(turn + k) % 3]).join("");
  };

  // 가운데 칸 여섯 개가 실제 큐브를 돌려 든 모습이어야 나머지 판정이 의미가 있다.
  const standard = solvedCube();
  const realCorners = new Set(
    ORDERED_CORNERS.map((slot) => readCorner(slot.map((i) => standard[i]), (c) => c === "U" || c === "D"))
  );
  const centerCorners = ORDERED_CORNERS.map((slot) =>
    readCorner(slot.map((i) => solved[i]), (c) => c === "U" || c === "D")
  );
  if (!centerCorners.every((corner) => realCorners.has(corner))) {
    return [
      {
        message: "가운데 칸 여섯 개의 자리가 실제 큐브와 달라요. 가운데 칸 색을 다시 확인해 주세요.",
        facelets: FACES.map((_, face) => face * 9 + 4),
      },
    ];
  }

  const solvedCorners = ORDERED_CORNERS.map((slot) => slot.map((i) => solved[i]).join(""));
  let twist = 0;
  let mirrored = false;
  const cornerHomes = ORDERED_CORNERS.map((slot) => {
    const colors = slot.map((i) => facelets[i]);
    twist += colors.findIndex(isUpDown);
    const home = solvedCorners.indexOf(readCorner(colors, isUpDown));
    if (home === -1) mirrored = true;
    return home;
  });

  if (mirrored || twist % 3 !== 0) {
    issues.push({
      message: "꼭짓점 조각 하나가 비틀려 붙어 있어요. 꼭짓점 칸의 색을 다시 확인해 주세요.",
      facelets: ORDERED_CORNERS.flat(),
    });
  }

  const solvedEdges = ORDERED_EDGES.map((slot) => slot.map((i) => solved[i]).sort().join(""));
  let flip = 0;
  const edgeHomes = ORDERED_EDGES.map(([reference, other]) => {
    const pieceReference = [facelets[reference], facelets[other]].find(isUpDown) ??
      [facelets[reference], facelets[other]].find(isFrontBack);
    if (facelets[reference] !== pieceReference) flip++;
    return solvedEdges.indexOf([facelets[reference], facelets[other]].sort().join(""));
  });

  if (flip % 2 !== 0) {
    issues.push({
      message: "모서리 조각 하나가 뒤집혀 붙어 있어요. 모서리 칸의 색을 다시 확인해 주세요.",
      facelets: ORDERED_EDGES.flat(),
    });
  }

  if (!mirrored && permutationIsOdd(cornerHomes) !== permutationIsOdd(edgeHomes)) {
    issues.push({
      message: "두 조각의 자리가 서로 바뀌어 있어요. 색을 다시 확인해 주세요.",
      facelets: [...ORDERED_CORNERS.flat(), ...ORDERED_EDGES.flat()],
    });
  }

  return issues;
}

export function validateCube(facelets: readonly Color[]): ValidationResult {
  const result = validatePieces(facelets);
  if (!result.valid) return result;

  const issues = solvabilityIssues(facelets);
  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

function validatePieces(facelets: readonly Color[]): ValidationResult {
  const issues = mergeByMessage([
    ...countIssues(facelets),
    ...centerIssues(facelets),
    ...pieceIssues(
      facelets,
      EDGE_SLOTS,
      "이렇게 붙어 있는 두 색은 실제 큐브에 없어요."
    ),
    ...pieceIssues(
      facelets,
      CORNER_SLOTS,
      "이렇게 모여 있는 세 색은 실제 큐브에 없어요."
    ),
  ]);

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}
