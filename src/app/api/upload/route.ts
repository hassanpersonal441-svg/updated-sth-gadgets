import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const ALLOWED_BUCKETS = new Set(['product-images', 'category-images', 'site-assets']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const bucket = String(formData.get('bucket') || '');

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED_BUCKETS.has(bucket)) return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WEBP or AVIF images are allowed' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 });
  }

  const service = createServiceClient();
  const ext = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const { error } = await service.storage.from(bucket).upload(fileName, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: publicUrlData } = service.storage.from(bucket).getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrlData.publicUrl });
}
