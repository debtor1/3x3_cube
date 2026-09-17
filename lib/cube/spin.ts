import type { Face, Vec3 } from "./state";

export type SpinAxis = "X" | "Y" | "Z";

/**
 * 화면에서 한 층을 돌릴 때 쓰는 회전축과 부호.
 * CSS는 아래쪽이 y 양수라서 논리 좌표와 부호가 갈리는 면이 있다.
 * 이 표가 어긋나면 아이가 화면과 반대로 큐브를 돌리게 되므로 시험으로 묶어 둔다.
 */
export const LAYER_SPIN: Record<
  Face,
  { readonly axis: SpinAxis; readonly sign: 1 | -1 }
> = {
  U: { axis: "Y", sign: -1 },
  D: { axis: "Y", sign: 1 },
  R: { axis: "X", sign: 1 },
  L: { axis: "X", sign: -1 },
  F: { axis: "Z", sign: 1 },
  B: { axis: "Z", sign: -1 },
};

export const AXIS_VECTOR: Record<SpinAxis, Vec3> = {
  X: [1, 0, 0],
  Y: [0, 1, 0],
  Z: [0, 0, 1],
};

/** 화면에서 실제로 돌려야 하는 각도. 시계 방향이 언제나 양수인 것은 아니다. */
export function spinAngle(face: Face, clockwise: boolean): number {
  return LAYER_SPIN[face].sign * (clockwise ? 90 : -90);
}

/** 아이가 큐브를 돌려 놓은 각도. */
export type ViewAngle = { readonly pitch: number; readonly yaw: number };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** 조각이 지금 각도에서 화면 앞쪽을 향하는지. 뒤를 향하면 표시를 다르게 보여 준다. */
export function facesViewer(position: Vec3, view: ViewAngle): boolean {
  const [x, y, z] = position;

  // 화면 좌표는 아래가 y 양수라 논리 좌표와 부호가 갈린다.
  const dy = -y;

  const yaw = toRadians(view.yaw);
  const pitch = toRadians(view.pitch);

  // rotateY 뒤에 rotateX. 화면 쪽으로 나오는 성분(z)만 있으면 된다.
  const afterYawZ = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const towardViewer = dy * Math.sin(pitch) + afterYawZ * Math.cos(pitch);

  return towardViewer > 0;
}
