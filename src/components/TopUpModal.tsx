import React, { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';
import PaymentComponent from './PaymentComponent';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, user }) => {
  const [amount, setAmount] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const [success, setSuccess] = useState(false);

  const presets = [500, 1000, 2000, 5000];

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setShowPayment(false);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-foreground text-background/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-card text-card-foreground rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-foreground">Top Up Wallet</h2>
              <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-emerald-500">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Success!</h3>
                <p className="text-sm font-bold text-muted-foreground mb-10">Ksh {amount} top up initiated. Balance will update shortly.</p>
                <button 
                  onClick={onClose}
                  className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            ) : showPayment ? (
              <PaymentComponent 
                amount={Number(amount)} 
                onCancel={() => setShowPayment(false)}
                onSuccess={() => {
                  setSuccess(true);
                }}
              />
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-sm font-black tracking-normal font-medium text-muted-foreground mb-4">Enter Amount (Ksh)</p>
                <div className="relative mb-6">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground/70">Ksh</span>
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-20 pr-8 py-6 bg-muted border-2 border-transparent focus:border-indigo-600 rounded-3xl text-3xl font-black text-foreground outline-none transition-all placeholder:text-muted-foreground/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {presets.map((p) => (
                    <button 
                      key={p}
                      onClick={() => setAmount(p.toString())}
                      className={`py-4 rounded-2xl font-black text-sm transition-all ${
                        amount === p.toString() 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                          : 'bg-muted text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      + Ksh {p}
                    </button>
                  ))}
                </div>

                <button 
                  disabled={!amount || Number(amount) <= 0}
                  onClick={() => setShowPayment(true)}
                  className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TopUpModal;
