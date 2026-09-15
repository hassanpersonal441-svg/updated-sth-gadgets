import { createClient } from '@/lib/supabase/server';
import ProductForm from '@/components/admin/ProductForm';

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from('categories').select('*').order('name');

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-silver-bright">Add Product</h1>
      <p className="mt-1 text-sm text-silver-dim">Create a new product listing</p>
      <div className="mt-6">
        <ProductForm categories={categories || []} />
      </div>
    </div>
  );
}
