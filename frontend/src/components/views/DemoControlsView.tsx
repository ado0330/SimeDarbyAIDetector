import React, { useState } from "react";
import { ScoringConfigData } from "@/types";
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
} from "lucide-react";

interface DemoControlsViewProps {
  scoringConfig: ScoringConfigData | null;
  onTriggerScenario: (scenario: "simultaneous" | "escalate" | "human_intervention" | "false_positive" | "low_confidence_fire") => Promise<void>;
  onResetDemo: () => Promise<void>;
  isStreamConnected: boolean;
}

export function DemoControlsView({
  scoringConfig,
  onTriggerScenario,
  onResetDemo,
  isStreamConnected,
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
      setScenarioMessage(`Scenario "${scenario}" executed successfully. Active incident queue updated.`);
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
              Hackathon Demonstration Control Center (Spec §15)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Execute deterministic live scenarios to showcase multi-incident concurrency, dynamic evidence re-ranking, and human-in-the-loop audit logs.
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
        <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{scenarioMessage}</span>
          </div>
          <button
            onClick={() => setScenarioMessage(null)}
            className="text-teal-700 hover:text-teal-900 font-bold ml-4 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Interactive Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario A */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-teal-700 uppercase tracking-wider">
                Scenario A
              </span>
              <Badge variant="simulated">Spec §15.A</Badge>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Simultaneous Multi-Incident Concurrency
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Creates 3 concurrent incidents at the exact same second:
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li><strong>Person Fall (Lake Park):</strong> Unresponsive pedestrian &rarr; Ranked #1</li>
              <li><strong>Vehicle Obstruction (Main Gate):</strong> Blocked lane &rarr; Ranked #2</li>
              <li><strong>Illegal Dumping (Precinct B):</strong> Trash hazard &rarr; Ranked #3</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Proves that medical emergency with high severity and immediate vulnerability outranks property/traffic issues regardless of order.
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
            Trigger Scenario A
          </Button>
        </div>

        {/* Scenario B */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-amber-700 uppercase tracking-wider">
                Scenario B
              </span>
              <Badge variant="simulated">Spec §15.B</Badge>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Dynamic Evidence Escalation & Re-ranking
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Updates evidence on an existing Person Fall:
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>Subject verified motionless &gt; 5 minutes</li>
              <li>No bystanders present in CCTV frame</li>
              <li>Life-safety emergency rule triggers</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Watch priority score jump from 72 to 93+, promoting the incident to Rank #1 and notifying operators via real-time SSE stream.
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
            Trigger Scenario B (Dynamic Escalate)
          </Button>
        </div>

        {/* Scenario C */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-blue-700 uppercase tracking-wider">
                Scenario C
              </span>
              <Badge variant="simulated">Spec §15.C</Badge>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Human Intervention & Response Workflow
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Demonstrates complete control-room operational handling:
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>Acknowledge highest-priority alert</li>
              <li>Assign dedicated responder ("Patrol Alpha")</li>
              <li>Record timestamped operator action note</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Shows how human decisions seamlessly transition incident status from New &rarr; Acknowledged &rarr; In Progress.
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => handleRun("human_intervention")}
            loading={runningScenario === "human_intervention"}
            className="w-full mt-3 bg-blue-700 hover:bg-blue-800"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
            Trigger Scenario C (Operator Handling)
          </Button>
        </div>

        {/* Scenario D */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-purple-700 uppercase tracking-wider">
                Scenario D
              </span>
              <Badge variant="simulated">Spec §15.D</Badge>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              False-Positive Resolution & Audit Trail
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Demonstrates responsible incident lifecycle termination:
            </p>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 pl-1">
              <li>Marks detection as False Positive</li>
              <li>Requires operator justification note</li>
              <li>Permanent audit entry recorded in SQLite</li>
            </ul>
            <p className="text-[11px] text-slate-400">
              Preserves data integrity: closed incidents remain searchable in history for audit compliance.
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => handleRun("false_positive")}
            loading={runningScenario === "false_positive"}
            className="w-full mt-3 bg-purple-700 hover:bg-purple-800"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
            Trigger Scenario D (False Positive Audit)
          </Button>
        </div>
      </div>

      {/* 3. Prioritization Math Engine & Configuration Inspector */}
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
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            Hysteresis Threshold: Δ ≥ 2.0 points required for rank reassignment (prevents queue bouncing)
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
    </div>
  );
}
