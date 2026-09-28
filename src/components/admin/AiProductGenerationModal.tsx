'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/context/ToastContext';

interface AiProductGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  onProductCreated: (product: any) => void;
}

interface GeneratedProductData {
  title: string;
  short_description: string;
  description: string;
  key_features: Array<{
    icon: string;
    title: string;
    subtitle: string;
  }>;
  specifications: Array<{
    label: string;
    value: string;
  }>;
}

export default function AiProductGenerationModal({
  isOpen,
  onClose,
  productName,
  onProductCreated,
}: AiProductGenerationModalProps) {
  const { success, error: showErrorToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedProductData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/ai/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName,
          categoryName: 'Mobile Accessories',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate product info');
      }

      setGeneratedData(json.data);
      success('AI product information generated successfully!');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to generate product info');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCreateDraft() {
    if (!generatedData) return;
    
    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/ai/generate-draft-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName,
          categoryName: 'Mobile Accessories',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create draft product');
      }

      success('Product draft created successfully!');
      onProductCreated(json.product);
      onClose();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to create draft product');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[22px] border border-[#00C4CC]/45 bg-[#0b111b] text-[#C9D2DB] shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(0,196,204,0.14)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative flex items-center justify-between overflow-hidden border-b border-[#00C4CC]/20 bg-[radial-gradient(circle_at_0%_0%,rgba(0,196,204,0.24),transparent_38%),linear-gradient(120deg,#0a1f2d,#111827_65%)] px-5 pb-4 pt-5">
          <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full border border-[#00C4CC]/20" />
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#00C4CC] bg-black/70 p-1 shadow-[0_0_18px_rgba(0,196,204,0.42)]">
              <div className="flex items-center justify-center h-full w-full text-2xl">
                ✨
              </div>
            </div>
            <div className="relative">
              <span className="text-[10px] font-black text-[#00C4CC] uppercase tracking-[0.16em] block">
                AI PRODUCT GENERATION
              </span>
              <h2 className="font-display text-lg font-black text-white">
                Generate New Product with AI
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative rounded-xl border border-slate-200/20 bg-black/20 p-2 text-slate-400 transition hover:border-[#00C4CC]/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Product Name Display */}
          <div className="rounded-xl border border-[#00C4CC]/30 bg-[#00C4CC]/5 p-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#00C4CC] mb-2">
              Product Name
            </label>
            <div className="text-sm font-bold text-white">
              {productName}
            </div>
          </div>

          {!generatedData ? (
            /* Generate Button */
            <div className="text-center py-8">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="cursor-pointer rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 px-6 py-3 text-sm font-black text-slate-950 shadow-md transition hover:brightness-110 disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Generating with AI...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate Product Information</span>
                  </>
                )}
              </button>
              <p className="mt-3 text-xs text-slate-400">
                Gemini AI will generate product details based on the product name
              </p>
            </div>
          ) : (
            /* Generated Data Display */
            <>
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Product Title
                  </label>
                  <div className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-sm font-semibold text-white">
                    {generatedData.title}
                  </div>
                </div>

                {/* Short Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Short Description
                  </label>
                  <div className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-sm text-slate-300">
                    {generatedData.short_description}
                  </div>
                </div>

                {/* Full Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Full Description
                  </label>
                  <div className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-sm text-slate-300 whitespace-pre-line max-h-40 overflow-y-auto">
                    {generatedData.description}
                  </div>
                </div>

                {/* Key Features */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Key Features
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {generatedData.key_features.map((feature, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-700 bg-[#080D15] p-3 flex items-start gap-2"
                      >
                        <span className="text-lg">{feature.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-white">{feature.title}</div>
                          <div className="text-[10px] text-slate-400">{feature.subtitle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specifications */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Specifications
                  </label>
                  <div className="rounded-xl border border-slate-700 bg-[#080D15] overflow-hidden">
                    {generatedData.specifications.map((spec, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between px-3 py-2 text-xs ${
                          index !== generatedData.specifications.length - 1
                            ? 'border-b border-slate-800'
                            : ''
                        }`}
                      >
                        <span className="text-slate-400 font-medium">{spec.label}</span>
                        <span className="text-white font-semibold">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setGeneratedData(null)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Regenerate
                </button>
                <button
                  onClick={handleCreateDraft}
                  disabled={isCreating}
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 px-5 py-2 text-xs font-black text-slate-950 shadow-md transition hover:brightness-110 disabled:opacity-50"
                >
                  {isCreating ? 'Creating Draft...' : 'Create Product Draft'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
