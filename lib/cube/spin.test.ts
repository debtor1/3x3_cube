import { describe, expect, it } from "vitest";

import { AXIS_VECTOR, LAYER_SPIN, type SpinAxis, facesViewer, spinAngle } from "./spin";
import {
  CUBIE_POSITIONS,
  FACES,
  type Vec3,
  isOnLayer,
  rotatePosition,
} from "./state";

/** 부호 붙은 0은 좌표로서 같은 자리다. */
const flat = ([x, y, z]: Vec3): Vec3 => [x + 0, y + 0, z + 0];

/** 논리 좌표는 위가 y 양수, CSS는 아래가 y 양수다. */
const toCss = ([x, y, z]: Vec3): Vec3 => flat([x, -y, z]);
const fromCss = ([x, y, z]: Vec3): Vec3 => flat([x, -y, z]);

/** CSS rotateX / rotateY / rotateZ 가 좌표에 하는 일. */
function rotateCss(axis: SpinAxis, degrees: number, [x, y, z]: Vec3): Vec3 {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.round(Math.cos(radians));
  const sin = Math.round(Math.sin(radians));

  switch (axis) {
    case "X":
      return flat([x, y * cos - z * sin, y * sin + z * cos]);
    case "Y":
      return flat([x * cos + z * sin, y, -x * sin + z * cos]);
    case "Z":
      return flat([x * cos - y * sin, x * sin + y * cos, z]);
  }
}

describe("LAYER_SPIN", () => {
  it("화면에서 도는 방향이 큐브가 실제로 도는 방향과 같다", () => {
    for (const face of FACES) {
      const { axis, sign } = LAYER_SPIN[face];

      for (const position of CUBIE_POSITIONS) {
        if (!isOnLayer(position, face)) continue;

        const onScreen = fromCss(rotateCss(axis, sign * 90, toCss(position)));

        expect({ face, position, onScreen }).toEqual({
          face,
          position,
          onScreen: flat(rotatePosition(position, face)),
        });
      }
    }
  });

  it("반대로 돌리면 제자리로 온다", () => {
    for (const face of FACES) {
      const { axis, sign } = LAYER_SPIN[face];

      for (const position of CUBIE_POSITIONS) {
        if (!isOnLayer(position, face)) continue;

        const there = rotateCss(axis, sign * 90, toCss(position));
        const back = rotateCss(axis, sign * -90, there);

        expect(fromCss(back)).toEqual(position);
      }
    }
  });
});

describe("spinAngle", () => {
  it("시계 방향과 반대 방향은 부호만 다르다", () => {
    for (const face of FACES) {
      expect(spinAngle(face, true)).toBe(-spinAngle(face, false));
      expect(Math.abs(spinAngle(face, true))).toBe(90);
    }
  });

  it("회전축 벡터는 축 하나만 세운다", () => {
    for (const face of FACES) {
      const vector = AXIS_VECTOR[LAYER_SPIN[face].axis];

      expect(vector.filter((value) => value === 1)).toHaveLength(1);
      expect(vector.filter((value) => value === 0)).toHaveLength(2);
    }
  });
});

describe("facesViewer", () => {
  it("정면으로 보면 앞쪽 조각은 보이고 뒤쪽 조각은 보이지 않는다", () => {
    const straightOn = { pitch: 0, yaw: 0 };

    expect(facesViewer([0, 0, 1], straightOn)).toBe(true);
    expect(facesViewer([0, 0, -1], straightOn)).toBe(false);
  });

  it("큐브를 반 바퀴 돌리면 앞뒤가 뒤집힌다", () => {
    const halfTurned = { pitch: 0, yaw: 180 };

    expect(facesViewer([0, 0, 1], halfTurned)).toBe(false);
    expect(facesViewer([0, 0, -1], halfTurned)).toBe(true);
  });

  it("위에서 내려다보면 윗면 조각이 보이고 아랫면 조각은 보이지 않는다", () => {
    const fromAbove = { pitch: -90, yaw: 0 };

    expect(facesViewer([0, 1, 0], fromAbove)).toBe(true);
    expect(facesViewer([0, -1, 0], fromAbove)).toBe(false);
  });

  it("오른쪽으로 90도 돌리면 오른면 조각이 앞으로 온다", () => {
    const quarterTurned = { pitch: 0, yaw: -90 };

    expect(facesViewer([1, 0, 0], quarterTurned)).toBe(true);
    expect(facesViewer([-1, 0, 0], quarterTurned)).toBe(false);
  });
});
