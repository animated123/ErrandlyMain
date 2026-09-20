import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { firebaseService } from '../../services/firebaseService';

interface TemporaryPasswordModalProps {
  email: string;
  onSuccess: () => void;
}

export default function TemporaryPasswordModal({ email, onSuccess }: TemporaryPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long for optimal protection.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Confirm password doesn't match.");
      return;
    }

    setIsProcessing(true);
    try {
      await firebaseService.updatePassword(email, password);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error("[TemporaryPasswordModal] error:", err);
      setError(err.message || "Failed to finalize your new password. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-[#f8fbff] dark:bg-slate-950 text-slate-900 dark:text-white w-full max-w-md rounded-[2.5rem] p-8 md:p-10 border border-indigo-100 dark:border-slate-900 shadow-2xl flex flex-col gap-6"
      >
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-slate-800">
            {success ? <ShieldCheck className="text-emerald-500" size={32} /> : <AlertTriangle className="text-indigo-600 animate-pulse" size={32} />}
          </div>
          <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white">
            {success ? "Security Verified" : "Secure Your Account"}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-500">
            {success ? "Setting up keys" : "Temporary Passcode Active"}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-2">
            {success 
              ? "Your permanent password has been stored successfully. Sign in is now persistent." 
              : "You are currently authenticated using a one-time temporary OTP. Please configure a secure permanent password to unlock full network services."
            }
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900/30 text-center uppercase tracking-widest leading-relaxed">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!success && (
            <motion.form 
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleSubmit} 
              className="space-y-5"
            >
              {/* Member email readout */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Member ID (Email)</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate select-all">{email}</span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">New Permanent Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Lock className="text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                  </div>
                  <input 
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-14 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm placeholder:text-slate-300 font-mono text-base"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-5 flex items-center text-slate-300 hover:text-slate-500 dark:hover:text-slate-200 transition-all"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Confirm New Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Lock className="text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                  </div>
                  <input 
                    type={showPass ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-14 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm placeholder:text-slate-300 font-mono text-base"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full py-5 bg-[#0a2e5c] dark:bg-primary text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 mt-6"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Establish Keys"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
