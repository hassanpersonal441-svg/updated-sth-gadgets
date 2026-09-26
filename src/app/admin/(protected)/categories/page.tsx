'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Category } from '@/types/database';
import { slugify } from '@/lib/utils';
import ImageUploader, { UploadedImage } from '@/components/admin/ImageUploader';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/admin/ConfirmModal';

// In-memory cache for instant module opening without blocking loading spinner
let cachedCategories: Category[] | null = null;

export default function AdminCategoriesPage() {
  const { success, error: showErrorToast } = useToast();
  const [categories, setCategories] = useState<Category[]>(cachedCategories || []);
  const [loading, setLoading] = useState(!cachedCategories);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<UploadedImage[]>([]);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!cachedCategories) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) {
        cachedCategories = data.categories;
        setCategories(data.categories);
      }
    } catch {
      showErrorToast('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setName('');
    setSlug('');
    setDescription('');
    setImage([]);
    setActive(true);
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description || '');
    setImage(c.image_url ? [{ image_url: c.image_url, is_primary: true }] : []);
    setActive(c.active);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { name, slug, description, active, image_url: image[0]?.image_url || null };
    try {
      const res = await fetch(editing ? `/api/categories/${editing.id}` : '/api/categories', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save category');

      success(editing ? 'Category updated successfully!' : 'Category created successfully!');
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
      showErrorToast(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Category) {
    try {
      const res = await fetch(`/api/categories/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active }),
      });
      if (res.ok) {
        success(`Category "${c.name}" status updated!`);
        load();
      } else {
        showErrorToast('Failed to update category status');
      }
    } catch {
      showErrorToast('Failed to update category status');
    }
  }

  async function confirmDeleteCategory() {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        success(`Category "${categoryToDelete.name}" deleted successfully!`);
        setCategories((prev) => {
          const next = prev.filter((c) => c.id !== categoryToDelete.id);
          cachedCategories = next;
          return next;
        });
        setCategoryToDelete(null);
      } else {
        showErrorToast('Failed to delete category');
      }
    } catch {
      showErrorToast('Failed to delete category');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-silver-bright">
            Categories Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Organize products by category for quick navigation and filtering
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2.5 font-display text-xs sm:text-sm font-bold text-black shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.02]"
        >
          <span>+</span>
          <span>Add New Category</span>
        </button>
      </div>

      {/* Form Modal / Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setShowForm(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto space-y-4 rounded-2xl border border-cyan-500/40 bg-[#0C1420] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-base font-bold text-silver-bright">
                {editing ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-silver-dim hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">Category Name</label>
              <input
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editing) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Power Banks"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">Slug (URL)</label>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="e.g. power-banks"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this category..."
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">Category Icon / Image</label>
              <ImageUploader bucket="category-images" images={image} onChange={setImage} multiple={false} />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activeCat"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-[#00C4CC]"
              />
              <label htmlFor="activeCat" className="text-xs sm:text-sm font-semibold text-silver-bright cursor-pointer">
                Active (Visible in Storefront)
              </label>
            </div>

            {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 font-display text-xs sm:text-sm text-silver-dim hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-5 py-2 font-display text-xs sm:text-sm font-bold text-black shadow-sm transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        description={`Are you sure you want to delete category "${categoryToDelete?.name}"? Products in this category will become uncategorized.`}
        confirmText="Yes, Delete Category"
        isDeleting={deleting}
      />

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-silver-dim flex items-center justify-center gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
            <span className="text-sm">Loading categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full py-16 text-center text-silver-dim">
            <p className="text-sm font-semibold text-silver-bright">No categories created yet.</p>
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420] p-4 transition hover:border-[#00C4CC]/60 hover:shadow-[0_0_15px_rgba(0,196,204,0.15)]"
            >
              <div>
                <div className="relative mb-3.5 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800/80 bg-black/40">
                  {c.image_url ? (
                    <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                  ) : (
                    <span className="font-display text-3xl font-black text-[#00C4CC]">{c.name.charAt(0)}</span>
                  )}
                </div>
                <h3 className="font-display text-sm font-bold text-silver-bright">{c.name}</h3>
                <p className="text-xs font-mono text-[#00C4CC]/80">/{c.slug}</p>
                {c.description && <p className="mt-1 text-xs text-silver-dim line-clamp-2">{c.description}</p>}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                <button
                  onClick={() => toggleActive(c)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                    c.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {c.active ? 'Active' : 'Hidden'}
                </button>

                <div className="flex items-center gap-2 font-semibold">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-[#00C4CC] hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    onClick={() => setCategoryToDelete(c)}
                    className="text-rose-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
