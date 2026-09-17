import type { Session } from "next-auth";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("허용된 관리자(debtor11@gmail.com)로 로그인된 경우 기본으로 6면 정면 촬영 모드가 노출된다", () => {
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

    // 6면 가이드 및 6개 면 카드 기본 노출 확인
    expect(
      screen.getByText("6면 정면 촬영 가이드 (가장 정확한 인식)")
    ).toBeInTheDocument();
    expect(screen.getByText("1. 윗면 (U)")).toBeInTheDocument();
    expect(screen.getByText("2. 아랫면 (D)")).toBeInTheDocument();
    expect(screen.getByText("3. 앞면 (F)")).toBeInTheDocument();
    expect(screen.getByText("4. 뒷면 (B)")).toBeInTheDocument();
    expect(screen.getByText("5. 오른쪽면 (R)")).toBeInTheDocument();
    expect(screen.getByText("6. 왼쪽면 (L)")).toBeInTheDocument();
    // 상단 기준 방향 힌트 확인
    expect(screen.getByText("상단: 파란색(뒤)")).toBeInTheDocument();
    expect(screen.getByText("상단: 초록색(앞)")).toBeInTheDocument();
    expect(screen.getAllByText("상단: 흰색(위)")).toHaveLength(4);

    const analyzeBtn = screen.getByRole("button", {
      name: "AI로 색상 분석하기",
    });
    expect(analyzeBtn).toBeInTheDocument();
    expect(analyzeBtn).toBeDisabled();

    // 대각선 2장 촬영 탭 클릭 시 2장 촬영 UI로 전환 확인
    fireEvent.click(screen.getByText(/대각선 2장 촬영/));
    expect(
      screen.getByText("인식률을 높이는 대각선 촬영 가이드")
    ).toBeInTheDocument();
    expect(screen.getByText("1번 사진 (위·앞·오른쪽)")).toBeInTheDocument();
    expect(screen.getByText("2번 사진 (아래·뒤·왼쪽)")).toBeInTheDocument();
  });
});
