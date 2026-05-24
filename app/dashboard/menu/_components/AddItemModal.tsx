'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { MenuItem, Category } from '@/types';
import { Upload, Wand2 } from 'lucide-react';
import Image from 'next/image';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurantId: string;
  categories: Category[];
  editItem?: MenuItem | null;
}

export function AddItemModal({ isOpen, onClose, onSuccess, restaurantId, categories, editItem }: Props) {
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    category: categories[0]?.name || '',
    price: '',
    description: '',
    isNewCategory: false,
  });

  useEffect(() => {
    if (editItem) {
      setForm({ name: editItem.name, category: editItem.category, price: String(editItem.price), description: editItem.description, isNewCategory: false });
      setImagePreview(editItem.image_url || '');
    } else {
      setForm({ name: '', category: categories[0]?.name || '', price: '', description: '', isNewCategory: false });
      setImagePreview('');
      setImageFile(null);
    }
  }, [editItem, isOpen, categories]);

  async function generateDescription() {
    if (!form.name || !form.category) { toastError('Enter name and category first'); return; }
    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/generate-description', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, category: form.category }),
      });
      const data = await res.json();
      if (data.description) { setForm((f) => ({ ...f, description: data.description })); success('Description generated!'); }
    } catch { toastError('Failed to generate description'); }
    finally { setGeneratingDesc(false); }
  }

  async function uploadImage(itemId: string): Promise<string | null> {
    if (!imageFile) return editItem?.image_url || null;
    const fd = new FormData();
    fd.append('file', imageFile);
    fd.append('path', `restaurants/${restaurantId}/menu/${itemId}`);
    const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Image upload failed');
    const { url } = await res.json();
    return url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let description = form.description;
      const categoryName = form.isNewCategory ? newCategory.trim() : form.category;

      if (!description.trim()) {
        const res = await fetch('/api/generate-description', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, category: categoryName }),
        });
        const data = await res.json();
        description = data.description || '';
      }

      if (editItem) {
        const imageUrl = await uploadImage(editItem.id);
        await fetch('/api/dashboard/menu', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', itemId: editItem.id, data: { name: form.name.trim(), category: categoryName, price: parseFloat(form.price), description, image_url: imageUrl } }),
        });
        success('Item updated!');
      } else {
        const createRes = await fetch('/api/dashboard/menu', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', data: { name: form.name.trim(), category: categoryName, price: parseFloat(form.price), description, image_url: null, is_available: true, like_count: 0, avg_rating: 0, review_count: 0 } }),
        });
        if (!createRes.ok) throw new Error((await createRes.json()).error);
        const { id: newId } = await createRes.json();

        if (imageFile) {
          const imageUrl = await uploadImage(newId);
          await fetch('/api/dashboard/menu', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', itemId: newId, data: { image_url: imageUrl } }),
          });
        }

        if (form.isNewCategory && newCategory.trim()) {
          await fetch('/api/dashboard/categories', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', name: newCategory.trim() }),
          });
        }
        success('Item added!');
      }
      onSuccess();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editItem ? 'Edit Menu Item' : 'Add Menu Item'} size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Input label="Item Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Chicken Biryani" required />

        {/* Category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label className="db-label">Category <span style={{ color: 'var(--db-accent)' }}>*</span></label>
          {!form.isNewCategory ? (
            <Select value={form.category}
              onChange={(e) => {
                if (e.target.value === '__new__') setForm({ ...form, isNewCategory: true, category: '' });
                else setForm({ ...form, category: e.target.value });
              }}>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__new__">+ Add new category</option>
            </Select>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name" required />
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setForm({ ...form, isNewCategory: false, category: categories[0]?.name || '' })}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        <Input label="Price (₹)" type="number" min="0" step="0.5"
          value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="e.g. 299" required />

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="db-label" style={{ marginBottom: 0 }}>Description</label>
            <Button type="button" variant="ghost" size="sm" loading={generatingDesc}
              leftIcon={<Wand2 size={12} />} onClick={generateDescription}>
              AI Generate
            </Button>
          </div>
          <Textarea value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Leave empty to auto-generate with AI" rows={2}
            hint="AI will generate if left empty" />
        </div>

        {/* Image Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="db-label">Image (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {imagePreview && (
              <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--db-border)', flexShrink: 0 }}>
                <Image src={imagePreview} alt="Preview" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
              }} />
            <Button type="button" variant="outline" size="sm" leftIcon={<Upload size={13} />}
              onClick={() => fileInputRef.current?.click()}>
              {imagePreview ? 'Change Image' : 'Upload Image'}
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} fullWidth>{editItem ? 'Update' : 'Add Item'}</Button>
        </div>
      </form>
    </Modal>
  );
}
