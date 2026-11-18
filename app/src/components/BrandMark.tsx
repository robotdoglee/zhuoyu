interface BrandMarkProps {
  className?: string
}

/** 刻刀斜切原石，切面露出一角玉色 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={className ? `brand-mark ${className}` : 'brand-mark'} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M5 24.5 L12.5 12.5 L27 17.5 L22.5 27.5 Z" fill="currentColor" />
        <path d="M12.5 12.5 L27 17.5 L20.5 20.5 Z" fill="#7d9471" />
        <path d="M20.5 20.5 L22.5 27.5 L14 24.5 Z" fill="#6f8a63" opacity=".55" />
        <path d="M27.5 3.5 L30 6 L19.5 16.5 L17 14 Z" fill="#b4552f" />
        <path d="M28.6 4.6 L29 5 L18.5 15.5 L18 15.4 Z" fill="#fffefb" opacity=".35" />
      </svg>
    </span>
  )
}
