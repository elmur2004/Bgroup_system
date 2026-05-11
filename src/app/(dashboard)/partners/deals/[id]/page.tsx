'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/partners/api';
import type { Deal } from '@/lib/partners/types';
import { Card, CardHeader, CardContent } from '@/components/partners/ui/card';
import { Badge } from '@/components/partners/ui/badge';
import { Button } from '@/components/partners/ui/button';
import { Modal } from '@/components/partners/ui/modal';
import { Skeleton } from '@/components/partners/ui/skeleton';
import { ArrowLeft, CheckCircle, XCircle, FileText, Receipt, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { TaskList } from '@/components/tasks/TaskList';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    api.get<Deal>(`/partners/deals/${id}`).then((res) => setDeal(res.data)).finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    await api.patch(`/partners/deals/${id}`, { status });
    const res = await api.get<Deal>(`/partners/deals/${id}`);
    setDeal(res.data);
  };

  const requestContract = async () => {
    await api.post('/contracts', { dealId: id });
    alert('Contract requested successfully!');
  };

  const requestInvoice = async () => {
    await api.post('/invoices', { dealId: id, amount: deal?.value });
    alert('Invoice requested successfully!');
  };

  const handleDelete = async () => {
    await api.delete(`/partners/deals/${id}`);
    router.push('/deals');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!deal) return <div className="text-muted-foreground">Deal not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Deal Details</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge status={deal.status} />
              <span className="text-sm text-muted-foreground">{deal.client?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {deal.status === 'PENDING' && (
              <>
                <Button icon={CheckCircle} onClick={() => updateStatus('WON')} className="bg-green-600 hover:bg-green-700 text-white">Mark Won</Button>
                <Button variant="secondary" icon={XCircle} onClick={() => updateStatus('LOST')}>Mark Lost</Button>
              </>
            )}
            {deal.status === 'WON' && (
              <>
                <Button variant="secondary" icon={FileText} onClick={requestContract}>Request Contract</Button>
                <Button variant="secondary" icon={Receipt} onClick={requestInvoice}>Request Invoice</Button>
              </>
            )}
            {deal.status === 'PENDING' && (
              <Button variant="secondary" icon={Trash2} onClick={() => setShowDeleteModal(true)} className="text-red-600 hover:text-red-700">Delete</Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deal Value</p>
            <p className="text-3xl font-bold text-foreground mt-1">${deal.value.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</p>
            <p className="text-lg font-semibold text-foreground mt-1">{deal.client?.name || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Service</p>
            <p className="text-lg font-semibold text-foreground mt-1">{deal.service?.name || '—'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">Deal Information</h3>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</dt>
                <dd className="mt-1"><Badge status={deal.status} /></dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</dt>
                <dd className="mt-1 text-sm text-foreground">{new Date(deal.createdAt).toLocaleDateString()}</dd>
              </div>
              {deal.wonAt && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Won At</dt>
                  <dd className="mt-1 text-sm text-foreground">{new Date(deal.wonAt).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {deal.notes && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{deal.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Tasks</h2>
        <TaskList
          entityType="PARTNER_DEAL"
          entityId={id}
          showBuckets={false}
          createDefaults={{ entityType: 'PARTNER_DEAL', entityId: id, module: 'partners' }}
        />
      </div>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Deal" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this deal? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
