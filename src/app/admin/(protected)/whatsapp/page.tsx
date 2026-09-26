'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { WHATSAPP_VARIABLES } from '@/lib/whatsapp-templates';

type Template = {
  id: string;
  template_key: string;
  title: string;
  group_name: string;
  audience: string;
  body: string;
  default_body: string;
  variables: string[];
  updated_at: string;
};

type HistoryEntry = {
  id: string;
  customer_name: string | null;
  order_number: string | null;
  message_type: string;
  status: string;
  created_at: string;
};

const GROUPS = ['Order Workflow', 'Purchase / Fulfillment', 'Delivery', 'Customer Communication'];
const GROUP_STYLES: Record<string, { border: string; text: string; soft: string; glow: string }> = {
  'Order Workflow': { border: 'border-cyan-500/30', text: 'text-[#00C4CC]', soft: 'bg-cyan-500/10', glow: 'from-cyan-500/20' },
  'Purchase / Fulfillment': { border: 'border-amber-500/30', text: 'text-amber-300', soft: 'bg-amber-500/10', glow: 'from-amber-500/20' },
  Delivery: { border: 'border-blue-500/30', text: 'text-blue-300', soft: 'bg-blue-500/10', glow: 'from-blue-500/20' },
  'Customer Communication': { border: 'border-emerald-500/30', text: 'text-emerald-300', soft: 'bg-emerald-500/10', glow: 'from-emerald-500/20' },
};

export default function WhatsAppCenterPage() {
  const { success, error: showErrorToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [templateRes, historyRes] = await Promise.all([
        fetch('/api/admin/whatsapp'),
        fetch('/api/admin/whatsapp?mode=history'),
      ]);
      const templateData = await templateRes.json();
      const historyData = await historyRes.json();
      if (!templateRes.ok) throw new Error(templateData.error || 'Failed to load templates');
      setTemplates(templateData.templates || []);
      setHistory(historyData.history || []);
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to load WhatsApp Center');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openEditor(template: Template) {
    setEditing(template);
    setDraft(template.body);
  }

  function insertVariable(variable: string) {
    setDraft((current) => `${current}${current && !current.endsWith(' ') ? ' ' : ''}{{${variable}}}`);
  }

  async function saveTemplate(reset = false) {
    if (!editing) return;
    if (reset && !window.confirm('Reset this message to the default English template?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_key: editing.template_key, body: reset ? editing.default_body : draft, reset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save template');
      setTemplates((current) => current.map((template) => template.template_key === editing.template_key ? data.template : template));
      setEditing(null);
      success(reset ? 'Template reset to default.' : 'WhatsApp template saved.');
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 text-[#C9D2DB]">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0C1420] p-5 shadow-xl sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-transparent to-emerald-500/10 opacity-70" />
        <div className="relative">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00C4CC]">STH Gadgets messaging</span>
            <h1 className="mt-1 font-display text-2xl font-black text-white sm:text-3xl">WhatsApp Center</h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">Manage the professional English messages used across orders and delivery updates.</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-300">Active templates</span>
            <strong className="font-mono text-xl text-white">{templates.length}</strong>
          </div>
        </div>
        </div>
      </div>

      {loading ? <div className="rounded-2xl border border-slate-800 bg-[#0C1420] py-16 text-center text-sm text-slate-400">Loading WhatsApp templates...</div> : (
        <div className="space-y-7">
          {GROUPS.map((group) => {
            const groupTemplates = templates.filter((template) => template.group_name === group);
            const style = GROUP_STYLES[group];
            return <section key={group}>
              <div className="mb-3 flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${style.soft} border ${style.border}`} /><h2 className={`font-display text-sm font-black uppercase tracking-wider ${style.text}`}>{group}</h2><span className="h-px flex-1 bg-slate-800" /></div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {groupTemplates.map((template) => <article key={template.template_key} className={`relative overflow-hidden rounded-2xl border ${style.border} bg-[#0C1420] p-4 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.glow} to-transparent opacity-30`} /><div className="relative"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-white">{template.title}</h3><span className={`mt-1 inline-block rounded-full border ${style.border} ${style.soft} px-2 py-0.5 text-[10px] font-bold ${style.text}`}>{template.audience === 'customer' ? 'Customer notification' : 'Internal workflow'}</span></div><button onClick={() => openEditor(template)} className="shrink-0 rounded-xl border border-orange-400/60 bg-orange-400/10 px-3 py-2 text-xs font-bold text-orange-300 transition hover:border-orange-300 hover:bg-orange-400/20 hover:text-orange-200">Edit Message</button></div>
                  <pre className="mt-4 max-h-36 overflow-hidden whitespace-pre-wrap rounded-xl border border-slate-800 bg-[#080D15] p-3 font-sans text-xs leading-5 text-slate-300">{template.body}</pre>
                  <p className="mt-2 text-[10px] text-slate-500">Last updated: {new Date(template.updated_at).toLocaleString('en-PK')}</p>
                  </div></article>)}
              </div>
            </section>;
          })}
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 shadow-lg sm:p-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-display text-sm font-black uppercase tracking-wider text-white">Message History</h2><p className="mt-1 text-[11px] text-slate-500">Manual WhatsApp sends from order workflows.</p></div><button onClick={load} className="text-xs font-bold text-[#36C5FF] hover:underline">Refresh</button></div>
        {history.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">No messages sent yet.</p> : <div className="divide-y divide-slate-800">{history.slice(0, 10).map((entry) => <div key={entry.id} className="flex flex-col gap-1 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-white">{entry.customer_name || 'Customer'}</strong><span className="ml-2 font-mono text-[#36C5FF]">{entry.order_number || 'Pending order'}</span><span className="ml-2 text-slate-400">{entry.message_type}</span></div><div className="flex items-center gap-2 text-[10px] text-slate-500"><span>{new Date(entry.created_at).toLocaleString('en-PK')}</span><span className={entry.status === 'sent' ? 'text-emerald-400' : 'text-amber-400'}>✓ {entry.status}</span></div></div>)}</div>}
      </section>

      {editing && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"><div className="fixed inset-0" onClick={() => setEditing(null)} /><div className="relative z-10 w-full max-w-2xl rounded-2xl border border-[#00C4CC]/40 bg-[#0C1420] p-5 text-[#C9D2DB] shadow-2xl sm:p-6"><div className="flex items-start justify-between border-b border-slate-800 pb-4"><div><span className="text-[10px] font-bold uppercase tracking-wider text-[#36C5FF]">Edit WhatsApp Message</span><h2 className="mt-1 text-lg font-black text-white">{editing.title}</h2></div><button onClick={() => setEditing(null)} className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white">✕</button></div><div className="mt-4"><p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Variables</p><div className="mb-3 flex flex-wrap gap-1.5">{(editing.variables || WHATSAPP_VARIABLES).map((variable) => <button key={variable} onClick={() => insertVariable(variable)} className="rounded-lg border border-[#00C4CC]/30 bg-[#00C4CC]/10 px-2 py-1 font-mono text-[10px] text-[#36C5FF] hover:bg-[#00C4CC]/20">{'{{'}{variable}{'}}'}</button>)}</div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={13} className="w-full resize-y rounded-xl border border-slate-700 bg-[#080D15] p-3 font-mono text-xs leading-5 text-white focus:border-[#00C4CC] focus:outline-none" /></div><div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-800 pt-4"><button onClick={() => saveTemplate(true)} disabled={saving} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20">Reset to Default</button><div className="flex gap-2"><button onClick={() => setEditing(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white">Cancel</button><button onClick={() => saveTemplate(false)} disabled={saving} className="rounded-xl bg-[#00C4CC] px-4 py-2 text-xs font-black text-slate-950 hover:brightness-110">{saving ? 'Saving...' : 'Save Changes'}</button></div></div></div></div>}
    </div>
  );
}
