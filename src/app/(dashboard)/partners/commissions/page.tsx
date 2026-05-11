'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/partners/api';
import type { PaginationMeta } from '@/lib/partners/api';
import type { Commission } from '@/lib/partners/types';
import { DataTable } from '@/components/partners/ui/data-table';
import { Badge } from '@/components/partners/ui/badge';
import { Card, CardContent } from '@/components/partners/ui/card';
import { EmptyState } from '@/components/partners/ui/empty-state';
import { TableSkeleton, Skeleton } from '@/components/partners/ui/skeleton';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface Summary {
  totalCommissions: number;
  totalAmount: number;
  byStatus: { status: string; count: number; totalAmount: number }[];
}

const statusIcons: Record<string, typeof DollarSign> = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  PAID: DollarSign,
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600',
  APPROVED: 'bg-blue-50 text-blue-600',
  PAID: 'bg-green-50 text-green-600',
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Commission[]>(`/commissions?page=${page}&perPage=10`).then((res) => {
      setCommissions(res.data);
      setPagination(res.meta?.pagination ?? null);
    }).finally(() => setLoading(false));
    api.get<Summary>('/commissions/summary').then((res) => setSummary(res.data));
  }, [page]);

  const columns = [
    {
      key: 'partner', label: 'Partner',
      render: (c: Commission) => <span className="text-sm font-medium text-foreground">{c.partner?.companyName || '—'}</span>,
    },
    {
      key: 'amount', label: 'Amount',
      render: (c: Commission) => <span className="text-sm font-semibold text-foreground">${c.amount.toLocaleString()}</span>,
    },
    {
      key: 'rate', label: 'Rate',
      render: (c: Commission) => <span className="text-sm text-muted-foreground">{c.rate}%</span>,
    },
    { key: 'status', label: 'Status', render: (c: Commission) => <Badge status={c.status} /> },
    {
      key: 'createdAt', label: 'Created',
      render: (c: Commission) => <span className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your earnings and commission payouts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!summary ? (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
                    <p className="text-xl font-bold text-foreground">${summary.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {summary.byStatus.map((s) => {
              const Icon = statusIcons[s.status] || DollarSign;
              const color = statusColors[s.status] || 'bg-muted/50 text-muted-foreground';
              return (
                <Card key={s.status}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.status}</p>
                        <p className="text-xl font-bold text-foreground">${s.totalAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{s.count} commissions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>

      <Card>
        {loading ? (
          <TableSkeleton />
        ) : commissions.length === 0 && !pagination ? (
          <EmptyState icon={DollarSign} title="No commissions yet" description="Commissions will appear here as your deals are processed." />
        ) : (
          <DataTable columns={columns} data={commissions} pagination={pagination} onPageChange={setPage} searchable searchPlaceholder="Search commissions..." />
        )}
      </Card>
    </div>
  );
}
