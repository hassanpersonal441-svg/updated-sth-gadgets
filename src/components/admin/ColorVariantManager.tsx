'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import type { ProductVariant } from '@/types/database';

const PRESET_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gold', hex: '#D4AF37' },
];

interface ColorVariantManagerProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  availableImages?: string[];
}

export default function ColorVariantManager({
  variants,
  onChange,
  availableImages = [],
}: ColorVariantManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#000000');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function openAddModal() {
    setEditingIndex(null);
    setName('');
    setHex('#000000');
    setImageUrl(null);
    setIsActive(true);
    setUploadError(null);
    setIsModalOpen(true);
  }

  function openEditModal(index: number) {
    const v = variants[index];
    if (!v) return;
    setEditingIndex(index);
    setName(v.variant_name);
    setHex(v.color_value || '#000000');
    setImageUrl(v.image_url || null);
    setIsActive(v.is_active ?? true);
    setUploadError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingIndex(null);
  }

  function applyPreset(preset: { name: string; hex: string }) {
    setName(preset.name);
    setHex(preset.hex);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'product-images');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setImageUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSave() {
    if (!name.trim()) return;

    const newVariant: ProductVariant = {
      variant_type: 'color',
      variant_name: name.trim(),
      color_value: hex.trim() || null,
      image_url: imageUrl || null,
      is_active: isActive,
      sort_order: editingIndex !== null ? variants[editingIndex].sort_order : variants.length,
    };

    if (editingIndex !== null) {
      const updated = [...variants];
      updated[editingIndex] = {
        ...updated[editingIndex],
        ...newVariant,
      };
      onChange(updated);
    } else {
      onChange([...variants, newVariant]);
    }

    closeModal();
  }

  function handleDelete(index: number) {
    const updated = variants.filter((_, i) => i !== index).map((v, i) => ({ ...v, sort_order: i }));
    onChange(updated);
  }

  function toggleActive(index: number) {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      is_active: !updated[index].is_active,
    };
    onChange(updated);
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const updated = [...variants];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onChange(updated.map((v, i) => ({ ...v, sort_order: i })));
  }

  function moveDown(index: number) {
    if (index >= variants.length - 1) return;
    const updated = [...variants];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onChange(updated.map((v, i) => ({ ...v, sort_order: i })));
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎨</span>
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              Product Colors / Variants
            </h2>
            <p className="text-[11px] text-silver-dim">
              Add color choices for customers (optional). Each color can have its own preview image.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-xl bg-[#00C4CC]/15 hover:bg-[#00C4CC]/25 text-[#00C4CC] border border-[#00C4CC]/30 px-3.5 py-1.5 text-xs font-bold transition shadow-sm"
        >
          <span>+</span>
          <span>Add Color</span>
        </button>
      </div>

      {/* Variants List */}
      {variants.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-[#080D15]/50">
          <span className="text-2xl block mb-1">🎨</span>
          <p className="text-xs text-silver-dim">No color variants added yet.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            If this product is sold in different colors (Black, White, Red, etc.), click &quot;+ Add Color&quot; above.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {variants.map((v, index) => {
            const hexColor = v.color_value || '#000000';
            const isWhiteLike = hexColor.toLowerCase() === '#ffffff' || hexColor.toLowerCase() === '#fff';

            return (
              <div
                key={v.id || index}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                  v.is_active
                    ? 'border-slate-800 bg-[#080D15] hover:border-slate-700'
                    : 'border-slate-800/50 bg-[#060A10] opacity-60'
                }`}
              >
                {/* Left: Swatch + Name + Hex */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Swatch */}
                  <div className="relative shrink-0">
                    <span
                      className="block h-7 w-7 rounded-full shadow-inner border"
                      style={{
                        backgroundColor: hexColor,
                        borderColor: isWhiteLike ? '#64748B' : 'rgba(255,255,255,0.2)',
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {v.variant_name}
                      </span>
                      {!v.is_active && (
                        <span className="rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 text-[9px] font-bold">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] text-slate-400 uppercase">
                        {hexColor}
                      </span>
                      {v.image_url ? (
                        <span className="text-[10px] text-[#00C4CC] flex items-center gap-0.5">
                          <span>📷</span> Has image
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          (Uses main image)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center / Right: Image Thumbnail if present */}
                {v.image_url && (
                  <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-slate-700 hidden sm:block bg-slate-900">
                    <Image
                      src={v.image_url}
                      alt={v.variant_name}
                      fill
                      className="object-contain p-0.5"
                      sizes="36px"
                    />
                  </div>
                )}

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-0.5 mr-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="h-4 w-5 flex items-center justify-center rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white disabled:opacity-20"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === variants.length - 1}
                      onClick={() => moveDown(index)}
                      className="h-4 w-5 flex items-center justify-center rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white disabled:opacity-20"
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Toggle Active Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleActive(index)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold transition border ${
                      v.is_active
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white'
                    }`}
                    title={v.is_active ? 'Click to disable' : 'Click to enable'}
                  >
                    {v.is_active ? 'Active' : 'Off'}
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => openEditModal(index)}
                    className="rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition"
                  >
                    Edit
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 text-[11px] font-semibold text-rose-400 transition"
                    title="Delete color"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Color Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                {editingIndex !== null ? 'Edit Color Variant' : 'Add Color Variant'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-white text-base leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Quick Presets */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Quick Color Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((p) => {
                    const isSelected = hex.toLowerCase() === p.hex.toLowerCase();
                    const isWhite = p.hex === '#FFFFFF';
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition border ${
                          isSelected
                            ? 'border-[#00C4CC] bg-[#00C4CC]/20 text-white font-bold'
                            : 'border-slate-800 bg-[#080D15] text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border shrink-0"
                          style={{
                            backgroundColor: p.hex,
                            borderColor: isWhite ? '#94A3B8' : 'rgba(255,255,255,0.2)',
                          }}
                        />
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Color Name *
                </label>
                <input
                  required
                  placeholder="e.g. Midnight Black, Pearl White, Red"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              {/* Color Picker & Custom Hex */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Color Hex / Visual Value
                </label>
                <div className="flex items-center gap-3">
                  {/* Native Color Input */}
                  <div className="relative h-10 w-12 shrink-0 rounded-xl overflow-hidden border border-slate-700 cursor-pointer">
                    <input
                      type="color"
                      value={hex.startsWith('#') && hex.length === 7 ? hex : '#000000'}
                      onChange={(e) => setHex(e.target.value.toUpperCase())}
                      className="absolute -top-2 -left-2 h-14 w-16 cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  {/* Text Input for Hex */}
                  <input
                    placeholder="#000000"
                    value={hex}
                    onChange={(e) => setHex(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm font-mono text-white focus:border-[#00C4CC] focus:outline-none uppercase"
                  />

                  {/* Preview Swatch */}
                  <div
                    className="h-10 w-10 rounded-xl border border-slate-600 shadow-inner shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                </div>
              </div>

              {/* Color-Specific Image (Optional) */}
              <div className="space-y-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Color-Specific Product Image (Optional)
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Shown automatically when the customer selects this color. If omitted, the default product image is used.
                </p>

                {/* Current Image Preview */}
                {imageUrl ? (
                  <div className="relative h-28 w-28 rounded-xl overflow-hidden border border-[#00C4CC]/50 bg-[#080D15] mx-auto group">
                    <Image
                      src={imageUrl}
                      alt={name || 'Color variant image'}
                      fill
                      className="object-contain p-2"
                      sizes="112px"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute top-1 right-1 rounded-full bg-rose-600/90 text-white h-5 w-5 flex items-center justify-center text-xs shadow opacity-0 group-hover:opacity-100 transition"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Upload new image */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-[#080D15] py-2.5 text-xs text-slate-300 hover:border-[#00C4CC] hover:text-[#00C4CC] transition disabled:opacity-50"
                      >
                        <span>📷</span>
                        <span>{uploading ? 'Uploading...' : 'Upload Image for this Color'}</span>
                      </button>
                    </div>

                    {/* Or choose from existing product images */}
                    {availableImages.length > 0 && (
                      <div>
                        <span className="block text-[10px] text-slate-400 mb-1">
                          Or select from product gallery:
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {availableImages.map((img, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setImageUrl(img)}
                              className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-slate-800 hover:border-[#00C4CC] bg-[#080D15]"
                            >
                              <Image
                                src={img}
                                alt={`Gallery image ${i + 1}`}
                                fill
                                className="object-contain p-1"
                                sizes="48px"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <p className="text-[11px] text-rose-400 font-semibold">{uploadError}</p>
                )}
              </div>

              {/* Enable / Disable */}
              <div className="flex items-center gap-2.5 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#00C4CC]"
                  />
                  <span>Active & available for customers to choose</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-800 bg-[#080D15] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-5 py-2 font-display text-xs font-bold text-black shadow-md transition"
                >
                  {editingIndex !== null ? 'Update Color' : 'Add Color'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
