import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StatusBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn('border-transparent', className)}>
      {label}
    </Badge>
  );
}
