'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ProductExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedProductRow {
  name: string;
  category?: string;
  price: number;
  old_price?: number;
  purchase_price?: number;
  wholesale_price?: number;
  stock_status?: string;
  sku?: string;
  model_number?: string;
  short_description?: string;
  description?: string;
  specifications?: string;
  key_features?: string;
  featured?: string | boolean;
  best_seller?: string | boolean;
  new_arrival?: string | boolean;
  free_delivery?: string | boolean;
}

export default function ProductExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ProductExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    imported: number;
    errors: { row: number; name?: string; error: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate and download sample Excel spreadsheet template
  function handleDownloadTemplate() {
    const templateData = [
      {
        name: 'Buds Pro 7 Wireless Earbuds',
        category: 'Wireless Earbuds',
        price: 1850,
        old_price: 2600,
        purchase_price: 1300,
        wholesale_price: 1550,
        stock_status: 'in_stock',
        sku: 'STH-EB-007',
        model_number: 'BP-07',
        short_description: 'Hi-Fi stereo sound with ENC noise reduction and smart touch sensor.',
        description: 'Premium wireless earbuds with crystal clear microphone, deep bass, and 24-hour battery case.',
        specifications: 'Bluetooth: 5.3; Battery: 350mAh; Charging: Type-C; Playtime: 6 Hours; Range: 10m',
        key_features: 'ENC Noise Cancellation | Touch Control | Heavy Bass | Water Resistant',
        featured: 'No',
        best_seller: 'Yes',
        new_arrival: 'Yes',
        free_delivery: 'No',
      },
      {
        name: 'LMA 20,000mAh Dual-Output Fast Power Bank',
        category: 'Power Banks',
        price: 2950,
        old_price: 3800,
        purchase_price: 2200,
        wholesale_price: 2500,
        stock_status: 'in_stock',
        sku: 'STH-PB-020',
        model_number: 'LP-02',
        short_description: 'Heavy duty 20,000mAh portable power bank with dual USB fast outputs.',
        description: 'High capacity power bank for smartphones and accessories. Supports 22.5W and PD fast charge with LED battery meter.',
        specifications: 'Capacity: 20000mAh; Output: 22.5W Max; Input: Type-C & Micro USB; Weight: 380g',
        key_features: 'Dual Fast USB Ports | 22.5W Quick Charge | LED Percentage Display | Flight Safe',
        featured: 'Yes',
        best_seller: 'Yes',
        new_arrival: 'No',
        free_delivery: 'Yes',
      },
      {
        name: 'Redmi 33W Turbo Fast Wall Charger',
        category: 'Fast Chargers',
        price: 950,
        old_price: 1400,
        purchase_price: 650,
        wholesale_price: 780,
        stock_status: 'in_stock',
        sku: 'STH-CH-033',
        model_number: 'MDY-11-EZ',
        short_description: '33W Turbo fast adapter for Type-C smartphones.',
        description: 'Compact original fast wall charger with smart temperature control and surge protection.',
        specifications: 'Output: 33W Max; Port: USB-A; Input: 100-240V 50/60Hz; Plug: US 2-Pin',
        key_features: '33W Turbo Charge | Smart Chip Protection | Fireproof Material',
        featured: 'No',
        best_seller: 'No',
        new_arrival: 'Yes',
        free_delivery: 'No',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Auto set column widths
    const colWidths = [
      { wch: 32 }, // name
      { wch: 20 }, // category
      { wch: 12 }, // price
      { wch: 12 }, // old_price
      { wch: 15 }, // purchase_price
      { wch: 15 }, // wholesale_price
      { wch: 14 }, // stock_status
      { wch: 15 }, // sku
      { wch: 15 }, // model_number
      { wch: 35 }, // short_description
      { wch: 45 }, // description
      { wch: 40 }, // specifications
      { wch: 35 }, // key_features
      { wch: 10 }, // featured
      { wch: 12 }, // best_seller
      { wch: 14 }, // new_arrival
      { wch: 14 }, // free_delivery
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    XLSX.writeFile(workbook, 'STH_Gadgets_Product_Import_Template.xlsx');
  }

  // Handle file selection and parsing
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg(null);
    setImportResults(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg('No data rows found in this file. Please check your sheet.');
          setParsedRows([]);
          return;
        }

        const normalized: ParsedProductRow[] = rawJson.map((row) => ({
          name: String(row.name || row.Name || row['Product Name'] || row.title || '').trim(),
          category: String(row.category || row.Category || row['Category Name'] || '').trim(),
          price: Number(row.price || row.Price || row['Selling Price'] || 0),
          old_price: row.old_price ? Number(row.old_price) : undefined,
          purchase_price: row.purchase_price ? Number(row.purchase_price) : undefined,
          wholesale_price: row.wholesale_price ? Number(row.wholesale_price) : undefined,
          stock_status: String(row.stock_status || row['Stock Status'] || 'in_stock').trim(),
          sku: String(row.sku || row.SKU || '').trim(),
          model_number: String(row.model_number || row['Model Number'] || '').trim(),
          short_description: String(row.short_description || row['Short Description'] || '').trim(),
          description: String(row.description || row.Description || '').trim(),
          specifications: String(row.specifications || row.Specifications || '').trim(),
          key_features: String(row.key_features || row['Key Features'] || '').trim(),
          featured: row.featured,
          best_seller: row.best_seller,
          new_arrival: row.new_arrival,
          free_delivery: row.free_delivery,
        }));

        setParsedRows(normalized);
      } catch (err: any) {
        setErrorMsg('Failed to parse file: ' + (err.message || 'Invalid format'));
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }

  // Submit parsed products to bulk import API
  async function handleImport() {
    if (!parsedRows || parsedRows.length === 0) return;

    setLoading(true);
    setErrorMsg(null);
    setImportResults(null);

    try {
      const res = await fetch('/api/admin/products/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: parsedRows }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to import products');
      }

      setImportResults({
        imported: data.imported_count || 0,
        errors: data.errors || [],
      });

      if (data.imported_count > 0) {
        onSuccess(data.imported_count);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during import');
    } finally {
      setLoading(false);
    }
  }

  const validRowCount = parsedRows.filter((r) => r.name && !isNaN(r.price)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0B1320] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 sm:p-6 bg-[#0E1726]/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00C4CC]/10 text-[#00C4CC] border border-[#00C4CC]/30 text-xl font-bold">
              📊
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Excel / CSV Bulk Product Import</span>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  Saves to Draft
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload products via spreadsheet. All products are saved as drafts so you can attach images later.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Draft Safeguard Notification Banner */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">📝</span>
            <div className="text-xs space-y-1 text-slate-300">
              <strong className="block text-sm text-amber-300 font-bold">
                Auto-Draft Protection
              </strong>
              <p>
                All imported products are automatically saved in <strong className="text-white font-semibold">Draft status</strong> (`active: false`). They will remain hidden from live customers until you upload photos and manually publish them.
              </p>
            </div>
          </div>

          {/* Action Row: Download Template & File Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 1: Download Template */}
            <div className="rounded-2xl border border-slate-800 bg-[#070D18] p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-[#00C4CC] uppercase tracking-wider block mb-1">
                  Step 1: Download Schema Template
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Download a pre-formatted Excel spreadsheet template with all database columns and 3 sample products.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#00C4CC]/50 bg-[#00C4CC]/10 hover:bg-[#00C4CC] px-4 py-2.5 font-display text-xs font-bold text-[#00C4CC] hover:text-black transition duration-200 cursor-pointer shadow-sm hover:scale-[1.01]"
              >
                <span>⬇️</span>
                <span>Download Sample Excel Template (.xlsx)</span>
              </button>
            </div>

            {/* Step 2: Upload File */}
            <div className="rounded-2xl border border-slate-800 bg-[#070D18] p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Step 2: Select Your Completed Sheet
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Choose your completed spreadsheet (.xlsx, .xls, or .csv) to instantly parse and preview rows.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2.5 font-display text-xs font-bold text-emerald-300 transition duration-200 cursor-pointer shadow-sm hover:scale-[1.01]"
              >
                <span>📁</span>
                <span>{file ? file.name : 'Choose Excel / CSV File'}</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Import Result Notification */}
          {importResults && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <span>🎉</span>
                  <span>Successfully imported {importResults.imported} products to Draft!</span>
                </span>
                <span className="text-xs text-slate-400">
                  Switching to Draft filter...
                </span>
              </div>
              {importResults.errors.length > 0 && (
                <div className="mt-2 text-xs text-amber-300 space-y-1">
                  <p className="font-semibold">Skipped / Issues in {importResults.errors.length} rows:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 max-h-24 overflow-y-auto">
                    {importResults.errors.map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.name ? `"${err.name}" - ` : ''} {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold text-white uppercase tracking-wider">
                    Parsed Spreadsheet Preview
                  </span>
                  <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-bold text-[#00C4CC]">
                    {parsedRows.length} Rows Found ({validRowCount} Valid)
                  </span>
                </div>
                <span className="text-[11px] text-amber-400 font-semibold">
                  All items will be tagged as DRAFT
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#070D18]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">#</th>
                      <th className="py-2.5 px-3 font-semibold">Product Name</th>
                      <th className="py-2.5 px-3 font-semibold">Category</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Price</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Old Price</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Cost Price</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedRows.slice(0, 15).map((row, idx) => {
                      const isValid = Boolean(row.name && !isNaN(row.price) && row.price > 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-white max-w-[200px] truncate">
                            {row.name || <span className="text-rose-400 italic">Missing Name</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-300">
                            {row.category || <span className="text-slate-500">Auto General</span>}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#00C4CC]">
                            Rs. {row.price ? Number(row.price).toLocaleString() : 0}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-400">
                            {row.old_price ? `Rs. ${Number(row.old_price).toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-400">
                            {row.purchase_price ? `Rs. ${Number(row.purchase_price).toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 px-3">
                            {isValid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                <span>📝</span> Draft
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                                <span>✕</span> Incomplete
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsedRows.length > 15 && (
                  <div className="p-2.5 text-center text-[11px] text-slate-500 border-t border-slate-800 bg-slate-900/40">
                    Showing first 15 of {parsedRows.length} rows... All {parsedRows.length} rows will be imported.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 p-4 sm:p-5 bg-[#0E1726]/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {parsedRows.length > 0 && (
              <span className="text-xs text-slate-400 hidden sm:inline">
                Ready to import <strong className="text-white font-bold">{validRowCount}</strong> products as Drafts
              </span>
            )}
            <button
              type="button"
              disabled={loading || validRowCount === 0}
              onClick={handleImport}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-display text-xs sm:text-sm font-black text-black shadow-[0_0_20px_rgba(0,196,204,0.3)] transition hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Importing Drafts...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Import {validRowCount} Products to Draft</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
