'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

export interface UploadedImage {
  image_url: string;
  is_primary: boolean;
}

export default function ImageUploader({
  bucket,
  images,
  onChange,
  multiple = true,
}: {
  bucket: 'product-images' | 'category-images' | 'site-assets';
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function optimizeImage(file: File): Promise<{ file: File; hash: string }> {
    if (!file.type.startsWith('image/')) throw new Error(`${file.name}: Please choose an image file.`);
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: Images must be under 10MB.`);

    const source = await createImageBitmap(file);
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error(`${file.name}: Image processing is not supported in this browser.`);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    source.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
    if (!blob) throw new Error(`${file.name}: Image compression failed.`);
    const bytes = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
    return { file: new File([blob], `${hash}.webp`, { type: 'image/webp' }), hash };
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const uploaded: UploadedImage[] = [];
      const selectedFiles = Array.from(files).slice(0, multiple ? 12 : 1);
      for (const [index, file] of selectedFiles.entries()) {
        const optimized = await optimizeImage(file);
        const formData = new FormData();
        formData.append('file', optimized.file);
        formData.append('bucket', bucket);
        formData.append('dedupe_key', optimized.hash);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push({ image_url: data.url, is_primary: false });
        setUploadProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
      }
      const next = multiple ? [...images, ...uploaded] : uploaded;
      if (next.length > 0 && !next.some((i) => i.is_primary)) next[0].is_primary = true;
      onChange(next);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function setPrimary(index: number) {
    onChange(images.map((img, i) => ({ ...img, is_primary: i === index })));
  }

  function removeImage(index: number) {
    const next = images.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((i) => i.is_primary)) next[0].is_primary = true;
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <div key={img.image_url} className={`relative h-24 w-24 overflow-hidden rounded-xl border ${img.is_primary ? 'border-electric' : 'border-base-border'}`}>
            <Image src={img.image_url} alt="Uploaded product image" fill sizes="96px" className="object-cover" />
            {img.is_primary && (
              <span className="absolute left-1 top-1 rounded-md bg-electric px-1.5 py-0.5 text-[9px] font-black uppercase text-black shadow">
                Main Photo
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 px-1 py-1 text-[10px]">
              <button type="button" onClick={() => setPrimary(i)} disabled={img.is_primary} className={`min-h-7 px-1 ${img.is_primary ? 'cursor-default text-electric-bright' : 'text-white hover:text-electric-bright'}`}>
                {img.is_primary ? 'Selected' : 'Set Main Photo'}
              </button>
              <button type="button" onClick={() => removeImage(i)} className="min-h-7 min-w-7 text-red-400" aria-label="Remove image">
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-24 min-h-11 flex-col items-center justify-center rounded-xl border border-dashed border-base-border text-xs text-silver-dim hover:border-electric hover:text-electric-bright disabled:opacity-50"
        >
          {uploading ? `Optimizing ${uploadProgress}%` : '+ Add Image'}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
