import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useAction, useAdmin, useApi } from '../hooks';
import { Card, ErrorState, PageHeader, Spinner, Switch } from '../ui';
import { EMPLOYMENT } from '../erp';

// ERP → Settings: working days, holidays, paid leave, claim approval limit and letter signatory

interface Settings {
  workingWeekdays: number[];
  holidays: Array<{ date: string; name: string }>;
  paidLeavePerMonth: Record<string, number>;
  missedCheckInUnpaid: boolean;
  claimApprovalLimit: number;
  signatoryName: string;
  signatoryTitle: string;
  companyAddress: string;
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ErpSettings() {
  const { data, error, reload } = useApi<{ data: Settings }>('/erp/settings');
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <div className="ad-empty"><Spinner size={20} /></div>;
  return <SettingsForm initial={data.data} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const { can } = useAdmin();
  const { busy, run } = useAction();
  const [form, setForm] = useState<Settings>(initial);
  const manage = can('hr.manage');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run('save', () => api<{ data: Settings }>('/erp/settings', { method: 'PUT', body: form }), 'Settings saved');
    if (ok) setForm(ok.data);
  };
  const toggleDay = (d: number) => setForm((f) => ({ ...f, workingWeekdays: f.workingWeekdays.includes(d) ? f.workingWeekdays.filter((x) => x !== d) : [...f.workingWeekdays, d].sort() }));

  return (
    <form onSubmit={save}>
      <PageHeader
        title="ERP settings"
        description="Used by payroll, letters and expenses."
        actions={manage && <button type="submit" className="ad-btn primary" disabled={busy === 'save'}>{busy === 'save' && <Spinner size={14} />} Save settings</button>}
      />
      <fieldset disabled={!manage} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}>
        <Card title="Working days" description="Payroll counts only these days. Same as CVMind Team check-ins: Monday to Saturday.">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {WEEKDAYS.map((w, i) => <label key={w} className="ad-check"><input type="checkbox" checked={form.workingWeekdays.includes(i)} onChange={() => toggleDay(i)} /> {w}</label>)}
          </div>
          <div style={{ marginTop: 16 }}>
            <Switch checked={form.missedCheckInUnpaid} onChange={(v) => setForm({ ...form, missedCheckInUnpaid: v })} label="A working day with no check-in and no leave is unpaid" />
          </div>
        </Card>

        <Card title="Company holidays" description="Not counted as working days.">
          {form.holidays.map((h, i) => (
            <div key={i} className="ad-form-row" style={{ marginBottom: 8, alignItems: 'flex-end' }}>
              <div className="ad-field"><label htmlFor={`hol-d-${i}`}>Date</label><input id={`hol-d-${i}`} type="date" className="ad-input" value={h.date} onChange={(e) => setForm({ ...form, holidays: form.holidays.map((x, j) => j === i ? { ...x, date: e.target.value } : x) })} required /></div>
              <div className="ad-field"><label htmlFor={`hol-n-${i}`}>Name</label><input id={`hol-n-${i}`} className="ad-input" value={h.name} onChange={(e) => setForm({ ...form, holidays: form.holidays.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} maxLength={60} placeholder="Diwali" /></div>
              <button type="button" className="ad-btn ghost" aria-label="Remove holiday" onClick={() => setForm({ ...form, holidays: form.holidays.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>
            </div>
          ))}
          <button type="button" className="ad-btn sm" onClick={() => setForm({ ...form, holidays: [...form.holidays, { date: '', name: '' }] })}><Plus size={13} /> Add holiday</button>
        </Card>

        <Card title="Paid leave a month" description="Casual and sick days that keep full pay. Leave beyond this is unpaid. WFH always counts as present.">
          <div className="ad-form-row">
            {EMPLOYMENT.map((t) => (
              <div key={t.value} className="ad-field">
                <label htmlFor={`pl-${t.value}`}>{t.label}</label>
                <input id={`pl-${t.value}`} type="number" min={0} max={31} step={0.5} className="ad-input" value={form.paidLeavePerMonth[t.value] ?? 0} onChange={(e) => setForm({ ...form, paidLeavePerMonth: { ...form.paidLeavePerMonth, [t.value]: Number(e.target.value) } })} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Expense claims" description="Claims above this also need leadership approval after the manager's.">
          <div className="ad-field" style={{ maxWidth: 260 }}><label htmlFor="claim-limit">Limit (₹)</label><input id="claim-limit" type="number" min={0} className="ad-input" value={form.claimApprovalLimit} onChange={(e) => setForm({ ...form, claimApprovalLimit: Number(e.target.value) })} /></div>
        </Card>

        <Card title="Letters and payslips" description="Printed on offer letters, certificates and payslips.">
          <div className="ad-form-row">
            <div className="ad-field"><label htmlFor="sig-name">Signatory name</label><input id="sig-name" className="ad-input" value={form.signatoryName} onChange={(e) => setForm({ ...form, signatoryName: e.target.value })} maxLength={80} /></div>
            <div className="ad-field"><label htmlFor="sig-title">Signatory title</label><input id="sig-title" className="ad-input" value={form.signatoryTitle} onChange={(e) => setForm({ ...form, signatoryTitle: e.target.value })} maxLength={80} placeholder="Founder & CEO" /></div>
          </div>
          <div className="ad-field" style={{ marginTop: 14 }}><label htmlFor="co-addr">Company address</label><input id="co-addr" className="ad-input" value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} maxLength={300} /></div>
        </Card>
      </fieldset>
    </form>
  );
}
