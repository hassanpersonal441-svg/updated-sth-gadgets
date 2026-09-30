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

    // 1. Fetch all approved/completed customer orders with their items
    const { data: orders, error: ordersErr } = await service
      .from('orders')
      .select('id, order_number, status, total_amount, subtotal, delivery_charges, actual_courier_cost, delivery_paid_by, coupon_discount, bundle_discount, created_at, approved_at, order_source, order_items(*)')
      .in('status', ['approved', 'pending_payment', 'processing', 'shipped', 'delivered'])
      .order('created_at', { ascending: false });

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    // 2. Fetch all products with categories (for wholesale & catalog pricing)
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
    let totalSoldProductCost = 0;
    let totalCustomerDeliveryFees = 0;
    let totalActualCourierCost = 0;
    let totalStoreDeliveryExpense = 0;
    let todayProfit = 0;
    let weekProfit = 0;
    let monthProfit = 0;

    // Revenue and cost by order source
    let webRevenue = 0;
    let webCost = 0;
    let whatsappRevenue = 0;
    let whatsappCost = 0;
    let randomRevenue = 0;
    let randomCost = 0;

    // Per-product sales tracking (listed catalog products)
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

    // Initialize productStats with all listed products
    (products || []).forEach((p) => {
      const pCost = Number(p.wholesale_price) || Number(p.purchase_price) || 0;
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

    // ─────────────────────────────────────────────────────────────────────────
    // Process each approved customer order
    // ─────────────────────────────────────────────────────────────────────────
    (orders || []).forEach((order: any) => {
      const orderDate = new Date(order.approved_at || order.created_at);

      let orderCost = 0;

      // ── Determine actual product revenue for this order ──
      const rawItemsSubtotal = (order.order_items || []).reduce((sum: number, it: any) => {
        const q = it.quantity || 1;
        return sum + (Number(it.line_total) || (Number(it.unit_price) * q));
      }, 0);

      const customerFee = Number(order.delivery_charges) || 0;
      const orderTotal = Number(order.total_amount) || 0;
      const discount = (Number(order.coupon_discount) || 0) + (Number(order.bundle_discount) || 0);

      let orderRevenue = 0;
      if (orderTotal > 0) {
        orderRevenue = Math.max(0, orderTotal - customerFee);
      } else if (rawItemsSubtotal > 0) {
        orderRevenue = Math.max(0, rawItemsSubtotal - discount);
      }

      // Ratio to scale individual item revenues so product/category reports match the actual discounted sale price
      const revenueScaleRatio = rawItemsSubtotal > 0 ? (orderRevenue / rawItemsSubtotal) : 1;

      (order.order_items || []).forEach((item: any) => {
        const prod = productMap.get(item.product_id);
        const qty = item.quantity || 1;
        const rawLine = Number(item.line_total) || (Number(item.unit_price) * qty);
        const lineRevenue = rawLine * revenueScaleRatio;

        // ── Product Wholesale Cost ──
        // Priority 1: Purchase/wholesale cost saved on order item
        // Priority 2: Product wholesale_price or purchase_price from catalog
        let unitCost = 0;
        if (Number(item.purchase_price) > 0) {
          unitCost = Number(item.purchase_price);
        } else if (Number(prod?.wholesale_price) > 0) {
          unitCost = Number(prod.wholesale_price);
        } else if (Number(prod?.purchase_price) > 0) {
          unitCost = Number(prod.purchase_price);
        }

        const lineCost = unitCost * qty;
        orderCost += lineCost;

        // Product stats aggregation
        if (item.product_id && productStats.has(item.product_id)) {
          const ps = productStats.get(item.product_id)!;
          ps.unitsSold += qty;
          ps.revenue += lineRevenue;
          ps.cost += lineCost;
          ps.profit += (lineRevenue - lineCost);
          ps.margin = ps.revenue > 0 ? Math.round((ps.profit / ps.revenue) * 10000) / 100 : ps.margin;
          if (unitCost > 0) ps.purchasePrice = unitCost;
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

      // ── Delivery Accounting per Order ──
      const courierCost = (order.actual_courier_cost !== undefined && order.actual_courier_cost !== null)
        ? Number(order.actual_courier_cost)
        : customerFee;
      const storeExpense = Math.max(0, courierCost - customerFee);

      totalCustomerDeliveryFees += customerFee;
      totalActualCourierCost += courierCost;
      totalStoreDeliveryExpense += storeExpense;

      const orderProfit = orderRevenue - orderCost - storeExpense;
      totalRevenue += orderRevenue;
      totalSoldProductCost += orderCost;

      // Track by order source
      const source = order.order_source || 'web';
      if (source === 'web') {
        webRevenue += orderRevenue;
        webCost += orderCost;
      } else if (source === 'whatsapp') {
        whatsappRevenue += orderRevenue;
        whatsappCost += orderCost;
      } else if (source === 'random') {
        randomRevenue += orderRevenue;
        randomCost += orderCost;
      }

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

    const grossProfit = totalRevenue - totalSoldProductCost;
    const netProfit = grossProfit - totalStoreDeliveryExpense;
    const averageMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

    // Profit by source
    const webProfit = webRevenue - webCost;
    const whatsappProfit = whatsappRevenue - whatsappCost;
    const randomProfit = randomRevenue - randomCost;

    const productList = Array.from(productStats.values());
    const categoryList = Array.from(categoryStats.values()).filter((c) => c.productsSold > 0 || c.revenue > 0);

    // Best profit product
    const bestProfitProduct = [...productList].sort((a, b) => b.profit - a.profit || (b.sellingPrice - b.purchasePrice) - (a.sellingPrice - a.purchasePrice))[0] || null;

    // Lowest margin product
    const lowestMarginProduct = [...productList].filter((p) => p.sellingPrice > 0).sort((a, b) => a.margin - b.margin)[0] || null;

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProductCost: Math.round(totalSoldProductCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        averageProfitMargin: averageMargin,
        totalCustomerDeliveryFees: Math.round(totalCustomerDeliveryFees * 100) / 100,
        totalActualCourierCost: Math.round(totalActualCourierCost * 100) / 100,
        totalStoreDeliveryExpense: Math.round(totalStoreDeliveryExpense * 100) / 100,
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
        // Profit by order source
        webProfit: Math.round(webProfit * 100) / 100,
        webRevenue: Math.round(webRevenue * 100) / 100,
        whatsappProfit: Math.round(whatsappProfit * 100) / 100,
        whatsappRevenue: Math.round(whatsappRevenue * 100) / 100,
        randomProfit: Math.round(randomProfit * 100) / 100,
        randomRevenue: Math.round(randomRevenue * 100) / 100,
      },
      products: productList,
      unlistedProducts: [],
      categories: categoryList,
    });
  } catch (err: any) {
    console.error('Profit API error:', err);
    return NextResponse.json({ error: err.message || 'Error calculating profit metrics' }, { status: 500 });
  }
}
