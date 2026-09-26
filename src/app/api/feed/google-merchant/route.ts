import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sthgadgets.store';
  const supabase = createServiceClient();

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name, slug), product_images(image_url, is_primary)')
    .eq('active', true)
    .order('created_at', { ascending: false });

  let itemsXml = '';

  if (products && Array.isArray(products)) {
    products.forEach((prod) => {
      const primaryImage =
        prod.product_images?.find((img: any) => img.is_primary)?.image_url ||
        prod.product_images?.[0]?.image_url ||
        `${base}/images/logo.png`;

      const title = (prod.name || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const description = (prod.short_description || prod.description || prod.name || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .slice(0, 5000);

      const availability = prod.stock_status === 'out_of_stock' ? 'out_of_stock' : 'in_stock';
      const link = `${base}/products/${prod.slug}`;

      itemsXml += `
    <item>
      <g:id>${prod.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${primaryImage}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${prod.price} PKR</g:price>
      <g:brand>STH Gadgets</g:brand>
      <g:condition>new</g:condition>
      ${prod.category?.name ? `<g:product_type>${prod.category.name}</g:product_type>` : ''}
    </item>`;
    });
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>STH Gadgets — Google Merchant Catalog Feed</title>
    <link>${base}</link>
    <description>Official Google Merchant Shopping Feed for STH Gadgets Pakistan</description>
    ${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xmlContent, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
