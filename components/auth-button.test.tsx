import type { Session } from "next-auth";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthButton } from "./auth-button";

vi.mock("@/lib/use-safe-session", () => ({
  useSafeSession: vi.fn(),
}));

import { useSafeSession } from "@/lib/use-safe-session";

describe("AuthButton", () => {
  it("비로그인 상태일 때 Google 로그인 버튼을 표시한다", () => {
    vi.mocked(useSafeSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: async () => null,
    });

    render(<AuthButton />);
    expect(
      screen.getByRole("button", { name: "Google 로그인" })
    ).toBeInTheDocument();
  });

  it("관리자(debtor11@gmail.com) 로그인 상태일 때 이메일, 관리자 뱃지, 로그아웃 버튼을 표시한다", () => {
    vi.mocked(useSafeSession).mockReturnValue({
      data: { user: { email: "debtor11@gmail.com" } } as unknown as Session,
      status: "authenticated",
      update: async () => null,
    });

    render(<AuthButton />);
    expect(screen.getByText("debtor11@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("관리자")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "로그아웃" })
    ).toBeInTheDocument();
  });

  it("다른 사용자로 로그인 상태일 때 관리자 뱃지 없이 이메일과 로그아웃 버튼만 표시한다", () => {
    vi.mocked(useSafeSession).mockReturnValue({
      data: { user: { email: "student@example.com" } } as unknown as Session,
      status: "authenticated",
      update: async () => null,
    });

    render(<AuthButton />);
    expect(screen.getByText("student@example.com")).toBeInTheDocument();
    expect(screen.queryByText("관리자")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "로그아웃" })
    ).toBeInTheDocument();
  });
});
