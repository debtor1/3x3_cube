import { NextResponse } from "next/server";
import { auth, ALLOWED_ADMIN_EMAIL } from "@/auth";
import { recognizeCubeFromImages } from "@/lib/cube/recognize";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "구글 로그인이 필요합니다." },
      { status: 401 }
    );
  }

  if (session.user.email !== ALLOWED_ADMIN_EMAIL) {
    return NextResponse.json(
      { error: `지정된 관리자 계정(${ALLOWED_ADMIN_EMAIL})만 이용할 수 있습니다.` },
      { status: 403 }
    );
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI Gateway API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { image1, image2 } = body || {};

    if (!image1 || !image2 || typeof image1 !== "string" || typeof image2 !== "string") {
      return NextResponse.json(
        { error: "두 장의 사진이 모두 필요합니다." },
        { status: 400 }
      );
    }

    const painted = await recognizeCubeFromImages(image1, image2, apiKey);
    return NextResponse.json({ painted });
  } catch (error) {
    console.error("[recognize API error]", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json(
      { error: `사진 분석에 실패했습니다: ${message}` },
      { status: 502 }
    );
  }
}
