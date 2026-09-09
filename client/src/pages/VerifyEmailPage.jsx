import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    api.get(`/auth/verify-email?token=${token}`)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 mx-auto rounded-lg bg-primary-800 flex items-center justify-center mb-6">
          <FileText className="w-6 h-6 text-white" />
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
              <p className="text-white text-sm">Verifying your email…</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <p className="text-white text-sm font-medium">Email Verified</p>
              <p className="text-slate-400 text-xs">{message}</p>
              <Link to="/login" className="btn-primary mt-3 text-xs">
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <XCircle className="w-10 h-10 text-red-400" />
              <p className="text-white text-sm font-medium">Verification Failed</p>
              <p className="text-slate-400 text-xs">{message}</p>
              <Link to="/login" className="btn-secondary mt-3 text-xs">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
