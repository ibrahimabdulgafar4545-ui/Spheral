import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { reportsAPI } from '../../api/reports';
import { useApp } from '../../context/AppContext';

const REASONS = [
  'Spam',
  'Inappropriate content',
  'Harassment',
  'Hate Speech',
  'False information',
  'Other'
];

export default function ReportModal({ contentId, contentType, onClose }) {
  const { showToast } = useApp();
  const [reason, setReason] = useState('Spam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await reportsAPI.createReport({
        contentId,
        contentType,
        reason,
        description
      });
      if (res.success) {
        showToast('success', 'Thank you. Content reported successfully and will be reviewed.');
        onClose();
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="card-elevated w-full max-w-md animate-scale-in text-left">
        <div className="px-5 py-4 border-b border-sp-divider flex items-center justify-between">
          <h2 className="font-bold text-lg text-sp-text flex items-center gap-2">
            <FiAlertTriangle className="text-red-500" />
            Report Content
          </h2>
          <button onClick={onClose} className="nav-btn w-9 h-9 flex items-center justify-center text-xl">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Select a reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input w-full [color-scheme:dark]"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-sp-sub uppercase tracking-wider">Additional Details (Optional)</label>
            <textarea
              rows={3}
              placeholder="Provide context or details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
            />
          </div>

          <div className="text-[11px] text-sp-muted leading-normal">
            By submitting, you confirm this content violates our{' '}
            <a href="/guidelines" target="_blank" rel="noopener noreferrer" className="text-sp-blue hover:underline font-semibold">
              Community Guidelines
            </a>
            . Action will be taken upon review.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary btn-md bg-red-500 hover:bg-red-600 border-red-500/20 text-white flex-1 flex items-center justify-center"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
