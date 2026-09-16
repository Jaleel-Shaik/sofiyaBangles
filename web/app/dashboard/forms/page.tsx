"use client";

import { useState, useEffect } from "react";
import { FileText, ExternalLink, Link2, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/lib/auth-context";
import Link from "next/link";
import toast from "react-hot-toast";
import { STRINGS } from "@/src/constants/strings";

export default function FormsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [formUrl, setFormUrl] = useState<string>("");
  const [savedUrl, setSavedUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sofiya_google_form_url");
    if (stored) {
      setSavedUrl(stored);
      setFormUrl(stored);
    }
  }, []);

  if (!authLoading && user && user.role !== "super_admin") {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-10 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {STRINGS.superAdminAuth.accessRequiredTitle}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {STRINGS.superAdminAuth.formsAccessRequiredDesc}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-[#E8436E] text-white px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold hover:bg-[#CC3366] transition-colors"
        >
          {STRINGS.superAdminAuth.returnToDashboard}
        </Link>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim()) {
      localStorage.removeItem("sofiya_google_form_url");
      setSavedUrl("");
      setIsEditing(false);
      toast.success(STRINGS.forms.unlinkedToast);
      return;
    }

    localStorage.setItem("sofiya_google_form_url", formUrl.trim());
    setSavedUrl(formUrl.trim());
    setIsEditing(false);
    toast.success(STRINGS.forms.savedToast);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#E8436E]" /> {STRINGS.forms.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {STRINGS.forms.subtitle}
          </p>
        </div>

        {savedUrl && (
          <a
            href={savedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#E8436E] hover:bg-[#CC3366] text-white px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <ExternalLink className="w-4 h-4" /> {STRINGS.forms.openGoogleForm}
          </a>
        )}
      </div>

      {/* Main Content Area */}
      {savedUrl && !isEditing ? (
        <div className="space-y-4">
          {/* Active Connected Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{STRINGS.forms.connectedStatus}</p>
                <p className="text-[11px] font-mono text-slate-500 truncate max-w-md">{savedUrl}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 min-h-[44px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {STRINGS.forms.changeUrl}
              </button>
              <a
                href={savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 min-h-[44px] rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {STRINGS.forms.viewForm}
              </a>
            </div>
          </div>

          {/* Embedded Form Preview or Frame */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 px-4">
              <span className="font-semibold text-slate-700">{STRINGS.forms.livePreviewTitle}</span>
              <span>{STRINGS.forms.integrationBadge}</span>
            </div>
            <iframe
              src={savedUrl}
              className="w-full flex-1 border-0 min-h-[600px]"
              title={STRINGS.forms.title}
            />
          </div>
        </div>
      ) : (
        /* Empty State / Setup Form */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#E8436E] flex items-center justify-center mx-auto shadow-inner">
            <FileText className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-slate-900">{STRINGS.forms.emptyTitle}</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {STRINGS.forms.emptyDesc}
            </p>
          </div>

          <form onSubmit={handleSave} className="max-w-lg mx-auto space-y-3">
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="url"
                placeholder={STRINGS.forms.urlPlaceholder}
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#E8436E] focus:ring-1 focus:ring-[#E8436E]"
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#E8436E] to-[#CC3366] text-white text-xs font-semibold shadow-md shadow-[#E8436E]/20 hover:brightness-105 transition-all"
              >
                {savedUrl ? STRINGS.forms.updateButton : STRINGS.forms.connectButton}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {STRINGS.forms.cancelButton}
                </button>
              )}
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 max-w-sm mx-auto flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{STRINGS.forms.cleanLightweightBadge}</span>
          </div>
        </div>
      )}
    </div>
  );
}
