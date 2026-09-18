import React, { useState } from 'react';
import { X, Mail, Loader2, Key, ShieldCheck, Lock, CheckCircle } from 'lucide-react';
import { firebaseService } from '../../services/firebaseService';

interface ResetPasswordModalProps {
  onClose: () => void;
}

export default function ResetPasswordModal({ onClose }: ResetPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'success'>('email');
  const [error, setError] = useState('');

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await firebaseService.sendPasswordResetEmail(email);
      setStep('success');
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Reset Password</h2>
            <p className="text-sm text-muted-foreground font-bold tracking-normal font-medium">
              {step === 'email' && "Enter your email to receive a reset link"}
              {step === 'success' && "Check your inbox"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors">
            <X size={14} />
          </button>
        </div>

        {step === 'email' && (
          <form onSubmit={handleSendResetLink} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-black text-muted-foreground tracking-normal font-medium ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={14} />
                <input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)} 
                  className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  required
                  placeholder="your@email.com"
                />
              </div>
            </div>
            {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}
            <button 
              type="submit" disabled={loading}
              className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="bg-emerald-50 p-6 rounded-2xl text-center space-y-3 border border-emerald-100">
            <div className="w-12 h-12 bg-card text-card-foreground rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="text-emerald-500" size={14} />
            </div>
            <p className="text-sm font-bold text-emerald-900">Link Sent!</p>
            <p className="text-xs text-emerald-600">A password reset link has been sent to <strong>{email}</strong>. Please check your inbox and follow the instructions.</p>
            <button onClick={onClose} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest mt-4 active:scale-95 transition-all shadow-lg">Back to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}
