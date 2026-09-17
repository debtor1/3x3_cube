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
import type { Color } from "@/lib/cube/state";

type Props = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRecognized: (painted: readonly (Color | null)[]) => void;
};

export function PhotoInputDialog({ open, onOpenChange, onRecognized }: Props) {
  const { data: session, status } = useSafeSession();
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

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

  const handleAnalyze = async () => {
    if (!image1 || !image2) {
      setError("두 장의 사진을 모두 등록해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cube/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image1, image2 }),
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
    setImage1(null);
    setImage2(null);
    setError(null);
    setLoading(false);
    onOpenChange(false);
  };

  const isAuthorized = session?.user?.email === ALLOWED_ADMIN_EMAIL;

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>큐브 사진으로 색상 자동 입력</DialogTitle>
          <DialogDescription>
            큐브의 대각선 2장을 찍거나 올려서 6개 면 색상을 자동으로 채워요.
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

            {/* 촬영 가이드 배너 */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs dark:border-blue-900/50 dark:bg-blue-950/40">
              <div className="flex items-center gap-1.5 font-semibold text-blue-950 dark:text-blue-200">
                <span className="text-sm">📸</span>
                <span>인식률을 높이는 촬영 가이드</span>
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

            <DialogFooter className="mt-2 flex flex-row items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
                취소
              </Button>
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={!image1 || !image2 || loading}
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
