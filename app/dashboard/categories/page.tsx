'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Plus, Pencil, Trash2, GripVertical, AlertCircle } from 'lucide-react';

interface Category { id: string; name: string; itemCount: number; }

function CategoriesContent() {
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const res = await fetch('/api/dashboard/categories');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories(data.categories);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleSave() {
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: editingCat ? 'rename' : 'add', categoryId: editingCat?.id, name: newCatName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      success(editingCat ? 'Category renamed!' : 'Category added!');
      setShowAddModal(false); setEditingCat(null); setNewCatName('');
      loadData();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingCat) return;
    try {
      await fetch('/api/dashboard/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', categoryId: deletingCat.id }),
      });
      success(`"${deletingCat.name}" deleted`);
      setDeletingCat(null); loadData();
    } catch {
      toastError('Failed to delete category');
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--db-border)', borderTopColor: 'var(--db-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--db-text)', marginBottom: 2 }}>Categories</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--db-text-muted)' }}>{categories.length} categories</p>
          </div>
          <Button leftIcon={<Plus size={15} />} onClick={() => { setEditingCat(null); setNewCatName(''); setShowAddModal(true); }}>
            Add Category
          </Button>
        </div>

        {/* List */}
        {categories.length === 0 ? (
          <div className="db-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 10 }}>🏷️</p>
            <p style={{ fontWeight: 600, color: 'var(--db-text)', marginBottom: 4 }}>No categories yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>Categories are auto-created when you add menu items</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map((cat) => (
              <div key={cat.id} className="db-card db-card-hover" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <GripVertical size={17} style={{ color: 'var(--db-border-2)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: 'var(--db-text)', fontFamily: 'var(--db-font-heading)' }}>{cat.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: 2 }}>
                    {cat.itemCount} item{cat.itemCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Button variant="ghost" size="sm" leftIcon={<Pencil size={13} />}
                    onClick={() => { setEditingCat(cat); setNewCatName(cat.name); setShowAddModal(true); }}>
                    Rename
                  </Button>
                  <Button variant="danger" size="sm" leftIcon={<Trash2 size={13} />}
                    onClick={() => setDeletingCat(cat)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Rename modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingCat(null); }}
        title={editingCat ? 'Rename Category' : 'Add Category'} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Category Name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Starters, Main Course"
            required autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" fullWidth onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>{editingCat ? 'Rename' : 'Add'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={!!deletingCat} onClose={() => setDeletingCat(null)} title="Delete Category" size="sm">
        {deletingCat && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a' }}>
              <AlertCircle size={17} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                Delete &ldquo;{deletingCat.name}&rdquo;?
                {deletingCat.itemCount > 0 && (
                  <span style={{ display: 'block', marginTop: 4 }}>⚠️ {deletingCat.itemCount} items will lose their category label.</span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" fullWidth onClick={() => setDeletingCat(null)}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

export default function CategoriesPage() {
  return <ToastProvider><CategoriesContent /></ToastProvider>;
}
