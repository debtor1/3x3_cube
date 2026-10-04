"use client";

import { useRef, useState } from "react";
import type { GridRegion } from "@/lib/cube/color-sample";

type Props = {
  readonly src: string;
  readonly alt: string;
  readonly region: GridRegion;
  readonly onChange: (region: GridRegion) => void;
};

const MIN_SIZE = 0.3;

function clampRegion(region: GridRegion, aspect: number): GridRegion {
  const size = Math.min(1, Math.max(MIN_SIZE, region.size));
  // size는 짧은 변 기준이므로 가로·세로 비율로 환산한다.
  const w = aspect >= 1 ? size / aspect : size;
  const h = aspect >= 1 ? size : size * aspect;
  return {
    size,
    cx: Math.min(1 - w / 2, Math.max(w / 2, region.cx)),
    cy: Math.min(1 - h / 2, Math.max(h / 2, region.cy)),
  };
}

/** 사진 위에 3x3 격자를 띄우고, 큐브 면에 맞게 끌어서 옮기거나 크기를 바꾸게 한다. */
export function FaceGridPicker({ src, alt, region, onChange }: Props) {
  const [aspect, setAspect] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; region: GridRegion } | null>(null);

  const w = aspect >= 1 ? region.size / aspect : region.size;
  const h = aspect >= 1 ? region.size : region.size * aspect;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, region };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!drag || !box || box.width === 0 || box.height === 0) return;
    onChange(
      clampRegion(
        {
          ...drag.region,
          cx: drag.region.cx + (e.clientX - drag.x) / box.width,
          cy: drag.region.cy + (e.clientY - drag.y) / box.height,
        },
        aspect
      )
    );
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div ref={boxRef} className="relative mx-auto w-full max-w-[220px] select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="block h-auto w-full rounded border"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              const next = img.naturalWidth / img.naturalHeight;
              setAspect(next);
              onChange(clampRegion(region, next));
            }
          }}
        />
        <div
          className="absolute grid cursor-move touch-none grid-cols-3 grid-rows-3 border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{
            left: `${(region.cx - w / 2) * 100}%`,
            top: `${(region.cy - h / 2) * 100}%`,
            width: `${w * 100}%`,
            height: `${h * 100}%`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-center border border-white/70"
            >
              <div className="h-1/2 w-1/2 rounded-sm border border-dashed border-white/90" />
            </div>
          ))}
        </div>
      </div>
      <label className="flex w-full max-w-[220px] items-center gap-2 text-[11px] text-muted-foreground">
        격자 크기
        <input
          type="range"
          min={MIN_SIZE}
          max={1}
          step={0.01}
          value={region.size}
          onChange={(e) => onChange(clampRegion({ ...region, size: Number(e.target.value) }, aspect))}
          className="flex-1"
        />
      </label>
    </div>
  );
}
