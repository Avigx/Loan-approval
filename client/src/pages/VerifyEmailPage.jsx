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
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-primary-950 to-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-xl shadow-primary-500/30 mb-6">
          <FileText className="w-8 h-8 text-white" />
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-primary-400 animate-spin" />
              <p className="text-white text-lg">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
              <p className="text-white text-lg font-medium">Email Verified!</p>
              <p className="text-surface-400">{message}</p>
              <Link to="/login" className="mt-4 btn-primary">
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <XCircle className="w-12 h-12 text-red-400" />
              <p className="text-white text-lg font-medium">Verification Failed</p>
              <p className="text-surface-400">{message}</p>
              <Link to="/login" className="mt-4 btn-secondary">
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
