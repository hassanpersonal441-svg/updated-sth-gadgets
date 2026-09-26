import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const service = createServiceClient();

    // 1. Fetch all approved/completed orders with items
    const { data: orders, error: ordersErr } = await service
      .from('orders')
      .select('id, order_number, status, total_amount, subtotal, delivery_charges, coupon_discount, bundle_discount, created_at, approved_at, order_items(*)')
      .in('status', ['approved', 'pending_payment', 'processing', 'shipped', 'delivered'])
      .order('created_at', { ascending: false });

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    // 2. Fetch all products with categories
    const { data: products, error: prodsErr } = await service
      .from('products')
      .select('id, name, sku, price, purchase_price, wholesale_price, category_id, stock_status, active, category:categories(*)')
      .order('name', { ascending: true });

    if (prodsErr) {
      return NextResponse.json({ error: prodsErr.message }, { status: 500 });
    }

    // 3. Fetch all categories
    const { data: categories } = await service
      .from('categories')
      .select('id, name, slug')
      .order('name', { ascending: true });

    const productMap = new Map<string, any>();
    (products || []).forEach((p) => productMap.set(p.id, p));

    const categoryMap = new Map<string, string>();
    (categories || []).forEach((c) => categoryMap.set(c.id, c.name));

    // Time boundaries for Today, This Week, This Month
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalRevenue = 0;
    let totalCost = 0;
    let todayProfit = 0;
    let weekProfit = 0;
    let monthProfit = 0;

    // Per-product sales tracking
    const productStats = new Map<string, {
      id: string;
      name: string;
      sku: string;
      categoryName: string;
      sellingPrice: number;
      purchasePrice: number;
      unitsSold: number;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }>();

    // Initialize productStats with all products
    (products || []).forEach((p) => {
      const pCost = Number(p.purchase_price) || 0;
      const pPrice = Number(p.price) || 0;
      const catalogProfit = pPrice - pCost;
      const catalogMargin = pPrice > 0 ? Math.round((catalogProfit / pPrice) * 10000) / 100 : 0;

      productStats.set(p.id, {
        id: p.id,
        name: p.name,
        sku: p.sku || 'N/A',
        categoryName: (p.category_id && categoryMap.get(p.category_id)) || 'Uncategorized',
        sellingPrice: pPrice,
        purchasePrice: pCost,
        unitsSold: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: catalogMargin,
      });
    });

    // Category sales tracking
    const categoryStats = new Map<string, {
      id: string;
      name: string;
      productsSold: number;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }>();

    (categories || []).forEach((c) => {
      categoryStats.set(c.id, {
        id: c.id,
        name: c.name,
        productsSold: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
      });
    });

    // Process all orders
    (orders || []).forEach((order: any) => {
      const orderDate = new Date(order.approved_at || order.created_at);
      let orderCost = 0;
      let orderRevenue = 0;

      (order.order_items || []).forEach((item: any) => {
        const prod = productMap.get(item.product_id);
        const qty = item.quantity || 1;
        const lineRevenue = Number(item.line_total) || (Number(item.unit_price) * qty);
        
        // Historical purchase price: use item.purchase_price, fallback to prod.purchase_price
        const unitCost = Number(item.purchase_price) > 0 
          ? Number(item.purchase_price) 
          : (Number(prod?.purchase_price) || 0);
        const lineCost = unitCost * qty;

        orderCost += lineCost;
        orderRevenue += lineRevenue;

        // Product stats aggregation
        if (item.product_id && productStats.has(item.product_id)) {
          const ps = productStats.get(item.product_id)!;
          ps.unitsSold += qty;
          ps.revenue += lineRevenue;
          ps.cost += lineCost;
          ps.profit += (lineRevenue - lineCost);
          ps.margin = ps.revenue > 0 ? Math.round((ps.profit / ps.revenue) * 10000) / 100 : ps.margin;
        }

        // Category stats aggregation
        const catId = prod?.category_id;
        if (catId && categoryStats.has(catId)) {
          const cs = categoryStats.get(catId)!;
          cs.productsSold += qty;
          cs.revenue += lineRevenue;
          cs.cost += lineCost;
          cs.profit += (lineRevenue - lineCost);
          cs.margin = cs.revenue > 0 ? Math.round((cs.profit / cs.revenue) * 10000) / 100 : 0;
        }
      });

      const orderProfit = orderRevenue - orderCost;
      totalRevenue += orderRevenue;
      totalCost += orderCost;

      if (orderDate >= startOfToday) {
        todayProfit += orderProfit;
      }
      if (orderDate >= startOfWeek) {
        weekProfit += orderProfit;
      }
      if (orderDate >= startOfMonth) {
        monthProfit += orderProfit;
      }
    });

    const grossProfit = totalRevenue - totalCost;
    const averageMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;

    const productList = Array.from(productStats.values());
    const categoryList = Array.from(categoryStats.values()).filter((c) => c.productsSold > 0 || c.revenue > 0);

    // Best profit product (by total profit sold, fallback to catalog profit)
    const bestProfitProduct = [...productList].sort((a, b) => b.profit - a.profit || (b.sellingPrice - b.purchasePrice) - (a.sellingPrice - a.purchasePrice))[0] || null;

    // Lowest margin product
    const lowestMarginProduct = [...productList].filter((p) => p.sellingPrice > 0).sort((a, b) => a.margin - b.margin)[0] || null;

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProductCost: Math.round(totalCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        averageProfitMargin: averageMargin,
        todayProfit: Math.round(todayProfit * 100) / 100,
        weekProfit: Math.round(weekProfit * 100) / 100,
        monthProfit: Math.round(monthProfit * 100) / 100,
        bestProfitProduct: bestProfitProduct ? {
          name: bestProfitProduct.name,
          profit: bestProfitProduct.profit > 0 ? bestProfitProduct.profit : (bestProfitProduct.sellingPrice - bestProfitProduct.purchasePrice),
          margin: bestProfitProduct.margin,
        } : null,
        lowestMarginProduct: lowestMarginProduct ? {
          name: lowestMarginProduct.name,
          margin: lowestMarginProduct.margin,
          sellingPrice: lowestMarginProduct.sellingPrice,
          purchasePrice: lowestMarginProduct.purchasePrice,
        } : null,
      },
      products: productList,
      categories: categoryList,
    });
  } catch (err: any) {
    console.error('Profit API error:', err);
    return NextResponse.json({ error: err.message || 'Error calculating profit metrics' }, { status: 500 });
  }
}
