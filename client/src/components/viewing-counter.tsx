import { Eye } from "lucide-react";
import { useMemo } from "react";

interface ViewingCounterProps {
  value: string | number,
  courseId: string;
}

export function ViewingCounter({ value, courseId }: ViewingCounterProps) {
  // Generate consistent viewing count based on course ID
  const viewingCount = useMemo(() => {
    // Use course ID as seed for consistent randomization
    let hash = 0;
    for (let i = 0; i < courseId.length; i++) {
      const char = courseId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Generate number between 3 and 47
    const min = 3;
    const max = 47;
    const range = max - min + 1;
    return min + (Math.abs(hash) % range);
  }, [courseId]);

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="viewing-counter">
      <Eye className="h-3 w-3" />
      <span data-testid="viewing-count">{value} смотрят</span>
    </div>
  );
}
