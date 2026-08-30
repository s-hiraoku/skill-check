"use client";

interface StarRatingProps {
  stars: number;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ stars, size = "md" }: StarRatingProps) {
  const sizeClass = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <span className={`${sizeClass} text-amber-400 tracking-wider`} aria-label={`${stars} out of 5 stars`}>
      {"★".repeat(stars)}
      <span className="text-slate-600">{"★".repeat(5 - stars)}</span>
    </span>
  );
}
