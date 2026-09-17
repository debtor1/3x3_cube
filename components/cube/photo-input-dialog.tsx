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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 등록할 수 있어요.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
    // 동일 파일 재선택 가능하게 리셋
    e.target.value = "";
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

      const data = await response.json();

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
          <div className="flex flex-col gap-6 py-2">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>알림</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {/* 1번 사진 카드 */}
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">1번 사진 (위·앞·오른쪽)</h4>
                  <p className="text-xs text-muted-foreground">
                    흰색(위), 초록색(앞), 빨간색(오른쪽) 면이 한 번에 보이게 대각선에서 찍어주세요.
                  </p>
                </div>
                {image1 ? (
                  <span className="text-xs font-semibold text-primary">등록됨 ✓</span>
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
                    📷 사진 촬영 / 파일 선택
                  </Button>
                </div>
              )}
            </div>

            {/* 2번 사진 카드 */}
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">2번 사진 (아래·뒤·왼쪽)</h4>
                  <p className="text-xs text-muted-foreground">
                    노란색(아래), 파란색(뒤), 주황색(왼쪽) 면이 한 번에 보이게 대각선에서 찍어주세요.
                  </p>
                </div>
                {image2 ? (
                  <span className="text-xs font-semibold text-primary">등록됨 ✓</span>
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
                    📷 사진 촬영 / 파일 선택
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
