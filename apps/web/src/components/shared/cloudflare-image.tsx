import type { ImgHTMLAttributes } from "react";

interface CloudflareImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Original image URL (can be absolute or relative) */
  src: string;
  /** Intrinsic width (required) */
  width: number;
  /** Intrinsic height (required) */
  height: number;

  /**
   * Aspect ratio in the form "width/height" (e.g. "16/9")
   * If provided, height will be recalculated per srcset entry
   */
  aspectRatio?: string;

  /**
   * Cloudflare-specific options
   */
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  quality?: number;
  format?: "auto" | "avif" | "webp" | "jpeg" | "png";
}

const DEFAULT_SRCSET_WIDTHS = [
  50, 100, 200, 450, 600, 750, 900, 1000, 1250, 1500, 1750, 2000,
];

interface BuildCloudflareUrlOptions {
  src: string;
  width: number;
  height: number;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  quality?: number;
  format?: "auto" | "avif" | "webp" | "jpeg" | "png";
}

export function buildCloudflareUrl({
  src,
  width,
  height,
  fit = "cover",
  quality = 75,
  format = "avif",
}: BuildCloudflareUrlOptions): string {
  const options = [
    `width=${width}`,
    `height=${height}`,
    `fit=${fit}`,
    `quality=${quality}`,
    `format=${format}`,
  ].join(",");

  return `https://munchies.tinloof.com/cdn-cgi/image/${options}/${src}`;
}

interface GenerateSrcSetOptions {
  src: string;
  width: number;
  height: number;
  aspectRatio?: string;
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
  quality?: number;
  format?: "auto" | "avif" | "webp" | "jpeg" | "png";
  widths?: number[];
}

export function generateSrcSet({
  src,
  width,
  height,
  aspectRatio,
  fit = "cover",
  quality = 75,
  format = "avif",
  widths = DEFAULT_SRCSET_WIDTHS,
}: GenerateSrcSetOptions): string {
  const aspectRatioValues = aspectRatio?.split("/");
  const aspectRatioWidth =
    aspectRatioValues?.[0] == null
      ? undefined
      : Number.parseFloat(aspectRatioValues[0]);
  const aspectRatioHeight =
    aspectRatioValues?.[1] == null
      ? undefined
      : Number.parseFloat(aspectRatioValues[1]);

  return widths
    .map((w) => {
      const h =
        aspectRatioWidth && aspectRatioHeight
          ? Math.round((w / aspectRatioWidth) * aspectRatioHeight)
          : Math.round((w / width) * height);

      const url = buildCloudflareUrl({
        src,
        width: w,
        height: h,
        fit,
        quality,
        format,
      });
      return `${url} ${w}w`;
    })
    .join(", ");
}

export function Image({
  src,
  width,
  height,
  sizes,
  loading = "lazy",
  aspectRatio,
  fit = "cover",
  quality = 75,
  format = "avif",
  style,
  alt,
  ...rest
}: CloudflareImageProps) {
  const aspectRatioValues = aspectRatio?.split("/");
  const aspectRatioWidth =
    aspectRatioValues?.[0] == null
      ? undefined
      : Number.parseFloat(aspectRatioValues[0]);
  const aspectRatioHeight =
    aspectRatioValues?.[1] == null
      ? undefined
      : Number.parseFloat(aspectRatioValues[1]);

  const computedHeight =
    aspectRatioWidth && aspectRatioHeight
      ? Math.round((width / aspectRatioWidth) * aspectRatioHeight)
      : height;

  const srcSet = generateSrcSet({
    src,
    width,
    height,
    aspectRatio,
    fit,
    quality,
    format,
  });
  const finalSrc = buildCloudflareUrl({
    src,
    width,
    height: computedHeight,
    fit,
    quality,
    format,
  });

  return (
    // biome-ignore assist/source/useSortedAttributes: https://github.com/vercel/next.js/blob/11e295089c5759891b82168c2cf7153731704519/packages/next/src/client/image-component.tsx#L272
    <img
      alt={alt}
      height={computedHeight}
      loading={loading}
      sizes={sizes}
      srcSet={srcSet}
      src={finalSrc}
      style={{ ...style, ...(aspectRatio ? { aspectRatio } : undefined) }}
      width={width}
      {...rest}
    />
  );
}
