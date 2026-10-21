import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Key,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldAlert,
  Flame,
  Trees,
  Building,
  UserX,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getStoredGeminiApiKey,
  storeGeminiApiKey,
  testGeminiApiKey,
} from "@/lib/geminiVision";

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (hasKey: boolean) => void;
}

export function GeminiApiKeyModal({
  isOpen,
  onClose,
  onKeySaved,
}: GeminiApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid?: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = getStoredGeminiApiKey();
      setApiKey(existing);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    setIsTesting(true);
    setTestResult(null);

    if (trimmed.length > 0) {
      const res = await testGeminiApiKey(trimmed);
      setIsTesting(false);
      setTestResult(res);
      if (res.valid) {
        storeGeminiApiKey(trimmed);
        if (onKeySaved) onKeySaved(true);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } else {
      storeGeminiApiKey("");
      setIsTesting(false);
      if (onKeySaved) onKeySaved(false);
      onClose();
    }
  };

  const handleClear = () => {
    setApiKey("");
    storeGeminiApiKey("");
    setTestResult(null);
    if (onKeySaved) onKeySaved(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-teal-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
              <Sparkles className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Google Gemini Vision AI Setup
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-500/30 text-teal-200 border border-teal-400/30">
                  Multimodal
                </span>
              </h3>
              <p className="text-xs text-teal-200/80">
                AI video clip hazard detection for Sime Darby townships
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-600">
          {/* Capabilities Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
              <ShieldAlert className="w-4 h-4 text-teal-700" />
              <span>Multi-Hazard Danger Incidents Detected:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span><strong>火灾 (Fire & Smoke)</strong>: Flames, plumes</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Trees className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>野生动物 (Wildlife)</strong>: Boars, monkeys, snakes</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Building className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span><strong>人在 Rooftop / 高危场所</strong>: Roof trespass</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <UserX className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span><strong>人员跌倒 (Falls)</strong>: Collapsed, motionless</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span><strong>交通事故 (Collisions)</strong>: Vehicle crash</span>
              </div>
              <div className="flex items-center gap-1.5 text-teal-800 font-medium">
                <span>✨ Auto-prioritized to queue</span>
              </div>
            </div>
          </div>

          {/* Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-teal-700" />
                <span>Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline font-medium"
              >
                <span>Get API key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full h-10 rounded-lg border border-slate-300 pl-3 pr-10 text-xs font-mono bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Your key is saved locally in your browser storage and transmitted directly to Google Gemini Vision endpoints for video keyframe analysis.
            </p>
          </div>

          {/* Validation Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 text-xs ${
                testResult.valid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {testResult.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Authentication Successful!</div>
                    <div className="text-[11px]">
                      Connected to Gemini 1.5 Flash Vision. Video uploads will now use multimodal AI frame analysis.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Connection Failed</div>
                    <div className="text-[11px]">{testResult.error}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-800 hover:underline"
          >
            Clear Key
          </button>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isTesting}
              className="bg-teal-700 hover:bg-teal-800"
            >
              {isTesting ? "Validating Key..." : "Save & Activate"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
