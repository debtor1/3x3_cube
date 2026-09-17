import { FACES, type Color, type Face } from "./state";

export type FaceColors = Record<Face, Color[]>;

const VALID_COLORS = new Set<Color>(["U", "R", "F", "D", "L", "B"]);

/**
 * 6개 면의 3x3 색상 데이터를 54개 facelet 배열로 조립합니다.
 * 각 면의 중심 칸(인덱스 4)은 큐브 표준에 따라 해당 면 고유의 색으로 고정합니다.
 */
export function assembleCubeFromFaces(faces: FaceColors): (Color | null)[] {
  const result: (Color | null)[] = [];

  for (const face of FACES) {
    const faceColors = faces[face];
    for (let i = 0; i < 9; i++) {
      if (i === 4) {
        // 중심 칸은 항상 해당 면의 색상으로 고정
        result.push(face);
      } else {
        const color = faceColors[i];
        result.push(VALID_COLORS.has(color) ? color : null);
      }
    }
  }

  return result;
}

/**
 * AI 모델이 반환한 JSON 문자열에서 6개 면 색상 데이터를 파싱하고 검증합니다.
 */
export function parseRecognizeResponse(content: string): FaceColors | null {
  try {
    const data = JSON.parse(content);
    if (!data || typeof data !== "object") return null;

    const result: Partial<FaceColors> = {};

    for (const face of FACES) {
      const arr = data[face];
      if (!Array.isArray(arr) || arr.length !== 9) {
        return null;
      }

      const validList: Color[] = [];
      for (const item of arr) {
        const c = String(item).toUpperCase() as Color;
        if (!VALID_COLORS.has(c)) {
          return null;
        }
        validList.push(c);
      }
      result[face] = validList;
    }

    return result as FaceColors;
  } catch {
    return null;
  }
}

export const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
export const VISION_MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a specialized Rubik's cube vision analyzer.
Given two diagonal photos of a standard 3x3 Rubik's cube:
- Image 1 displays 3 faces: U (Up/Top), F (Front), and R (Right).
- Image 2 displays the opposite 3 faces: D (Down/Bottom), B (Back), and L (Left).

For each face, determine the colors of the 9 stickers arranged in a 3x3 grid (indices 0 to 8, read row-by-row from top-left to bottom-right).
Valid color codes are:
- 'U': White
- 'R': Red
- 'F': Green
- 'D': Yellow
- 'L': Orange
- 'B': Blue

Note:
- U center is always 'U' (White)
- R center is always 'R' (Red)
- F center is always 'F' (Green)
- D center is always 'D' (Yellow)
- L center is always 'L' (Orange)
- B center is always 'B' (Blue)

Respond strictly with valid JSON having the exact keys "U", "R", "F", "D", "L", "B".
Each key must map to an array of exactly 9 uppercase single-character strings among ["U", "R", "F", "D", "L", "B"].
Example structure:
{
  "U": ["U", "R", "F", "D", "U", "L", "B", "U", "R"],
  "R": [...9 colors...],
  "F": [...9 colors...],
  "D": [...9 colors...],
  "L": [...9 colors...],
  "B": [...9 colors...]
}`;

/**
 * Vercel AI Gateway를 호출하여 2장의 큐브 사진으로부터 54개 칸의 색상을 추출합니다.
 */
export async function recognizeCubeFromImages(
  image1DataUrl: string,
  image2DataUrl: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<(Color | null)[]> {
  const response = await fetchFn(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Image 1 shows faces U (top), F (front), R (right). Image 2 shows faces D (bottom), B (back), L (left). Please inspect the stickers carefully and return the 3x3 colors for all 6 faces in the specified JSON structure.",
            },
            {
              type: "image_url",
              image_url: { url: image1DataUrl },
            },
            {
              type: "image_url",
              image_url: { url: image2DataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`AI Gateway error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI 응답 내용이 비어 있습니다.");
  }

  const parsedFaces = parseRecognizeResponse(content);
  if (!parsedFaces) {
    throw new Error("큐브 색상 분석 결과를 파싱할 수 없습니다.");
  }

  return assembleCubeFromFaces(parsedFaces);
}
