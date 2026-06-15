const MAX_DIMENSION = 1600;
const MIN_SIZE_TO_COMPRESS = 300 * 1024;
const OUTPUT_QUALITY = 0.8;

const replaceFileExtension = (fileName: string, nextExtension: string) => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return `${fileName}${nextExtension}`;
  }

  return `${fileName.slice(0, lastDotIndex)}${nextExtension}`;
};

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    image.src = objectUrl;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to compress image."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });

export const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });

export async function compressPropertyImage(file: File): Promise<File> {
  const image = await loadImage(file);
  const longestSide = Math.max(image.width, image.height);

  if (file.size <= MIN_SIZE_TO_COMPRESS && longestSide <= MAX_DIMENSION) {
    return file;
  }

  const scale =
    longestSide > MAX_DIMENSION ? MAX_DIMENSION / longestSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  const outputType =
    file.type === "image/png" || file.type === "image/webp"
      ? "image/webp"
      : "image/jpeg";

  const outputExtension = outputType === "image/jpeg" ? ".jpg" : ".webp";
  const blob = await canvasToBlob(canvas, outputType, OUTPUT_QUALITY);

  if (blob.size >= file.size && scale === 1) {
    return file;
  }

  return new File([blob], replaceFileExtension(file.name, outputExtension), {
    type: outputType,
    lastModified: Date.now(),
  });
}
