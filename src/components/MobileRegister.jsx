import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Trophy, 
  ArrowRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

export default function MobileRegister({ socket }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    school: '',
    grade: 'Grade 6 - 8',
    interest: 'Robotics & AI'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [myRegistration, setMyRegistration] = useState(null);
  const [queueInfo, setQueueInfo] = useState({ active: null, queue: [] });
  const [isSpinningServer, setIsSpinningServer] = useState(false);

  // Restore previous registration from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stem_xpert_didac_reg');
      if (saved) {
        setMyRegistration(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Real-time Socket + Polling Fallback (For Vercel Serverless)
  useEffect(() => {
    if (socket) {
      socket.on('queue:init', (data) => {
        setQueueInfo({ active: data.active, queue: data.queue || [] });
        setIsSpinningServer(data.isSpinning || false);
      });

      socket.on('queue:update', (data) => {
        setQueueInfo({ active: data.active, queue: data.queue || [] });
        setIsSpinningServer(data.isSpinning || false);

        if (myRegistration?._id) {
          if (data.active?._id === myRegistration._id) {
            setMyRegistration(prev => ({ ...prev, status: 'active', queuePosition: 0 }));
          } else {
            const inQueue = (data.queue || []).find(q => q._id === myRegistration._id);
            if (inQueue) {
              setMyRegistration(prev => ({ ...prev, status: 'waiting', queuePosition: inQueue.queuePosition }));
            }
          }
        }
      });

      socket.on('spin:completed', (data) => {
        if (data.participant?._id === myRegistration?._id) {
          const completedDoc = {
            ...data.participant,
            status: 'completed',
            prizeWon: data.prize,
            voucherCode: data.voucherCode
          };
          setMyRegistration(completedDoc);
          localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(completedDoc));
        }
      });
    }

    // Polling fallback
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/queue');
        if (!res.ok) return;
        const data = await res.json();
        
        setQueueInfo({ active: data.active, queue: data.queue || [] });
        setIsSpinningServer(data.isSpinning || false);

        if (myRegistration?._id) {
          if (data.active?._id === myRegistration._id) {
            setMyRegistration(prev => ({ ...prev, status: 'active', queuePosition: 0 }));
          } else {
            const inQueue = (data.queue || []).find(q => q._id === myRegistration._id);
            if (inQueue) {
              setMyRegistration(prev => ({ ...prev, status: 'waiting', queuePosition: inQueue.queuePosition }));
            }
          }
        }
      } catch (e) {}
    }, 1500);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('queue:init');
        socket.off('queue:update');
        socket.off('spin:completed');
      }
    };
  }, [socket, myRegistration]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setMyRegistration(data.participant);
      localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(data.participant));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Remote trigger spin on the big booth screen
  const handleRemoteSpin = async () => {
    setIsSpinningServer(true);
    try {
      if (socket && socket.connected) {
        socket.emit('spin:trigger', { requestedBy: 'mobile-phone', id: myRegistration?._id });
      } else {
        const res = await fetch('/api/spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestedBy: 'mobile-phone' })
        });
        const data = await res.json();
        if (data.success && data.prize) {
          setTimeout(() => {
            const completedDoc = {
              ...myRegistration,
              status: 'completed',
              prizeWon: data.prize,
              voucherCode: `STEM-${data.prize?.voucherPrefix || 'COURSE'}-${Math.floor(1000 + Math.random() * 9000)}`
            };
            setMyRegistration(completedDoc);
            localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(completedDoc));
            setIsSpinningServer(false);
          }, 7500);
        }
      }
    } catch (err) {
      console.error('Failed to trigger remote spin:', err);
      setIsSpinningServer(false);
    }
  };

  const isMyTurn = myRegistration && (
    myRegistration.status === 'active' || 
    queueInfo.active?._id === myRegistration._id ||
    (queueInfo.active?.phone === myRegistration.phone)
  );

  return (
    <div className="min-h-screen bg-brand-dark bg-cyber-grid text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      
      {/* Mobile Header with Official STEM Xpert Logo */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-3 border-b border-brand-border/60">
        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <img src="/logo.png" alt="STEM Xpert" className="h-7 object-contain" />
        </div>
        <div className="text-right">
          <span className="px-2 py-0.5 rounded bg-brand-orange/20 border border-brand-orange/40 text-brand-orange font-bold text-[10px] uppercase">
            DIDAC • Booth #E-42
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto my-5 flex-1 flex flex-col justify-center">

        {/* CASE 1: Student has already completed their spin */}
        {myRegistration?.status === 'completed' && (
          <div className="bg-gradient-to-b from-brand-card to-brand-navy border-2 border-brand-orange rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden animate-fadeIn">
            <div className="inline-flex p-3 rounded-full bg-brand-orange/20 border border-brand-orange text-brand-amber mb-3">
              <Trophy className="w-8 h-8 text-brand-gold" />
            </div>

            <h2 className="text-xl font-extrabold text-white">
              Congratulations, {myRegistration.name}!
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              You won a scholarship at our DIDAC booth!
            </p>

            {/* Prize Card */}
            <div className="my-5 p-4 rounded-2xl bg-brand-dark border border-brand-border">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Your Prize
              </div>
              <div className="text-2xl font-black text-brand-amber my-1.5">
                {myRegistration.prizeWon?.label || 'STEM Award'}
              </div>
              <p className="text-xs text-slate-300">
                {myRegistration.prizeWon?.description}
              </p>

              <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between">
                <span className="text-xs text-slate-400">VOUCHER CODE:</span>
                <span className="font-mono text-sm font-bold text-white px-3 py-1 rounded bg-brand-card border border-brand-orange/40">
                  {myRegistration.voucherCode}
                </span>
              </div>
            </div>

            <div className="text-xs text-emerald-400 flex items-center justify-center gap-1.5 mb-4">
              <CheckCircle className="w-4 h-4" />
              <span>Confirmation recorded for {myRegistration.email}</span>
            </div>

            <div className="space-y-2">
              <a
                href="https://academy.stem-xpert.com/in/home"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-orange to-brand-amber text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
              >
                <span>Explore STEM Courses on Academy</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => {
                  localStorage.removeItem('stem_xpert_didac_reg');
                  setMyRegistration(null);
                }}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white"
              >
                Register another student
              </button>
            </div>
          </div>
        )}

        {/* CASE 2: Registered and it is YOUR TURN (Active Player) */}
        {myRegistration && myRegistration.status !== 'completed' && isMyTurn && (
          <div className="bg-gradient-to-b from-brand-card to-brand-navy border-2 border-emerald-500/80 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden animate-pulse">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 mb-3">
              <Sparkles className="w-8 h-8 animate-spin-slow" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              It is Your Turn!
            </span>

            <h2 className="text-2xl font-black text-white">
              {myRegistration.name}, You're Up!
            </h2>
            <p className="text-xs text-slate-300 mt-1 mb-6">
              Watch the booth tablet screen. You can tap the button below to spin the wheel live!
            </p>

            <button
              onClick={handleRemoteSpin}
              disabled={isSpinningServer}
              className={`w-full py-5 px-6 rounded-2xl font-black text-base sm:text-lg uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 shadow-2xl active:scale-95 ${
                isSpinningServer
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber text-white hover:brightness-110 border-2 border-white/50 glow-orange'
              }`}
            >
              <span className="text-2xl">⚡</span>
              <span>{isSpinningServer ? 'WHEEL IS SPINNING...' : 'TAP TO SPIN BOOTH WHEEL NOW!'}</span>
            </button>
          </div>
        )}

        {/* CASE 3: Registered and in Waiting Queue */}
        {myRegistration && myRegistration.status !== 'completed' && !isMyTurn && (
          <div className="bg-gradient-to-b from-brand-card to-brand-navy border border-brand-border rounded-3xl p-6 text-center shadow-xl">
            <div className="inline-flex p-3 rounded-full bg-brand-amber/20 border border-brand-amber/40 text-brand-amber mb-3">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>

            <h2 className="text-xl font-black text-white">
              You are in Line, {myRegistration.name}!
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Please watch the booth screen.
            </p>

            {/* Position Box */}
            <div className="my-5 p-5 rounded-2xl bg-brand-dark border border-brand-border">
              <div className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
                Your Queue Position
              </div>
              <div className="text-4xl font-black text-brand-amber my-1 font-mono">
                #{myRegistration.queuePosition || 1}
              </div>
              <p className="text-[11px] text-slate-400">
                {myRegistration.school}
              </p>
            </div>

            <div className="text-xs text-slate-400 bg-brand-dark/50 p-3 rounded-xl border border-brand-border/40">
              💡 When your name is called on the screen, your phone will unlock the "Spin Now" button!
            </div>
          </div>
        )}

        {/* CASE 4: New Student Registration Form */}
        {!myRegistration && (
          <div className="bg-gradient-to-b from-brand-card to-brand-navy border border-brand-border rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-amber/15 border border-brand-amber/40 text-brand-amber text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>DIDAC 2026 Special</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Register & Spin to Win
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your details to join the live lucky wheel queue!
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-left text-xs">
              
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Student / Attendee Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-orange outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  WhatsApp / Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-orange outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Email Address * (for Prize Voucher)
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="e.g. aarav@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-orange outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  School / College / Institution *
                </label>
                <input
                  type="text"
                  name="school"
                  required
                  placeholder="e.g. National Public School, Bangalore"
                  value={formData.school}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-orange outline-none text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Grade / Role
                </label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-orange outline-none text-white text-sm"
                >
                  <option value="Grade 1 - 5 (Primary)">Grade 1 - 5 (Primary)</option>
                  <option value="Grade 6 - 8 (Middle School)">Grade 6 - 8 (Middle School)</option>
                  <option value="Grade 9 - 12 (High School)">Grade 9 - 12 (High School)</option>
                  <option value="College / University Student">College / University Student</option>
                  <option value="Educator / Teacher / Principal">Educator / Teacher / Principal</option>
                  <option value="Parent">Parent</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  What interests you most?
                </label>
                <select
                  name="interest"
                  value={formData.interest}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-dark border border-brand-border focus:border-brand-orange outline-none text-white text-sm"
                >
                  <option value="Robotics & AI">Robotics & AI</option>
                  <option value="Python & Coding">Python & Coding</option>
                  <option value="Hands-on STEM Tinkering Kits">Hands-on STEM Tinkering Kits</option>
                  <option value="Setting up STEM Lab in School">Setting up STEM Lab in School</option>
                  <option value="Teacher Training / Facilitator Program">Teacher Training / Facilitator Program</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-orange to-brand-amber hover:brightness-110 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/30 transition-all"
              >
                {loading ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <span>Join Queue & Spin!</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-2 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Your information is safe & only used for prize verification.</span>
              </div>
            </form>
          </div>
        )}

      </main>

      <footer className="text-center text-[10px] text-slate-500 max-w-md mx-auto pt-2 border-t border-brand-border/40 w-full">
        STEM-Xpert • Empowering Future Tech Leaders • didacindia.com
      </footer>

    </div>
  );
}
