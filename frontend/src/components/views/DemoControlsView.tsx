import React, { useState } from "react";
import { ScoringConfigData } from "@/types";
import { NavView } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Layers,
  Info,
  Server,
  Zap,
  Download,
  Eye,
  Compass,
  Video,
  ExternalLink,
  Flame,
  UserCheck,
  Clock,
  ArrowRight,
} from "lucide-react";
import { GlobalEyeLogo, GlobalEyeSymbol } from "@/components/brand/GlobalEyeLogo";

interface DemoControlsViewProps {
  scoringConfig: ScoringConfigData | null;
  onTriggerScenario: (
    scenario: "simultaneous" | "escalate" | "human_intervention" | "false_positive" | "low_confidence_fire"
  ) => Promise<void>;
  onResetDemo: () => Promise<void>;
  isStreamConnected: boolean;
  onNavigateToView?: (view: NavView) => void;
  onSelectIncident?: (id: string) => void;
  topIncidentId?: string | null;
}

export function DemoControlsView({
  scoringConfig,
  onTriggerScenario,
  onResetDemo,
  isStreamConnected,
  onNavigateToView,
  onSelectIncident,
  topIncidentId,
}: DemoControlsViewProps) {
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [scenarioMessage, setScenarioMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleRun = async (
    scenario: "simultaneous" | "escalate" | "human_intervention" | "false_positive" | "low_confidence_fire"
  ) => {
    setRunningScenario(scenario);
    setScenarioMessage(null);
    try {
      await onTriggerScenario(scenario);
      const labels: Record<string, string> = {
        simultaneous: "Scenario 1: Multi-Sector Concurrency (3 simultaneous township incidents)",
        escalate: "Scenario 2: Dynamic Telemetry Escalation (Person motionless >90s, promoted to Rank #1)",
        human_intervention: "Scenario 5: Operator Triage & Lifecycle Handling (Acknowledge → Assign → Record → Resolve)",
        false_positive: "Scenario 5b: False Positive Audit Trail (Mandatory operator rationale recorded)",
        low_confidence_fire: "Scenario 6: Safety Invariance (Low-confidence fire flags verification without down-ranking)",
      };
      setScenarioMessage(`${labels[scenario] || scenario} executed successfully. Active incident queue updated.`);
    } catch (err: any) {
      setScenarioMessage(`Error: ${err.message}`);
    } finally {
      setRunningScenario(null);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setScenarioMessage(null);
    try {
      await onResetDemo();
      setScenarioMessage("System reset complete. Simulated test records cleared; baseline state restored.");
    } catch (err: any) {
      setScenarioMessage(`Error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Connection Status */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Hackathon Demonstration Control Center • Version 2.0
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
              Unified AI & Governance Suite
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Execute deterministic live scenarios to showcase multi-sector concurrency, dynamic telemetry escalation, live Gemini 3.5 Flash Lite multimodal AI triage, in-modal forensic CCTV playback, and shift handover governance.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-50 border border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isStreamConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="font-medium text-slate-700">
              {isStreamConnected ? "SSE Queue Stream Active" : "Polling Mode Active"}
            </span>
          </div>

          <Button
            size="sm"
            variant="danger"
            onClick={handleReset}
            loading={isResetting}
            className="text-xs h-8"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Baseline State
          </Button>
        </div>
      </div>

      {scenarioMessage && (
        <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="font-medium">{scenarioMessage}</span>
          </div>
          <button
            onClick={() => setScenarioMessage(null)}
            className="text-teal-700 hover:text-teal-900 font-bold ml-4 cursor-pointer text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Version 2.0 Live Evaluation Sequence Strip */}
      <div className="bg-slate-900 text-white rounded-lg p-4 border border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Recommended 90-Second Presentation Flow
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Sime Darby Property Judges Evaluation Order
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-teal-400 font-bold">ACT 1 (0:20)</span>
            <span className="font-semibold text-white mt-1">1. Concurrency</span>
            <span className="text-[10px] text-slate-400 mt-0.5">3 Sector Events</span>
          </div>
          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-amber-400 font-bold">ACT 2 (0:45)</span>
            <span className="font-semibold text-white mt-1">2. Escalation</span>
            <span className="text-[10px] text-slate-400 mt-0.5">SSE Live Re-rank</span>
          </div>
          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-cyan-400 font-bold">ACT 3 (1:05)</span>
            <span className="font-semibold text-white mt-1">3. Gemini Vision</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Flash Lite 3.5 AI</span>
          </div>
          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-emerald-400 font-bold">ACT 4 (1:25)</span>
            <span className="font-semibold text-white mt-1">4. CCTV Player</span>
            <span className="text-[10px] text-slate-400 mt-0.5">24.0s Fast Seek</span>
          </div>
          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-blue-400 font-bold">ACT 5 (1:45)</span>
            <span className="font-semibold text-white mt-1">5. Governance</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Handover & CSV</span>
          </div>
          <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-rose-400 font-bold">ACT 6 (2:00)</span>
            <span className="font-semibold text-white mt-1">6. Safety Invariant</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Fire Resilience</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Scenarios Grid (Version 2.0 - 6 Pillars) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Scenario 1: Multi-Sector Concurrency */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-teal-700 uppercase tracking-wider">
                Scenario 1
              </span>
              <Badge variant="simulated">Spec §15.A</Badge>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Multi-Sector Concurrency (The Morning Rush)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ingests 3 simultaneous incidents across City of Elmina sectors at the exact same second:
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li><strong>CAM-GATE-01:</strong> 2-Vehicle Collision (Roundabout entry) &rarr; Ranked #1 (High)</li>
              <li><strong>CAM-PROM-02:</strong> Person Down (Lakeside path) &rarr; Ranked #2 (Medium)</li>
              <li><strong>CAM-MALL-01:</strong> Delivery Van Obstruction &rarr; Ranked #3 (Low)</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Proves mathematical relative urgency outranks timestamp order. Life and transit hazards take priority.
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => handleRun("simultaneous")}
            loading={runningScenario === "simultaneous"}
            className="w-full mt-3 bg-teal-700 hover:bg-teal-800"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
            Trigger Scenario 1 (Concurrency)
          </Button>
        </div>

        {/* Scenario 2: Dynamic Telemetry Escalation */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-amber-700 uppercase tracking-wider">
                Scenario 2
              </span>
              <Badge variant="simulated">Spec §15.B</Badge>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Dynamic Telemetry Escalation (Life-Safety Floor)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Updates camera telemetry on Lakeside Promenade incident (<code className="font-mono text-teal-800 font-semibold">CAM-PROM-02</code>):
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>Subject verified motionless &gt; 90 seconds</li>
              <li>Location flagged hazardous (adjacent deep water)</li>
              <li>Rule <code className="font-mono text-[11px]">R-FALL-PERSISTENT</code> triggers emergency floor (85.0+)</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Priority score leaps above collision. Live Server-Sent Events (SSE) immediately promote incident to Rank #1 without page refresh.
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => handleRun("escalate")}
            loading={runningScenario === "escalate"}
            className="w-full mt-3 bg-amber-700 hover:bg-amber-800"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
            Trigger Scenario 2 (Escalate to #1)
          </Button>
        </div>

        {/* Scenario 3: Real Gemini Multimodal AI Vision */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-cyan-700 uppercase tracking-wider">
                Scenario 3
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                Gemini 3.5 Flash Lite
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Gemini Multimodal AI Vision & Auto-Triage
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Processes real CCTV video footage through the Google Gemini multimodal vision pipeline:
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>Automated keyframe extraction & video reasoning</li>
              <li>Detects vehicle impact / pedestrian fall automatically</li>
              <li>Auto-promotes structured incident directly to Active Queue</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Run real video files or load the embedded 1-Click CCTV sample clip in the Video Analysis lab.
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigateToView && onNavigateToView("video")}
            className="w-full mt-3 bg-cyan-700 hover:bg-cyan-800"
          >
            <Video className="w-3.5 h-3.5 mr-1.5" />
            Launch Gemini CCTV Lab &rarr;
          </Button>
        </div>

        {/* Scenario 4: In-Modal CCTV Video Player & 24.0s Seek */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                Scenario 4
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Forensic Playback
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              In-Modal CCTV Video & 1-Click Forensic Seek
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Open the Incident Detail Inspector to audit the actual surveillance footage clip:
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>Native HTML5 video player with byte-range streaming</li>
              <li>Dual-mode toggle: Raw CCTV Video vs. AI Keyframes HUD</li>
              <li><strong>1-Click "Jump to Detection Point (24.0s)"</strong> seeks directly to impact</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Empowers human operators to forensically verify AI detections in under 3 seconds.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={!topIncidentId}
            onClick={() => topIncidentId && onSelectIncident && onSelectIncident(topIncidentId)}
            className="w-full mt-3 text-emerald-800 border-emerald-300 hover:bg-emerald-50"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-emerald-700 text-emerald-700" />
            {topIncidentId ? "Inspect Top Incident Video" : "Trigger Scenario 1 First"}
          </Button>
        </div>

        {/* Scenario 5: Operator Triage & Shift Handover */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-wider">
                Scenario 5
              </span>
              <Badge variant="simulated">Spec §15.C</Badge>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Operator Response, Override & Shift Handover
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Demonstrates end-to-end human-in-the-loop governance:
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>Acknowledge alert & assign dedicated First-Aid responder</li>
              <li>Priority manual override with mandatory operator rationale</li>
              <li>Shift handover governance: "Clear History" + CSV audit export</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Every status transition, assignment, and override is permanently audited in SQLite.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleRun("human_intervention")}
              loading={runningScenario === "human_intervention"}
              className="bg-blue-700 hover:bg-blue-800 text-[11px]"
            >
              <UserCheck className="w-3 h-3 mr-1" />
              Run Response Flow
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRun("false_positive")}
              loading={runningScenario === "false_positive"}
              className="text-purple-800 border-purple-300 hover:bg-purple-50 text-[11px]"
            >
              False Positive Test
            </Button>
          </div>
        </div>

        {/* Scenario 6: Safety Invariance (Low-Confidence Fire) */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-rose-700 uppercase tracking-wider">
                Scenario 6
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                Safety Invariant
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Safety Invariance & Uncertainty Handling
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Simulates a low-confidence smoke detection near residential blocks (<code className="font-mono text-rose-800 font-semibold">CAM-RESA-02</code>, conf: 0.41):
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>Optical/thermal anomaly might be steam, dust or fire</li>
              <li>Low confidence sets <code className="font-mono text-[11px]">needs_verification = True</code></li>
              <li><strong>Zero Suppression:</strong> Priority remains High/Critical to protect residents</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Proves safety invariance: AI uncertainty never delays life-safety response.
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => handleRun("low_confidence_fire")}
            loading={runningScenario === "low_confidence_fire"}
            className="w-full mt-3 bg-rose-700 hover:bg-rose-800"
          >
            <Flame className="w-3.5 h-3.5 mr-1.5" />
            Trigger Scenario 6 (Low-Conf Fire)
          </Button>
        </div>
      </div>

      {/* 4. Prioritization Math Engine & Configuration Inspector */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Dynamic Prioritization Formula & Weights (Spec §7)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Configurable Weights</span>
        </div>

        {/* Mathematical Formula Box */}
        <div className="p-4 rounded-md bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed space-y-2">
          <div className="text-teal-400 font-bold">
            Composite Priority Score Formula:
          </div>
          <div className="text-slate-300">
            priority_score = (0.40 × Severity) + (0.25 × Immediacy) + (0.20 × People at Risk) + (0.15 × Secondary Hazard)
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span>Hysteresis Threshold: Δ ≥ 2.0 points required for rank reassignment (prevents queue bouncing)</span>
            <span className="text-amber-400">Emergency Override Floor: score ≥ 85.0 on confirmed life risk</span>
          </div>
        </div>

        {/* 4 Weights Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[11px] block">Severity Weight</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">40%</span>
            <span className="text-[10px] text-slate-400">Base event hazard severity</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[11px] block">Immediacy Weight</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">25%</span>
            <span className="text-[10px] text-slate-400">Time-sensitive progression</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[11px] block">People at Risk</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">20%</span>
            <span className="text-[10px] text-slate-400">Vulnerable population count</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 text-[11px] block">Secondary Hazard</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">15%</span>
            <span className="text-[10px] text-slate-400">Environmental / spread risk</span>
          </div>
        </div>
      </div>

      {/* 5. GlobalEye Brand Identity & Logo System Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-teal-700" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                GlobalEye Official Brand Identity & Logo System
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Engineered vector identity communicating <strong>Township-wide Panoramic Vision</strong>, <strong>Awareness</strong>, <strong>Protection</strong>, and <strong>Intelligent Incident Prioritisation</strong>.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold">
            Vector Design System • v2.0
          </span>
        </div>

        {/* Brand Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">1. Vision</span>
            <p className="text-[11px] text-slate-500">Autonomous observation across all cameras and sectors simultaneously.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">2. Awareness</span>
            <p className="text-[11px] text-slate-500">Continuous spatial intelligence linking geographic pins and camera telemetry.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">3. Intelligence</span>
            <p className="text-[11px] text-slate-500">Multimodal reasoning converting raw pixel frames into structured evidence.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">4. Protection</span>
            <p className="text-[11px] text-slate-500">Enclosing orbital arcs symbolizing protective guardianship over community life.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">5. Prioritisation</span>
            <p className="text-[11px] text-slate-500">The 4-point central triage diamond focusing attention where risk is highest.</p>
          </div>
        </div>

        {/* Logo System Showcase Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dark Background Variant */}
          <div className="rounded-xl bg-slate-950 p-5 border border-slate-800 text-slate-200 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold block">
                Primary Dark Variant
              </span>
              <p className="text-xs text-slate-400">SOC Video Wall, Dark Navigation, Terminal UI</p>
            </div>
            <div className="py-6 flex items-center justify-center">
              <GlobalEyeLogo variant="full" theme="dark" size="lg" withTagline={true} />
            </div>
            <a
              href="/brand/globaleye-logo.svg"
              download
              className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center justify-center gap-1.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-850 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download globaleye-logo.svg
            </a>
          </div>

          {/* Light Background Variant */}
          <div className="rounded-xl bg-slate-50 p-5 border border-slate-200 text-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-700 font-bold block">
                Primary Light Variant
              </span>
              <p className="text-xs text-slate-500">Reports, Official Executive Briefings, Light Docs</p>
            </div>
            <div className="py-6 flex items-center justify-center bg-white rounded-lg border border-slate-100 shadow-2xs">
              <GlobalEyeLogo variant="full" theme="light" size="lg" withTagline={true} />
            </div>
            <a
              href="/brand/globaleye-logo-light.svg"
              download
              className="text-[11px] text-teal-700 hover:text-teal-800 font-medium flex items-center justify-center gap-1.5 py-1.5 rounded bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download globaleye-logo-light.svg
            </a>
          </div>

          {/* Standalone Symbol & Monochrome */}
          <div className="rounded-xl bg-slate-900 p-5 border border-slate-800 text-slate-200 space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold block">
                Standalone Symbol & Mono
              </span>
              <p className="text-xs text-slate-400">App Icon, 16x16 Favicon, Single-color Print</p>
            </div>
            <div className="py-4 flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1.5">
                <GlobalEyeSymbol theme="dark" className="w-12 h-12" />
                <span className="text-[10px] font-mono text-slate-400">Full Color</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 text-white">
                <GlobalEyeSymbol theme="mono" className="w-12 h-12" />
                <span className="text-[10px] font-mono text-slate-400">Monochrome</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <img src="/brand/favicon.svg" alt="Favicon" className="w-9 h-9 rounded-md shadow-xs" />
                <span className="text-[10px] font-mono text-slate-400">Favicon</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/brand/globaleye-symbol.svg"
                download
                className="text-[10px] text-teal-400 hover:text-teal-300 font-medium flex items-center justify-center gap-1 py-1.5 rounded bg-slate-950 border border-slate-800 transition-colors"
              >
                <Download className="w-3 h-3" />
                Symbol SVG
              </a>
              <a
                href="/brand/globaleye-symbol-mono.svg"
                download
                className="text-[10px] text-slate-300 hover:text-white font-medium flex items-center justify-center gap-1 py-1.5 rounded bg-slate-950 border border-slate-800 transition-colors"
              >
                <Download className="w-3 h-3" />
                Mono SVG
              </a>
            </div>
          </div>
        </div>

        {/* Multi-Scale Legibility Validation Strip */}
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-6">
            <span className="font-semibold text-slate-400 text-xs">Scale Verification:</span>
            <div className="flex items-center space-x-2">
              <GlobalEyeSymbol theme="dark" className="w-12 h-12" />
              <span className="text-[10px] font-mono text-slate-500">48px</span>
            </div>
            <div className="flex items-center space-x-2">
              <GlobalEyeSymbol theme="dark" className="w-8 h-8" />
              <span className="text-[10px] font-mono text-slate-500">32px</span>
            </div>
            <div className="flex items-center space-x-2">
              <GlobalEyeSymbol theme="dark" className="w-5 h-5" />
              <span className="text-[10px] font-mono text-slate-500">20px</span>
            </div>
            <div className="flex items-center space-x-2">
              <GlobalEyeSymbol theme="dark" className="w-4 h-4" />
              <span className="text-[10px] font-mono text-slate-500">16px</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
              #06B6D4 Electric Cyan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block"></span>
              #0D9488 Sovereign Teal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-700 inline-block"></span>
              #0B132B SOC Obsidian
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
