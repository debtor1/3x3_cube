"use client";

import { Button } from "@/components/ui/button";
import { COLOR_NAMES, COLOR_VALUES, describeFacelet } from "@/lib/cube/appearance";
import type { Repair } from "@/lib/cube/repair";
import { type Color, FACES } from "@/lib/cube/state";

type Props = {
  readonly repairs: readonly Repair[];
  readonly index: number;
  readonly onApply: (repair: Repair) => void;
  readonly onNext: () => void;
};

function Swatch({ color }: { readonly color: Color }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden
        className="inline-block size-3 rounded-full border border-black/30 align-middle"
        style={{ background: COLOR_VALUES[color] }}
      />
      {COLOR_NAMES[color]}
    </span>
  );
}

/** 실제 큐브가 되도록 가장 적은 칸만 바꾸는 방법을 보여 주고, 눌러서 바로 고칠 수 있게 한다. */
export function RepairSuggestion({ repairs, index, onApply, onNext }: Props) {
  const repair = repairs[index];
  if (!repair) return null;

  return (
    <div
      data-testid="repair-suggestion"
      className="mt-3 flex flex-col gap-2 rounded-md border border-primary/30 bg-background p-3 text-foreground"
    >
      <p className="text-sm font-semibold">
        🛠️ {repair.changes.length}칸만 고치면 실제 큐브가 돼요
        {repairs.length > 1 ? (
          <span className="ml-1 font-normal text-muted-foreground">
            (제안 {index + 1}/{repairs.length})
          </span>
        ) : null}
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {repair.changes.map(({ index: facelet, from, to }) => (
          <li key={facelet}>
            {describeFacelet(FACES[Math.floor(facelet / 9)], facelet % 9)}: <Swatch color={from} /> →{" "}
            <Swatch color={to} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        표시된 칸을 손에 든 큐브와 비교해 보고, 맞으면 눌러서 바로 고쳐요.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onApply(repair)}>
          제안대로 고치기
        </Button>
        {repairs.length > 1 ? (
          <Button type="button" size="sm" variant="outline" onClick={onNext}>
            다른 제안 보기
          </Button>
        ) : null}
      </div>
    </div>
  );
}
