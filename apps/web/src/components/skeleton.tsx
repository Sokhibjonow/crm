import { cn } from '@/lib/cn';

type Props = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...rest }: Props) {
  return (
    <div
      {...rest}
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded bg-slate-200 dark:bg-slate-800',
        className,
      )}
    />
  );
}

export function SkeletonRow({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <tr className={cn('border-t border-slate-100 dark:border-slate-800', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
