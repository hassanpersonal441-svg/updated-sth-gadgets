'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { BackupRecord, RestoreHistoryRecord } from '@/types/database';
import RestoreModal from '@/components/admin/RestoreModal';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [restoreHistory, setRestoreHistory] = useState<RestoreHistoryRecord[]>([]);
  const [stats, setStats] = useState<{
    recordCounts: Record<string, number>;
    lastBackup: BackupRecord | null;
    lastRestore: RestoreHistoryRecord | null;
  }>({
    recordCounts: {},
    lastBackup: null,
    lastRestore: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [customBackupName, setCustomBackupName] = useState('');
  const [activeTab, setActiveTab] = useState<'backups' | 'history'>('backups');
  
  // Modals state
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupRecord | null>(null);
  const [previewModalBackup, setPreviewModalBackup] = useState<BackupRecord | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/backups');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch backup data');

      setBackups(json.backups || []);
      setRestoreHistory(json.restoreHistory || []);
      if (json.stats) {
        setStats(json.stats);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load backup dashboard data' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateBackup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsCreatingBackup(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customName: customBackupName }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create backup');

      setMessage({ type: 'success', text: `Backup snapshot "${json.backup.backup_name}" created successfully!` });
      setCustomBackupName('');
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Backup creation failed' });
    } finally {
      setIsCreatingBackup(false);
    }
  }

  function handleDeleteBackup(backup: BackupRecord) {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Backup',
      description: `Are you sure you want to permanently delete backup "${backup.backup_name}"? This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/backups/${backup.id}`, {
            method: 'DELETE',
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Failed to delete backup');

          setMessage({ type: 'success', text: 'Backup deleted successfully' });
          loadData();
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Deletion failed' });
        }
      },
    });
  }

  async function handleViewPreview(backup: BackupRecord) {
    setPreviewModalBackup(backup);
    setIsLoadingPreview(true);
    setPreviewData(null);
    try {
      const res = await fetch(`/api/admin/backups/${backup.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load preview');
      setPreviewData(json.preview);
    } catch (err: any) {
      alert(`Preview Error: ${err.message}`);
      setPreviewModalBackup(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function handleRollback(historyRow: RestoreHistoryRecord) {
    if (!historyRow.safety_backup_id) {
      alert('Cannot perform rollback: Safety backup missing for this restore entry.');
      return;
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Database Rollback Warning',
      description: `WARNING: This will roll back your entire database to the safety state recorded on ${new Date(historyRow.started_at).toLocaleString()}. Are you sure you want to proceed?`,
      confirmText: 'Execute Rollback',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        setIsRollingBack(historyRow.id);
        setMessage(null);

        try {
          const res = await fetch('/api/admin/backups/rollback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restoreHistoryId: historyRow.id }),
          });

          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Rollback failed');

          setMessage({
            type: 'success',
            text: 'Database successfully rolled back to safety point!',
          });
          loadData();
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Rollback operation failed' });
        } finally {
          setIsRollingBack(null);
        }
      },
    });
  }

  function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#00C4CC]">
              System Administration
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-black text-white">
            Backup & Database Restoration
          </h1>
          <p className="text-xs text-slate-400">
            Create automated JSON database snapshots, perform full/selective restores, and manage rollback points.
          </p>
        </div>

        {/* Quick Backup Trigger Form */}
        <form onSubmit={handleCreateBackup} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Custom Backup Name (Optional)"
            value={customBackupName}
            onChange={(e) => setCustomBackupName(e.target.value)}
            className="rounded-xl border border-slate-800 bg-[#0C121D] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isCreatingBackup}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 px-4 py-2 font-display text-xs font-bold text-slate-950 shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:brightness-110 disabled:opacity-50"
          >
            {isCreatingBackup ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-r-transparent" />
                Generating Snapshot...
              </>
            ) : (
              <>
                <span>⚡</span> Create Backup Now
              </>
            )}
          </button>
        </form>
      </div>

      {/* Alert banner */}
      {message && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Database Records Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C121D] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Live Database</span>
            <span className="text-lg">🗄️</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {Object.values(stats.recordCounts).reduce((a, b) => a + b, 0)} <span className="text-xs font-normal text-slate-400">records</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-400">
            <span>{stats.recordCounts.products || 0} Products</span> •{' '}
            <span>{stats.recordCounts.orders || 0} Orders</span> •{' '}
            <span>{stats.recordCounts.invoices || 0} Invoices</span>
          </div>
        </div>

        {/* Total Backups Snapshot Count */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C121D] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Saved Backups</span>
            <span className="text-lg">📦</span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#00C4CC]">
            {backups.length} <span className="text-xs font-normal text-slate-400">snapshots</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Total storage: {formatBytes(backups.reduce((acc, b) => acc + (b.file_size || 0), 0))}
          </div>
        </div>

        {/* Last Successful Backup */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C121D] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Last Backup</span>
            <span className="text-lg">🛡️</span>
          </div>
          <div className="mt-2 text-sm font-bold text-white truncate">
            {stats.lastBackup ? stats.lastBackup.backup_name : 'No Backups Yet'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {stats.lastBackup ? new Date(stats.lastBackup.created_at).toLocaleString() : 'N/A'}
          </div>
        </div>

        {/* Last Restore / Status */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C121D] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Last Restore</span>
            <span className="text-lg">🔄</span>
          </div>
          <div className="mt-2 text-sm font-bold text-white truncate">
            {stats.lastRestore ? `Restore #${stats.lastRestore.restore_number}` : 'None Recorded'}
          </div>
          <div className="mt-1 text-[11px]">
            {stats.lastRestore ? (
              <span className={`font-semibold capitalize ${
                stats.lastRestore.status === 'success' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                ● {stats.lastRestore.status} ({new Date(stats.lastRestore.started_at).toLocaleDateString()})
              </span>
            ) : (
              <span className="text-slate-500">System Healthy</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="flex border-b border-slate-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('backups')}
          className={`px-5 py-3 transition border-b-2 ${
            activeTab === 'backups'
              ? 'border-[#00C4CC] text-[#00C4CC]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📦 Backup History ({backups.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 transition border-b-2 ${
            activeTab === 'history'
              ? 'border-[#00C4CC] text-[#00C4CC]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📜 Restore Audit Logs ({restoreHistory.length})
        </button>
      </div>

      {/* TAB 1: Backup History Table */}
      {activeTab === 'backups' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0C121D] overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#00C4CC] border-r-transparent mb-2" />
              <p>Loading backup snapshots...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <p className="text-sm font-semibold">No Backup Snapshots Found</p>
              <p className="text-xs text-slate-500">
                Click "Create Backup Now" above to generate your first complete database snapshot.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Backup Name</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">File Size</th>
                    <th className="px-5 py-3.5">Created Date</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white font-mono text-sm">{b.backup_name}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-xs">
                          SHA256: {b.checksum?.slice(0, 16)}...
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            b.backup_type === 'safety_prerestore'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : b.backup_type === 'automated'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {b.backup_type === 'safety_prerestore' ? '🛡️ Safety Pre-Restore' : b.backup_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-slate-300">
                        {formatBytes(b.file_size)}
                      </td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Preview Action */}
                          <button
                            onClick={() => handleViewPreview(b)}
                            title="Preview Record Breakdown"
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
                          >
                            👁️ Preview
                          </button>

                          {/* Restore Action */}
                          <button
                            onClick={() => setSelectedBackupForRestore(b)}
                            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 font-bold text-slate-950 text-xs shadow-sm hover:brightness-110 transition"
                          >
                            🔄 Restore
                          </button>

                          {/* Download Action */}
                          <a
                            href={`/api/admin/backups/${b.id}?download=true`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
                            title="Download JSON Snapshot"
                          >
                            ⬇️ JSON
                          </a>

                          {/* Delete Action */}
                          <button
                            onClick={() => handleDeleteBackup(b)}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition"
                            title="Delete Backup"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Restore Audit Logs */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0C121D] overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#00C4CC] border-r-transparent mb-2" />
              <p>Loading restore history...</p>
            </div>
          ) : restoreHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm font-semibold">No Restorations Recorded Yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Restore Ref</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Backup Source</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Rollback Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {restoreHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-5 py-4 font-bold text-white font-mono">
                        #{h.restore_number}
                      </td>
                      <td className="px-5 py-4 capitalize font-semibold text-cyan-400">
                        {h.restore_type} Restore
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-300">
                        {h.backup ? h.backup.backup_name : h.backup_id ? h.backup_id.slice(0, 8) : 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(h.started_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            h.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : h.status === 'rolled_back'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {h.status === 'rolled_back' ? (
                          <span className="text-[11px] font-bold text-purple-400">
                            ✓ Rolled Back
                          </span>
                        ) : h.safety_backup_id ? (
                          <button
                            disabled={isRollingBack === h.id}
                            onClick={() => handleRollback(h)}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
                          >
                            {isRollingBack === h.id ? 'Rolling Back...' : '⏪ Rollback Database'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Breakdown Modal */}
      {previewModalBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0C121D] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                Backup Preview: <span className="text-cyan-400">{previewModalBackup.backup_name}</span>
              </h3>
              <button onClick={() => setPreviewModalBackup(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {isLoadingPreview ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Loading breakdown...
              </div>
            ) : previewData ? (
              <div className="space-y-3">
                <div className="text-xs text-slate-300">
                  Total Snapshot Records: <strong className="text-cyan-400">{previewData.totalRecords}</strong>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-1">
                  {Object.entries(previewData.moduleCounts || {}).map(([mod, count]) => (
                    <div key={mod} className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="text-slate-300 capitalize">{mod}</span>
                      <span className="font-mono font-bold text-white">{count as number} rows</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-400">Preview data unavailable.</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewModalBackup(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Wizard Modal */}
      {selectedBackupForRestore && (
        <RestoreModal
          backup={selectedBackupForRestore}
          isOpen={Boolean(selectedBackupForRestore)}
          onClose={() => setSelectedBackupForRestore(null)}
          onRestoreComplete={() => {
            loadData();
          }}
        />
      )}

      {/* Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        description={confirmModalConfig.description}
        confirmText={confirmModalConfig.confirmText}
      />
    </div>
  );
}
