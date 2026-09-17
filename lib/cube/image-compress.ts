/**
 * 브라우저 환경에서 대용량 이미지를 최대 해상도 및 JPEG 품질로 압축하여 DataURL로 반환합니다.
 * Vercel Serverless Function 요청 페이로드 제한(4.5MB) 초과 방지 및 AI 처리 속도 향상 목적.
 */
export async function compressImage(
  file: File,
  maxDimension = 1024,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("파일을 읽을 수 없습니다."));
    };

    reader.onload = () => {
      const dataUrl = reader.result as string;

      // 브라우저의 Image / Canvas API를 지원하지 않는 환경(SSR 등)에서는 원본 dataUrl 반환
      if (typeof window === "undefined" || typeof Image === "undefined") {
        resolve(dataUrl);
        return;
      }

      const img = new Image();

      // jsdom이나 이미지 디코딩이 지원되지 않는 환경을 위한 타임아웃 fallback
      const timer = setTimeout(() => {
        resolve(dataUrl);
      }, 300);

      img.onerror = () => {
        clearTimeout(timer);
        resolve(dataUrl);
      };

      img.onload = () => {
        clearTimeout(timer);
        try {
          let { width, height } = img;

          // 크기 축소 비율 계산
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        } catch {
          // Canvas 처리 중 오류 발생 시 fallback
          resolve(dataUrl);
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
