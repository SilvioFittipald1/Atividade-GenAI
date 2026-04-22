interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30 ring-1 ring-white/20 ${SIZES[size]} ${className}`}
      aria-hidden="true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7v2a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-2c0-2 2-4 2-7a7 7 0 0 0-7-7z" />
        <path d="M9 16h6" />
        <path d="M12 9v5" />
      </svg>
    </div>
  );
}
