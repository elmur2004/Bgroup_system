'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/partners/api';
import type { Client } from '@/lib/partners/types';
import { Card, CardHeader, CardContent } from '@/components/partners/ui/card';
import { Button } from '@/components/partners/ui/button';
import { Input } from '@/components/partners/ui/input';
import { Modal } from '@/components/partners/ui/modal';
import { Skeleton } from '@/components/partners/ui/skeleton';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Client>(`/partners/clients/${id}`).then((res) => {
      setClient(res.data);
      setFormData({
        name: res.data.name,
        email: res.data.email || '',
        phone: res.data.phone || '',
        company: res.data.company || '',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.patch(`/partners/clients/${id}`, formData);
      const res = await api.get<Client>(`/partners/clients/${id}`);
      setClient(res.data);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    await api.delete(`/partners/clients/${id}`);
    router.push('/clients');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!client) return <div className="text-muted-foreground">Client not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-emerald-600">{client.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
              {client.company && <p className="text-sm text-muted-foreground mt-0.5">{client.company}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={Pencil} onClick={() => setShowEditModal(true)}>Edit</Button>
            <Button variant="secondary" icon={Trash2} onClick={() => setShowDeleteModal(true)} className="text-red-600 hover:text-red-700">Delete</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</dt>
                <dd className="mt-1 text-sm text-foreground">{client.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</dt>
                <dd className="mt-1 text-sm text-foreground">{client.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company</dt>
                <dd className="mt-1 text-sm text-foreground">{client.company || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client Since</dt>
                <dd className="mt-1 text-sm text-foreground">{new Date(client.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Client">
        <form onSubmit={handleUpdate} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Client name" />
            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
            <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
            <Input label="Company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} placeholder="Company name" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Client" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <span className="font-semibold">{client.name}</span>? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
