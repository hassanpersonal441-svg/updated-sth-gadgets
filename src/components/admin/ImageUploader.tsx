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
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push({ image_url: data.url, is_primary: false });
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
            <Image src={img.image_url} alt="" fill className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 px-1 py-0.5 text-[10px]">
              <button type="button" onClick={() => setPrimary(i)} className={img.is_primary ? 'text-electric-bright' : 'text-white'}>
                {img.is_primary ? 'Main' : 'Set Main'}
              </button>
              <button type="button" onClick={() => removeImage(i)} className="text-red-400">
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border border-dashed border-base-border text-xs text-silver-dim hover:border-electric hover:text-electric-bright disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : '+ Add Image'}
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
