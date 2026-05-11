'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/partners/api';
import type { PaginationMeta } from '@/lib/partners/api';
import type { Client } from '@/lib/partners/types';
import { DataTable } from '@/components/partners/ui/data-table';
import { Button } from '@/components/partners/ui/button';
import { Input } from '@/components/partners/ui/input';
import { Modal } from '@/components/partners/ui/modal';
import { Card } from '@/components/partners/ui/card';
import { EmptyState } from '@/components/partners/ui/empty-state';
import { TableSkeleton } from '@/components/partners/ui/skeleton';
import { Plus, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async (p: number) => {
    try {
      const res = await api.get<Client[]>(`/clients?page=${p}&perPage=10`);
      setClients(res.data);
      setPagination(res.meta?.pagination ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(page); }, [page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/clients', formData);
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', company: '' });
      fetchClients(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (client: Client) => (
        <Link href={`/partners/clients/${client.id}`} className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-emerald-600">{client.name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-emerald-600 transition-colors">{client.name}</p>
            {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
          </div>
        </Link>
      ),
    },
    { key: 'company', label: 'Company', render: (c: Client) => <span className="text-sm text-muted-foreground">{c.company || '—'}</span> },
    { key: 'phone', label: 'Phone', render: (c: Client) => <span className="text-sm text-muted-foreground">{c.phone || '—'}</span> },
    { key: 'createdAt', label: 'Created', render: (c: Client) => <span className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your client relationships</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>New Client</Button>
      </div>

      <Card>
        {loading ? (
          <TableSkeleton />
        ) : clients.length === 0 && !pagination ? (
          <EmptyState icon={Building2} title="No clients yet" description="Add your first client or convert a lead to get started." action={{ label: 'Add Client', onClick: () => setShowModal(true) }} />
        ) : (
          <DataTable columns={columns} data={clients} pagination={pagination} onPageChange={setPage} searchable searchPlaceholder="Search clients..." />
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New Client">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Client name" />
            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
            <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
            <Input label="Company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} placeholder="Company name" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create Client</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
