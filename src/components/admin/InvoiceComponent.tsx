'use client';

import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Order, Settings } from '@/types/database';

interface InvoiceComponentProps {
  order: Order;
  settings?: Settings | null;
  onClose?: () => void;
  showActions?: boolean;
}

export default function InvoiceComponent({
  order,
  settings: initialSettings,
  onClose,
  showActions = true,
}: InvoiceComponentProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<Settings | null>(initialSettings || null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (!initialSettings) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.settings) setSettings(data.settings);
        })
        .catch(() => {});
    }
  }, [initialSettings]);

  // Derived values
  const businessName = settings?.business_name || 'STH Gadgets';
  const logoUrl = settings?.logo_url || '/logo.png';
  const phone = settings?.whatsapp_number || '+92 348 9593671';
  const whatsapp = settings?.whatsapp_number || '+92 348 9593671';
  const email = settings?.email || 'support@sthgadgets.com';
  const address = settings?.address || 'Pakistan';
  const currencySymbol = settings?.currency_symbol || 'Rs.';

  const invoiceNumber = `INV-${order.order_number ? order.order_number.padStart(4, '0') : order.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const subtotal = Number(order.subtotal) || Number(order.total_amount) || 0;
  const couponDiscount = Number(order.coupon_discount) || 0;
  const bundleDiscount = Number(order.bundle_discount) || 0;
  const deliveryCharges = Number(order.delivery_charges) || 0;
  const grandTotal = Number(order.total_amount) || 0;

  const paymentMethod = settings?.payment_method_title || 'Cash on Delivery (COD)';
  const paymentStatus = (order.payment_status || 'pending').toUpperCase();

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPDF() {
    if (!invoiceRef.current) return;
    setPdfGenerating(true);

    try {
      const element = invoiceRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution capture
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Support multi-page PDFs if the order has many items
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${invoiceNumber}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. You can also use the Print Invoice option to save as PDF.');
    } finally {
      setPdfGenerating(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Top Action Bar (Hidden during print) */}
      {showActions && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0C1420] p-4 shadow-md">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C4CC]/10 text-base text-[#00C4CC] border border-[#00C4CC]/30">
              📄
            </span>
            <div>
              <h3 className="font-display text-sm font-bold text-silver-bright">
                Invoice {invoiceNumber}
              </h3>
              <p className="text-[11px] text-silver-dim">
                Print or download official invoice document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#141F30] px-4 py-2 text-xs font-bold text-silver-bright hover:bg-slate-700 hover:text-white transition"
            >
              <span>🖨️</span>
              <span>Print Invoice</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={pdfGenerating}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2 text-xs font-bold text-black shadow-sm transition hover:scale-[1.01] disabled:opacity-50"
            >
              <span>📥</span>
              <span>{pdfGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                type="button"
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-silver-dim hover:text-white transition"
                aria-label="Close invoice"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* INVOICE PAPER CONTAINER (White, A4 printable format) */}
      <div
        ref={invoiceRef}
        id="printable-invoice"
        className="printable-invoice mx-auto w-full max-w-[800px] rounded-xl border border-gray-200 bg-white p-6 sm:p-10 text-gray-800 shadow-xl"
        style={{ colorScheme: 'light' }}
      >
        {/* INVOICE HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 pb-6">
          {/* Left: Company Identity */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="h-12 w-auto max-w-[160px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h1 className="text-xl font-bold font-display text-gray-900 tracking-tight uppercase">
                  {businessName}
                </h1>
                <p className="text-xs font-semibold text-[#00888C]">Mobile Accessories & Gadgets</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 space-y-0.5 pt-1">
              <p>📍 {address}</p>
              <p>📞 Phone: {phone}</p>
              <p>📱 WhatsApp: {whatsapp}</p>
              <p>✉️ Email: {email}</p>
            </div>
          </div>

          {/* Right: Invoice Meta */}
          <div className="text-left sm:text-right space-y-1">
            <h2 className="text-2xl font-black tracking-wider text-gray-900 font-display uppercase">
              INVOICE
            </h2>
            <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-xs font-mono font-bold text-gray-800 border border-gray-200">
              #{invoiceNumber}
            </div>
            <p className="text-xs text-gray-500 pt-1">
              Date: <span className="font-semibold text-gray-800">{invoiceDate}</span>
            </p>
            <p className="text-xs text-gray-500">
              Order Source: <span className="font-semibold text-gray-800 uppercase">{order.order_source || 'WhatsApp / Web'}</span>
            </p>
          </div>
        </div>

        {/* CUSTOMER INFORMATION ("BILL TO") */}
        <div className="my-6 rounded-xl bg-gray-50 border border-gray-200 p-4 flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              BILL TO (CUSTOMER DETAILS)
            </span>
            <h3 className="text-base font-bold text-gray-900">{order.customer_name}</h3>
            <p className="text-xs text-gray-600">📱 {order.phone}</p>
          </div>

          <div className="space-y-1 text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              DELIVERY ADDRESS
            </span>
            <p className="text-xs font-semibold text-gray-800">{order.address}</p>
            <p className="text-xs text-gray-600">{order.city}, Pakistan</p>
          </div>
        </div>

        {/* PRODUCT TABLE */}
        <div className="my-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Item & Description</th>
                <th className="py-3 px-4 text-center">Unit Price</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item, idx) => {
                  const itemImg = item.product_image || item.product?.product_images?.[0]?.image_url || null;

                  return (
                    <tr key={item.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {itemImg ? (
                            <img
                              src={itemImg}
                              alt={item.product_name}
                              className="h-10 w-10 rounded-md border border-gray-200 object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-400 text-base flex-shrink-0">
                            📦
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{item.product_name}</p>
                          {item.variant_name && (
                            <p className="text-[11px] text-gray-500">Variant: {item.variant_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {currencySymbol} {Number(item.unit_price).toLocaleString('en-PK')}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {currencySymbol} {Number(item.line_total).toLocaleString('en-PK')}
                    </td>
                  </tr>
                );
              })
            ) : (
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-center text-gray-500 italic">
                    No individual line items available. Order Total: {currencySymbol}{' '}
                    {grandTotal.toLocaleString('en-PK')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* INVOICE SUMMARY & PAYMENT INFO SECTION */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Left: Payment Method & Status */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-2">
              Payment & Order Status
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-bold text-gray-800">{paymentMethod}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Payment Status:</span>
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Fulfillment Status:</span>
                <span className="font-bold text-gray-800 uppercase">{order.status || 'PENDING'}</span>
              </div>
            </div>
          </div>

          {/* Right: Financial Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">
                {currencySymbol} {subtotal.toLocaleString('en-PK')}
              </span>
            </div>

            {couponDiscount > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-600 font-medium">
                <span>Coupon Discount</span>
                <span>
                  -{currencySymbol} {couponDiscount.toLocaleString('en-PK')}
                </span>
              </div>
            )}

            {bundleDiscount > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-600 font-medium">
                <span>Bundle Discount</span>
                <span>
                  -{currencySymbol} {bundleDiscount.toLocaleString('en-PK')}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
              <span>Delivery Charges</span>
              <span className="font-semibold text-gray-900">
                {deliveryCharges === 0 ? 'FREE' : `${currencySymbol} ${deliveryCharges.toLocaleString('en-PK')}`}
              </span>
            </div>

            {/* GRAND TOTAL */}
            <div className="mt-3 flex justify-between items-center rounded-xl bg-gray-900 p-3 text-white">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                  GRAND TOTAL
                </span>
                <span className="text-[11px] text-gray-400">Net Amount Payable</span>
              </div>
              <span className="font-display text-xl sm:text-2xl font-black text-[#00C4CC]">
                {currencySymbol} {grandTotal.toLocaleString('en-PK')}
              </span>
            </div>
          </div>
        </div>

        {/* INVOICE NOTES */}
        <div className="my-6 rounded-xl border border-dashed border-gray-300 p-4 bg-gray-50/50 text-xs text-gray-600 space-y-1">
          <p className="font-bold text-gray-900">Thank you for shopping with STH Gadgets! 🛍️</p>
          <p>For any questions, warranty claims, or support regarding your order, please contact our WhatsApp customer support with your Order Invoice Number (#{invoiceNumber}).</p>
        </div>

        {/* TERMS AND CONDITIONS */}
        <div className="mt-8 border-t border-gray-200 pt-4 text-[10px] text-gray-500 space-y-1">
          <h5 className="font-bold uppercase tracking-wider text-gray-700">Terms & Conditions</h5>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Please inspect your product thoroughly upon receiving delivery from the courier rider.</li>
            <li>Products may only be returned or exchanged according to STH Gadgets standard 7-day return policy.</li>
            <li>Keep this invoice copy saved for official warranty claims and customer support reference.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
