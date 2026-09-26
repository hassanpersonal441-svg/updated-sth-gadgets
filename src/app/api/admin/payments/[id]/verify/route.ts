import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const verifySchema = z.object({
  rejection_reason: z.string().optional(),
  create_invoice: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: any }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const paymentId = resolvedParams?.id || params?.id;

  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const service = createServiceClient();

  try {
    // Get payment details
    const { data: payment, error: paymentError } = await service
      .from('payments')
      .select('*, order:orders(*), order:orders(order_items(*))')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ error: 'Payment is already verified' }, { status: 400 });
    }

    if (payment.status === 'rejected') {
      return NextResponse.json({ error: 'Payment is already rejected' }, { status: 400 });
    }

    // Verify payment using the database function
    const { data: verifiedPayment, error: verifyError } = await service
      .rpc('verify_payment_and_place_order', {
        p_payment_id: paymentId,
        p_admin_id: admin.userId,
        p_admin_notes: parsed.data.rejection_reason || null,
      });

    if (verifyError) {
      console.error('Payment verification error:', verifyError);
      return NextResponse.json({ error: verifyError.message }, { status: 500 });
    }

    // Send WhatsApp confirmation message
    if (payment.order) {
      try {
        const { buildPaymentConfirmedWhatsAppMessage, createWhatsAppUrl } = await import('@/lib/whatsapp');
        const { data: settings } = await service
          .from('settings')
          .select('whatsapp_number, business_name')
          .eq('id', 1)
          .maybeSingle();

        const whatsappNumber = settings?.whatsapp_number || '+92 348 9593671';
        const message = buildPaymentConfirmedWhatsAppMessage({
          customer_name: payment.customer_name,
          total_amount: payment.amount,
          payment_reference: payment.payment_reference,
          order_number: payment.order.order_number || undefined,
        });

        const whatsappUrl = createWhatsAppUrl(whatsappNumber, message);

        // In a real implementation, you would send this via WhatsApp Business API
        // For now, we just log it
        console.log('WhatsApp confirmation message:', message);
      } catch (error) {
        console.error('Error sending WhatsApp confirmation:', error);
        // Non-blocking error
      }
    }

    // Auto-create invoice if requested and order has items
    let invoiceData = null;
    if (parsed.data.create_invoice && payment.order && payment.order.order_items) {
      try {
        // Generate invoice number
        const { data: existingInvoices } = await service
          .from('invoices')
          .select('invoice_number')
          .not('invoice_number', 'is', null)
          .order('created_at', { ascending: false });

        let nextNum = 1;
        if (existingInvoices && existingInvoices.length > 0) {
          const numbers = existingInvoices
            .map((inv: any) => {
              const m = (inv.invoice_number || '').match(/(\d+)/);
              return m ? parseInt(m[1], 10) : 0;
            })
            .filter((n: number) => n > 0);

          const usedSet = new Set(numbers);
          while (usedSet.has(nextNum)) {
            nextNum++;
          }
        }
        const finalInvoiceNumber = `STH-INV-${String(nextNum).padStart(3, '0')}`;

        // Create invoice
        const { data: invoice, error: invoiceError } = await service
          .from('invoices')
          .insert({
            invoice_number: finalInvoiceNumber,
            customer_name: payment.customer_name,
            customer_phone: payment.customer_phone,
            customer_whatsapp: payment.customer_phone,
            customer_email: null,
            customer_address: payment.order.address,
            customer_city: payment.order.city,
            invoice_date: new Date().toISOString(),
            due_date: null,
            subtotal: payment.order.subtotal,
            item_discount: payment.order.coupon_discount || 0,
            coupon_discount: payment.order.coupon_discount || 0,
            delivery_charges: payment.order.delivery_charges,
            grand_total: payment.order.total_amount,
            coupon_code: null,
            coupon_id: null,
            payment_method: payment.payment_method,
            payment_status: 'Paid',
            amount_paid: payment.order.total_amount,
            remaining_amount: 0,
            invoice_status: 'Paid',
            notes: `Payment Reference: ${payment.payment_reference} | Online Payment Verified`,
            terms: null,
          })
          .select()
          .single();

        if (!invoiceError && invoice) {
          // Insert invoice items
          const invoiceItems = payment.order.order_items.map((item: any) => ({
            invoice_id: invoice.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: 0,
            total: item.line_total,
          }));

          await service.from('invoice_items').insert(invoiceItems);

          // Fetch complete invoice
          const { data: completeInvoice } = await service
            .from('invoices')
            .select('*, invoice_items(*)')
            .eq('id', invoice.id)
            .single();

          invoiceData = completeInvoice;
        }
      } catch (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        // Non-blocking error - payment is still verified
      }
    }

    return NextResponse.json({
      success: true,
      payment: verifiedPayment,
      invoice: invoiceData,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
