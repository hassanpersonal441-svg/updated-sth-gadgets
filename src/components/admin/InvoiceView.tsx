'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import type { Invoice, Settings } from '@/types/database';
import { buildWhatsAppInvoiceMessage, createWhatsAppUrl } from '@/lib/whatsapp';

interface InvoiceViewProps {
  invoice: Invoice;
  settings?: Settings | null;
  onEdit?: () => void;
  showActions?: boolean;
}

export default function InvoiceView({
  invoice,
  settings,
  onEdit,
  showActions = true,
}: InvoiceViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const businessName = settings?.business_name || 'STH Gadgets';
  const businessPhone = settings?.whatsapp_number || '+92 300 0000000';
  const businessEmail = settings?.email || 'support@sthgadgets.com';

  let rawAddress = settings?.address || 'Lahore, Pakistan';
  if (typeof rawAddress === 'string' && (rawAddress.trim().startsWith('{') || rawAddress.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(rawAddress);
      rawAddress = parsed.address || parsed.business_address || 'Lahore, Pakistan';
    } catch {
      rawAddress = 'Lahore, Pakistan';
    }
  }
  const businessAddress = rawAddress;
  const logoUrl = settings?.logo_url || '/images/logo.png';
  const currencySymbol = settings?.currency_symbol || 'Rs.';

  const displayInvoiceNumber = invoice.invoice_number || (invoice.id && !invoice.id.startsWith('draft') ? `STH-INV-${invoice.id.slice(0, 8).toUpperCase()}` : 'STH-INV-DRAFT');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloading(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const filename = `${displayInvoiceNumber}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF. Please try using the Print button to Save as PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsApp = () => {
    const rawPhone = invoice.customer_whatsapp || invoice.customer_phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    const publicUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/invoice/${displayInvoiceNumber}`
      : `/invoice/${displayInvoiceNumber}`;

    const message = buildWhatsAppInvoiceMessage({
      customer_name: invoice.customer_name,
      business_name: businessName,
      invoice_number: displayInvoiceNumber,
      grand_total: invoice.grand_total,
      payment_status: invoice.payment_status,
      currency_symbol: currencySymbol,
      public_url: publicUrl,
    });

    window.open(createWhatsAppUrl(phone, message), '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Confirmed':
      case 'Delivered':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'Pending':
      case 'Partial':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      case 'Cancelled':
      case 'Refunded':
      case 'Unpaid':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
    }
  };

  return (
    <div className="w-full">
      {/* Top Action Toolbar (Hidden during print) */}
      {showActions && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0C1420] p-4 text-white print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-[#00C4CC]">
              {displayInvoiceNumber}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(
                invoice.invoice_status
              )}`}
            >
              {invoice.invoice_status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                ✏️ Edit
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              🖨️ Print
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 px-4 py-2 text-xs font-bold text-black shadow-md hover:brightness-110 transition disabled:opacity-50"
            >
              {downloading ? '⏳ Generating PDF...' : '📥 Download PDF'}
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-md"
            >
              💬 Send WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Printable Invoice Paper Area */}
      <div className="mx-auto max-w-4xl bg-white text-slate-900 shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none print:w-full">
        <div
          ref={printRef}
          id="invoice-printable-content"
          className="p-8 sm:p-12 bg-white text-slate-900 text-sm leading-relaxed"
        >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-900">
                  <Image
                    src={logoUrl}
                    alt={businessName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    {businessName}
                  </h1>
                  <p className="text-xs font-medium text-slate-500">Premium Tech & Mobile Accessories</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>{businessAddress}</p>
                <p>Phone / WhatsApp: {businessPhone}</p>
                <p>Email: {businessEmail}</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <h2 className="text-3xl font-black text-slate-900 tracking-wider">INVOICE</h2>
              <p className="font-mono text-base font-bold text-[#0066FF]">
                {displayInvoiceNumber}
              </p>
              <div className="text-xs text-slate-600 space-y-0.5 pt-2">
                <p>
                  <span className="font-semibold text-slate-700">Date:</span>{' '}
                  {invoice.invoice_date ? invoice.invoice_date.split('T')[0] : ''}
                </p>
                {invoice.due_date && (
                  <p>
                    <span className="font-semibold text-slate-700">Due Date:</span>{' '}
                    {invoice.due_date.split('T')[0]}
                  </p>
                )}
                <div className="pt-1 flex sm:justify-end gap-2">
                  <span className="inline-block px-2 py-0.5 rounded border border-slate-900 text-[10px] font-bold uppercase tracking-wider bg-slate-100">
                    Status: {invoice.invoice_status}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded border border-slate-900 text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white">
                    Payment: {invoice.payment_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Payment Info Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8 py-4 bg-slate-50 rounded-xl p-6 border border-slate-200">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                Billed To (Customer)
              </h3>
              <p className="font-bold text-slate-900 text-base">{invoice.customer_name}</p>
              <p className="text-xs text-slate-600">{invoice.customer_address}, {invoice.customer_city}</p>
              <p className="text-xs text-slate-600 mt-1">📞 {invoice.customer_phone}</p>
              {invoice.customer_whatsapp && (
                <p className="text-xs text-slate-600">💬 {invoice.customer_whatsapp}</p>
              )}
              {invoice.customer_email && (
                <p className="text-xs text-slate-600">✉️ {invoice.customer_email}</p>
              )}
            </div>

            <div className="sm:text-right">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                Payment Details
              </h3>
              <p className="text-xs text-slate-700">
                <span className="font-semibold">Method:</span> {invoice.payment_method}
              </p>
              <p className="text-xs text-slate-700">
                <span className="font-semibold">Status:</span> {invoice.payment_status}
              </p>
              <p className="text-xs text-slate-700">
                <span className="font-semibold">Amount Paid:</span> {currencySymbol} {invoice.amount_paid.toLocaleString()}
              </p>
              <p className="text-xs font-bold text-slate-900 mt-1">
                <span>Balance Remaining:</span> {currencySymbol} {invoice.remaining_amount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto my-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-900 text-white text-xs uppercase font-bold tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Product Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {invoice.invoice_items && invoice.invoice_items.length > 0 ? (
                  invoice.invoice_items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.product_image && (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="h-9 w-9 object-cover rounded border border-slate-200 shrink-0"
                            />
                          )}
                          <span className="font-bold text-slate-900">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{currencySymbol} {item.unit_price.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-600">
                        {item.discount > 0 ? `-${currencySymbol} ${item.discount.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {currencySymbol} {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No items listed in this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-slate-900 pt-6 my-6">
            <div className="max-w-xs text-xs text-slate-600 space-y-4">
              {invoice.notes && (
                <div>
                  <h4 className="font-bold uppercase text-slate-900 text-[11px] tracking-wider mb-1">Notes</h4>
                  <p className="bg-slate-50 p-3 rounded-lg border border-slate-200">{invoice.notes}</p>
                </div>
              )}
              <div>
                <h4 className="font-bold uppercase text-slate-900 text-[11px] tracking-wider mb-1">Terms & Conditions</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  {invoice.terms ||
                    'Thank you for your business! Items once sold can be claimed under standard STH Gadgets warranty where applicable. Please retain this invoice for your records.'}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-72 text-xs space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-mono font-semibold text-slate-900">{currencySymbol} {invoice.subtotal.toLocaleString()}</span>
              </div>

              {invoice.item_discount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-200 text-rose-600">
                  <span>Item Discounts:</span>
                  <span className="font-mono font-semibold">-{currencySymbol} {invoice.item_discount.toLocaleString()}</span>
                </div>
              )}

              {invoice.coupon_discount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-600">
                  <span>
                    Coupon Discount {invoice.coupon_code ? `(${invoice.coupon_code})` : ''}:
                  </span>
                  <span className="font-mono font-semibold">-{currencySymbol} {invoice.coupon_discount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Delivery Charges:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {invoice.delivery_charges > 0 ? `${currencySymbol} ${invoice.delivery_charges.toLocaleString()}` : 'FREE'}
                </span>
              </div>

              <div className="flex justify-between py-3 border-t-2 border-b-2 border-slate-900 font-bold text-base text-slate-900 bg-slate-100 px-3 rounded-lg">
                <span>Grand Total:</span>
                <span className="font-mono text-[#0066FF]">{currencySymbol} {invoice.grand_total.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-700">
                <span>Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-600">{currencySymbol} {invoice.amount_paid.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1 font-bold text-slate-900">
                <span>Remaining Balance:</span>
                <span className="font-mono text-rose-600">{currencySymbol} {invoice.remaining_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
            <p className="font-medium text-slate-600">STH Gadgets — Quality Products, Unmatched Service</p>
            <p className="text-[10px] mt-1 text-slate-400">Official Digital Invoice | STH Gadgets</p>
          </div>
        </div>
      </div>
    </div>
  );
}
