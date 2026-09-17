import { FACES, type Color, type Face } from "./state";

export type FaceColors = Record<Face, Color[]>;

const COLOR_MAP: Record<string, Color> = {
  U: "U",
  W: "U", // White
  WHITE: "U",
  R: "R", // Red
  RED: "R",
  F: "F",
  G: "F", // Green
  GREEN: "F",
  D: "D",
  Y: "D", // Yellow
  YELLOW: "D",
  L: "L",
  O: "L", // Orange
  ORANGE: "L",
  B: "B", // Blue
  BLUE: "B",
};

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
        result.push(COLOR_MAP[color] ?? null);
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
        const normalized = COLOR_MAP[String(item).trim().toUpperCase()];
        if (!normalized) {
          return null;
        }
        validList.push(normalized);
      }
      result[face] = validList;
    }

    return result as FaceColors;
  } catch {
    return null;
  }
}

export const AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
export const VISION_MODEL = "google/gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `You are an expert Rubik's Cube vision recognition system.
You are given two photos of a standard 3x3 Rubik's cube taken from perspective/diagonal angles.
Photos might be rotated (e.g. 90, 180, or 270 degrees) depending on smartphone camera orientation.

Your task:
1. Identify all visible cube faces across both images.
2. For each face, determine its standard cube face by examining its CENTER sticker (at index 4 in a 3x3 grid):
   - White center -> 'U' (Up)
   - Red center -> 'R' (Right)
   - Green center -> 'F' (Front)
   - Yellow center -> 'D' (Down)
   - Orange center -> 'L' (Left)
   - Blue center -> 'B' (Back)
3. For each identified face, determine the colors of its 9 stickers in a 3x3 grid (indices 0 to 8: row 0 is top 3, row 1 is middle 3, row 2 is bottom 3).
   Reference relative orientation between faces:
   - When looking at F (Green): Top is U (White), Right is R (Red), Bottom is D (Yellow), Left is L (Orange)
   - When looking at U (White): Top is B (Blue), Right is R (Red), Bottom is F (Green), Left is L (Orange)
   - When looking at R (Red): Top is U (White), Right is B (Blue), Bottom is D (Yellow), Left is F (Green)
   - When looking at B (Blue): Top is U (White), Right is L (Orange), Bottom is D (Yellow), Left is R (Red)
   - When looking at L (Orange): Top is U (White), Right is F (Green), Bottom is D (Yellow), Left is B (Blue)
   - When looking at D (Yellow): Top is F (Green), Right is R (Red), Bottom is B (Blue), Left is L (Orange)
4. Valid color codes:
   - 'U' for White
   - 'R' for Red
   - 'F' for Green
   - 'D' for Yellow
   - 'L' for Orange
   - 'B' for Blue
5. If a face is partially obscured or not visible in either photo, estimate the most probable stickers based on surrounding edge/corner pieces.

Respond strictly with valid JSON having keys "U", "R", "F", "D", "L", "B".
Each key must map to an array of exactly 9 color codes.`;

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
              text: "Please inspect the 3x3 Rubik's cube faces across both images. Identify each face by its center sticker and extract the 3x3 sticker colors for all 6 faces in the specified JSON structure.",
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

const SIX_FACES_SYSTEM_PROMPT = `You are an expert Rubik's Cube vision recognition system.
You are given 6 photos corresponding to the 6 faces of a standard 3x3 Rubik's cube:
- Image U: White face (Up)
- Image R: Red face (Right)
- Image F: Green face (Front)
- Image D: Yellow face (Down)
- Image L: Orange face (Left)
- Image B: Blue face (Back)

Each photo shows exactly one face taken from the front as a 3x3 grid of stickers.
For each face, determine the colors of the 9 stickers (indices 0 to 8: row 0 top-left to top-right, row 1 mid-left to mid-right, row 2 bot-left to bot-right).

Valid color codes:
- 'U' for White
- 'R' for Red
- 'F' for Green
- 'D' for Yellow
- 'L' for Orange
- 'B' for Blue

Respond strictly with valid JSON having the exact keys "U", "R", "F", "D", "L", "B".
Each key must map to an array of exactly 9 color codes.`;

/**
 * Vercel AI Gateway를 호출하여 6장의 각 면 정면 사진으로부터 54개 칸의 색상을 추출합니다.
 */
export async function recognizeCubeFromFaceImages(
  faces: Record<Face, string>,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<(Color | null)[]> {
  const contentItems: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    {
      type: "text",
      text: "Please inspect each of the 6 front-facing Rubik's cube photos and extract the 3x3 grid of sticker colors for faces U, R, F, D, L, B in the specified JSON structure.",
    },
  ];

  for (const face of FACES) {
    contentItems.push({
      type: "text",
      text: `Face ${face} photo:`,
    });
    contentItems.push({
      type: "image_url",
      image_url: { url: faces[face] },
    });
  }

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
          content: SIX_FACES_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: contentItems,
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

