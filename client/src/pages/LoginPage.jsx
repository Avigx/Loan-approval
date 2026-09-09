import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800/50 to-slate-900/80" />
        <div className="relative z-10 max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-lg bg-white/10 flex items-center justify-center mb-8 border border-white/10">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Legal Notice DMS</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Enterprise document management for legal departments, banks, and financial institutions.
            Manage notices, proof-of-delivery, and courier tracking across your organization.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-md bg-white/5 border border-white/10">
              <p className="text-lg font-semibold text-white">Secure</p>
              <p className="text-[11px] text-slate-400 mt-0.5">RBAC & Multi-tenant</p>
            </div>
            <div className="p-3 rounded-md bg-white/5 border border-white/10">
              <p className="text-lg font-semibold text-white">Audit</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Complete trail</p>
            </div>
            <div className="p-3 rounded-md bg-white/5 border border-white/10">
              <p className="text-lg font-semibold text-white">Bulk</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload & match</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 mx-auto rounded-lg bg-primary-800 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-white">Legal Notice DMS</h1>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
            <p className="text-slate-400 text-sm mb-6">Enter your credentials to access the system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-slate-400 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-600 transition-colors text-sm"
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-600 transition-colors text-sm"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-700 text-white py-2.5 rounded-md text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-2">
            <p className="text-slate-500 text-xs">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
                Sign up
              </Link>
            </p>
            <p className="text-slate-600 text-[11px]">
              Demo: <span className="text-slate-500 font-mono">admin@aubank.com / password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
