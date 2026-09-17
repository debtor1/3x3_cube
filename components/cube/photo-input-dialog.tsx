"use client";

import { useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { ALLOWED_ADMIN_EMAIL } from "@/lib/auth-config";
import { useSafeSession } from "@/lib/use-safe-session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { compressImage } from "@/lib/cube/image-compress";
import { FACES, type Color, type Face } from "@/lib/cube/state";

type Props = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRecognized: (painted: readonly (Color | null)[]) => void;
};

type Mode = "six" | "diagonal";

const FACE_CONFIGS: Array<{
  face: Face;
  label: string;
  colorName: string;
  dotClass: string;
  badgeClass: string;
}> = [
  {
    face: "U",
    label: "1. 윗면 (U)",
    colorName: "흰색",
    dotClass: "bg-white border border-neutral-400",
    badgeClass: "border-neutral-300 bg-white text-neutral-800",
  },
  {
    face: "D",
    label: "2. 아랫면 (D)",
    colorName: "노란색",
    dotClass: "bg-amber-400",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
  },
  {
    face: "F",
    label: "3. 앞면 (F)",
    colorName: "초록색",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    face: "B",
    label: "4. 뒷면 (B)",
    colorName: "파란색",
    dotClass: "bg-blue-500",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-800",
  },
  {
    face: "R",
    label: "5. 오른쪽면 (R)",
    colorName: "빨간색",
    dotClass: "bg-rose-500",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-800",
  },
  {
    face: "L",
    label: "6. 왼쪽면 (L)",
    colorName: "주황색",
    dotClass: "bg-orange-500",
    badgeClass: "border-orange-200 bg-orange-50 text-orange-800",
  },
];

export function PhotoInputDialog({ open, onOpenChange, onRecognized }: Props) {
  const { data: session, status } = useSafeSession();
  const [mode, setMode] = useState<Mode>("six");
  const [faceImages, setFaceImages] = useState<Partial<Record<Face, string>>>({});
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const faceInputRefs = useRef<Partial<Record<Face, HTMLInputElement | null>>>({});

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 등록할 수 있어요.");
      return;
    }

    try {
      setError(null);
      const compressedUrl = await compressImage(file);
      setImage(compressedUrl);
    } catch {
      setError("이미지를 불러오는 중 문제가 발생했습니다.");
    } finally {
      e.target.value = "";
    }
  };

  const handleFaceFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    face: Face
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 등록할 수 있어요.");
      return;
    }

    try {
      setError(null);
      const compressedUrl = await compressImage(file);
      setFaceImages((prev) => ({ ...prev, [face]: compressedUrl }));
    } catch {
      setError("이미지를 불러오는 중 문제가 발생했습니다.");
    } finally {
      e.target.value = "";
    }
  };

  const isAllFacesReady = FACES.every((f) => !!faceImages[f]);
  const isDiagonalReady = !!image1 && !!image2;
  const isReadyToAnalyze = mode === "six" ? isAllFacesReady : isDiagonalReady;

  const handleAnalyze = async () => {
    if (mode === "six" && !isAllFacesReady) {
      setError("6개 면의 사진을 모두 등록해주세요.");
      return;
    }

    if (mode === "diagonal" && !isDiagonalReady) {
      setError("두 장의 사진을 모두 등록해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "six"
          ? { faces: faceImages }
          : { image1, image2 };

      const response = await fetch("/api/cube/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; painted?: readonly (Color | null)[] } = {};
      try {
        data = await response.json();
      } catch {
        if (response.status === 413) {
          throw new Error("사진 파일 용량이 너무 큽니다. 사진 크기를 줄여주세요.");
        }
        if (response.status === 504) {
          throw new Error("AI 응답 시간이 초과되었습니다. 다시 시도해주세요.");
        }
        throw new Error(`서버 오류가 발생했습니다 (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || "사진 분석 중 오류가 발생했습니다.");
      }

      if (data.painted && Array.isArray(data.painted)) {
        onRecognized(data.painted);
        handleClose();
      } else {
        throw new Error("올바른 색상 데이터를 받아오지 못했습니다.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "사진 분석에 실패했습니다. 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFaceImages({});
    setImage1(null);
    setImage2(null);
    setError(null);
    setLoading(false);
    onOpenChange(false);
  };

  const isAuthorized = session?.user?.email === ALLOWED_ADMIN_EMAIL;

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>큐브 사진으로 색상 자동 입력</DialogTitle>
          <DialogDescription>
            큐브 사진을 등록하여 6개 면 54개 칸의 색상을 자동으로 채워요.
          </DialogDescription>
        </DialogHeader>

        {status === "loading" ? (
          <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
            로그인 상태 확인 중...
          </div>
        ) : !session?.user ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-2xl">🔒</div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-foreground">구글 로그인이 필요해요</p>
              <p className="text-xs text-muted-foreground">
                외부 Vision AI 모델을 사용하는 기능으로, 인증된 구글 계정으로 로그인해야
                사용할 수 있습니다.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => signIn("google")}
              className="mt-2 gap-2"
            >
              구글 계정으로 로그인
            </Button>
          </div>
        ) : !isAuthorized ? (
          <div className="flex flex-col gap-4 py-4">
            <Alert variant="destructive">
              <AlertTitle>이용 권한이 없습니다</AlertTitle>
              <AlertDescription>
                현재 사진 자동 입력 기능은 지정된 관리자(
                <span className="font-mono font-medium">{ALLOWED_ADMIN_EMAIL}</span>) 계정으로만
                이용할 수 있습니다.
                <br />
                (현재 로그인 계정: {session.user.email})
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => signOut()}>
                다른 계정으로 로그인
              </Button>
              <Button type="button" variant="ghost" onClick={handleClose}>
                닫기
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 py-2">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>알림</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {/* 촬영 방식 탭 선택 */}
            <div className="flex rounded-lg bg-muted p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("six")}
                className={`flex-1 rounded-md py-1.5 font-medium transition-all ${
                  mode === "six"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📷 6면 정면 촬영 (기본·추천)
              </button>
              <button
                type="button"
                onClick={() => setMode("diagonal")}
                className={`flex-1 rounded-md py-1.5 font-medium transition-all ${
                  mode === "diagonal"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📐 대각선 2장 촬영
              </button>
            </div>

            {mode === "six" ? (
              /* 6면 정면 촬영 모드 */
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/40">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-950 dark:text-emerald-200">
                    <span className="text-sm">🎯</span>
                    <span>6면 정면 촬영 가이드 (가장 정확한 인식)</span>
                  </div>
                  <p className="mt-1 text-emerald-900/90 dark:text-emerald-300 leading-relaxed">
                    각 면의 <strong>가운데 중심색</strong>을 확인하고, 3×3 격자가 정면으로 보이게 반듯하게 촬영해주세요. 왜곡이 없어 인식률이 가장 높습니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {FACE_CONFIGS.map((cfg) => {
                    const img = faceImages[cfg.face];
                    return (
                      <div
                        key={cfg.face}
                        className="flex flex-col gap-2 rounded-lg border p-3 bg-card"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{cfg.label}</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium shadow-2xs ${cfg.badgeClass}`}
                            >
                              <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
                              {cfg.colorName}
                            </span>
                          </div>
                          {img ? (
                            <span className="text-xs font-semibold text-primary">등록됨 ✓</span>
                          ) : null}
                        </div>

                        <input
                          ref={(el) => {
                            faceInputRefs.current[cfg.face] = el;
                          }}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleFaceFileChange(e, cfg.face)}
                        />

                        {img ? (
                          <div className="relative mt-1 flex flex-col items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={`${cfg.label} 미리보기`}
                              className="max-h-32 w-full rounded border object-contain bg-black/5"
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => faceInputRefs.current[cfg.face]?.click()}
                              >
                                변경
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setFaceImages((prev) => {
                                    const next = { ...prev };
                                    delete next[cfg.face];
                                    return next;
                                  })
                                }
                              >
                                삭제
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => faceInputRefs.current[cfg.face]?.click()}
                            >
                              📷 촬영 / 파일 선택
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 대각선 2장 촬영 모드 */
              <div className="flex flex-col gap-5">
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs dark:border-blue-900/50 dark:bg-blue-950/40">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-950 dark:text-blue-200">
                    <span className="text-sm">📸</span>
                    <span>인식률을 높이는 대각선 촬영 가이드</span>
                  </div>
                  <ul className="mt-2 list-disc list-inside space-y-1 text-blue-900/90 dark:text-blue-300">
                    <li>
                      <strong>6개 면이 3면씩 모두 나와야 해요:</strong> 1번과 2번 사진의 면이 겹치지 않고 완전 반대편 꼭짓점을 찍어야 6면 전체(54칸)가 인식됩니다.
                    </li>
                    <li>
                      <strong>대각선 꼭짓점 구도:</strong> 3개 면이 한 화면에 골고루 보이도록 꼭짓점 정면에서 촬영해주세요.
                    </li>
                    <li>
                      <strong>빛 반사 주의:</strong> 형광등 빛이 큐브에 강하게 반사되어 하얗게 날아가지 않도록 각도를 살짝 틀어주세요.
                    </li>
                  </ul>
                </div>

                {/* 1번 사진 카드 */}
                <div className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold">1번 사진 (위·앞·오른쪽)</h4>
                      <p className="text-xs text-muted-foreground">
                        위, 앞, 오른쪽 면이 한 번에 보이게 대각선 꼭짓점에서 찍어주세요.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 font-medium text-neutral-800 shadow-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                          <span className="h-2 w-2 rounded-full border border-neutral-400 bg-white" />
                          위: 흰색
                        </span>
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          앞: 초록색
                        </span>
                        <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          오른쪽: 빨간색
                        </span>
                      </div>
                    </div>
                    {image1 ? (
                      <span className="shrink-0 text-xs font-semibold text-primary">등록됨 ✓</span>
                    ) : null}
                  </div>

                  <input
                    ref={fileInputRef1}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setImage1)}
                  />

                  {image1 ? (
                    <div className="relative mt-2 flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image1}
                        alt="1번 사진 미리보기"
                        className="max-h-44 w-full rounded border object-contain bg-black/5"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef1.current?.click()}
                        >
                          사진 변경
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setImage1(null)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => fileInputRef1.current?.click()}
                      >
                        📷 1번 사진 촬영 / 파일 선택
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2번 사진 카드 */}
                <div className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold">2번 사진 (아래·뒤·왼쪽)</h4>
                      <p className="text-xs text-muted-foreground">
                        큐브를 반대로 돌려 아래, 뒤, 왼쪽 면이 보이게 대각선 꼭짓점에서 찍어주세요.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          아래: 노란색
                        </span>
                        <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          뒤: 파란색
                        </span>
                        <span className="inline-flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 font-medium text-orange-800 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-300">
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                          왼쪽: 주황색
                        </span>
                      </div>
                    </div>
                    {image2 ? (
                      <span className="shrink-0 text-xs font-semibold text-primary">등록됨 ✓</span>
                    ) : null}
                  </div>

                  <input
                    ref={fileInputRef2}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setImage2)}
                  />

                  {image2 ? (
                    <div className="relative mt-2 flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image2}
                        alt="2번 사진 미리보기"
                        className="max-h-44 w-full rounded border object-contain bg-black/5"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef2.current?.click()}
                        >
                          사진 변경
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setImage2(null)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => fileInputRef2.current?.click()}
                      >
                        📷 2번 사진 촬영 / 파일 선택
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="mt-2 flex flex-row items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                취소
              </Button>
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={!isReadyToAnalyze || loading}
              >
                {loading ? "AI가 색상을 분석 중입니다..." : "AI로 색상 분석하기"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
