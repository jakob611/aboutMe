import Image from "next/image";

/** Decorative within a named brand link or signature. */
export function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/brand/jakob-tominc-logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="shrink-0"
      unoptimized
    />
  );
}
