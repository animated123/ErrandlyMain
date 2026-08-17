import React from 'react';
import { motion } from 'framer-motion';
import { X, HelpCircle, ShieldAlert, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FAQS, PRIVACY_POLICY } from '../constants/legal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FAQModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
              <HelpCircle size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 text-left flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="font-black text-slate-900 dark:text-white">{faq.question}</span>
                <ChevronDown size={20} className={`text-slate-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <div className="px-6 pb-6 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export const PrivacyPolicyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl relative flex flex-col max-h-[85vh]">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
              <ShieldAlert size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Privacy Policy</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-1 zero-scrollbar">
           <div className="p-8 markdown-body dark:prose-invert max-w-none">
             <ReactMarkdown>{PRIVACY_POLICY}</ReactMarkdown>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
