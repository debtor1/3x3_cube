"use client";

import { signIn, signOut } from "next-auth/react";
import { ALLOWED_ADMIN_EMAIL } from "@/lib/auth-config";
import { useSafeSession } from "@/lib/use-safe-session";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const { data: session, status } = useSafeSession();

  if (status === "loading") {
    return <div className="h-8 w-20 animate-pulse rounded bg-muted" />;
  }

  if (!session?.user) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => signIn("google")}
        className="text-xs"
      >
        Google 로그인
      </Button>
    );
  }

  const isAdmin = session.user.email === ALLOWED_ADMIN_EMAIL;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
        {session.user.email}
      </span>
      {isAdmin ? (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          관리자
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        로그아웃
      </Button>
    </div>
  );
}
