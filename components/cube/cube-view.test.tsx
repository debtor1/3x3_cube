import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CubeView } from "./cube-view";
import type { PieceIndicator } from "@/lib/cube/face";
import { solvedCube } from "@/lib/cube/state";

const marks: readonly PieceIndicator[] = [
  { position: [0, 1, 1], label: "맞출 모서리", type: "source" },
  { position: [1, 0, 1], label: "목표 자리", type: "target" },
];

describe("CubeView 조각 표시", () => {
  it("표시할 조각마다 고리를 하나씩 보여 주고, 큐브 위에는 글자를 두지 않는다", () => {
    render(
      <CubeView cube={solvedCube()} turning={null} onTurnEnd={() => {}} indicators={marks} />
    );

    expect(screen.getAllByTestId("piece-indicator")).toHaveLength(2);
    expect(screen.queryByText("맞출 모서리")).not.toBeInTheDocument();
    expect(screen.queryByText("목표 자리")).not.toBeInTheDocument();
  });

  it("앞쪽 조각은 또렷한 실선 고리로, 뒤편 조각은 흐린 점선 고리로 보여 준다", () => {
    render(
      <CubeView
        cube={solvedCube()}
        turning={null}
        onTurnEnd={() => {}}
        indicators={[
          { position: [0, 1, 1], label: "앞쪽", type: "source" },
          { position: [0, 1, -1], label: "뒤쪽", type: "target" },
        ]}
      />
    );

    const [front, back] = screen.getAllByTestId("piece-indicator");

    expect(front.style.borderStyle).toBe("solid");
    expect(back.style.borderStyle).toBe("dashed");
    expect(Number(back.style.opacity)).toBeLessThan(Number(front.style.opacity));
  });

  it("동작이 도는 동안에는 표시를 감춘다", () => {
    render(
      <CubeView
        cube={solvedCube()}
        turning={{ move: { face: "U", clockwise: true }, token: 1 }}
        onTurnEnd={() => {}}
        indicators={marks}
      />
    );

    expect(screen.queryAllByTestId("piece-indicator")).toHaveLength(0);
  });

  it("scale prop이 전달되면 3D 씬 래퍼에 scale3d가 적용된다", () => {
    const { container } = render(
      <CubeView
        cube={solvedCube()}
        turning={null}
        onTurnEnd={() => {}}
        scale={1.2}
      />
    );

    const scene = container.querySelector('[data-testid="cube-scene-scale"]');
    expect(scene).toBeInTheDocument();
    expect((scene as HTMLElement).style.transform).toContain("scale3d(1.2, 1.2, 1.2)");
  });
});
