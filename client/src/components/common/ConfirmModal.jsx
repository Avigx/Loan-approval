import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

/**
 * Reusable confirmation modal for destructive actions.
 * 
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onConfirm: () => void
 *  - loading: boolean
 *  - title: string
 *  - message: string (optional)
 *  - details: Array<{ label, value }> (optional)
 *  - confirmLabel: string (default "Confirm")
 *  - cancelLabel: string (default "Cancel")
 *  - variant: 'danger' | 'warning' (default 'danger')
 */
const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  loading = false,
  title = 'Are you sure?',
  message,
  details = [],
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Focus the cancel button initially for safety
      const timer = setTimeout(() => confirmRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open && !loading) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, loading, onClose]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-0">
          <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${isDanger ? 'bg-red-50' : 'bg-amber-50'}`}>
            <AlertTriangle className={`w-4.5 h-4.5 ${isDanger ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {message && <p className="text-sm text-slate-500 mt-1">{message}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details */}
        {details.length > 0 && (
          <div className="mx-5 mt-4 p-3 bg-slate-50 rounded-md border border-slate-200">
            <div className="space-y-2">
              {details.map(({ label, value }, i) => (
                <div key={i} className="flex justify-between items-start gap-4">
                  <span className="text-xs font-medium text-slate-500 flex-shrink-0">{label}</span>
                  <span className="text-xs text-slate-800 font-mono text-right break-all">{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-60 flex items-center gap-2 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
