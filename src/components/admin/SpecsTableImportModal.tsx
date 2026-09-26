'use client';

import React, { useState, useEffect } from 'react';
import type { Specification } from '@/types/database';

interface SpecsTableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (specs: Specification[], mode: 'replace' | 'append') => void;
  currentSpecsCount: number;
}

export function parseRawSpecsText(text: string): Specification[] {
  if (!text || !text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const results: Specification[] = [];

  // 1. Check if it's alternating lines (Line 1: Label, Line 2: Value)
  // Happens when copying some mobile websites (like GSMArena specs block without table format)
  const isAlternating =
    lines.length >= 4 &&
    lines.length % 2 === 0 &&
    !lines.some((l) => l.includes('\t') || l.includes(':') || l.includes(' - ') || l.includes('|'));

  if (isAlternating) {
    for (let i = 0; i < lines.length; i += 2) {
      const label = lines[i].trim();
      const value = lines[i + 1].trim();
      if (label && value) {
        results.push({ label, value });
      }
    }
    if (results.length > 0) return results;
  }

  // 2. Line by line parsing for tables, tabs, colons, dashes, pipes
  for (const line of lines) {
    // Markdown table or pipe: | Label | Value |
    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2 && !parts[0].includes('---') && !parts[0].toLowerCase().includes('specification')) {
        results.push({ label: parts[0], value: parts.slice(1).join(' - ') });
        continue;
      }
    }

    // Excel / Google Sheets / Browser copied tables (Tab-separated)
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        results.push({ label: parts[0], value: parts.slice(1).join(' ') });
        continue;
      }
    }

    // Colon separated: "Battery Capacity: 5000 mAh"
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < line.length - 1) {
      const label = line.slice(0, colonIdx).trim().replace(/^[-*•\d+.]\s*/, '');
      const value = line.slice(colonIdx + 1).trim();
      if (label && value) {
        results.push({ label, value });
        continue;
      }
    }

    // Dash separated: "Charging - 65W Fast Charge"
    const dashIdx = line.indexOf(' - ');
    if (dashIdx > 0 && dashIdx < line.length - 3) {
      const label = line.slice(0, dashIdx).trim().replace(/^[-*•\d+.]\s*/, '');
      const value = line.slice(dashIdx + 3).trim();
      if (label && value) {
        results.push({ label, value });
        continue;
      }
    }
  }

  return results;
}

export default function SpecsTableImportModal({
  isOpen,
  onClose,
  onApply,
  currentSpecsCount,
}: SpecsTableImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [parsedSpecs, setParsedSpecs] = useState<Specification[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Auto-parse on rawText change
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedSpecs([]);
      return;
    }
    const detected = parseRawSpecsText(rawText);
    setParsedSpecs(detected);
  }, [rawText]);

  if (!isOpen) return null;

  async function handleAiExtract() {
    if (!rawText.trim()) {
      setAiError('Please paste some text or specs description first.');
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch('/api/admin/ai/extract-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract specs');
      }

      if (data.specs && Array.isArray(data.specs) && data.specs.length > 0) {
        setParsedSpecs(data.specs);
      } else {
        setAiError('No specifications could be detected in this text. Try pasting structured text or table.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Error communicating with AI service');
    } finally {
      setIsAiLoading(false);
    }
  }

  function handleSpecChange(index: number, field: 'label' | 'value', value: string) {
    setParsedSpecs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function handleRemoveSpec(index: number) {
    setParsedSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddEmptyRow() {
    setParsedSpecs((prev) => [...prev, { label: '', value: '' }]);
  }

  function handleApply() {
    const valid = parsedSpecs.filter((s) => s.label.trim() || s.value.trim());
    if (valid.length === 0) {
      alert('Please provide or parse at least one specification.');
      return;
    }
    onApply(valid, importMode);
    onClose();
    setRawText('');
    setParsedSpecs([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-800 bg-[#0C1420] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-[#080D15]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C4CC]/10 text-[#00C4CC] font-bold">
              📋
            </div>
            <div>
              <h2 className="text-base font-bold text-silver-bright">
                Paste Specs Table / AI Specs Extractor
              </h2>
              <p className="text-xs text-silver-dim">
                Copy from Excel, GSMArena, Daraz, or supplier website & paste here
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-silver-dim hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Textarea Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-silver-dim">
                Paste Raw Text, Table, or Product Specs:
              </label>
              <button
                type="button"
                onClick={handleAiExtract}
                disabled={isAiLoading || !rawText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition"
              >
                {isAiLoading ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    AI Extracting...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>AI Format & Extract</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste anything here! Examples:&#10;• Bluetooth: 5.3&#10;• Battery Capacity: 5000 mAh&#10;• Playtime: 24 Hours&#10;• Or an Excel / Google Sheets table copied with Ctrl+C&#10;• Or raw description paragraph (then click 'AI Format')"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] p-3 text-xs sm:text-sm font-mono text-silver-bright placeholder:text-slate-600 focus:border-[#00C4CC] focus:outline-none"
            />
            {aiError && (
              <p className="mt-1 text-xs text-rose-400">{aiError}</p>
            )}
          </div>

          {/* Parsed Preview Section */}
          <div className="rounded-xl border border-slate-800 bg-[#080D15] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-silver-bright">
                  Parsed Specs Preview ({parsedSpecs.length} items detected)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddEmptyRow}
                className="text-xs font-bold text-[#00C4CC] hover:underline"
              >
                + Add Extra Row
              </button>
            </div>

            {parsedSpecs.length === 0 ? (
              <div className="py-6 text-center text-xs text-silver-dim/60 italic">
                No specifications detected yet. Paste text in the box above to see instant preview!
              </div>
            ) : (
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {parsedSpecs.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center text-[10px] font-mono text-silver-dim/60">
                      {idx + 1}
                    </span>
                    <input
                      value={spec.label}
                      onChange={(e) => handleSpecChange(idx, 'label', e.target.value)}
                      placeholder="Spec Name (e.g. Battery)"
                      className="w-1/3 rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-1.5 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                    <input
                      value={spec.value}
                      onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                      placeholder="Spec Value (e.g. 5000 mAh)"
                      className="flex-1 rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-1.5 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(idx)}
                      className="rounded-lg border border-slate-800 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Import Mode Selection */}
          {currentSpecsCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#080D15] p-3 text-xs">
              <span className="text-silver-dim">
                Form currently has <strong className="text-silver-bright">{currentSpecsCount}</strong> existing spec(s):
              </span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-silver-bright">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-[#00C4CC]"
                  />
                  <span>Replace existing</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-silver-bright">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="accent-[#00C4CC]"
                  />
                  <span>Add to existing</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-[#080D15]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-silver-bright hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={parsedSpecs.length === 0}
            className="rounded-xl bg-[#00C4CC] px-5 py-2 text-xs font-bold text-black hover:bg-[#00b0b8] transition disabled:opacity-50"
          >
            Apply {parsedSpecs.length} Specifications to Form
          </button>
        </div>
      </div>
    </div>
  );
}
