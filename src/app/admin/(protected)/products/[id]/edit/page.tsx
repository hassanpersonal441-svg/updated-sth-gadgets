import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductForm from '@/components/admin/ProductForm';

export default async function EditProductPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const supabase = await createClient();
  const [{ data: categories }, { data: product }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('products').select('*, category:categories(*), product_images(*)').eq('id', id).maybeSingle(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-silver-bright">Edit Product</h1>
      <p className="mt-1 text-sm text-silver-dim">{product.name}</p>
      <div className="mt-6">
        <ProductForm categories={categories || []} product={product as any} />
      </div>
    </div>
  );
}
