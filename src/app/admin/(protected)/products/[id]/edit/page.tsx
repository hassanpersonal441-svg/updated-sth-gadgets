import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const service = createServiceClient();
  let productRes = await service.from('products').select('*, category:categories(*), product_images(*), product_variants(*)').eq('id', id).maybeSingle();
  if (productRes.error && (productRes.error.message.includes('product_variants') || productRes.error.code === 'PGRST200')) {
    productRes = await service.from('products').select('*, category:categories(*), product_images(*)').eq('id', id).maybeSingle();
  }
  const product = productRes.data;

  const [{ data: categories }, { data: products }] = await Promise.all([
    service.from('categories').select('*').order('name'),
    service.from('products').select('id, name, price, short_description, sku').eq('active', true).order('name'),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-silver-bright">Edit Product</h1>
      <p className="mt-1 text-sm text-silver-dim">{product.name}</p>
      <div className="mt-6">
        <ProductForm key={`edit-product-${product.id}`} categories={categories || []} product={product as any} allProducts={products || []} />
      </div>
    </div>
  );
}
