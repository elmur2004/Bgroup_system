'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/partners/api';
import type { Lead } from '@/lib/partners/types';
import { Card, CardHeader, CardContent } from '@/components/partners/ui/card';
import { Badge } from '@/components/partners/ui/badge';
import { Button } from '@/components/partners/ui/button';
import { Input, Textarea } from '@/components/partners/ui/input';
import { Modal } from '@/components/partners/ui/modal';
import { Skeleton } from '@/components/partners/ui/skeleton';
import { ArrowLeft, Pencil, UserCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', status: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Lead>(`/partners/leads/${id}`).then((res) => {
      setLead(res.data);
      setFormData({
        name: res.data.name,
        email: res.data.email || '',
        phone: res.data.phone || '',
        company: res.data.company || '',
        status: res.data.status,
        notes: res.data.notes || '',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.patch(`/partners/leads/${id}`, formData);
      const res = await api.get<Lead>(`/partners/leads/${id}`);
      setLead(res.data);
      setShowEditModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async () => {
    await api.post(`/partners/leads/${id}/convert`, {});
    router.push('/clients');
  };

  const handleDelete = async () => {
    await api.delete(`/partners/leads/${id}`);
    router.push('/leads');
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

  if (!lead) return <div className="text-muted-foreground">Lead not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600">{lead.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{lead.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge status={lead.status} />
                {lead.company && <span className="text-sm text-muted-foreground">{lead.company}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!lead.convertedToClientId && (
              <Button variant="secondary" icon={UserCheck} onClick={handleConvert}>Convert to Client</Button>
            )}
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
                <dd className="mt-1 text-sm text-foreground">{lead.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</dt>
                <dd className="mt-1 text-sm text-foreground">{lead.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company</dt>
                <dd className="mt-1 text-sm text-foreground">{lead.company || '—'}</dd>
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
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</dt>
                <dd className="mt-1"><Badge status={lead.status} /></dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</dt>
                <dd className="mt-1 text-sm text-foreground">{new Date(lead.createdAt).toLocaleDateString()}</dd>
              </div>
              {lead.convertedToClientId && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Converted to Client</dt>
                  <dd className="mt-1">
                    <Link href={`/partners/clients/${lead.convertedToClientId}`} className="text-sm text-blue-600 hover:underline">View Client</Link>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {lead.notes && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Lead">
        <form onSubmit={handleUpdate} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Lead name" />
            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
            <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
            <Input label="Company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} placeholder="Company name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="block w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
          <Textarea label="Notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Any additional notes..." rows={3} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Lead" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <span className="font-semibold">{lead.name}</span>? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
