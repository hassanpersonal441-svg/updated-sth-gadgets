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

    // 1. Fetch all approved/completed orders with items (includes all order sources: web, whatsapp, random)
    const { data: orders, error: ordersErr } = await service
      .from('orders')
      .select('id, order_number, status, total_amount, subtotal, delivery_charges, actual_courier_cost, delivery_paid_by, coupon_discount, bundle_discount, created_at, approved_at, order_source, order_items(*)')
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

    // 4. Fetch all vendor purchases — used as the source of truth for actual purchase costs
    //    (particularly for unlisted / order-specific products)
    const { data: vendorPurchasesRaw } = await service
      .from('vendor_purchases')
      .select('id, order_number, product_name, quantity, wholesale_cost, status, purchase_date, created_at');

    const vendorPurchases: any[] = vendorPurchasesRaw || [];

    // Build a lookup: order_number → list of vendor purchases for that order
    // Normalise order numbers to UPPERCASE so STH-0001 == sth-0001
    const vendorByOrder = new Map<string, any[]>();
    vendorPurchases.forEach((vp) => {
      const key = (vp.order_number || '').trim().toUpperCase();
      if (!key) return;
      if (!vendorByOrder.has(key)) vendorByOrder.set(key, []);
      vendorByOrder.get(key)!.push(vp);
    });

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
    let totalCustomerDeliveryFees = 0;
    let totalActualCourierCost = 0;
    let totalStoreDeliveryExpense = 0;
    let todayProfit = 0;
    let weekProfit = 0;
    let monthProfit = 0;

    // Revenue and profit by order source
    let webRevenue = 0;
    let webCost = 0;
    let whatsappRevenue = 0;
    let whatsappCost = 0;
    let randomRevenue = 0;
    let randomCost = 0;

    // Track how much vendor-purchase cost has already been absorbed per order
    // Key: "orderId::productName_normalised" — used to deduplicate
    // We'll track which vendor_purchase IDs have been consumed
    const consumedVendorPurchaseIds = new Set<string>();

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

    // Per-unlisted-product sales tracking (vendor-purchased items not in catalog)
    //   Key: normalised product_name
    const unlistedProductStats = new Map<string, {
      id: string; // synthetic id
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
    // STEP A: Process each order and its order items
    // ─────────────────────────────────────────────────────────────────────────
    (orders || []).forEach((order: any) => {
      const orderDate = new Date(order.approved_at || order.created_at);
      const orderKey = (order.order_number || '').trim().toUpperCase();

      // Gather vendor purchases linked to this order (by order_number)
      const linkedVendorPurchases: any[] = orderKey ? (vendorByOrder.get(orderKey) || []) : [];

      let orderCost = 0;
      let orderRevenue = 0;

      (order.order_items || []).forEach((item: any) => {
        const prod = productMap.get(item.product_id);
        const qty = item.quantity || 1;
        const lineRevenue = Number(item.line_total) || (Number(item.unit_price) * qty);

        // ── COST DETERMINATION (Priority Order, no double-counting) ──────────
        // Priority 1: matching vendor_purchase record for this order (actual vendor bill paid)
        // Priority 2: item.purchase_price recorded at time of sale
        // Priority 3: product catalog purchase_price
        // Priority 4: 0 (unknown — flagged as missing, never invented)

        let unitCost = 0;
        let costSource: 'order_item' | 'vendor_purchase' | 'catalog' | 'missing' = 'missing';

        const itemProductName = (item.product_name || prod?.name || '').toLowerCase().trim();
        const matchIdx = linkedVendorPurchases.findIndex((vp) => {
          if (consumedVendorPurchaseIds.has(vp.id)) return false;
          const vpName = (vp.product_name || '').toLowerCase().trim();
          return vpName === itemProductName || vpName.includes(itemProductName) || itemProductName.includes(vpName);
        });

        if (matchIdx !== -1) {
          // Priority 1: Real vendor purchase for this order
          const vp = linkedVendorPurchases[matchIdx];
          consumedVendorPurchaseIds.add(vp.id);
          unitCost = Number(vp.wholesale_cost) || 0;
          costSource = 'vendor_purchase';
        } else if (Number(item.purchase_price) > 0) {
          // Priority 2: Cost recorded on order item at checkout
          unitCost = Number(item.purchase_price);
          costSource = 'order_item';
        } else if (Number(prod?.purchase_price) > 0) {
          // Priority 3: Catalog fallback
          unitCost = Number(prod.purchase_price);
          costSource = 'catalog';
        }
        // else costSource remains 'missing', unitCost = 0

        const lineCost = unitCost * qty;

        orderCost += lineCost;
        orderRevenue += lineRevenue;

        // Product stats aggregation (listed catalog products)
        if (item.product_id && productStats.has(item.product_id)) {
          const ps = productStats.get(item.product_id)!;
          ps.unitsSold += qty;
          ps.revenue += lineRevenue;
          ps.cost += lineCost;
          ps.profit += (lineRevenue - lineCost);
          ps.margin = ps.revenue > 0 ? Math.round((ps.profit / ps.revenue) * 10000) / 100 : ps.margin;
          // Update purchasePrice to reflect the actual cost used (most recent wins)
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

      // ── STEP A2: Unlisted vendor purchases linked to this order ──────────
      // Any vendor purchase record for this order that was NOT consumed by an
      // order_item match above should still count as a cost (unlisted products).
      linkedVendorPurchases.forEach((vp) => {
        if (consumedVendorPurchaseIds.has(vp.id)) return; // already counted

        const vpQty = Number(vp.quantity) || 1;
        const vpUnitCost = Number(vp.wholesale_cost) || 0;
        const vpTotalCost = vpUnitCost * vpQty;

        // We have no revenue line for unlisted products in order_items
        // (the sale revenue is captured in the order total but may not be itemised separately).
        // Add the cost only; revenue is already included in the order subtotal via order_items.
        // If a revenue line was NOT in order_items (genuinely unlisted with no order_item row),
        // we still count the cost so profit is not overstated.
        orderCost += vpTotalCost;
        consumedVendorPurchaseIds.add(vp.id);

        // Track in unlistedProductStats
        const nameKey = (vp.product_name || 'Unknown Product').toLowerCase().trim();
        if (!unlistedProductStats.has(nameKey)) {
          unlistedProductStats.set(nameKey, {
            id: `unlisted::${nameKey}`,
            name: vp.product_name || 'Unknown Product',
            sku: 'UNLISTED',
            categoryName: 'Unlisted / Order-Specific',
            sellingPrice: 0,
            purchasePrice: vpUnitCost,
            unitsSold: vpQty,
            revenue: 0,
            cost: vpTotalCost,
            profit: -vpTotalCost,
            margin: 0,
          });
        } else {
          const up = unlistedProductStats.get(nameKey)!;
          up.unitsSold += vpQty;
          up.cost += vpTotalCost;
          up.profit -= vpTotalCost;
          up.purchasePrice = vpUnitCost; // last seen unit cost
        }
      });

      // ── Delivery Accounting per Order ──
      const customerFee = Number(order.delivery_charges) || 0;
      const courierCost = (order.actual_courier_cost !== undefined && order.actual_courier_cost !== null)
        ? Number(order.actual_courier_cost)
        : customerFee;
      const storeExpense = Math.max(0, courierCost - customerFee);

      totalCustomerDeliveryFees += customerFee;
      totalActualCourierCost += courierCost;
      totalStoreDeliveryExpense += storeExpense;

      const orderProfit = orderRevenue - orderCost - storeExpense;
      totalRevenue += orderRevenue;
      totalCost += orderCost;

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

    // ─────────────────────────────────────────────────────────────────────────
    // STEP B: All remaining vendor purchases (general / historical / stock purchases)
    //   These are real vendor purchases (from Voltix Mobile) that are not yet
    //   consumed by a specific customer order. They represent actual product costs
    //   spent by STH Gadgets and must be included in Total Product Cost.
    // ─────────────────────────────────────────────────────────────────────────
    vendorPurchases.forEach((vp) => {
      if (consumedVendorPurchaseIds.has(vp.id)) return;
      consumedVendorPurchaseIds.add(vp.id);

      const vpQty = Number(vp.quantity) || 1;
      const vpUnitCost = Number(vp.wholesale_cost) || 0;
      const vpTotalCost = vpUnitCost * vpQty;

      totalCost += vpTotalCost;

      const nameKey = (vp.product_name || 'Vendor Purchase').toLowerCase().trim();
      if (!unlistedProductStats.has(nameKey)) {
        unlistedProductStats.set(nameKey, {
          id: `unlisted::${vp.id}`,
          name: vp.product_name || 'Vendor Purchase',
          sku: vp.order_number || 'VENDOR',
          categoryName: 'Vendor Purchases (Voltix)',
          sellingPrice: 0,
          purchasePrice: vpUnitCost,
          unitsSold: vpQty,
          revenue: 0,
          cost: vpTotalCost,
          profit: -vpTotalCost,
          margin: 0,
        });
      } else {
        const up = unlistedProductStats.get(nameKey)!;
        up.unitsSold += vpQty;
        up.cost += vpTotalCost;
        up.profit -= vpTotalCost;
        up.purchasePrice = vpUnitCost;
      }
    });

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalStoreDeliveryExpense;
    const averageMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

    // Calculate profit by source
    const webProfit = webRevenue - webCost;
    const whatsappProfit = whatsappRevenue - whatsappCost;
    const randomProfit = randomRevenue - randomCost;

    const productList = Array.from(productStats.values());
    const unlistedList = Array.from(unlistedProductStats.values());

    // Merge listed + unlisted for full product table
    const allProductsForTable = [...productList, ...unlistedList];

    const categoryList = Array.from(categoryStats.values()).filter((c) => c.productsSold > 0 || c.revenue > 0);

    // Best profit product (by total profit sold, fallback to catalog profit)
    const bestProfitProduct = [...allProductsForTable].sort((a, b) => b.profit - a.profit || (b.sellingPrice - b.purchasePrice) - (a.sellingPrice - a.purchasePrice))[0] || null;

    // Lowest margin product (only listed ones with a selling price)
    const lowestMarginProduct = [...productList].filter((p) => p.sellingPrice > 0).sort((a, b) => a.margin - b.margin)[0] || null;

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProductCost: Math.round(totalCost * 100) / 100,
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
        // Metadata flags for admin awareness
        unlistedProductCount: unlistedList.length,
        unlistedProductCost: Math.round(unlistedList.reduce((s, u) => s + u.cost, 0) * 100) / 100,
        // Profit by order source
        webProfit: Math.round(webProfit * 100) / 100,
        webRevenue: Math.round(webRevenue * 100) / 100,
        whatsappProfit: Math.round(whatsappProfit * 100) / 100,
        whatsappRevenue: Math.round(whatsappRevenue * 100) / 100,
        randomProfit: Math.round(randomProfit * 100) / 100,
        randomRevenue: Math.round(randomRevenue * 100) / 100,
      },
      products: productList,
      unlistedProducts: unlistedList,
      categories: categoryList,
    });
  } catch (err: any) {
    console.error('Profit API error:', err);
    return NextResponse.json({ error: err.message || 'Error calculating profit metrics' }, { status: 500 });
  }
}
