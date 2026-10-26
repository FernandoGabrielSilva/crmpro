import { CalendarDays, CheckSquare, Mail, Pencil, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: CalendarDays,
  NOTE: Pencil,
  TASK: CheckSquare,
};

export function ActivityIcon({ type, className }: { type: string; className?: string }) {
  const Icon = icons[type as keyof typeof icons] ?? Pencil;
  return (
    <span className={cn('flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground', className)}>
      <Icon className="size-4" />
    </span>
  );
}
