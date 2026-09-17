"use client";

import { type CSSProperties, useRef, useState } from "react";

import { COLOR_VALUES, INDICATOR_COLORS } from "@/lib/cube/appearance";
import {
  AXIS_VECTOR,
  LAYER_SPIN,
  type ViewAngle,
  facesViewer,
  spinAngle,
} from "@/lib/cube/spin";
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

import type { PieceIndicator } from "@/lib/cube/face";

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

export type Turning = {
  readonly move?: Move;
  readonly rotateCube?: { readonly clockwise: boolean };
  readonly rotateCubeX180?: boolean;
  readonly token: number;
};

type Props = {
  readonly cube: Cube;
  readonly turning: Turning | null;
  readonly onTurnEnd: () => void;
  readonly indicators?: readonly PieceIndicator[];
};

/** 표시된 조각이 큐브 밖으로 나오는 거리. 한 칸의 1/4쯤이면 떨어져 보이면서도 어느 자리인지 알아볼 수 있다. */
const PIECE_POP_OUT = 14;
/** 고리가 조각에서 떠 있는 거리와 크기. */
const RING_LIFT = 50;
const RING_SIZE = 78;

/** 조각이 큐브 밖을 향하는 방향. 화면 좌표(아래가 y 양수)로 돌려준다. 가운데 조각은 바깥 방향이 없다. */
function outwardDirection([x, y, z]: Vec3): Vec3 | null {
  const length = Math.hypot(x, y, z);
  if (length === 0) return null;
  return [x / length, -y / length, z / length];
}

/** 조각의 바깥 방향을 정면으로 삼도록 세우고, 그만큼 큐브 밖으로 띄운다. */
function ringTransform(position: Vec3, [dx, dy, dz]: Vec3): string {
  const [x, y, z] = position;
  const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
  const pitch = (-Math.asin(Math.max(-1, Math.min(1, dy))) * 180) / Math.PI;

  return [
    `translate3d(${x * CUBIE}px, ${-y * CUBIE}px, ${z * CUBIE}px)`,
    `rotateY(${yaw}deg)`,
    `rotateX(${pitch}deg)`,
    `translateZ(${RING_LIFT}px)`,
  ].join(" ");
}

/**
 * 조각을 감싸는 고리. 큐브와 같은 공간에 놓여 큐브와 함께 돈다.
 * 조각이 뒤편에 있으면 점선으로 흐리게 보여 어디에 있는지는 알 수 있게 한다.
 */
function PieceRing({ indicator, view }: { indicator: PieceIndicator; view: ViewAngle }) {
  const direction = outwardDirection(indicator.position);
  if (!direction) return null;

  const front = facesViewer(indicator.position, view);
  const color = INDICATOR_COLORS[indicator.type];

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: "50%",
        top: "50%",
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
        transform: ringTransform(indicator.position, direction),
      }}
    >
      <div
        data-testid="piece-indicator"
        className={front ? "absolute animate-pulse" : "absolute"}
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          left: -RING_SIZE / 2,
          top: -RING_SIZE / 2,
          borderRadius: "50%",
          borderWidth: 7,
          borderStyle: front ? "solid" : "dashed",
          borderColor: color,
          opacity: front ? 1 : 0.5,
          filter: "drop-shadow(0 0 3px rgba(255,255,255,.9))",
        }}
      />
    </div>
  );
}

function Cubie({
  position,
  cube,
  marked,
}: {
  position: Vec3;
  cube: Cube;
  marked?: boolean;
}) {
  const [x, y, z] = position;
  const popOut = marked ? outwardDirection(position) : null;

  return (
    <div
      className="absolute"
      style={{
        width: CUBIE,
        height: CUBIE,
        transformStyle: "preserve-3d",
        transform: [
          `translate3d(${x * CUBIE}px, ${-y * CUBIE}px, ${z * CUBIE}px)`,
          popOut
            ? `translate3d(${popOut[0] * PIECE_POP_OUT}px, ${popOut[1] * PIECE_POP_OUT}px, ${popOut[2] * PIECE_POP_OUT}px)`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
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

export function CubeView({ cube, turning, onTurnEnd, indicators }: Props) {
  const [view, setView] = useState({ pitch: -24, yaw: -34 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const isWholeCube = !!turning?.rotateCube || !!turning?.rotateCubeX180;
  const spinning = turning
    ? isWholeCube
      ? CUBIE_POSITIONS
      : CUBIE_POSITIONS.filter((position) => isOnLayer(position, turning.move!.face))
    : [];
  const resting = turning
    ? isWholeCube
      ? []
      : CUBIE_POSITIONS.filter((position) => !isOnLayer(position, turning.move!.face))
    : CUBIE_POSITIONS;

  // 도는 중에는 표시를 감춘다. 조각이 움직이는 동안에는 가리킬 자리가 정해지지 않는다.
  const shownMarks = turning ? [] : (indicators ?? []);

  const isMarked = (position: Vec3): boolean =>
    shownMarks.some(
      (mark) =>
        mark.position[0] === position[0] &&
        mark.position[1] === position[1] &&
        mark.position[2] === position[2]
    );

  const spinStyle = (): CSSProperties => {
    if (!turning) return {};
    if (turning.rotateCubeX180) {
      return {
        "--turn-x": 1,
        "--turn-y": 0,
        "--turn-z": 0,
        "--turn-angle": "180deg",
        animationDuration: "1400ms",
        animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      } as CSSProperties;
    }
    if (turning.rotateCube) {
      return {
        "--turn-x": 0,
        "--turn-y": 1,
        "--turn-z": 0,
        "--turn-angle": `${turning.rotateCube.clockwise ? -90 : 90}deg`,
      } as CSSProperties;
    }
    const [x, y, z] = AXIS_VECTOR[LAYER_SPIN[turning.move!.face].axis];

    return {
      "--turn-x": x,
      "--turn-y": y,
      "--turn-z": z,
      "--turn-angle": `${spinAngle(turning.move!.face, turning.move!.clockwise)}deg`,
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
          <Cubie
            key={position.join(",")}
            position={position}
            cube={cube}
            marked={isMarked(position)}
          />
        ))}

        {turning ? (
          <div
            key={turning.token}
            data-testid="turn-layer"
            className="absolute inset-0 animate-cube-turn"
            style={{ transformStyle: "preserve-3d", ...spinStyle() }}
            onAnimationEnd={onTurnEnd}
            onClick={onTurnEnd}
          >
            {spinning.map((position) => (
              <Cubie key={position.join(",")} position={position} cube={cube} />
            ))}
          </div>
        ) : null}
      </div>

      {/* 큐브 본체와 분리된 층. 뒤편 조각의 고리도 큐브에 가리지 않고 비쳐 보인다. */}
      {shownMarks.length > 0 ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${view.pitch}deg) rotateY(${view.yaw}deg)`,
          }}
        >
          {shownMarks.map((mark) => (
            <PieceRing key={mark.position.join(",")} indicator={mark} view={view} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

