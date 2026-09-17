import type { Session } from "next-auth";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoInputDialog } from "./photo-input-dialog";

vi.mock("@/lib/use-safe-session", () => ({
  useSafeSession: vi.fn(),
}));

import { useSafeSession } from "@/lib/use-safe-session";

describe("PhotoInputDialog", () => {
  it("비로그인 상태일 때 로그인 안내와 구글 로그인 버튼을 보여준다", () => {
    vi.mocked(useSafeSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: async () => null,
    });

    render(
      <PhotoInputDialog
        open={true}
        onOpenChange={vi.fn()}
        onRecognized={vi.fn()}
      />
    );

    expect(screen.getByText("구글 로그인이 필요해요")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "구글 계정으로 로그인" })
    ).toBeInTheDocument();
  });

  it("허용되지 않은 다른 구글 계정으로 로그인된 경우 권한 경고를 표시한다", () => {
    vi.mocked(useSafeSession).mockReturnValue({
      data: { user: { email: "other@gmail.com" } } as unknown as Session,
      status: "authenticated",
      update: async () => null,
    });

    render(
      <PhotoInputDialog
        open={true}
        onOpenChange={vi.fn()}
        onRecognized={vi.fn()}
      />
    );

    expect(screen.getByText("이용 권한이 없습니다")).toBeInTheDocument();
    expect(
      screen.getByText(/debtor11@gmail\.com/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다른 계정으로 로그인" })
    ).toBeInTheDocument();
  });

  it("허용된 관리자(debtor11@gmail.com)로 로그인된 경우 2장의 사진 등록 카드와 분석 버튼을 표시한다", () => {
    vi.mocked(useSafeSession).mockReturnValue({
      data: { user: { email: "debtor11@gmail.com" } } as unknown as Session,
      status: "authenticated",
      update: async () => null,
    });

    render(
      <PhotoInputDialog
        open={true}
        onOpenChange={vi.fn()}
        onRecognized={vi.fn()}
      />
    );

    expect(screen.getByText("인식률을 높이는 촬영 가이드")).toBeInTheDocument();
    expect(screen.getByText("1번 사진 (위·앞·오른쪽)")).toBeInTheDocument();
    expect(screen.getByText("2번 사진 (아래·뒤·왼쪽)")).toBeInTheDocument();
    expect(screen.getByText(/위: 흰색/)).toBeInTheDocument();
    expect(screen.getByText(/앞: 초록색/)).toBeInTheDocument();
    expect(screen.getByText(/오른쪽: 빨간색/)).toBeInTheDocument();
    expect(screen.getByText(/아래: 노란색/)).toBeInTheDocument();
    expect(screen.getByText(/뒤: 파란색/)).toBeInTheDocument();
    expect(screen.getByText(/왼쪽: 주황색/)).toBeInTheDocument();

    const analyzeBtn = screen.getByRole("button", {
      name: "AI로 색상 분석하기",
    });
    expect(analyzeBtn).toBeInTheDocument();
    expect(analyzeBtn).toBeDisabled();
  });
});
