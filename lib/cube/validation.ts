import { COLOR_NAMES } from "./appearance";
import {
  CORNER_SLOTS,
  type Color,
  EDGE_SLOTS,
  FACES,
  solvedCube,
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

export function validateCube(facelets: readonly Color[]): ValidationResult {
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
