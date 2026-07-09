'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, Clock, CheckCircle2, XCircle, FileText, PenLine,
  Send, AlertCircle, Calendar, DollarSign, Briefcase, X, Check,
  Loader2, Shield, Building2, User, ChevronRight, Eye, Lock,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useLanguage } from "../../../lib/i18n";

const STATUS_CFG = {
  draft:     { labelKey: 'contracts.status.draft',     bg: 'bg-gray-100 dark:bg-gray-800',     text: 'text-gray-600 dark:text-gray-400',     border: 'border-gray-200 dark:border-gray-700',     icon: FileText },
  sent:      { labelKey: 'contracts.status.sent',      bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600 dark:text-blue-400',     border: 'border-blue-200 dark:border-blue-500/20', icon: Send },
  viewed:    { labelKey: 'contracts.status.viewed',    bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-500/20', icon: Eye },
  signed:    { labelKey: 'contracts.status.signed',    bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle2 },
  completed: { labelKey: 'contracts.status.completed', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle2 },
  expired:   { labelKey: 'contracts.status.expired',   bg: 'bg-red-50 dark:bg-red-900/20',    text: 'text-red-600 dark:text-red-400',       border: 'border-red-200 dark:border-red-500/20',   icon: XCircle },
  cancelled: { labelKey: 'contracts.status.cancelled', bg: 'bg-red-50 dark:bg-red-900/20',    text: 'text-red-600 dark:text-red-400',       border: 'border-red-200 dark:border-red-500/20',   icon: XCircle },
};

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} /> {t(cfg.labelKey)}
    </span>
  );
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMoney(amount, currency = 'USD') {
  if (!amount) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

/* ── Full-page contract document modal ─────────────────────────────────────── */
function ContractModal({ contract, onClose, onSigned }) {
  const { t } = useLanguage();
  const [signing, setSigning] = useState(false);
  const [sigName, setSigName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSign = ['sent', 'viewed'].includes(contract.status);

  const handleSign = async () => {
    if (!sigName.trim()) { setError(t('contracts.err_type_name')); return; }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('contracts')
        .update({
          status: 'signed',
          user_signature: sigName.trim(),
          signed_at: new Date().toISOString(),
          terms_accepted: true,
        })
        .eq('id', contract.id);
      if (err) throw err;

      // Notify admin
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_admin', true)
          .limit(5);
        if (admins?.length) {
          await supabase.from('notifications').insert(
            admins.map(a => ({
              receiver_id: a.id,
              actor_id: session.user.id,
              type: 'message',
              content: `signed the contract: "${contract.title}"`,
            }))
          );
        }
      }

      onSigned({ ...contract, status: 'signed', user_signature: sigName.trim(), signed_at: new Date().toISOString() });
    } catch (e) {
      setError(e.message || t('contracts.err_sign_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-950 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
              <ScrollText size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{t('contracts.work_contract')}</p>
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-tight">{contract.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Document body */}
        <div className="p-6 space-y-6">

          {/* Status + meta row */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={contract.status} />
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{t('contracts.issued', { date: fmt(contract.created_at) })}</span>
            {contract.contract_type && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-2 py-0.5 rounded-full">
                {contract.contract_type}
              </span>
            )}
          </div>

          {/* Period + Payment summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Calendar size={10} /> {t('contracts.contract_period')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(contract.start_date)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{t('contracts.to', { date: fmt(contract.end_date) })}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><DollarSign size={10} /> {t('contracts.total_value')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtMoney(contract.payment_amount, contract.payment_currency)}</p>
              {contract.payment_currency && <p className="text-[10px] text-gray-400 mt-0.5">{contract.payment_currency}</p>}
            </div>
          </div>

          {/* Work description */}
          {contract.work_description && (
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Briefcase size={10} /> {t('contracts.scope_of_work')}</h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{contract.work_description}</p>
              </div>
            </div>
          )}

          {/* Deliverables */}
          {contract.deliverables && (
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Check size={10} /> {t('contracts.deliverables')}</h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{contract.deliverables}</p>
              </div>
            </div>
          )}

          {/* Payment terms */}
          {(contract.payment_terms || contract.payment_schedule) && (
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><DollarSign size={10} /> {t('contracts.payment_terms')}</h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-2">
                {contract.payment_terms && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{contract.payment_terms}</p>}
                {contract.payment_schedule && <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{contract.payment_schedule}</p>}
              </div>
            </div>
          )}

          {/* ── Signature Block ── */}
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><PenLine size={10} /> {t('contracts.signatures')}</h3>
            <div className="grid grid-cols-2 gap-4">

              {/* beoneofus signature */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={13} className="text-blue-500 shrink-0" />
                  <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{t('contracts.platform')}</p>
                </div>
                <p className="font-black text-2xl text-blue-600 dark:text-blue-400 tracking-tight mb-2" style={{ fontFamily: 'cursive' }}>
                  beoneofus
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{contract.admin_signature || 'beoneofus'}</p>
                <div className="mt-2 flex items-center gap-1">
                  <Shield size={10} className="text-emerald-500" />
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{t('contracts.verified_signed')}</p>
                </div>
              </div>

              {/* User signature */}
              <div className={`border rounded-2xl p-4 ${contract.user_signature ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/20' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <User size={13} className={contract.user_signature ? 'text-emerald-500' : 'text-gray-400'} />
                  <p className={`text-[9px] font-black uppercase tracking-widest ${contract.user_signature ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>{t('contracts.your_signature')}</p>
                </div>
                {contract.user_signature ? (
                  <>
                    <p className="font-black text-2xl text-emerald-600 dark:text-emerald-400 tracking-tight mb-2" style={{ fontFamily: 'cursive' }}>
                      {contract.user_signature}
                    </p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400">{fmt(contract.signed_at)}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-emerald-500" />
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{t('contracts.signed')}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col h-full justify-center">
                    <div className="flex items-center gap-1 mt-1">
                      <Lock size={10} className="text-gray-300 dark:text-gray-600" />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">{t('contracts.awaiting_signature')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms note */}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed text-center">
            {t('contracts.terms_note')}
          </p>

          {/* Sign action */}
          {canSign && !signing && (
            <button
              onClick={() => setSigning(true)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm"
            >
              <PenLine size={15} /> {t('contracts.sign_this_contract')}
            </button>
          )}

          {canSign && signing && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">{t('contracts.type_legal_name')}</p>
              <input
                type="text"
                placeholder={t('contracts.name_placeholder')}
                value={sigName}
                onChange={e => { setSigName(e.target.value); setError(''); }}
                className="w-full bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-500/30 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {error && <p className="text-[11px] text-red-500 font-bold">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setSigning(false); setSigName(''); setError(''); }}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm">
                  {t('contracts.cancel')}
                </button>
                <button onClick={handleSign} disabled={loading || !sigName.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {loading ? t('contracts.signing') : t('contracts.confirm_signature')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────────── */
function Empty() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-4">
        <ScrollText size={28} className="text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-base font-black text-gray-700 dark:text-gray-300 mb-1">{t('contracts.empty_title')}</h3>
      <p className="text-[12px] text-gray-400 dark:text-gray-500 max-w-xs">
        {t('contracts.empty_body')}
      </p>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────────── */
export default function ContractsContent() {
  const { t } = useLanguage();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selected, setSelected] = useState(null);
  const [userId, setUserId] = useState(null);

  const load = useCallback(async (uid) => {
    setFetchError('');
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('user_id', uid)
      .neq('status', 'draft')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('contracts fetch error:', error);
      setFetchError(error.message || 'Failed to load contracts.');
    } else {
      setContracts(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);
      load(session.user.id);
    });
  }, [load]);

  const openContract = async (c) => {
    setSelected(c);
    if (c.status === 'sent') {
      await supabase.from('contracts').update({ status: 'viewed' }).eq('id', c.id).eq('user_id', userId);
      setContracts(prev => prev.map(x => x.id === c.id ? { ...x, status: 'viewed' } : x));
    }
  };

  const handleSigned = (updated) => {
    setContracts(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelected(updated);
  };

  const pendingCount = contracts.filter(c => ['sent', 'viewed'].includes(c.status)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">{t('contracts.load_error_title')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{fetchError}</p>
        </div>
        <button
          onClick={() => userId && load(userId)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all"
        >
          {t('contracts.try_again')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('contracts.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('contracts.subtitle')}
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-xl">
            <AlertCircle size={13} />
            <span className="text-[11px] font-black">{t(pendingCount === 1 ? 'contracts.needs_signature_one' : 'contracts.needs_signature_many', { n: pendingCount })}</span>
          </div>
        )}
      </div>

      {/* List */}
      {contracts.length === 0 ? <Empty /> : (
        <div className="space-y-3">
          {contracts.map(c => {
            const cfg = STATUS_CFG[c.status] || STATUS_CFG.draft;
            const needsAction = ['sent', 'viewed'].includes(c.status);
            return (
              <button
                key={c.id}
                onClick={() => openContract(c)}
                className={`w-full text-left bg-white dark:bg-gray-900 border rounded-2xl p-5 hover:shadow-md transition-all group ${needsAction ? 'border-blue-200 dark:border-blue-500/30' : 'border-gray-200 dark:border-gray-800'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.text}`}>
                      <ScrollText size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white truncate">{c.title}</h3>
                        {needsAction && <span className="text-[8px] font-black uppercase tracking-widest bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0">{t('contracts.action_needed')}</span>}
                      </div>
                      {c.contract_type && (
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">{c.contract_type}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <StatusBadge status={c.status} />
                        {c.payment_amount && (
                          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                            <DollarSign size={10} />{fmtMoney(c.payment_amount, c.payment_currency)}
                          </span>
                        )}
                        {c.end_date && (
                          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                            <Calendar size={10} />{t('contracts.due', { date: fmt(c.end_date) })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors mt-2 shrink-0" />
                </div>

                {c.work_description && (
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-3 line-clamp-2 leading-relaxed">
                    {c.work_description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Contract detail modal */}
      {selected && (
        <ContractModal
          contract={selected}
          onClose={() => setSelected(null)}
          onSigned={handleSigned}
        />
      )}
    </div>
  );
}
