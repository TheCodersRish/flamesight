type BrandLogoProps = {
  variant?: 'full' | 'mark';
  className?: string;
  imgClassName?: string;
  title?: string;
};

/** Public asset path that respects Vite `base: './'`. */
export function brandAsset(file: string) {
  const base = import.meta.env.BASE_URL || './';
  return `${base}${file.replace(/^\//, '')}`;
}

export default function BrandLogo({
  variant = 'full',
  className = '',
  imgClassName = '',
  title = 'FlameSight',
}: BrandLogoProps) {
  const src = brandAsset(variant === 'mark' ? 'logo-mark.png' : 'logo.png');
  const decorative = title === '';
  const alt = decorative ? '' : variant === 'mark' ? 'FlameSight' : 'FlameSight logo';

  return (
    <span className={`inline-flex items-center ${className}`} aria-hidden={decorative || undefined}>
      <img
        src={src}
        alt={alt}
        title={decorative ? undefined : title}
        draggable={false}
        className={`select-none object-contain ${imgClassName}`}
      />
    </span>
  );
}
