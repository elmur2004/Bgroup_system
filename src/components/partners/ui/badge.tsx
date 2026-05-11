import { clsx } from 'clsx';

const variants: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  CONTACTED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  QUALIFIED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  LOST: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  WON: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REQUESTED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  PAID: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset',
      variants[status] || 'bg-muted/50 text-foreground ring-gray-600/20',
      className
    )}>
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full mr-1.5',
        status === 'WON' || status === 'APPROVED' || status === 'QUALIFIED' || status === 'PAID' ? 'bg-emerald-500' :
        status === 'LOST' || status === 'REJECTED' ? 'bg-rose-500' :
        status === 'PENDING' || status === 'CONTACTED' || status === 'REQUESTED' ? 'bg-amber-500' :
        'bg-blue-500'
      )} />
      {status}
    </span>
  );
}
