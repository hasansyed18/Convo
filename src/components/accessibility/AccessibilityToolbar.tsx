import { useEffect, useState } from "react";
import { Sliders, Eye, Type, Bell, Volume2, Sparkles, X } from "lucide-react";
import {
  offlineStorageService,
  type AccessibilitySettings,
} from "../../services/offlineStorageService";

interface AccessibilityToolbarProps {
  onSettingsChange?: (settings: AccessibilitySettings) => void;
}

export default function AccessibilityToolbar({
  onSettingsChange,
}: AccessibilityToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(() =>
    offlineStorageService.getAccessibilitySettings()
  );

  useEffect(() => {
    offlineStorageService.saveAccessibilitySettings(settings);
    if (onSettingsChange) onSettingsChange(settings);

    // Apply document-level classes for styling
    if (settings.highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }

    if (settings.largeText) {
      document.documentElement.classList.add("large-text");
    } else {
      document.documentElement.classList.remove("large-text");
    }
  }, [settings, onSettingsChange]);

  const toggle = (key: keyof AccessibilitySettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <>
      {/* Floating Accessibility Quick Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Accessibility Settings"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-2xl transition hover:scale-105 border-2 border-slate-900"
      >
        <Sliders size={20} />
      </button>

      {/* Accessibility Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-emerald-400" />
                <h3 className="font-bold text-white text-base">Accessibility Options</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* High Contrast */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <Eye size={18} className="text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">High Contrast</p>
                    <p className="text-[11px] text-slate-400">Pure black & vivid highlights</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggle("highContrast")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.highContrast ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.highContrast ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Large Text */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <Type size={18} className="text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Large Interface</p>
                    <p className="text-[11px] text-slate-400">Larger text & touch targets</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggle("largeText")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.largeText ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.largeText ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Visual Sound Alerts */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Visual Sound Flash</p>
                    <p className="text-[11px] text-slate-400">Screen border pulses on sound</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggle("visualAlerts")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.visualAlerts ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.visualAlerts ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Auto Speak Incoming */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-cyan-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Auto-Read Messages</p>
                    <p className="text-[11px] text-slate-400">Speak new messages aloud</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggle("autoSpeakIncoming")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoSpeakIncoming ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoSpeakIncoming ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 py-3 text-sm font-bold text-black transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
