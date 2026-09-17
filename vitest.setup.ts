import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// globals: false 이므로 Testing Library 자동 cleanup이 걸리지 않는다.
afterEach(cleanup);

if (typeof window !== "undefined" && typeof window.AnimationEvent === "undefined") {
  // jsdom에서 React 19의 onAnimationEnd 이벤트 처리를 위한 폴리필
  class AnimationEventPolyfill extends Event {
    readonly animationName: string;
    readonly elapsedTime: number;
    readonly pseudoElement: string;

    constructor(type: string, eventInitDict?: AnimationEventInit) {
      super(type, eventInitDict);
      this.animationName = eventInitDict?.animationName ?? "";
      this.elapsedTime = eventInitDict?.elapsedTime ?? 0;
      this.pseudoElement = eventInitDict?.pseudoElement ?? "";
    }
  }

  window.AnimationEvent = AnimationEventPolyfill as unknown as typeof AnimationEvent;
}
