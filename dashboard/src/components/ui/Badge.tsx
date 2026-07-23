// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

// Badget pre-configurado a partir de un string de clase Tailwind
export function StatusBadge({ statusClass, label }: { statusClass: string; label: string }) {
  return <Badge className={statusClass} dot>{label}</Badge>;
}
