export default function FlameMark({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M12 2C12 2 5.5 9.5 5.5 14.5a6.5 6.5 0 0013 0C18.5 9.5 12 2 12 2z"
        fill="url(#lumi-flame-gradient)"
      />
      <defs>
        <linearGradient id="lumi-flame-gradient" x1="5.5" y1="2" x2="18.5" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFB627" />
          <stop offset="1" stopColor="#FF6B57" />
        </linearGradient>
      </defs>
    </svg>
  );
}
