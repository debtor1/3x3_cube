"use client";

import { type CSSProperties, useRef, useState } from "react";

import { COLOR_VALUES } from "@/lib/cube/appearance";
import { AXIS_VECTOR, LAYER_SPIN, spinAngle } from "@/lib/cube/spin";
import {
  CUBIE_POSITIONS,
  type Cube,
  FACES,
  type Face,
  FACE_NORMALS,
  type Move,
  type Vec3,
  isOnLayer,
  stickerIndexOf,
} from "@/lib/cube/state";

const CUBIE = 54;

/** 조각 안쪽 벽. 층이 도는 동안 잠깐 보인다. */
const INNER = "#1c1917";

/** 큐비 한 면을 자기 자리로 눕히는 변환. */
const FACE_TRANSFORM: Record<Face, string> = {
  F: `translateZ(${CUBIE / 2}px)`,
  B: `rotateY(180deg) translateZ(${CUBIE / 2}px)`,
  R: `rotateY(90deg) translateZ(${CUBIE / 2}px)`,
  L: `rotateY(-90deg) translateZ(${CUBIE / 2}px)`,
  U: `rotateX(90deg) translateZ(${CUBIE / 2}px)`,
  D: `rotateX(-90deg) translateZ(${CUBIE / 2}px)`,
};

export type Turning = { readonly move: Move; readonly token: number };

type Props = {
  readonly cube: Cube;
  readonly turning: Turning | null;
  readonly onTurnEnd: () => void;
};

function Cubie({ position, cube }: { position: Vec3; cube: Cube }) {
  const [x, y, z] = position;

  return (
    <div
      className="absolute"
      style={{
        width: CUBIE,
        height: CUBIE,
        transformStyle: "preserve-3d",
        transform: `translate3d(${x * CUBIE}px, ${-y * CUBIE}px, ${z * CUBIE}px)`,
        left: `calc(50% - ${CUBIE / 2}px)`,
        top: `calc(50% - ${CUBIE / 2}px)`,
      }}
    >
      {FACES.map((face) => {
        const outward = isOnLayer(position, face);
        const sticker = outward
          ? stickerIndexOf(position, FACE_NORMALS[face])
          : undefined;

        return (
          <div
            key={face}
            className="absolute inset-0 rounded-[6px] border border-black/45"
            style={{
              backgroundColor:
                sticker === undefined ? INNER : COLOR_VALUES[cube[sticker]],
              transform: FACE_TRANSFORM[face],
              backfaceVisibility: "hidden",
              boxShadow: outward ? "inset 0 0 0 2px rgba(0,0,0,0.12)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export function CubeView({ cube, turning, onTurnEnd }: Props) {
  const [view, setView] = useState({ pitch: -24, yaw: -34 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const spinning = turning
    ? CUBIE_POSITIONS.filter((position) => isOnLayer(position, turning.move.face))
    : [];
  const resting = turning
    ? CUBIE_POSITIONS.filter((position) => !isOnLayer(position, turning.move.face))
    : CUBIE_POSITIONS;

  const spinStyle = (): CSSProperties => {
    if (!turning) return {};
    const [x, y, z] = AXIS_VECTOR[LAYER_SPIN[turning.move.face].axis];

    return {
      "--turn-x": x,
      "--turn-y": y,
      "--turn-z": z,
      "--turn-angle": `${spinAngle(turning.move.face, turning.move.clockwise)}deg`,
    } as CSSProperties;
  };

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[320px] cursor-grab touch-none select-none active:cursor-grabbing"
      style={{ perspective: 1100 }}
      aria-label="큐브 화면. 끌어서 돌려 볼 수 있어요."
      role="img"
      onPointerDown={(event) => {
        drag.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const dx = event.clientX - drag.current.x;
        const dy = event.clientY - drag.current.y;
        drag.current = { x: event.clientX, y: event.clientY };
        setView((current) => ({
          pitch: Math.max(-85, Math.min(85, current.pitch - dy * 0.5)),
          yaw: current.yaw + dx * 0.5,
        }));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${view.pitch}deg) rotateY(${view.yaw}deg)`,
        }}
      >
        {resting.map((position) => (
          <Cubie key={position.join(",")} position={position} cube={cube} />
        ))}

        {turning ? (
          <div
            key={turning.token}
            className="absolute inset-0 animate-cube-turn"
            style={{ transformStyle: "preserve-3d", ...spinStyle() }}
            onAnimationEnd={onTurnEnd}
          >
            {spinning.map((position) => (
              <Cubie key={position.join(",")} position={position} cube={cube} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
