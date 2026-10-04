import type { SecondLayerCase } from "@/lib/cube/second-layer";
import type { YellowCrossCase } from "@/lib/cube/yellow-cross";
import type { YellowCrossEdgesCase } from "@/lib/cube/yellow-cross-edges";
import type { YellowCornersPosCase } from "@/lib/cube/yellow-corners-pos";

export type LessonStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 질문을 만들 때 필요한 안내 동작의 필드만 추린 모양. */
export type LessonAction = {
  readonly stage: LessonStage;
  readonly formula?: string;
  readonly edgeIndex?: number;
  readonly secondLayerCase?: SecondLayerCase;
  readonly yellowCrossCase?: YellowCrossCase;
  readonly edgesCase?: YellowCrossEdgesCase;
  readonly posCase?: YellowCornersPosCase;
};

export type QuizOption = {
  readonly value: string;
  readonly label: string;
};

export type CaseQuiz = {
  readonly question: string;
  readonly hint: string;
  readonly options: readonly QuizOption[];
  readonly answer: string;
};

export type FormulaCard = {
  readonly name: string;
  readonly rhythm: string;
  readonly when: string;
};

/** 단계마다 "왜 이렇게 돌리는지"를 한 줄로 알려 주는 원리. */
export const STAGE_PRINCIPLES: Readonly<Record<LessonStage, string>> = {
  1: "가운데 조각은 아무리 돌려도 자리가 바뀌지 않아서 기준이 돼요. 흰 모서리 조각은 옆면 색이 그 면 가운데 색과 같을 때 제자리예요.",
  2: "트위스트 4동작은 오른쪽 아래 꼭짓점을 위로 올리면서 방향을 바꿔요. 흰색이 위를 볼 때까지 같은 공식을 되풀이하면 돼요.",
  3: "넣을 자리를 잠깐 비켜 두고(피하기), 꺼냈다 넣는 트위스트를 양손으로 한 번씩 하면 1층은 그대로 두고 모서리만 2층에 들어가요.",
  4: "이 공식은 아래 두 층은 그대로 두고 윗면 모서리만 뒤집어요. 그래서 할 때마다 노란 모서리가 늘어나 점 ➔ ㄱ자 ➔ 일자 ➔ 십자가가 돼요.",
  5: "이 공식은 노란 십자가는 그대로 두고 윗면 모서리 두 개의 자리만 맞바꿔요. 이미 맞은 두 면을 정해진 자리에 놓고 시작하는 것이 핵심이에요.",
  6: "이 공식은 오른쪽 앞 꼭짓점은 그대로 두고 나머지 세 꼭짓점만 빙글 자리를 돌려요. 그래서 제자리에 있는 꼭짓점을 오른쪽 앞에 두고 시작해요.",
  7: "아래층이 흐트러지는 것은 잠깐이에요. 네 꼭짓점을 모두 맞출 때까지 트위스트를 이어 가면 아래층이 저절로 다시 맞춰져요.",
};

/** 단계를 마쳤을 때 다시 보여 주는 그 단계의 공식. */
export const STAGE_FORMULAS: Readonly<Record<LessonStage, readonly FormulaCard[]>> = {
  1: [],
  2: [
    {
      name: "트위스트",
      rhythm: "내리고 ➔ 돌리고 ➔ 올리고 ➔ 돌리고",
      when: "흰 꼭짓점을 오른쪽 앞 아래에 두고, 흰색이 위를 볼 때까지 되풀이해요.",
    },
  ],
  3: [
    {
      name: "오른쪽 넣기",
      rhythm: "피하기 ➔ 오른손 트위스트 ➔ 큐브 돌리기 ➔ 왼손 트위스트",
      when: "윗면 조각의 윗면 색이 오른쪽 가운데 색과 같을 때 써요.",
    },
    {
      name: "왼쪽 넣기",
      rhythm: "피하기 ➔ 왼손 트위스트 ➔ 큐브 돌리기 ➔ 오른손 트위스트",
      when: "윗면 조각의 윗면 색이 왼쪽 가운데 색과 같을 때 써요.",
    },
    {
      name: "2층에서 꺼내기",
      rhythm: "오른쪽 넣기와 같은 동작",
      when: "2층에 엉뚱한 조각이 끼어 있을 때, 먼저 윗면으로 꺼내요.",
    },
  ],
  4: [
    {
      name: "노란 십자가 공식",
      rhythm: "앞면 눕히기 ➔ 오른손 트위스트 ➔ 앞면 세우기",
      when: "점은 아무 방향, ㄱ자는 뒤쪽과 왼쪽, 일자는 가로로 두고 써요.",
    },
  ],
  5: [
    {
      name: "모서리 맞바꾸기 공식",
      rhythm: "올리고 ➔ 돌리고 ➔ 내리고 ➔ 돌리고 ➔ 올리고 ➔ 두 번 돌리고 ➔ 내리고",
      when: "맞은 두 면이 이웃하면 뒤와 오른쪽에, 마주 보면 앞과 뒤에 두고 써요.",
    },
  ],
  6: [
    {
      name: "노란 꼭짓점 공식",
      rhythm: "돌리고 ➔ 올리고 ➔ 돌리고 ➔ 올리고 ➔ 돌리고 ➔ 내리고 ➔ 돌리고 ➔ 내리고",
      when: "제자리인 꼭짓점을 오른쪽 앞에 두고 써요. 하나도 없으면 아무 방향에서 한 번 써요.",
    },
  ],
  7: [
    {
      name: "트위스트 (2단계와 같아요)",
      rhythm: "내리고 ➔ 돌리고 ➔ 올리고 ➔ 돌리고",
      when: "오른쪽 앞 꼭짓점의 노란색이 위를 볼 때까지 되풀이하고, 다음 꼭짓점은 윗면만 돌려 가져와요.",
    },
  ],
};

const QUIZ_STAGE_7: CaseQuiz = {
  question: "노란 꼭짓점 방향은 어떤 공식으로 맞출까요?",
  hint: "새 공식은 없어요. 앞에서 배운 공식 중 하나를 다시 써요.",
  options: [
    { value: "twist", label: "2단계 트위스트" },
    { value: "cross", label: "노란 십자가 공식" },
    { value: "corners", label: "노란 꼭짓점 공식" },
  ],
  answer: "twist",
};

function caseKey(action: LessonAction): string | null {
  switch (action.stage) {
    case 3:
      return action.secondLayerCase ? `${action.edgeIndex}:${action.secondLayerCase}` : null;
    case 4:
      return action.yellowCrossCase && action.yellowCrossCase !== "cross"
        ? action.yellowCrossCase
        : null;
    case 5:
      return action.edgesCase && action.edgesCase !== "all" ? action.edgesCase : null;
    case 6:
      return action.posCase && action.posCase !== "all" ? action.posCase : null;
    default:
      return null;
  }
}

function caseQuiz(action: LessonAction): CaseQuiz | null {
  switch (action.stage) {
    case 3:
      return {
        question: "이 모서리는 어느 쪽으로 넣을까요?",
        hint: "표시된 조각의 윗면 색이 오른쪽과 왼쪽 중 어느 가운데 색과 같은지 보세요. 2층에 잘못 끼어 있으면 먼저 꺼내요.",
        options: [
          { value: "right", label: "오른쪽 넣기" },
          { value: "left", label: "왼쪽 넣기" },
          { value: "eject", label: "2층에서 꺼내기" },
        ],
        answer: action.secondLayerCase ?? "right",
      };
    case 4:
      return {
        question: "지금 윗면의 노란 모양은 무엇일까요?",
        hint: "꼭짓점은 빼고, 가운데와 모서리 4개의 노란색만 보세요.",
        options: [
          { value: "dot", label: "점" },
          { value: "hook", label: "ㄱ자" },
          { value: "line", label: "일자" },
        ],
        answer: action.yellowCrossCase ?? "dot",
      };
    case 5:
      return {
        question: "옆면 색이 맞은 모서리 두 개는 어떤 사이일까요?",
        hint: "노란 십자가 모서리의 옆면 색이 아래 가운데 색과 같은 곳을 찾아보세요.",
        options: [
          { value: "adjacent", label: "이웃해 있어요" },
          { value: "opposite", label: "마주 보고 있어요" },
        ],
        answer: action.edgesCase ?? "adjacent",
      };
    case 6:
      return {
        question: "제자리에 있는 노란 꼭짓점은 몇 개일까요?",
        hint: "꼭짓점의 세 가지 색이 둘레 세 면의 가운데 색과 같으면 제자리예요. 돌아가 있어도 괜찮아요.",
        options: [
          { value: "one", label: "1개" },
          { value: "none", label: "0개" },
        ],
        answer: action.posCase ?? "one",
      };
    default:
      return null;
  }
}

/**
 * actions[index]에서 아이에게 먼저 맞혀 볼 질문이 있으면 돌려준다.
 * 경우가 새로 시작되는 첫 동작에서만 묻고, 같은 경우가 이어지면 묻지 않는다.
 */
export function findCaseQuiz(
  actions: readonly LessonAction[],
  index: number
): CaseQuiz | null {
  const action = actions[index];
  if (!action) return null;

  if (action.stage === 7) {
    if (!action.formula) return null;
    const isFirstFormula = actions.slice(0, index).every((a) => !a.formula);
    return isFirstFormula ? QUIZ_STAGE_7 : null;
  }

  const key = caseKey(action);
  if (key === null) return null;
  const prev = index > 0 ? actions[index - 1] : undefined;
  if (prev && prev.stage === action.stage && caseKey(prev) === key) return null;
  return caseQuiz(action);
}
