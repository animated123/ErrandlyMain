import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Phone, Loader2, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { firebaseService } from '../../services/firebaseService';
import { UserRole } from '../../types';
import { Logo } from './Logo';

interface SignUpProps {
  onSuccess?: (user: any) => void;
  onSwitchToLogin?: () => void;
  logoUrl?: string;
}

const SignUp: React.FC<SignUpProps> = ({ onSuccess, onSwitchToLogin, logoUrl }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'failed'>('idle');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setSyncStatus('syncing');

    try {
      // Use the centralized firebaseService.register which handles:
      // 1. Firebase Auth user creation
      // 2. Supabase profile sync (including phone)
      // 3. Firestore user document creation
      const completeUser = await firebaseService.register(
        formData.username, 
        formData.email, 
        formData.phone, 
        formData.password
      );

      setSyncStatus('success');
      if (onSuccess) onSuccess(completeUser);

    } catch (err: any) {
      console.error("Signup/Sync failed:", err.message);
      
      let friendlyError = err.message || "An unexpected error occurred during signup";
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = "This email is already registered. Please sign in instead.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Please enter a valid email address.";
      } else if (err.code === 'auth/weak-password') {
        friendlyError = "Password should be at least 6 characters.";
      }

      setError(friendlyError);
      setSyncStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-1">
      <div className="space-y-2 text-center md:text-left flex items-center gap-4">
        <Logo url={logoUrl} size={64} variant="rounded" className="shadow-lg" />
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight leading-none">Create Account</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Join the errand revolution</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 shadow-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-sm font-black tracking-normal font-medium leading-relaxed">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSignUp} className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-sm font-black text-muted-foreground tracking-normal font-medium ml-1">Username</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors">
              <UserIcon size={18} />
            </div>
            <input 
              type="text"
              required
              placeholder="e.g. jdoe254"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-[1.25rem] font-black text-foreground text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-black text-muted-foreground tracking-normal font-medium ml-1">Email Address</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors">
              <Mail size={18} />
            </div>
            <input 
              type="email"
              required
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-[1.25rem] font-black text-foreground text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-sm font-black text-muted-foreground tracking-normal font-medium ml-1">Phone Number</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors">
              <Phone size={18} />
            </div>
            <input 
              type="tel"
              required
              placeholder="07XX XXX XXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-[1.25rem] font-black text-foreground text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-black text-muted-foreground tracking-normal font-medium ml-1">Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground/70 group-focus-within:text-indigo-600 transition-colors">
              <Lock size={18} />
            </div>
            <input 
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-12 pr-6 py-4 bg-muted border-none rounded-[1.25rem] font-black text-foreground text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={isProcessing}
          className="w-full py-5 bg-black text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4 relative overflow-hidden group"
        >
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </motion.div>
            ) : (
              <motion.div 
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <span>Create Account</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Progress overlay for sync stages */}
          {isProcessing && syncStatus === 'syncing' && (
            <motion.div 
              className="absolute bottom-0 left-0 h-1 bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2 }}
            />
          )}
        </button>
      </form>

      <div className="text-center pt-2 space-y-4">
        <button 
          onClick={onSwitchToLogin}
          className="text-xs font-black text-muted-foreground tracking-normal font-medium hover:text-indigo-600 transition-colors"
        >
          Already have an account? <span className="text-foreground border-b-2 border-slate-900/10">Sign In</span>
        </button>
      </div>
    </div>
  );
};

export default SignUp;
