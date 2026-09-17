import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { POST } from "./route";

// auth 모킹
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  ALLOWED_ADMIN_EMAIL: "debtor11@gmail.com",
}));

// recognize 모킹
vi.mock("@/lib/cube/recognize", () => ({
  recognizeCubeFromImages: vi.fn(),
}));

import { auth } from "@/auth";
import { recognizeCubeFromImages } from "@/lib/cube/recognize";

const mockAuth = auth as unknown as Mock;

describe("POST /api/cube/recognize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_GATEWAY_API_KEY = "test-key";
  });

  it("세션이 없으면 401을 반환한다", async () => {
    mockAuth.mockResolvedValue(null as unknown as Session);

    const req = new Request("http://localhost/api/cube/recognize", {
      method: "POST",
      body: JSON.stringify({ image1: "img1", image2: "img2" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("로그인");
  });

  it("허용된 관리자 이메일이 아니면 403을 반환한다", async () => {
    mockAuth.mockResolvedValue({
      user: { email: "other@gmail.com" },
    } as unknown as Session);

    const req = new Request("http://localhost/api/cube/recognize", {
      method: "POST",
      body: JSON.stringify({ image1: "img1", image2: "img2" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("debtor11@gmail.com");
  });

  it("이미지가 전달되지 않으면 400을 반환한다", async () => {
    mockAuth.mockResolvedValue({
      user: { email: "debtor11@gmail.com" },
    } as unknown as Session);

    const req = new Request("http://localhost/api/cube/recognize", {
      method: "POST",
      body: JSON.stringify({ image1: "img1" }), // image2 누락
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("인가된 사용자가 두 장의 이미지를 전달하면 200과 함께 painted 배열을 반환한다", async () => {
    mockAuth.mockResolvedValue({
      user: { email: "debtor11@gmail.com" },
    } as unknown as Session);

    const mockPainted = Array(54).fill("U");
    vi.mocked(recognizeCubeFromImages).mockResolvedValue(mockPainted);

    const req = new Request("http://localhost/api/cube/recognize", {
      method: "POST",
      body: JSON.stringify({ image1: "data:img1", image2: "data:img2" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.painted).toHaveLength(54);
    expect(recognizeCubeFromImages).toHaveBeenCalledWith(
      "data:img1",
      "data:img2",
      "test-key"
    );
  });
});
