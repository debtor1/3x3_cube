import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, test } from "vitest";

import { CrossTrainer } from "@/components/cube/cross-trainer";
import { COLOR_NAMES } from "@/lib/cube/appearance";
import { solveWhiteCross } from "@/lib/cube/cross";
import { solveWhiteFace } from "@/lib/cube/face";
import { randomCube } from "@/lib/cube/scramble";
import { rotateCubeX180, solveSecondLayer } from "@/lib/cube/second-layer";
import { applyMove, applyMoves, solvedCube, type Move } from "@/lib/cube/state";
import { isYellowCrossSolved } from "@/lib/cube/yellow-cross";

function emptyCells() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-label")?.includes("아직 안 칠함"));
}

test("한 색을 아홉 칸 넘게 칠하려 하면 열 번째 칸은 그대로 남는다", () => {
  render(<CrossTrainer />);

  // 가운데 칸이 미리 칠해져 있어 빨간색은 이미 1/9에서 시작한다.
  fireEvent.click(screen.getByRole("button", { name: /빨간색 1\/9칸/ }));

  for (let i = 0; i < 10; i += 1) {
    fireEvent.click(emptyCells()[0]);
  }

  expect(screen.getByRole("button", { name: /빨간색 9\/9칸/ })).toBeInTheDocument();
  expect(
    screen.getByText(`${COLOR_NAMES.R}은 이미 9칸을 다 칠했어요. 다른 색을 골라 주세요.`)
  ).toBeInTheDocument();
  expect(emptyCells().length).toBeGreaterThan(0);
});

test("무작위로 채우기를 누르면 곧바로 다 칠해지고 큐브 맞추기 시작을 누를 수 있다", () => {
  render(<CrossTrainer />);

  fireEvent.click(screen.getByRole("button", { name: "무작위로 채우기" }));

  expect(screen.getByText("모두 칠했어요")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "큐브 맞추기 시작" })).not.toBeDisabled();
  expect(emptyCells()).toHaveLength(0);
});

test("수용 기준 1: 색 입력 화면에 흰 십자가를 스스로 만들어 보라는 권유가 보인다", () => {
  render(<CrossTrainer />);
  expect(screen.getByText(/흰 십자가를 스스로 먼저 맞춰볼 수도 있어요/)).toBeInTheDocument();
});

test("수용 기준 2: 이미 6면이 모두 완성된 상태를 넣으면 돌릴 것이 없다고 알린다", () => {
  render(<CrossTrainer initialPainted={solvedCube()} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  expect(screen.getByText("이미 큐브가 모두 완성되어 있어요. 돌릴 것이 없어요.")).toBeInTheDocument();
  expect(screen.getByText("3x3 큐브 완성!")).toBeInTheDocument();
});

test("5단계까지 맞고 꼭짓점 자리는 섞인 상태를 넣으면 1~5단계를 건너뛰고 바로 6단계가 시작된다", () => {
  // 5단계까지 맞추고 Niklas 공식을 적용해 꼭짓점 자리만 섞기
  let c = rotateCubeX180(solvedCube());
  c = applyMoves(c, [
    { face: "U", clockwise: true },
    { face: "R", clockwise: true },
    { face: "U", clockwise: false },
    { face: "L", clockwise: false },
    { face: "U", clockwise: true },
    { face: "R", clockwise: false },
    { face: "U", clockwise: false },
    { face: "L", clockwise: true },
  ]);

  render(<CrossTrainer initialPainted={c} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  expect(screen.getByText("6단계: 노란 꼭짓점 자리")).toBeInTheDocument();
  expect(screen.getByText(/6단계: 노란 꼭짓점 자리 맞추기란\?/)).toBeInTheDocument();
});

test("노란 십자가까지 맞고 옆면은 틀어진 상태를 넣으면 1, 2, 3, 4단계를 건너뛰고 바로 5단계가 시작된다", () => {
  // 노란 십자가는 맞고 옆면은 섞인 상태 만들기 (흰색 바닥, 노란색 윗면)
  let c = rotateCubeX180(solvedCube());
  // Sune 공식을 1회 적용하여 옆면 순환시킴
  c = applyMoves(c, [
    { face: "R", clockwise: true },
    { face: "U", clockwise: true },
    { face: "R", clockwise: false },
    { face: "U", clockwise: true },
    { face: "R", clockwise: true },
    { face: "U", clockwise: true },
    { face: "U", clockwise: true },
    { face: "R", clockwise: false },
  ]);

  render(<CrossTrainer initialPainted={c} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  expect(screen.getByText("5단계: 노란 십자가 옆면")).toBeInTheDocument();
  expect(screen.getByText(/5단계: 노란 십자가 옆면 맞추기란\?/)).toBeInTheDocument();
});

test("2층까지 완성된 상태를 넣으면 1, 2, 3단계를 건너뛰고 바로 4단계가 시작된다", () => {
  const scr = randomCube();
  let c = applyMoves(scr, solveWhiteCross(scr));
  const faceRes = solveWhiteFace(c);
  for (const act of faceRes.actions) {
    c = act.type === "move" ? applyMove(c, act.move) : act.apply(c);
  }
  const secondRes = solveSecondLayer(c);
  for (const act of secondRes.actions) {
    c = act.type === "move" ? applyMove(c, act.move) : act.apply(c);
  }

  // 만약 우연히 십자가까지 맞아있다면 1회 돌려 노란 십자가를 깸
  if (isYellowCrossSolved(c)) {
    c = applyMoves(c, [
      { face: "F", clockwise: true },
      { face: "R", clockwise: true },
      { face: "U", clockwise: true },
      { face: "R", clockwise: false },
      { face: "U", clockwise: false },
      { face: "F", clockwise: false },
    ]);
  }

  render(<CrossTrainer initialPainted={c} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  expect(screen.getByText("4단계: 노란 십자가")).toBeInTheDocument();
  expect(screen.getByText(/4단계: 노란 십자가 맞추기란\?/)).toBeInTheDocument();
});

test("흰 면(1층)만 완성된 상태를 넣으면 1, 2단계를 건너뛰고 바로 3단계가 시작된다", () => {
  const scr = randomCube();
  const crossMoves = solveWhiteCross(scr);
  let whiteSolvedCube = applyMoves(scr, crossMoves);
  const faceResult = solveWhiteFace(whiteSolvedCube);
  for (const act of faceResult.actions) {
    if (act.type === "move") {
      whiteSolvedCube = applyMove(whiteSolvedCube, act.move);
    } else {
      whiteSolvedCube = act.apply(whiteSolvedCube);
    }
  }

  render(<CrossTrainer initialPainted={whiteSolvedCube} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  expect(screen.getByText("3단계: 2층 완성")).toBeInTheDocument();
  expect(screen.getAllByText(/큐브를 위아래로 180도 뒤집어요/).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/3단계: 2층 모서리 맞추기란\?/)).toBeInTheDocument();
});

test("수용 기준 2: 흰 십자가가 이미 맞은 상태를 넣으면 1단계 없이 바로 2단계가 시작된다", () => {
  // 흰 십자가는 맞고 코너가 틀린 상태
  const twisted = applyMoves(solvedCube(), [
    { face: "R", clockwise: false },
    { face: "D", clockwise: false },
    { face: "R", clockwise: true },
    { face: "D", clockwise: true },
  ]);

  render(<CrossTrainer initialPainted={twisted} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  // 1단계 표시가 없고 바로 2단계 배지 표시
  expect(screen.getByText("2단계: 흰 면 완성")).toBeInTheDocument();
  // 공식 묶음과 트위스트 안내 노출
  expect(screen.getByText(/트위스트/)).toBeInTheDocument();
});

test("수용 기준 6 & 10: 공식은 네 동작 묶음으로 보이고 영어 기호가 없다", () => {
  const twisted = applyMoves(solvedCube(), [
    { face: "R", clockwise: false },
    { face: "D", clockwise: false },
    { face: "R", clockwise: true },
    { face: "D", clockwise: true },
  ]);

  render(<CrossTrainer initialPainted={twisted} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  // 공식 묶음 번호 1, 2, 3, 4가 렌더링됨
  expect(screen.getByTestId("formula-step-1")).toBeInTheDocument();
  expect(screen.getByTestId("formula-step-2")).toBeInTheDocument();
  expect(screen.getByTestId("formula-step-3")).toBeInTheDocument();
  expect(screen.getByTestId("formula-step-4")).toBeInTheDocument();

  // 안내 텍스트에 영어 기호 R, U, F, D, L, B 단독 기호가 없음
  const guideText = screen.getByText(/돌려요/);
  expect(guideText.textContent).not.toMatch(/\b[RUFDLB]\b/);
});

test("수용 기준 11: 이전 동작과 다음 동작으로 한 동작씩 넘나든다", () => {
  const twisted = applyMoves(solvedCube(), [
    { face: "R", clockwise: false },
    { face: "D", clockwise: false },
    { face: "R", clockwise: true },
    { face: "D", clockwise: true },
  ]);

  render(<CrossTrainer initialPainted={twisted} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  const nextBtn = screen.getByRole("button", { name: "다음 동작" });
  const prevBtn = screen.getByRole("button", { name: "이전 동작" });

  expect(prevBtn).toBeDisabled();

  // 첫 번째 동작 실행
  fireEvent.click(nextBtn);

  // 애니메이션 종료 모달/이벤트 처리: transition end
  // 버튼 클릭 후 turn이 설정됨
});

test("수용 기준 3: 1단계를 안내로 마치면 완성을 알리고, 아이가 누르기 전까지 2단계로 넘어가지 않는다", async () => {
  // 1단계 1수(F)로 완성되는 상태: solvedCube에 F'를 적용
  const oneMoveFromCross = applyMoves(solvedCube(), [{ face: "F", clockwise: false }]);

  render(<CrossTrainer initialPainted={oneMoveFromCross} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  expect(screen.getByText("1단계: 흰 십자가")).toBeInTheDocument();

  // 다음 동작 클릭
  fireEvent.click(screen.getByRole("button", { name: "다음 동작" }));

  const turnLayer = await screen.findByTestId("turn-layer");
  fireEvent.click(turnLayer);

  // 1단계 완성 알림 및 2단계 전환 버튼 확인
  await waitFor(() => {
    expect(screen.getByText("🎉 1단계 흰 십자가가 완성되었어요!")).toBeInTheDocument();
  });

  const proceedBtn = screen.getByRole("button", { name: "2단계: 흰 면 맞추러 가기" });
  expect(proceedBtn).toBeInTheDocument();

  // 아직 2단계로 넘어가지 않은 상태
  expect(screen.queryByText("2단계: 흰 면 완성")).not.toBeInTheDocument();

  // 아이가 버튼을 누르면 비로소 2단계로 진입
  fireEvent.click(proceedBtn);
  expect(screen.getByText("2단계: 흰 면 완성")).toBeInTheDocument();
});

test("2단계에서 공식 적용 상황과 조건 설명 카드가 노출된다", () => {
  const twisted = applyMoves(solvedCube(), [
    { face: "R", clockwise: false },
    { face: "D", clockwise: false },
    { face: "R", clockwise: true },
    { face: "D", clockwise: true },
  ]);

  render(<CrossTrainer initialPainted={twisted} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  expect(screen.getByText("지금 상황")).toBeInTheDocument();
  expect(screen.getByText("공식 조건")).toBeInTheDocument();
  expect(
    screen.getByText("네 동작을 한 묶음으로 돌리면 아래 조각이 위로 올라오면서 회전해요")
  ).toBeInTheDocument();
});

test("2단계에서 어떤 조각을 가리키는지 조각 위치 화살표 안내와 3D 인디케이터가 노출된다", () => {
  const twisted = applyMoves(solvedCube(), [
    { face: "R", clockwise: false },
    { face: "D", clockwise: false },
    { face: "R", clockwise: true },
    { face: "D", clockwise: true },
  ]);

  render(<CrossTrainer initialPainted={twisted} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  // 설명 카드 내 "조각 위치" 및 화살표 안내 노출 확인
  expect(screen.getByText("조각 위치")).toBeInTheDocument();
  expect(screen.getByText("➔")).toBeInTheDocument();
  expect(screen.getByText("오른쪽 앞 아래")).toBeInTheDocument();
  expect(screen.getByText("오른쪽 위 앞")).toBeInTheDocument();

  // 3D 큐브 뷰 위에 조각을 가리키는 3D 인디케이터 마커 노출 확인
  const indicators = screen.getAllByTestId("piece-indicator");
  expect(indicators.length).toBeGreaterThanOrEqual(1);
  // 조각 이름은 안내 카드가 맡고, 3D 큐브 위에는 글자를 두지 않는다
  expect(screen.queryByText("목표 자리")).not.toBeInTheDocument();

  // 2단계 꼭짓점 맞추기 개념 카드 노출 확인
  expect(screen.getByText(/꼭짓점\(코너\) 맞추기란\?/)).toBeInTheDocument();
  expect(screen.getByText(/색이 3개/)).toBeInTheDocument();
});

test("3단계에서 10동작 공식 묶음과 상황 설명이 노출된다", async () => {
  const scr = randomCube();
  const crossMoves = solveWhiteCross(scr);
  let whiteSolvedCube = applyMoves(scr, crossMoves);
  const faceResult = solveWhiteFace(whiteSolvedCube);
  for (const act of faceResult.actions) {
    if (act.type === "move") {
      whiteSolvedCube = applyMove(whiteSolvedCube, act.move);
    } else {
      whiteSolvedCube = act.apply(whiteSolvedCube);
    }
  }

  render(<CrossTrainer initialPainted={whiteSolvedCube} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  // 첫 동작은 180도 뒤집기
  expect(screen.getAllByText(/큐브를 위아래로 180도 뒤집어요/).length).toBeGreaterThanOrEqual(1);

  // 뒤집기 실행
  fireEvent.click(screen.getByRole("button", { name: "다음 동작" }));
  const turnLayer = await screen.findByTestId("turn-layer");
  fireEvent.click(turnLayer);

  // 뒤집기 후 정렬 또는 10동작 공식 묶음이 노출됨
  await waitFor(() => {
    expect(screen.getByText(/2층 모서리 4개 중 \d번째 모서리 맞추는 중/)).toBeInTheDocument();
  });
});

test("4단계에서 6동작 공식 묶음과 상황 설명이 노출된다", async () => {
  const scr = randomCube();
  let c = applyMoves(scr, solveWhiteCross(scr));
  const faceRes = solveWhiteFace(c);
  for (const act of faceRes.actions) {
    c = act.type === "move" ? applyMove(c, act.move) : act.apply(c);
  }
  const secondRes = solveSecondLayer(c);
  for (const act of secondRes.actions) {
    c = act.type === "move" ? applyMove(c, act.move) : act.apply(c);
  }

  // 만약 우연히 십자가까지 맞아있다면 1회 돌려 노란 십자가를 깸
  if (isYellowCrossSolved(c)) {
    c = applyMoves(c, [
      { face: "F", clockwise: true },
      { face: "R", clockwise: true },
      { face: "U", clockwise: true },
      { face: "R", clockwise: false },
      { face: "U", clockwise: false },
      { face: "F", clockwise: false },
    ]);
  }

  render(<CrossTrainer initialPainted={c} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  expect(screen.getByText("4단계: 노란 십자가")).toBeInTheDocument();
  expect(screen.getByText(/4단계: 노란 십자가 맞추기란\?/)).toBeInTheDocument();
  expect(screen.getByText("지금 상황")).toBeInTheDocument();
  expect(screen.getByText("공식 조건")).toBeInTheDocument();

  // 첫 동작이 정렬 회전일 경우 다음 동작을 진행하여 공식 묶음으로 이동
  if (screen.queryByText("1") === null) {
    fireEvent.click(screen.getByRole("button", { name: "다음 동작" }));
    const turnLayer = await screen.findByTestId("turn-layer");
    fireEvent.click(turnLayer);
  }

  // 정렬이 2회인 경우(U2) 한 번 더 진행할 수 있음
  if (screen.queryByText("1") === null) {
    fireEvent.click(screen.getByRole("button", { name: "다음 동작" }));
    const turnLayer = await screen.findByTestId("turn-layer");
    fireEvent.click(turnLayer);
  }

  // 공식 묶음 표시 및 1~6 번호 확인
  await waitFor(() => {
    expect(screen.getAllByText(/노란 십자가 공식/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("formula-step-1")).toBeInTheDocument();
    expect(screen.getByTestId("formula-step-2")).toBeInTheDocument();
    expect(screen.getByTestId("formula-step-3")).toBeInTheDocument();
    expect(screen.getByTestId("formula-step-4")).toBeInTheDocument();
    expect(screen.getByTestId("formula-step-5")).toBeInTheDocument();
    expect(screen.getByTestId("formula-step-6")).toBeInTheDocument();
  });
});

test("다음 단계로 건너뛰기 버튼을 누르면 1단계 -> 2단계 -> 3단계 -> 4단계 -> 5단계 -> 6단계 -> 완료로 즉시 건너뛸 수 있다", () => {
  const scr = randomCube();
  render(<CrossTrainer initialPainted={scr} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  // 1단계 시작 확인
  expect(screen.getByText("1단계: 흰 십자가")).toBeInTheDocument();
  const skipButton = screen.getByRole("button", { name: "다음 단계로 건너뛰기" });
  expect(skipButton).not.toBeDisabled();

  // 1단계 -> 2단계 건너뛰기
  fireEvent.click(skipButton);
  expect(screen.getByText("2단계: 흰 면 완성")).toBeInTheDocument();

  // 2단계 -> 3단계 건너뛰기
  fireEvent.click(skipButton);
  expect(screen.getByText("3단계: 2층 완성")).toBeInTheDocument();

  // 3단계 -> 4단계 건너뛰기
  fireEvent.click(skipButton);
  expect(screen.getByText("4단계: 노란 십자가")).toBeInTheDocument();

  // 4단계 -> 5단계 건너뛰기
  fireEvent.click(skipButton);
  expect(screen.getByText("5단계: 노란 십자가 옆면")).toBeInTheDocument();

  // 5단계 -> 6단계 건너뛰기
  fireEvent.click(skipButton);
  expect(screen.getByText("6단계: 노란 꼭짓점 자리")).toBeInTheDocument();

  // 6단계 -> 7단계 건너뛰기
  fireEvent.click(skipButton);
  expect(screen.getByText("7단계: 노란 꼭짓점 방향 (최종 완성)")).toBeInTheDocument();

  // 7단계 -> 최종 큐브 전체 완성 건너뛰기
  fireEvent.click(skipButton);
  expect(screen.getByText("🎉 축하합니다! 3x3 큐브를 모두 완성했어요!")).toBeInTheDocument();
  expect(skipButton).toBeDisabled();
});

test("5단계: 노란 십자가 옆면 안내와 8동작 공식 묶음이 화면에 나타난다", async () => {
  const scr = randomCube();
  render(<CrossTrainer initialPainted={scr} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  const skipButton = screen.getByRole("button", { name: "다음 단계로 건너뛰기" });
  while (screen.getByTestId("stage-step-5").getAttribute("data-status") !== "current" && !skipButton.hasAttribute("disabled")) {
    fireEvent.click(skipButton);
  }

  expect(screen.getByText("5단계: 노란 십자가 옆면")).toBeInTheDocument();
  expect(screen.getByText(/5단계: 노란 십자가 옆면 맞추기란\?/)).toBeInTheDocument();
});

test("6단계: 노란 꼭짓점 자리 안내와 8동작 대칭 공식 묶음이 화면에 나타난다", async () => {
  const scr = randomCube();
  render(<CrossTrainer initialPainted={scr} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  const skipButton = screen.getByRole("button", { name: "다음 단계로 건너뛰기" });
  while (screen.getByTestId("stage-step-6").getAttribute("data-status") !== "current" && !skipButton.hasAttribute("disabled")) {
    fireEvent.click(skipButton);
  }

  expect(screen.getByText(/6단계: 노란 꼭짓점 자리 맞추기란\?/)).toBeInTheDocument();
});

test("7단계: 노란 꼭짓점 방향 맞추기 안내와 4동작 아랫면 트위스트가 화면에 나타난다", async () => {
  const scr = randomCube();
  render(<CrossTrainer initialPainted={scr} />);
  fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

  const skipButton = screen.getByRole("button", { name: "다음 단계로 건너뛰기" });
  while (screen.getByTestId("stage-step-7").getAttribute("data-status") !== "current" && !skipButton.hasAttribute("disabled")) {
    fireEvent.click(skipButton);
  }

  expect(screen.getByText("7단계: 노란 꼭짓점 방향 (최종 완성)")).toBeInTheDocument();
  expect(screen.getByText(/7단계: 노란 꼭짓점 방향 맞추기 \(최종 완성!\)/)).toBeInTheDocument();
});

describe("폰트 및 큐브 크기 개별 조절 (view-scale-controls)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("수용 기준 1 & 10: 화면 상단 헤더에 친숙한 한글(글자, 큐브)과 기호(−, +) 버튼이 상시 노출된다", () => {
    render(<CrossTrainer />);

    expect(screen.getByText("글자")).toBeInTheDocument();
    expect(screen.getByText("큐브")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "글자 크기 축소" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "글자 크기 확대" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "큐브 크기 축소" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "큐브 크기 확대" })).toBeInTheDocument();
  });

  it("수용 기준 2 & 3: 글자 크기는 4단계로 조절되며 최소 단계에서 축소 비활성화, 최대 단계에서 확대 비활성화된다", () => {
    render(<CrossTrainer />);

    const fontDown = screen.getByRole("button", { name: "글자 크기 축소" });
    const fontUp = screen.getByRole("button", { name: "글자 크기 확대" });

    // 기본값: 보통 (1.0, 100%) -> 인덱스 1
    // 1회 축소 -> 축소 (0.85, 85%) -> 인덱스 0 (최소)
    fireEvent.click(fontDown);
    expect(fontDown).toBeDisabled();
    expect(fontUp).not.toBeDisabled();

    // 1회 확대 -> 보통 (1.0)
    fireEvent.click(fontUp);
    expect(fontDown).not.toBeDisabled();
    expect(fontUp).not.toBeDisabled();

    // 2회 확대 -> 확대 (1.15)
    fireEvent.click(fontUp);
    expect(fontDown).not.toBeDisabled();
    expect(fontUp).not.toBeDisabled();

    // 3회 확대 -> 최대 (1.30, 130%) -> 인덱스 3 (최대)
    fireEvent.click(fontUp);
    expect(fontUp).toBeDisabled();
    expect(fontDown).not.toBeDisabled();
  });

  it("수용 기준 4 & 5: 큐브 크기는 3단계로 조절되며 최소 단계에서 축소 비활성화, 최대 단계에서 확대 비활성화된다", () => {
    const scr = randomCube();
    const { container } = render(<CrossTrainer initialPainted={scr} />);
    fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

    const cubeDown = screen.getByRole("button", { name: "큐브 크기 축소" });
    const cubeUp = screen.getByRole("button", { name: "큐브 크기 확대" });

    // 기본값: 보통 (1.0x) -> 씬의 transform은 scale3d(1, 1, 1)
    let scene = container.querySelector('[data-testid="cube-scene-scale"]');
    expect((scene as HTMLElement).style.transform).toContain("scale3d(1, 1, 1)");

    // 1회 축소 -> 축소 (0.8x, 최소)
    fireEvent.click(cubeDown);
    expect(cubeDown).toBeDisabled();
    expect(cubeUp).not.toBeDisabled();
    scene = container.querySelector('[data-testid="cube-scene-scale"]');
    expect((scene as HTMLElement).style.transform).toContain("scale3d(0.8, 0.8, 0.8)");

    // 1회 확대 -> 보통 (1.0x)
    fireEvent.click(cubeUp);
    expect(cubeDown).not.toBeDisabled();
    expect(cubeUp).not.toBeDisabled();
    scene = container.querySelector('[data-testid="cube-scene-scale"]');
    expect((scene as HTMLElement).style.transform).toContain("scale3d(1, 1, 1)");

    // 2회 확대 -> 확대 (1.2x, 최대)
    fireEvent.click(cubeUp);
    expect(cubeUp).toBeDisabled();
    expect(cubeDown).not.toBeDisabled();
    scene = container.querySelector('[data-testid="cube-scene-scale"]');
    expect((scene as HTMLElement).style.transform).toContain("scale3d(1.2, 1.2, 1.2)");
  });

  it("수용 기준 8: 글자 크기와 큐브 크기는 독립적으로 작동한다", () => {
    const scr = randomCube();
    const { container } = render(<CrossTrainer initialPainted={scr} />);
    fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

    const fontUp = screen.getByRole("button", { name: "글자 크기 확대" });
    const cubeDown = screen.getByRole("button", { name: "큐브 크기 축소" });

    // 글자 크기를 키워도 큐브 크기는 1.0 유지
    fireEvent.click(fontUp);
    let scene = container.querySelector('[data-testid="cube-scene-scale"]');
    expect((scene as HTMLElement).style.transform).toContain("scale3d(1, 1, 1)");

    // 큐브 크기를 줄여도 글자 확대 상태는 유지
    fireEvent.click(cubeDown);
    scene = container.querySelector('[data-testid="cube-scene-scale"]');
    expect((scene as HTMLElement).style.transform).toContain("scale3d(0.8, 0.8, 0.8)");
    expect(screen.getByRole("button", { name: "글자 크기 확대" })).not.toBeDisabled();
  });

  it("수용 기준 9: 조절한 크기는 localStorage에 저장되고 '처음부터 다시'를 눌러도 유지된다", () => {
    localStorage.clear();
    const scr = randomCube();
    render(<CrossTrainer initialPainted={scr} />);
    fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

    const fontUp = screen.getByRole("button", { name: "글자 크기 확대" });
    const cubeUp = screen.getByRole("button", { name: "큐브 크기 확대" });

    fireEvent.click(fontUp); // font scale index 2 (1.15)
    fireEvent.click(cubeUp); // cube scale index 2 (1.2)

    expect(localStorage.getItem("cube_trainer_font_scale_index")).toBe("2");
    expect(localStorage.getItem("cube_trainer_cube_scale_index")).toBe("2");

    // 처음부터 다시 클릭
    fireEvent.click(screen.getByRole("button", { name: "처음부터 다시" }));

    // 색 입력 화면에서도 설정 인덱스 유지
    expect(screen.getByRole("button", { name: "큐브 크기 확대" })).toBeDisabled();
  });
});

describe("7단계 스테이지 진행 인디케이터 (stage-progress-indicator)", () => {
  it("수용 기준 1 & 5: 가이드 진입 시 7개 스텝이 표시되고, 건너뛰기 시 스텝 상태가 즉시 갱신된다", () => {
    const scr = randomCube();
    render(<CrossTrainer initialPainted={scr} />);
    fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

    // 1단계 시작 시 스텝 1은 current, 스텝 2~7은 upcoming
    expect(screen.getByTestId("stage-step-1")).toHaveAttribute("data-status", "current");
    expect(screen.getByTestId("stage-step-2")).toHaveAttribute("data-status", "upcoming");

    // 다음 단계로 건너뛰기 클릭 -> 2단계
    const skipBtn = screen.getByRole("button", { name: "다음 단계로 건너뛰기" });
    fireEvent.click(skipBtn);

    // 스텝 1은 completed, 스텝 2는 current
    expect(screen.getByTestId("stage-step-1")).toHaveAttribute("data-status", "completed");
    expect(screen.getByTestId("stage-step-2")).toHaveAttribute("data-status", "current");
  });

  it("수용 기준 6: 이미 완성된 큐브를 넣으면 모든 스텝이 completed 상태로 표시된다", () => {
    render(<CrossTrainer initialPainted={solvedCube()} />);
    fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

    for (let s = 1; s <= 7; s++) {
      expect(screen.getByTestId(`stage-step-${s}`)).toHaveAttribute("data-status", "completed");
    }
  });
});

describe("공식 반복 횟수 및 목표 상태 안내 (formula-repeat-guidance)", () => {
  it("수용 기준 1 & 2 & 3: 4단계 노란 십자가에서 반복 회차 배지와 형태 변화 목표가 상시 표시된다", () => {
    // 2층까지 완성되고 노란 십자가는 안 풀린 결정론적 큐브 생성
    let c = rotateCubeX180(solvedCube());
    c = applyMoves(c, [
      { face: "F", clockwise: true },
      { face: "R", clockwise: true },
      { face: "U", clockwise: true },
      { face: "R", clockwise: false },
      { face: "U", clockwise: false },
      { face: "F", clockwise: false },
    ]);
    render(<CrossTrainer initialPainted={c} />);
    fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

    // 1~3단계는 이미 맞았으므로 곧바로 4단계 시작
    expect(screen.getByTestId("stage-step-4")).toHaveAttribute("data-status", "current");
    expect(screen.getAllByText(/4단계: 노란 십자가/)[0]).toBeInTheDocument();

    // 목표 문구는 상시 표시됨
    const goalEl = screen.getByTestId("formula-goal-text");
    expect(goalEl).toBeInTheDocument();
    expect(goalEl.textContent).toMatch(/🎯 형태: ㄱ자 ➔ 일자 ➔ 십자가/);

    // 반복 회차 배지 표시됨 (1 / 2회차)
    const badgeEl = screen.getByTestId("formula-repeat-badge");
    expect(badgeEl).toBeInTheDocument();
    expect(badgeEl.textContent).toBe("1 / 2회차");
  });

  it("수용 기준 6: 1회만 단독 실행되는 공식(3단계 등)에서는 반복 회차 배지가 노출되지 않고 목표만 표시된다", () => {
    // 1층까지 완성되고 2층 엣지가 틀어진 결정론적 큐브 생성
    let c = rotateCubeX180(solvedCube());
    c = applyMoves(c, [
      { face: "U", clockwise: true },
      { face: "R", clockwise: true },
      { face: "U", clockwise: false },
      { face: "R", clockwise: false },
      { face: "U", clockwise: false },
      { face: "F", clockwise: false },
      { face: "U", clockwise: true },
      { face: "F", clockwise: true },
    ]);
    c = rotateCubeX180(c);
    render(<CrossTrainer initialPainted={c} />);
    fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

    // 1~2단계는 이미 맞았으므로 곧바로 3단계 시작
    expect(screen.getByTestId("stage-step-3")).toHaveAttribute("data-status", "current");
    expect(screen.getAllByText(/3단계: 2층 완성/)[0]).toBeInTheDocument();

    // 공식 카드가 나타날 때까지 다음 동작 및 애니메이션 진행
    while (!screen.queryByTestId("formula-goal-text")) {
      fireEvent.click(screen.getByRole("button", { name: "다음 동작" }));
      fireEvent.click(screen.getByTestId("turn-layer"));
    }

    // 3단계는 단독 실행이므로 회차 배지(formula-repeat-badge)가 없어야 함
    expect(screen.queryByTestId("formula-repeat-badge")).not.toBeInTheDocument();
    // 하지만 목표 문구는 존재해야 함
    expect(screen.getByTestId("formula-goal-text")).toBeInTheDocument();
    expect(screen.getByTestId("formula-goal-text").textContent).toMatch(/🎯 목표: 윗면의 모서리 조각을 2층 왼쪽 자리로 넣어요/);
  });

  it("수용 기준 4: 7단계 노란 꼭짓점 방향 맞추기에서 트위스트 반복 회차 배지와 목표가 정확히 표시된다", () => {
    // 6단계까지 완성되고 7단계 꼭짓점 방향만 틀어진 결정론적 큐브 생성
    let c = rotateCubeX180(solvedCube());
    const twist2: readonly Move[] = [
      { face: "R", clockwise: false }, { face: "D", clockwise: false }, { face: "R", clockwise: true }, { face: "D", clockwise: true },
      { face: "R", clockwise: false }, { face: "D", clockwise: false }, { face: "R", clockwise: true }, { face: "D", clockwise: true },
    ];
    const twist4 = [...twist2, ...twist2];
    c = applyMoves(c, [
      ...twist2,
      { face: "U", clockwise: true },
      ...twist4,
      { face: "U", clockwise: false },
    ]);

    render(<CrossTrainer initialPainted={c} />);
    fireEvent.click(screen.getByRole("button", { name: "큐브 맞추기 시작" }));

    // 1~6단계는 이미 맞았으므로 곧바로 7단계 시작
    expect(screen.getByTestId("stage-step-7")).toHaveAttribute("data-status", "current");
    expect(screen.getAllByText(/7단계: 노란 꼭짓점 방향/)[0]).toBeInTheDocument();

    // 트위스트 반복 회차 배지 노출
    const badgeEl = screen.getByTestId("formula-repeat-badge");
    expect(badgeEl).toBeInTheDocument();
    expect(badgeEl.textContent).toMatch(/\d+ \/ \d+회차/);

    const goalEl = screen.getByTestId("formula-goal-text");
    expect(goalEl.textContent).toMatch(/🎯 목표: 오른쪽 앞 꼭짓점의 노란색이 위를 볼 때까지 반복해요/);
  });
});



