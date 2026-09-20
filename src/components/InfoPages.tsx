import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  ShieldCheck, 
  Zap, 
  Star, 
  Trash2, 
  ShoppingBag, 
  Truck, 
  Sparkles, 
  Users, 
  ChevronRight, 
  ArrowLeft,
  Search,
  CheckCircle,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Layers,
  Heart,
  Briefcase,
  DollarSign,
  TrendingUp,
  Award,
  Waves,
  Scale,
  Activity,
  Droplets,
  UserCheck,
  AlertCircle,
  Send,
  Loader2,
  FileText,
  History,
  Tag
} from 'lucide-react';
import { Logo } from './Logo';
import { API_BASE_URL } from '../../services/apiConfig';

interface InfoPageProps {
  onBack: () => void;
  onStartApplication?: () => void;
  appSettings?: any;
  user?: any;
}

const PageWrapper: React.FC<{ children: React.ReactNode; title: string; onBack: () => void }> = ({ children, title, onBack }) => (
  <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#050b15]">
    <nav className="w-full z-50 px-4 md:px-12 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl sticky top-0">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 group text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
          <ArrowLeft size={16} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Back to Hub</span>
      </button>
      <div className="flex items-center gap-2">
        <span className="text-lg font-black tracking-tighter text-[#0a2e5c] dark:text-white">{title}<span className="text-primary">.</span></span>
      </div>
      <div className="w-20 lg:w-24" /> {/* Spacer */}
    </nav>
    <main className="max-w-7xl mx-auto px-6 py-12 pb-16">
      {children}
    </main>
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">© 2026 Coordination Network Standards</p>
        <div className="flex items-center gap-5 text-xs font-bold text-slate-500 dark:text-slate-400">
          <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  </div>
);

export const ServicesPage: React.FC<InfoPageProps> = ({ onBack }) => {
  const categories = [
    {
      title: "Logistics & Delivery",
      icon: <Truck />,
      items: [
        { label: "Express Couriers", desc: "Same-city document and package handling with 15-min pickup." },
        { label: "Luxury Escrow", desc: "Secure delivery for high-value items with insurance coverage." },
        { label: "Market Run", desc: "Fresh produce sourcing from Gikomba, Muthurwa & beyond." }
      ]
    },
    {
      title: "Lifestyle Management",
      icon: <Sparkles />,
      items: [
        { label: "Laundry Concierge", desc: "Premium Mama Fua services with hygiene standards." },
        { label: "Grocery Solutions", desc: "Supermarket shopping with real-time bill auditing." },
        { label: "House Hunting", desc: "Professional unit viewing and neighborhood analysis." }
      ]
    },
    {
      title: "Utility Services",
      icon: <Zap />,
      items: [
        { label: "Bill Clearing", desc: "Physical office visits for utility and license processing." },
        { label: "Pharma Pickup", desc: "Discreet prescription handling from verified chemists." },
        { label: "Technical Dispatch", desc: "Sourcing vetted handymen and specialist technicians." }
      ]
    }
  ];

  return (
    <PageWrapper title="Our Services" onBack={onBack}>
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-7xl font-black text-[#0a2e5c] dark:text-white tracking-tighter leading-none mb-4">
          The Full <br /> <span className="text-primary italic">Spectrum.</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
          We provide a comprehensive orchestration layer for all non-technical needs.
        </p>
      </div>

      <div className="space-y-12">
        {categories.map((cat, i) => (
          <div key={i}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                {cat.icon}
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-[#0a2e5c] dark:text-white">{cat.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {cat.items.map((item, j) => (
                <div key={j} className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group">
                  <h3 className="text-lg font-black text-[#0a2e5c] dark:text-white mb-2 group-hover:text-primary transition-colors">{item.label}</h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
};

export const ElitePricingPage: React.FC<InfoPageProps> = ({ onBack }) => {
  return (
    <PageWrapper title="Elite Pricing" onBack={onBack}>
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-7xl font-black text-[#0a2e5c] dark:text-white tracking-tighter leading-none mb-4">
          Transparent <br /> <span className="text-primary italic">Value.</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
          Premium service without the guesswork. Standardized rates for every sector.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            tier: "Standard",
            price: "KSh 40",
            desc: "Base pickup fee",
            features: ["GPS Tracking", "Insurance up to 5k", "Standard support"]
          },
          {
            tier: "Premium Delivery",
            price: "+KSh 50/km",
            desc: "Distance-based transit",
            features: ["Priority dispatch", "Escrow protection", "Bill auditing"]
          },
          {
            tier: "Specialist",
            price: "Custom",
            desc: "For complex projects",
            features: ["Project manager", "Multiple runners", "Custom reporting"]
          }
        ].map((p, i) => (
          <div key={i} className={`p-6 md:p-8 rounded-[2rem] border transition-all ${i === 1 ? 'bg-[#0a2e5c] text-white border-[#0a2e5c] shadow-2xl scale-105' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${i === 1 ? 'text-cyan-400' : 'text-slate-400'}`}>Tier {i + 1}</span>
            <h3 className="text-3xl md:text-4xl font-black mb-2 italic">{p.price}</h3>
            <p className={`text-xs font-bold mb-6 uppercase tracking-widest ${i === 1 ? 'text-white/70' : 'text-slate-400'}`}>{p.desc}</p>
            <ul className="space-y-3 mb-6">
              {p.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle size={16} className={i === 1 && i === 1 ? 'text-cyan-400' : 'text-emerald-500'} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
};

export const NetworkStandardsPage: React.FC<InfoPageProps> = ({ onBack }) => {
  return (
    <PageWrapper title="Network Standards" onBack={onBack}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-black text-[#0a2e5c] dark:text-white tracking-tighter leading-none mb-4">
            The Code of <br /> <span className="text-primary italic">Conduct.</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium">
            We maintain the highest operational standards in Kenya's gig economy.
          </p>
        </div>

        <div className="space-y-12">
          {[
            {
              title: "Verification Protocol",
              desc: "Every runner undergoes a 3-step vetting process including government ID verification, phone number authentication, and social proof checks.",
              icon: <UserCheck className="text-blue-500" />
            },
            {
              title: "Financial Integrity",
              desc: "Payments are held in secure escrow. Funds are only released when the requester confirms task completion or audits the receipt.",
              icon: <ShieldCheck className="text-emerald-500" />
            },
            {
              title: "Operational Hygiene",
              desc: "Laundry and food errands follow strict health guidelines. Runners use standardized delivery bags and maintain high personal grooming standards.",
              icon: <Activity className="text-rose-500" />
            },
            {
              title: "Dispute Resolution",
              desc: "Our 24/7 moderation team settles discrepancies within 60 minutes based on GPS logs, receipt photos, and chat transcripts.",
              icon: <Scale className="text-amber-500" />
            }
          ].map((s, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-6 items-start p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem]">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                 {/* Manually rendering icons for safety */}
                 {i === 0 && <Users className="text-blue-500" />}
                 {i === 1 && <ShieldCheck className="text-emerald-500" />}
                 {i === 2 && <Droplets className="text-rose-500" />}
                 {i === 3 && <Heart className="text-amber-500" />}
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#0a2e5c] dark:text-white mb-4">{s.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
};

export const HelpPage: React.FC<InfoPageProps> = ({ onBack, user }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [complaintForm, setComplaintForm] = useState({
    subject: '',
    description: '',
    priority: 'MEDIUM'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ success: boolean; ticketNumber?: string; error?: string } | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setIsLoadingTickets(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/db/complaints/select`, {
        match: { user_id: user.id }
      });
      if (response.data.success) {
        setTickets(response.data.data.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setIsLoadingTickets(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (activeTab === 'history') {
      fetchTickets();
    }
  }, [activeTab, fetchTickets]);

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to log a complaint.");
      return;
    }

    setIsSubmitting(true);
    setTicketResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/complaints`, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        role: user.role,
        subject: complaintForm.subject,
        description: complaintForm.description,
        priority: complaintForm.priority
      });

      if (response.data.success) {
        setTicketResult({ success: true, ticketNumber: response.data.ticketNumber });
        setComplaintForm({ subject: '', description: '', priority: 'MEDIUM' });
      } else {
        setTicketResult({ success: false, error: response.data.error || "Failed to log complaint" });
      }
    } catch (err: any) {
      setTicketResult({ success: false, error: err.response?.data?.error || err.message || "An error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper title="Help Center" onBack={onBack}>
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-7xl font-black text-[#0a2e5c] dark:text-white tracking-tighter leading-none mb-4">
          Support <br /> <span className="text-primary italic">Concierge.</span>
        </h1>
        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
          We're here to ensure every interaction with our network is seamless.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        <div className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-[#0a2e5c] dark:text-white flex items-center gap-3">
               <HelpCircle className="text-primary" />
               Frequently Asked Questions
            </h2>
            {[
              "How do I track my runner?",
              "What happens if my package is delayed?",
              "How do I audit my shopping receipt?",
              "Can I request a specific runner?"
            ].map((q, i) => (
              <div key={i} className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-primary/40 transition-colors group">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700 dark:text-slate-300">{q}</span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-[#0a2e5c] dark:text-white flex items-center gap-3">
               <Mail className="text-primary" />
               Direct Lines
            </h2>
            <div className="p-6 bg-[#0a2e5c] text-white rounded-[2rem] space-y-4 shadow-xl">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2891e2] mb-1">Email Support</p>
                  <p className="text-xl font-bold">ops@coordinate.net</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2891e2] mb-1">WhatsApp Hotline</p>
                  <p className="text-xl font-bold">+254 700 000 000</p>
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2891e2] mb-1">Operational Hours</p>
                  <p className="text-xl font-bold">24/7 Live Response</p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm relative overflow-hidden min-h-[600px] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex items-center justify-between mb-8 relative z-10 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('form')}
                  className={`flex items-center gap-2 text-sm font-black transition-all ${activeTab === 'form' ? 'text-primary scale-105' : 'text-slate-400 grayscale hover:grayscale-0'}`}
                >
                  <AlertCircle size={18} />
                  <span>Log Complaint</span>
                  {activeTab === 'form' && <motion.div layoutId="tab-underline" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 text-sm font-black transition-all relative ${activeTab === 'history' ? 'text-primary scale-105' : 'text-slate-400 grayscale hover:grayscale-0'}`}
                >
                  <History size={18} />
                  <span>Ticket History</span>
                  {activeTab === 'history' && <motion.div layoutId="tab-underline" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary" />}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              <AnimatePresence mode="wait">
                {activeTab === 'form' ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    {!user ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                          <UserCheck size={32} />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Please sign in to log a formal complaint and track its resolution.</p>
                      </div>
                    ) : ticketResult?.success ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8 space-y-6"
                      >
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                          <CheckCircle size={40} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white">Complaint Logged!</h3>
                          <p className="text-sm font-medium text-slate-500 mt-2">Your ticket number is:</p>
                          <div className="mt-3 px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-primary/30 inline-block font-black text-2xl tracking-widest text-primary">
                            {ticketResult.ticketNumber}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">A confirmation email has been sent to <strong>{user.email}</strong>. Our team will review your case shortly.</p>
                        <button 
                          onClick={() => setTicketResult(null)}
                          className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-colors"
                        >
                          Log Another Complaint
                        </button>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubmitComplaint} className="space-y-5">
                        {ticketResult?.error && (
                          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={14} />
                            {ticketResult.error}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                            <input 
                              type="text" 
                              value={user.name} 
                              disabled 
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email Address</label>
                            <input 
                              type="text" 
                              value={user.email} 
                              disabled 
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed" 
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Subject</label>
                          <input 
                            type="text" 
                            placeholder="e.g., Delayed delivery, Wrong items..." 
                            value={complaintForm.subject}
                            onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none" 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Priority Level</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setComplaintForm({ ...complaintForm, priority: p })}
                                className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                                  complaintForm.priority === p 
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-800 hover:border-primary/20'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Describe the Issue</label>
                          <textarea 
                            rows={4}
                            placeholder="Provide details about what happened..."
                            value={complaintForm.description}
                            onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none resize-none"
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Logging Ticket...
                            </>
                          ) : (
                            <>
                              <Send size={16} />
                              Submit Complaint
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    {!user ? (
                      <div className="text-center py-12">
                        <p className="text-sm font-medium text-slate-500">Sign in to view your ticket history.</p>
                      </div>
                    ) : isLoadingTickets ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={32} className="animate-spin text-primary/30" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Retrieving records...</p>
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-200">
                          <History size={32} />
                        </div>
                        <p className="text-sm font-bold text-slate-400 italic">No tickets found on record.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tickets.map((t) => (
                          <div key={t.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-primary/20 transition-all group">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded-lg mb-1 block w-fit">
                                  {t.ticket_number}
                                </span>
                                <h4 className="text-sm font-black text-[#0a2e5c] dark:text-white leading-tight">
                                  {t.subject}
                                </h4>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                                t.status === 'RESOLVED' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50' 
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50'
                                  : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50'
                              }`}>
                                {t.status || 'OPEN'}
                              </div>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                              {t.description}
                            </p>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} className="text-slate-300" />
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Tag size={12} className="text-slate-300" />
                                  <span className={`text-[10px] font-bold ${
                                    t.priority === 'HIGH' ? 'text-rose-400' : 'text-slate-400'
                                  }`}>
                                    {t.priority}
                                  </span>
                                </div>
                              </div>
                              <button className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                                View Full
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export const PartnerGuidePage: React.FC<InfoPageProps> = ({ onBack, onStartApplication }) => {
  return (
    <PageWrapper title="Partner Program" onBack={onBack}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-black text-[#0a2e5c] dark:text-white tracking-tighter leading-none mb-4">
            Become a <br /> <span className="text-primary italic">Partner.</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium">
            Join the most elite network of professional runners in Nairobi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
           <div className="p-6 md:p-8 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/60 rounded-[2rem]">
              <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 mb-6 flex items-center gap-3">
                <TrendingUp />
                Growth Potentials
              </h3>
              <ul className="space-y-4">
                 {[
                   "Earn up to KSh 45,000 monthly",
                   "Flexible high-density routes",
                   "Weekly performance bonuses",
                   "Health insurance subsidies"
                 ].map((l, i) => (
                   <li key={i} className="flex items-center gap-3 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle size={14} />
                      {l}
                   </li>
                 ))}
              </ul>
           </div>
           <div className="p-6 md:p-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/60 rounded-[2rem]">
              <h3 className="text-2xl font-black text-indigo-900 dark:text-indigo-400 mb-6 flex items-center gap-3">
                <Award />
                Requirements
              </h3>
              <ul className="space-y-4">
                 {[
                   "Valid Government ID",
                   "Smartphone with GPS",
                   "Strong local area knowledge",
                   "Reliable mode of transit"
                 ].map((l, i) => (
                   <li key={i} className="flex items-center gap-3 text-sm font-bold text-indigo-800 dark:text-indigo-300">
                      <CheckCircle size={14} />
                      {l}
                   </li>
                 ))}
              </ul>
           </div>
        </div>

        <div className="space-y-12">
          <h2 className="text-4xl font-black text-[#0a2e5c] dark:text-white text-center italic">The Onboarding Path</h2>
          {[
            { step: 1, title: "Online Application", desc: "Submit your details and verification documents through our partner portal." },
            { step: 2, title: "Virtual Interview", desc: "Basic assessment of customer service skills and logistical aptitude." },
            { step: 3, title: "Standards Training", desc: "Learn our network protocols for laundry, shopping, and package handling." },
            { step: 4, title: "Live Activation", desc: "Receive your first task and start earning immediately." }
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-8 group">
               <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary/20 flex items-center justify-center text-2xl font-black text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  {s.step}
               </div>
               <div className="flex-1">
                  <h4 className="text-xl font-black text-[#0a2e5c] dark:text-white tracking-tight">{s.title}</h4>
                  <p className="text-slate-500 font-medium text-sm">{s.desc}</p>
               </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
            <button 
              onClick={onStartApplication}
              className="px-10 py-4 md:py-5 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/25 hover:scale-105 transition-all"
            >
               Start My Application
            </button>
        </div>
      </div>
    </PageWrapper>
  );
};

// Placeholder for custom icons if needed - using imported icons
const CustomUserCheck = ({ size = 24, className = "" }) => <UserCheck size={size} className={className} />;
const CustomDroplets = ({ size = 24, className = "" }) => <Droplets size={size} className={className} />;
