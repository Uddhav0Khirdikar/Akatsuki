import React, { useState } from 'react';
import { X, Send, Link as LinkIcon, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { applicationsApi } from '../api/applications';
import AkatsukiCloud from '../assets/AkatsukiCloud';

export const ApplyModal = ({ job, isOpen, onClose, onApplied }) => {
  const [pitchNote, setPitchNote] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pitchNote.trim()) {
      setError('Please provide a pitch note explaining your interest and qualifications.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await applicationsApi.applyToJob(job.id, {
        pitch_note: pitchNote.trim(),
        resume_url: resumeUrl.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onApplied();
        onClose();
        setSuccess(false);
        setPitchNote('');
        setResumeUrl('');
      }, 1500);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to submit application';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950/95 border border-red-600/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(229,9,20,0.25)] text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AkatsukiCloud size={32} />
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Apply to Opportunity
            </h3>
            <p className="text-xs text-red-400 font-medium line-clamp-1">{job.title}</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-white">Application Submitted!</h4>
            <p className="text-xs text-zinc-400 max-w-xs">
              The opportunity creator has received your pitch and portfolio details.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-red-500" />
                <span>Pitch Note & Relevant Experience *</span>
              </label>
              <textarea
                rows={4}
                value={pitchNote}
                onChange={(e) => setPitchNote(e.target.value)}
                placeholder="Explain why you're a great fit, what relevant projects or coursework you have completed, and how you can contribute..."
                className="w-full px-4 py-3 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-red-500" />
                <span>Resume / Portfolio Link (Optional)</span>
              </label>
              <input
                type="url"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="https://github.com/... or Google Drive link"
                className="w-full px-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-xs font-semibold text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(229,9,20,0.4)] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ApplyModal;
