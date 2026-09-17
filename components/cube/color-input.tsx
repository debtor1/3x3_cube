"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COLOR_NAMES, COLOR_VALUES, PAINT_ORDER } from "@/lib/cube/appearance";
import { MAX_PER_COLOR, countPainted } from "@/lib/cube/paint";
import { FACES, type Color, type Face, faceletIndex } from "@/lib/cube/state";

/** 전개도에서 여섯 면이 놓이는 자리. 십자 모양으로 펼친다. */
const LAYOUT: Record<Face, { readonly row: number; readonly col: number }> = {
  U: { row: 1, col: 2 },
  L: { row: 2, col: 1 },
  F: { row: 2, col: 2 },
  R: { row: 2, col: 3 },
  B: { row: 2, col: 4 },
  D: { row: 3, col: 2 },
};

const FACE_LABEL: Record<Face, string> = {
  U: "윗면",
  R: "오른쪽 면",
  F: "앞면",
  D: "아랫면",
  L: "왼쪽 면",
  B: "뒷면",
};

type Props = {
  readonly painted: readonly (Color | null)[];
  readonly selected: Color;
  readonly onSelect: (color: Color) => void;
  readonly onPaint: (index: number) => void;
  readonly highlighted: ReadonlySet<number>;
};

export function ColorInput({
  painted,
  selected,
  onSelect,
  onPaint,
  highlighted,
}: Props) {
  const counts = countPainted(painted);
  const selectedFull = counts[selected] >= MAX_PER_COLOR;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          칠할 색을 고르고, 큐브에서 같은 색인 칸을 눌러요. 한 색은 9칸까지만
          칠할 수 있어요.
        </p>
        <ToggleGroup
          value={[selected]}
          onValueChange={(next) => {
            const picked = next.at(-1);
            if (picked) onSelect(picked as Color);
          }}
          className="flex-wrap justify-start"
          aria-label="칠할 색 고르기"
        >
          {PAINT_ORDER.map((color) => (
            <ToggleGroupItem
              key={color}
              value={color}
              aria-label={`${COLOR_NAMES[color]} ${counts[color]}/${MAX_PER_COLOR}칸`}
              className="gap-2"
            >
              <span
                aria-hidden
                className="size-4 rounded-full border border-black/30"
                style={{ background: COLOR_VALUES[color] }}
              />
              {COLOR_NAMES[color]}
              <span
                aria-hidden
                className={`text-xs tabular-nums ${
                  counts[color] >= MAX_PER_COLOR
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {counts[color]}/{MAX_PER_COLOR}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {selectedFull ? (
          <p className="text-sm text-muted-foreground" role="status">
            {COLOR_NAMES[selected]}은 이미 9칸을 다 칠했어요. 다른 색을 골라
            주세요.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {FACES.map((face) => (
          <div
            key={face}
            className="flex flex-col gap-1"
            style={{ gridRow: LAYOUT[face].row, gridColumn: LAYOUT[face].col }}
          >
            <span className="text-[11px] text-muted-foreground">
              {FACE_LABEL[face]}
            </span>
            <div className="grid grid-cols-3 gap-[3px]">
              {Array.from({ length: 9 }, (_, cell) => {
                const row = Math.floor(cell / 3);
                const col = cell % 3;
                const index = faceletIndex(face, row, col);
                const color = painted[index];
                const isCenter = cell === 4;
                const wrong = highlighted.has(index);

                return (
                  <button
                    key={cell}
                    type="button"
                    disabled={isCenter}
                    onClick={() => onPaint(index)}
                    aria-label={`${FACE_LABEL[face]} ${row + 1}번째 줄 ${col + 1}번째 칸${
                      color ? `, ${COLOR_NAMES[color]}` : ", 아직 안 칠함"
                    }`}
                    className={`aspect-square rounded-[4px] border transition-[outline-color,transform] ${
                      wrong
                        ? "border-destructive outline outline-2 outline-offset-1 outline-destructive"
                        : "border-black/25"
                    } ${isCenter ? "cursor-default" : "hover:scale-105"}`}
                    style={{
                      backgroundColor: color ? COLOR_VALUES[color] : "var(--muted)",
                      backgroundImage: color
                        ? "none"
                        : "repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0 3px, transparent 3px 6px)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
