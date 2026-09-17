import { describe, expect, it } from "vitest";

import { AXIS_VECTOR, LAYER_SPIN, type SpinAxis, spinAngle } from "./spin";
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
