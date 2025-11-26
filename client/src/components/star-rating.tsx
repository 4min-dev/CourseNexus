import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  reviewsCount?: number;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ rating, reviewsCount, showCount = true, size = "sm" }: StarRatingProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1" data-testid="star-rating">
      <div className="flex items-center">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
            data-testid="star-full"
          />
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative" data-testid="star-half">
            <Star
              className={`${sizeClasses[size]} text-yellow-400`}
            />
            <Star
              className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400 absolute top-0 left-0`}
              style={{ clipPath: 'inset(0 50% 0 0)' }}
            />
          </div>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={`${sizeClasses[size]} text-muted-foreground`}
            data-testid="star-empty"
          />
        ))}
      </div>

      {showCount && (
        <span className={`${textSizeClasses[size]} text-muted-foreground ml-1`} data-testid="rating-text">
          {rating.toFixed(1)} {reviewsCount !== undefined && `(${reviewsCount})`}
        </span>
      )}
    </div>
  );
}
