import React, { useCallback, useEffect, useState } from "react";
import { api, EvaluationSummary, EvaluationTrial } from "@/lib/api";
import { FlaskConical, Plus, Trash2 } from "lucide-react";

const fmt = (v: number | null) => (v === null || v === undefined ? "—" : `${v.toFixed(1)} s`);

/**
 * Manual monitoring vs GlobalEye. Every number comes from a trial a person recorded after actually running it.
 * With no trials it says so; it never shows placeholder or projected improvements.
 */
export function ControlledTestPanel() {
  const [trials, setTrials] = useState<EvaluationTrial[]>([]);
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    arm: "manual" as "manual" | "globaleye",
    scenario: "",
    detection: "",
    ack: "",
    falseAlarms: "0",
    missed: false,
  });

  const load = useCallback(async () => {
    try {
      const r = await api.getEvaluation();
      setTrials(r.trials);
      setSummary(r.summary);
      setError(null);
    } catch (e: any) {
      setError(`Could not load trial data: ${e?.message || "backend unreachable"}`);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api.addEvaluationTrial({
        arm: form.arm,
        scenario: form.scenario.trim(),
        detection_seconds: form.missed ? null : num(form.detection),
        acknowledgement_seconds: form.missed ? null : num(form.ack),
        false_alarms: Math.max(0, Math.floor(Number(form.falseAlarms) || 0)),
        missed: form.missed,
      });
      setTrials(r.trials);
      setSummary(r.summary);
      setError(null);
      setForm({ ...form, detection: "", ack: "", falseAlarms: "0", missed: false });
    } catch (err: any) {
      setError(`NOT SAVED: ${err?.message || "backend unreachable"}`);
    }
  };

  const clear = async () => {
    if (!window.confirm("Delete all recorded trials?")) return;
    try {
      const r = await api.clearEvaluation();
      setTrials(r.trials);
      setSummary(r.summary);
    } catch (err: any) {
      setError(`NOT CLEARED: ${err?.message}`);
    }
  };

  const rows: { label: string; key: keyof EvaluationSummary["manual"]; f: (v: any) => string }[] = [
    { label: "Trials run (n)", key: "trials", f: (v) => String(v) },
    { label: "Median detection time", key: "median_detection_seconds", f: fmt },
    { label: "Median acknowledgement time", key: "median_acknowledgement_seconds", f: fmt },
    { label: "False alarms", key: "false_alarms", f: (v) => String(v) },
    { label: "Missed incidents", key: "missed_incidents", f: (v) => String(v) },
  ];

  const total = trials.length;

  return (
    <div id="controlled-test-panel" className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-teal-700" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Controlled Test: Manual Monitoring vs GlobalEye
          </h3>
        </div>
        {total > 0 && (
          <button onClick={clear} className="text-[11px] text-slate-500 hover:text-rose-700 inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Clear trials
          </button>
        )}
      </div>

      {error && <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800">{error}</div>}

      {total === 0 ? (
        <div className="p-4 rounded bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-600 space-y-1.5">
          <div className="font-semibold text-slate-800">No measurements recorded yet. Nothing is shown until you run the test.</div>
          <div>Protocol: play the same prepared clips to a person watching several feeds (manual arm), then to GlobalEye
            (GlobalEye arm). Record, per clip, seconds from event start to first notice/alert and to acknowledgement,
            plus any false alarms or missed incidents.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 font-semibold">Metric</th>
                <th className="py-2 font-semibold">Manual monitoring</th>
                <th className="py-2 font-semibold">GlobalEye</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{r.label}</td>
                  <td className="py-2 font-mono">{summary ? r.f(summary.manual[r.key]) : "—"}</td>
                  <td className="py-2 font-mono">{summary ? r.f(summary.globaleye[r.key]) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-500 mt-2">
            Computed only from {total} recorded trial{total === 1 ? "" : "s"}. Small samples are indicative, not statistically conclusive.
          </p>
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-slate-600 font-semibold">Arm</span>
          <select value={form.arm} onChange={(e) => setForm({ ...form, arm: e.target.value as any })}
            className="h-9 rounded border border-slate-300 px-2 bg-white">
            <option value="manual">Manual</option>
            <option value="globaleye">GlobalEye</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-slate-600 font-semibold">Clip / scenario</span>
          <input required minLength={2} value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })}
            placeholder="e.g. pedestrian fall, clip 1" className="h-9 rounded border border-slate-300 px-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-600 font-semibold">Detect (s)</span>
          <input type="number" min={0} step="0.1" disabled={form.missed} value={form.detection}
            onChange={(e) => setForm({ ...form, detection: e.target.value })} className="h-9 rounded border border-slate-300 px-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-600 font-semibold">Acknowledge (s)</span>
          <input type="number" min={0} step="0.1" disabled={form.missed} value={form.ack}
            onChange={(e) => setForm({ ...form, ack: e.target.value })} className="h-9 rounded border border-slate-300 px-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-600 font-semibold">False alarms</span>
          <input type="number" min={0} value={form.falseAlarms}
            onChange={(e) => setForm({ ...form, falseAlarms: e.target.value })} className="h-9 rounded border border-slate-300 px-2" />
        </label>
        <label className="flex items-center gap-2 col-span-2 md:col-span-3">
          <input type="checkbox" checked={form.missed} onChange={(e) => setForm({ ...form, missed: e.target.checked })} />
          <span className="text-slate-700">Incident was missed entirely</span>
        </label>
        <button type="submit" id="record-trial"
          className="col-span-2 md:col-span-3 h-9 rounded bg-teal-700 hover:bg-teal-800 text-white font-semibold inline-flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Record measured trial
        </button>
      </form>
    </div>
  );
}
