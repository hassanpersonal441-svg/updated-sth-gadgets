import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { evaluateCoupon, normalizePhoneNumber } from '@/lib/utils';
import { buildWhatsAppCheckoutMessage, createWhatsAppUrl, buildOnlinePaymentWhatsAppMessage } from '@/lib/whatsapp';
import type { Product } from '@/types/database';

const checkoutSchema = z.object({
  customer_name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(5, 'Valid phone is required').max(30),
  city: z.string().min(1, 'City is required').max(100),
  address: z.string().min(1, 'Address is required').max(300),
  coupon_code: z.string().nullable().optional(),
  payment_method: z.enum(['cod', 'online']).default('cod'),
  items: z.array(
    z.object({
      product_id: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().min(1),
      variant_name: z.string().nullable().optional(),
    })
  ).min(1, 'At least one item is required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { customer_name, phone, city, address, coupon_code, payment_method, items } = parsed.data;
    const supabase = createServiceClient();

    // 1. Fetch real product data from Supabase database to validate price & stock
    const productIds = items.map((i) => i.product_id);
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price, purchase_price, stock_status, active, bundle_offers, free_delivery')
      .in('id', productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not fetch products from database' },
        { status: 400 }
      );
    }

    const productMap = new Map<string, Product>();
    dbProducts.forEach((p: any) => productMap.set(p.id, p));

    // 2. Validate availability and build verified line items
    let subtotal = 0;
    let totalQuantity = 0;
    const verifiedItems: {
      product_id: string;
      product_name: string;
      variant_name?: string | null;
      unit_price: number;
      purchase_price: number;
      quantity: number;
      line_total: number;
    }[] = [];

    for (const item of items) {
      const prod = productMap.get(item.product_id);
      if (!prod || !prod.active) {
        return NextResponse.json(
          { success: false, error: `Product "${prod?.name || item.product_id}" is not available.` },
          { status: 400 }
        );
      }

      if (prod.stock_status === 'out_of_stock') {
        return NextResponse.json(
          { success: false, error: `Product "${prod.name}" is currently out of stock.` },
          { status: 400 }
        );
      }

      const selectedBundle = item.variant_name
        ? (prod as any).bundle_offers?.find((bundle: any) => bundle.title === item.variant_name)
        : null;
      const unit_price = selectedBundle ? Number(selectedBundle.bundle_price) : Number(prod.price);
      const purchase_price = Number(prod.purchase_price) || 0;
      const line_total = unit_price * item.quantity;
      subtotal += line_total;
      totalQuantity += item.quantity;

      verifiedItems.push({
        product_id: prod.id,
        product_name: selectedBundle ? `${prod.name} (${selectedBundle.title})` : prod.name,
        variant_name: item.variant_name,
        unit_price,
        purchase_price,
        quantity: item.quantity,
        line_total,
      });
    }

    // 3. Validate coupon against Supabase database
    let coupon_discount = 0;
    if (coupon_code && coupon_code.trim()) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', coupon_code.trim())
        .maybeSingle();

      if (coupon) {
        const evaluation = evaluateCoupon(coupon as any, subtotal);
        if (evaluation.valid) {
          coupon_discount = evaluation.discountAmount;
        }
      }
    }

    // 4. Calculate bundle discount based on subtotal thresholds from store settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const tier1Threshold = settings?.bundle_tier1_threshold ?? 2000;
    const tier1Percent = settings?.bundle_tier1_percent ?? 5;
    const tier2Threshold = settings?.bundle_tier2_threshold ?? 4000;
    const tier2Percent = settings?.bundle_tier2_percent ?? 10;

    let bundle_discount = 0;
    // Mutually Exclusive Discount Rule:
    // Either Coupon Discount OR Automatic Bundle Discount applies, NOT both!
    if (coupon_discount === 0) {
      if (subtotal >= tier2Threshold && tier2Threshold > 0) {
        bundle_discount = Math.round((subtotal * tier2Percent) / 100);
      } else if (subtotal >= tier1Threshold && tier1Threshold > 0) {
        bundle_discount = Math.round((subtotal * tier1Percent) / 100);
      }
    }

    // 5. Calculate delivery charges based on store settings and individual product free_delivery status
    const freeShippingThreshold = settings?.free_shipping_threshold ?? 5000;
    const defaultDeliveryFee = settings?.delivery_charges ?? 200;
    
    // Check if any product in the cart has free_delivery enabled
    const hasFreeDeliveryProduct = verifiedItems.some(item => {
      const product = productMap.get(item.product_id);
      return product?.free_delivery === true;
    });
    
    // Free delivery if: threshold met OR any product has free_delivery enabled
    const delivery_charges = (hasFreeDeliveryProduct || (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold)) ? 0 : defaultDeliveryFee;

    // 6. Calculate final total amount
    const total_amount = Math.max(0, subtotal - coupon_discount - bundle_discount + delivery_charges);

    // 6.5 Handle Online Payment
    let payment_reference = null;
    let payment_id = null;
    if (payment_method === 'online') {
      // Check if online payment is enabled
      if (!settings?.online_payment_enabled) {
        return NextResponse.json(
          { success: false, error: 'Online payment is currently not available' },
          { status: 400 }
        );
      }

      // Generate payment reference
      const { data: refData, error: refError } = await supabase
        .rpc('generate_payment_reference');

      if (refError || !refData) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate payment reference' },
          { status: 500 }
        );
      }

      payment_reference = refData;
    }

    // Normalize customer phone number for WhatsApp delivery
    const normalizedPhone = normalizePhoneNumber(phone);

    // 7. Insert Order into Supabase
    // NOTE: order_number MUST be NULL because order is strictly PENDING!
    const { data: insertedOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: null,
        status: payment_method === 'online' ? 'pending_payment' : 'pending',
        customer_name,
        phone: normalizedPhone || phone,
        city,
        address,
        subtotal,
        delivery_charges,
        coupon_discount,
        bundle_discount,
        total_amount,
        payment_status: payment_method === 'online' ? 'pending' : 'pending',
        payment_method: payment_method === 'online' ? settings?.payment_method_name || 'JazzCash' : null,
        payment_reference: payment_reference,
        order_source: 'whatsapp',
        admin_notification_sent: false,
        customer_notification_sent: false,
      })
      .select()
      .single();

    if (orderErr || !insertedOrder) {
      console.error('Error inserting order:', orderErr);
      return NextResponse.json(
        { success: false, error: 'Database error creating order. Please ensure the orders table is set up.' },
        { status: 500 }
      );
    }

    // 8. Insert Order Items into Supabase with snapshot purchase_price
    const orderItemsToInsert = verifiedItems.map((v) => ({
      order_id: insertedOrder.id,
      product_id: v.product_id,
      product_name: v.product_name,
      variant_name: v.variant_name || null,
      unit_price: v.unit_price,
      purchase_price: v.purchase_price,
      quantity: v.quantity,
      line_total: v.line_total,
    }));

    await supabase.from('order_items').insert(orderItemsToInsert);

    // 8.5 Create payment record for online payment
    if (payment_method === 'online' && payment_reference) {
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          payment_reference,
          order_id: insertedOrder.id,
          customer_name,
          customer_phone: normalizedPhone || phone,
          payment_method: settings?.payment_method_name || 'JazzCash',
          amount: total_amount,
          status: 'awaiting_payment',
        })
        .select()
        .single();

      if (!paymentError && paymentData) {
        payment_id = paymentData.id;
        // Update order with payment_id
        await supabase
          .from('orders')
          .update({ payment_id })
          .eq('id', insertedOrder.id);
      }
    }

    // 9. Record WhatsApp Click event (best-effort)
    try {
      await supabase.from('whatsapp_clicks').insert({
        product_id: verifiedItems[0]?.product_id || null,
      });
    } catch {
      // non-blocking
    }

    // 10. Destination WhatsApp number from settings
    const destPhone = (settings?.whatsapp_number && settings.whatsapp_number.trim())
      ? settings.whatsapp_number.replace(/[^0-9]/g, '')
      : '923489593671';

    // 11. Build Initial WhatsApp Message in exact required format
    // Format:
    // 🛍️ STH GADGETS - NEW ORDER
    // 👤 Customer Name: {customer_name}
    // 📱 WhatsApp Number: {phone}
    // 🏙️ City: {city}
    // 📍 Address: {address}
    // 📦 ORDER DETAILS
    // • {product_name}
    // Qty: {quantity} x PKR {unit_price} = PKR {line_total}
    // 💵 Subtotal: PKR {subtotal}
    // 🎟️ Coupon Discount: PKR {coupon_discount}
    // 🎁 Bundle Discount: PKR {bundle_discount}
    // 🚚 Delivery Charges: PKR {delivery_charges}
    // 💰 TOTAL AMOUNT: PKR {total_amount}
    // =========================
    // Thank you for ordering with STH Gadgets!
    // We will confirm your order shortly.

    let whatsappMessage;
    if (payment_method === 'online' && payment_reference) {
      whatsappMessage = buildOnlinePaymentWhatsAppMessage({
        customer_name,
        payment_reference,
        total_amount,
        payment_method: settings?.payment_method_name || 'JazzCash',
      });
    } else {
      whatsappMessage = buildWhatsAppCheckoutMessage({
        customer_name,
        phone,
        city,
        address,
        subtotal,
        coupon_discount,
        coupon_code,
        bundle_discount,
        delivery_charges,
        total_amount,
        items: verifiedItems,
      });
    }

    const whatsappUrl = createWhatsAppUrl(destPhone, whatsappMessage);

    return NextResponse.json({
      success: true,
      orderId: insertedOrder.id,
      whatsappUrl,
      message: whatsappMessage,
      payment_reference,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during checkout' },
      { status: 500 }
    );
  }
}
