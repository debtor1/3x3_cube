import { describe, expect, it, vi } from "vitest";
import {
  assembleCubeFromFaces,
  type FaceColors,
  parseRecognizeResponse,
  recognizeCubeFromImages,
} from "./recognize";

describe("assembleCubeFromFaces", () => {
  it("6개 면의 9개 색상 배열을 54개 facelet 배열로 올바르게 조립한다", () => {
    const mockFaces: FaceColors = {
      U: ["U", "U", "U", "U", "U", "U", "U", "U", "U"],
      R: ["R", "R", "R", "R", "R", "R", "R", "R", "R"],
      F: ["F", "F", "F", "F", "F", "F", "F", "F", "F"],
      D: ["D", "D", "D", "D", "D", "D", "D", "D", "D"],
      L: ["L", "L", "L", "L", "L", "L", "L", "L", "L"],
      B: ["B", "B", "B", "B", "B", "B", "B", "B", "B"],
    };

    const assembled = assembleCubeFromFaces(mockFaces);
    expect(assembled).toHaveLength(54);

    // 각 면의 첫 번째 칸과 중심 칸 확인
    expect(assembled[0]).toBe("U");
    expect(assembled[4]).toBe("U");
    expect(assembled[9]).toBe("R");
    expect(assembled[13]).toBe("R");
    expect(assembled[18]).toBe("F");
    expect(assembled[22]).toBe("F");
  });

  it("중심 칸(인덱스 4)은 항상 해당 면의 고유 색상으로 강제 유지된다", () => {
    const mockFaces: FaceColors = {
      U: ["R", "R", "R", "R", "F", "R", "R", "R", "R"], // 중심이 F로 잘못 인식됨
      R: ["U", "U", "U", "U", "U", "U", "U", "U", "U"],
      F: ["U", "U", "U", "U", "U", "U", "U", "U", "U"],
      D: ["U", "U", "U", "U", "U", "U", "U", "U", "U"],
      L: ["U", "U", "U", "U", "U", "U", "U", "U", "U"],
      B: ["U", "U", "U", "U", "U", "U", "U", "U", "U"],
    };

    const assembled = assembleCubeFromFaces(mockFaces);
    expect(assembled[4]).toBe("U"); // U면의 중심은 무조건 U
  });
});

describe("parseRecognizeResponse", () => {
  it("유효한 JSON 문자열에서 6개 면 색상을 파싱한다", () => {
    const jsonStr = JSON.stringify({
      U: ["U", "U", "U", "U", "U", "U", "U", "U", "U"],
      R: ["R", "R", "R", "R", "R", "R", "R", "R", "R"],
      F: ["F", "F", "F", "F", "F", "F", "F", "F", "F"],
      D: ["D", "D", "D", "D", "D", "D", "D", "D", "D"],
      L: ["L", "L", "L", "L", "L", "L", "L", "L", "L"],
      B: ["B", "B", "B", "B", "B", "B", "B", "B", "B"],
    });

    const parsed = parseRecognizeResponse(jsonStr);
    expect(parsed).not.toBeNull();
    expect(parsed?.U).toHaveLength(9);
  });

  it("색상 코드가 잘못되었거나 칸 수가 모자라면 null을 반환한다", () => {
    const invalidJson = JSON.stringify({
      U: ["U", "X", "U"], // 칸 수 부족 및 잘못된 색상 코드 'X'
    });

    const parsed = parseRecognizeResponse(invalidJson);
    expect(parsed).toBeNull();
  });
});

describe("recognizeCubeFromImages", () => {
  it("AI Gateway를 호출하여 54개 색상 배열을 반환한다", async () => {
    const mockJson = JSON.stringify({
      U: Array(9).fill("U"),
      R: Array(9).fill("R"),
      F: Array(9).fill("F"),
      D: Array(9).fill("D"),
      L: Array(9).fill("L"),
      B: Array(9).fill("B"),
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: mockJson,
            },
          },
        ],
      }),
    });

    const result = await recognizeCubeFromImages(
      "data:image/jpeg;base64,img1",
      "data:image/jpeg;base64,img2",
      "test-key",
      mockFetch as unknown as typeof fetch
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(54);
    expect(result[0]).toBe("U");
  });

  it("AI Gateway 에러 발생 시 예외를 던진다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(
      recognizeCubeFromImages(
        "data:image/jpeg;base64,img1",
        "data:image/jpeg;base64,img2",
        "bad-key",
        mockFetch as unknown as typeof fetch
      )
    ).rejects.toThrow("AI Gateway error (401)");
  });
});
