'use client';

import { useState, useEffect } from 'react';
import type { BackupRecord, BackupModule, RestoreType, RestorePreviewData } from '@/types/database';
import { ALL_BACKUP_MODULES, resolveModuleDependencies } from '@/lib/backup-restore-constants';

interface RestoreModalProps {
  backup: BackupRecord;
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete: () => void;
}

const MODULE_LABELS: Record<BackupModule, { title: string; desc: string }> = {
  categories: { title: 'Categories', desc: 'Product categories & taxonomy' },
  products: { title: 'Products', desc: 'Product catalog details & pricing' },
  product_images: { title: 'Product Images', desc: 'Image gallery mappings' },
  coupons: { title: 'Coupons', desc: 'Discount promo codes & limits' },
  coupon_usage: { title: 'Coupon Usage History', desc: 'Redemption audit history' },
  customers: { title: 'Customers & Profiles', desc: 'Registered user profiles' },
  orders: { title: 'Orders', desc: 'Customer order transactions' },
  order_items: { title: 'Order Items', desc: 'Line items within orders' },
  invoices: { title: 'Invoices', desc: 'Generated customer invoices' },
  invoice_items: { title: 'Invoice Line Items', desc: 'Itemized details within invoices' },
  settings: { title: 'Store Settings', desc: 'Branding, phone, email & config' },
};

export default function RestoreModal({
  backup,
  isOpen,
  onClose,
  onRestoreComplete,
}: RestoreModalProps) {
  const [step, setStep] = useState<'type' | 'modules' | 'confirm' | 'restoring' | 'result'>('type');
  const [restoreType, setRestoreType] = useState<RestoreType>('full');
  const [selectedModules, setSelectedModules] = useState<BackupModule[]>([...ALL_BACKUP_MODULES]);
  const [preview, setPreview] = useState<RestorePreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  const [confirmInput, setConfirmInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<any>(null);

  // Auto dependency check
  const { modulesToRestore, autoAddedDependencies } = resolveModuleDependencies(selectedModules);

  const requiredConfirmText = restoreType === 'full' ? 'RESTORE FULL BACKUP' : 'RESTORE SELECTED DATA';

  useEffect(() => {
    if (isOpen && backup?.id) {
      setStep('type');
      setRestoreType('full');
      setSelectedModules([...ALL_BACKUP_MODULES]);
      setConfirmInput('');
      setRestoreError(null);
      setRestoreResult(null);
      fetchPreviewData(backup.id);
    }
  }, [isOpen, backup?.id]);

  async function fetchPreviewData(id: string) {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await fetch(`/api/admin/backups/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch backup preview');
      setPreview(json.preview);
    } catch (err: any) {
      setPreviewError(err.message || 'Error loading preview');
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function toggleModule(mod: BackupModule) {
    if (selectedModules.includes(mod)) {
      setSelectedModules(selectedModules.filter((m) => m !== mod));
    } else {
      setSelectedModules([...selectedModules, mod]);
    }
  }

  async function handleStartRestore() {
    if (confirmInput.trim() !== requiredConfirmText) return;

    setStep('restoring');
    setIsExecuting(true);
    setRestoreError(null);

    try {
      const res = await fetch(`/api/admin/backups/${backup.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restoreType,
          selectedModules: restoreType === 'full' ? ALL_BACKUP_MODULES : modulesToRestore,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Restoration failed');
      }

      setRestoreResult(json);
      setStep('result');
      onRestoreComplete();
    } catch (err: any) {
      setRestoreError(err.message || 'Restoration encountered a critical error');
      setStep('confirm');
    } finally {
      setIsExecuting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-[#0C121D] p-6 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#00C4CC]">
              Database Restoration Wizard
            </span>
            <h3 className="text-lg font-bold text-white">
              Restore from Backup: <span className="text-cyan-400">{backup.backup_name}</span>
            </h3>
          </div>
          {step !== 'restoring' && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Loading Preview state */}
        {isLoadingPreview && (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00C4CC] border-r-transparent mb-3" />
            <p className="text-sm text-slate-400">Verifying backup snapshot integrity...</p>
          </div>
        )}

        {previewError && (
          <div className="my-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
            <strong className="block font-bold mb-1">Preview Failed</strong>
            {previewError}
          </div>
        )}

        {!isLoadingPreview && preview && (
          <div className="mt-4 space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className={`px-2.5 py-1 rounded-full ${step === 'type' ? 'bg-[#00C4CC] text-slate-950 font-bold' : 'bg-slate-800'}`}>
                1. Mode
              </span>
              <span>→</span>
              {restoreType === 'selective' && (
                <>
                  <span className={`px-2.5 py-1 rounded-full ${step === 'modules' ? 'bg-[#00C4CC] text-slate-950 font-bold' : 'bg-slate-800'}`}>
                    2. Select Modules
                  </span>
                  <span>→</span>
                </>
              )}
              <span className={`px-2.5 py-1 rounded-full ${step === 'confirm' ? 'bg-[#00C4CC] text-slate-950 font-bold' : 'bg-slate-800'}`}>
                {restoreType === 'selective' ? '3. Confirm' : '2. Confirm'}
              </span>
              <span>→</span>
              <span className={`px-2.5 py-1 rounded-full ${step === 'result' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800'}`}>
                Complete
              </span>
            </div>

            {/* STEP 1: Select Type */}
            {step === 'type' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Select how you wish to restore your database snapshot:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Restore Card */}
                  <div
                    onClick={() => setRestoreType('full')}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      restoreType === 'full'
                        ? 'border-[#00C4CC] bg-[#00C4CC]/10 shadow-[0_0_15px_rgba(0,196,204,0.15)]'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🔄</span>
                      <h4 className="font-bold text-white">Full Database Restore</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Wipes current live operational tables and restores all 11 modules to match this exact backup snapshot.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-cyan-400">
                      Total Records: {preview.totalRecords}
                    </div>
                  </div>

                  {/* Selective Restore Card */}
                  <div
                    onClick={() => setRestoreType('selective')}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      restoreType === 'selective'
                        ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🎯</span>
                      <h4 className="font-bold text-white">Selective Data Restore</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Pick specific modules (e.g. Products or Invoices) to restore without touching other operational data.
                    </p>
                    <div className="mt-3 text-xs font-semibold text-purple-400">
                      Custom Module Filter
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                      if (restoreType === 'selective') setStep('modules');
                      else setStep('confirm');
                    }}
                    className="rounded-xl bg-[#00C4CC] px-5 py-2.5 font-bold text-slate-950 hover:bg-[#00D8E0] transition"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Selective Module Selection */}
            {step === 'modules' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-300">
                    Select modules to restore. Required dependencies will automatically be included.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedModules([...ALL_BACKUP_MODULES])}
                      className="text-xs text-cyan-400 underline hover:text-white"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {ALL_BACKUP_MODULES.map((mod) => {
                    const isSelected = selectedModules.includes(mod);
                    const isAutoAdded = autoAddedDependencies.includes(mod);
                    const count = preview.moduleCounts[mod] || 0;

                    return (
                      <div
                        key={mod}
                        onClick={() => toggleModule(mod)}
                        className={`cursor-pointer rounded-lg border p-3 flex items-start gap-3 transition ${
                          isSelected
                            ? isAutoAdded
                              ? 'border-amber-500/50 bg-amber-500/10'
                              : 'border-[#00C4CC]/60 bg-[#00C4CC]/10'
                            : 'border-slate-800 bg-slate-900/40 opacity-70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent div onClick
                          className="mt-1 accent-[#00C4CC]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-white">
                              {MODULE_LABELS[mod]?.title || mod}
                            </span>
                            <span className="text-[10px] font-mono rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                              {count} rows
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {MODULE_LABELS[mod]?.desc}
                          </p>
                          {isAutoAdded && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-amber-400">
                              ⚠️ Auto-added dependency
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setStep('type')}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                  >
                    ← Back
                  </button>
                  <button
                    disabled={selectedModules.length === 0}
                    onClick={() => setStep('confirm')}
                    className="rounded-xl bg-[#00C4CC] px-5 py-2.5 font-bold text-slate-950 hover:bg-[#00D8E0] transition disabled:opacity-50"
                  >
                    Proceed to Confirmation →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Confirm & Type String */}
            {step === 'confirm' && (
              <div className="space-y-4">
                {/* Pre-restore safety backup badge */}
                <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <span>🛡️ Automatic Pre-Restore Safety Snapshot</span>
                  </div>
                  <p className="text-slate-300">
                    A safety snapshot <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-300">PRE-RESTORE-{new Date().toISOString().slice(0, 10)}</code> will automatically be taken prior to modifying live tables. If anything goes wrong, you can click <strong>Rollback</strong>.
                  </p>
                </div>

                {restoreError && (
                  <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400 text-xs font-medium">
                    ⚠️ {restoreError}
                  </div>
                )}

                {/* Modules Summary */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Modules to be restored:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(restoreType === 'full' ? ALL_BACKUP_MODULES : modulesToRestore).map((m) => (
                      <span
                        key={m}
                        className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1 text-[11px] text-cyan-300 font-medium"
                      >
                        {m} ({preview.moduleCounts[m] || 0})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Typed confirmation */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Type <strong className="text-red-400 select-all font-mono">{requiredConfirmText}</strong> to confirm execution:
                  </label>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={requiredConfirmText}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setStep(restoreType === 'selective' ? 'modules' : 'type')}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                  >
                    ← Back
                  </button>
                  <button
                    disabled={confirmInput.trim() !== requiredConfirmText || isExecuting}
                    onClick={handleStartRestore}
                    className="rounded-xl bg-gradient-to-r from-red-500 to-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-red-600 hover:to-amber-700 disabled:opacity-40"
                  >
                    Execute Restoration
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Restoring in progress */}
            {step === 'restoring' && (
              <div className="py-12 text-center space-y-4">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent mb-2" />
                <h4 className="text-base font-bold text-white">Restoring Database...</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Step 1: Creating safety backup... <br />
                  Step 2: Clearing live target tables... <br />
                  Step 3: Restoring snapshot records in strict dependency sequence...
                </p>
                <div className="w-full bg-slate-800 rounded-full h-2 max-w-md mx-auto overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full animate-pulse w-3/4" />
                </div>
              </div>
            )}

            {/* STEP 5: Result summary */}
            {step === 'result' && restoreResult && (
              <div className="space-y-4">
                <div className={`rounded-xl border p-4 text-xs ${
                  restoreResult.success
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}>
                  <h4 className="font-bold text-sm mb-1">
                    {restoreResult.success ? '🎉 Restoration Completed Successfully!' : '⚠️ Restoration Completed with Warnings'}
                  </h4>
                  <p>
                    Safety backup created: <strong className="font-mono text-white">{restoreResult.safetyBackup?.backup_name}</strong>
                  </p>
                </div>

                {/* Restored record breakdown */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <h5 className="text-xs font-bold text-slate-300 uppercase">
                    Restored Record Breakdown:
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(restoreResult.summary?.restoredCounts || {}).map(([mod, count]) => (
                      <div key={mod} className="flex justify-between border-b border-slate-800/80 py-1">
                        <span className="text-slate-400">{mod}:</span>
                        <span className="font-bold text-emerald-400">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    onClick={onClose}
                    className="rounded-xl bg-[#00C4CC] px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-[#00D8E0] transition"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
