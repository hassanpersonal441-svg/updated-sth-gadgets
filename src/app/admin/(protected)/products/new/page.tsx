import { createServiceClient } from '@/lib/supabase/server';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ series_id?: string }> }) {
  const { series_id } = await searchParams;
  const service = createServiceClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    service.from('categories').select('*').order('name'),
    service.from('products').select('id, name, price, short_description, sku').eq('active', true).order('name'),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-silver-bright">Add Product</h1>
      <p className="mt-1 text-sm text-silver-dim">Create a new product listing</p>
      <div className="mt-6">
      <ProductForm key="new-product-form" categories={categories || []} allProducts={products || []} initialSeriesId={series_id} />
      </div>
    </div>
  );
}
