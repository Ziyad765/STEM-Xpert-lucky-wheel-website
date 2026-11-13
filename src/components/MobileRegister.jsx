import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle,
  Clock,
  AlertCircle,
  Trophy,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  UserPlus
} from 'lucide-react';
import { getExactVoucherCode } from '../utils/voucher';

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
  const [activating, setActivating] = useState(false);

  // Restore previous registration from localStorage & verify live status with DB
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stem_xpert_didac_reg');
      if (saved) {
        const parsed = JSON.parse(saved);
        setMyRegistration(parsed);

        // Fetch live state from server
        const lookupKey = parsed._id || parsed.phone;
        if (lookupKey) {
          fetch(`/api/participant/${encodeURIComponent(lookupKey)}`)
            .then(res => {
              if (res.status === 404) {
                // Only wipe if not completed yet (don't lose won prize)
                if (parsed.status !== 'completed') {
                  localStorage.removeItem('stem_xpert_didac_reg');
                  setMyRegistration(null);
                }
                return null;
              }
              return res.json();
            })
            .then(data => {
              if (!data) return;
              if (data.participant) {
                if (data.participant.status === 'cancelled') {
                  localStorage.removeItem('stem_xpert_didac_reg');
                  setMyRegistration(null);
                } else {
                  setMyRegistration(data.participant);
                  localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(data.participant));
                }
              }
            })
            .catch(() => { });
        }
      }
    } catch (e) { }
  }, []);

  // Poll & Socket Queue Sync
  useEffect(() => {
    if (socket) {
      socket.on('queue:init', (data) => {
        setQueueInfo({ active: data.active, queue: data.queue || [] });
        setIsSpinningServer(data.isSpinning || false);
      });

      socket.on('queue:update', (data) => {
        setQueueInfo({ active: data.active, queue: data.queue || [] });
        setIsSpinningServer(data.isSpinning || false);

        if (myRegistration) {
          const myId = myRegistration._id ? String(myRegistration._id) : null;
          const activeId = data.active?._id ? String(data.active._id) : null;
          const phoneMatch = data.active?.phone && data.active.phone === myRegistration.phone;

          if (activeId === myId || phoneMatch) {
            setMyRegistration(prev => ({ ...prev, status: 'active', queuePosition: 0 }));
          } else {
            const inQueue = (data.queue || []).find(q => (myId && String(q._id) === myId) || q.phone === myRegistration.phone);
            if (inQueue) {
              setMyRegistration(prev => ({ ...prev, status: 'waiting', queuePosition: inQueue.queuePosition }));
            }
          }
        }
      });

      socket.on('spin:completed', (data) => {
        const myId = myRegistration?._id ? String(myRegistration._id) : null;
        const winnerId = data.participant?._id ? String(data.participant._id) : null;
        const phoneMatch = data.participant?.phone && data.participant.phone === myRegistration?.phone;

        if ((winnerId && winnerId === myId) || phoneMatch) {
          const completedDoc = {
            ...myRegistration,
            ...data.participant,
            status: 'completed',
            prizeWon: data.prize,
            voucherCode: data.voucherCode
          };
          setMyRegistration(completedDoc);
          localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(completedDoc));
          setIsSpinningServer(false);
        }
      });
    }

    // High-reliability 1.2s polling fallback
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/queue');
        if (!res.ok) return;
        const data = await res.json();

        setQueueInfo({ active: data.active, queue: data.queue || [] });
        setIsSpinningServer(data.isSpinning || false);

        if (myRegistration) {
          const myId = myRegistration._id ? String(myRegistration._id) : null;
          const myPhone = myRegistration.phone;

          // 1. Check if current/recent spin on booth screen was for ME
          const spinDoc = data.currentSpinData || data.lastCompletedSpin;
          const spinPerson = spinDoc?.participant;
          if (spinPerson) {
            const isMe =
              (myId && String(spinPerson._id) === myId) ||
              (myPhone && spinPerson.phone === myPhone) ||
              (myRegistration.email && spinPerson.email?.toLowerCase() === myRegistration.email.toLowerCase());

            if (isMe) {
              if (data.isSpinning) {
                setIsSpinningServer(true);
              } else {
                // Spin completed! Reveal prize and WhatsApp claim immediately!
                const completedDoc = {
                  ...myRegistration,
                  ...spinPerson,
                  status: 'completed',
                  prizeWon: spinDoc.prize || spinPerson.prizeWon,
                  voucherCode: getExactVoucherCode(spinDoc.prize || spinPerson.prizeWon) || spinDoc.voucherCode || spinPerson.voucherCode
                };
                setMyRegistration(completedDoc);
                localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(completedDoc));
                setIsSpinningServer(false);
                return;
              }
            }
          }

          // 2. Check active & waiting status
          const activeId = data.active?._id ? String(data.active._id) : null;
          const phoneMatch = data.active?.phone && data.active.phone === myPhone;

          if ((myId && activeId === myId) || phoneMatch) {
            if (data.active.status === 'completed' || data.active.prizeWon) {
              if (!data.isSpinning) {
                const completedDoc = {
                  ...myRegistration,
                  ...data.active,
                  status: 'completed'
                };
                setMyRegistration(completedDoc);
                localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(completedDoc));
                setIsSpinningServer(false);
              } else {
                setIsSpinningServer(true);
              }
            } else {
              const updated = { ...myRegistration, ...(data.active || {}), status: 'active', queuePosition: 0 };
              setMyRegistration(updated);
              localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(updated));
            }
          } else {
            const inQueue = (data.queue || []).find(q => (myId && String(q._id) === myId) || (myPhone && q.phone === myPhone));
            if (inQueue) {
              const updated = { ...myRegistration, ...inQueue, status: 'waiting', queuePosition: inQueue.queuePosition };
              setMyRegistration(updated);
              localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(updated));
            } else if (myRegistration.status !== 'completed' || !myRegistration.prizeWon) {
              // Check backend for completion status using ID or Phone
              const lookupKey = myId || myPhone;
              if (lookupKey) {
                try {
                  const pRes = await fetch(`/api/participant/${encodeURIComponent(lookupKey)}`);
                  if (pRes.ok) {
                    const pData = await pRes.json();
                    if (pData.participant) {
                      if (pData.participant.status === 'completed' || pData.participant.prizeWon) {
                        const completedDoc = {
                          ...myRegistration,
                          ...pData.participant,
                          status: 'completed'
                        };
                        setMyRegistration(completedDoc);
                        localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(completedDoc));
                        setIsSpinningServer(false);
                      } else if (pData.participant.status === 'cancelled') {
                        localStorage.removeItem('stem_xpert_didac_reg');
                        setMyRegistration(null);
                      }
                    }
                  }
                } catch (e) { }
              }
            }
          }
        }
      } catch (e) { }
    }, 1200);

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

      // If registered as waiting but no one is active, trigger immediate activation
      if (data.participant.status === 'waiting') {
        fetch('/api/queue/activate-me', { method: 'POST' }).catch(() => { });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Student taps "Step Up to the Wheel" from their phone
  const handleActivateTurn = async () => {
    setActivating(true);
    try {
      const res = await fetch('/api/queue/activate-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: myRegistration?._id })
      });
      const data = await res.json();
      if (data.active) {
        setMyRegistration(prev => ({ ...prev, status: 'active', queuePosition: 0 }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActivating(false);
    }
  };

  // Clear session to register another student
  const handleClearSession = () => {
    localStorage.removeItem('stem_xpert_didac_reg');
    setMyRegistration(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      school: '',
      grade: 'Grade 6 - 8',
      interest: 'Robotics & AI'
    });
  };

  // Remote trigger spin
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
              voucherCode: getExactVoucherCode(data.prize)
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

  // Check if it's my turn
  const isMyTurn = myRegistration && (
    myRegistration.status === 'active' ||
    (queueInfo.active && String(queueInfo.active._id) === String(myRegistration._id)) ||
    (queueInfo.active?.phone && myRegistration.phone && queueInfo.active.phone === myRegistration.phone) ||
    (queueInfo.active?.email && myRegistration.email && queueInfo.active.email.toLowerCase() === myRegistration.email.toLowerCase())
  );

  // WhatsApp Claim URL Generator
  const getWhatsAppClaimUrl = () => {
    const rawNumber = import.meta.env.VITE_COMPANY_WHATSAPP || '919400451133';
    const cleanNumber = rawNumber.replace(/\D/g, '');
    const prizeLabel = myRegistration?.prizeWon?.label || 'Course Scholarship';
    const voucher = getExactVoucherCode(myRegistration?.prizeWon) || myRegistration?.voucherCode || 'DIDAC100';
    const studentName = myRegistration?.name || 'Student';
    const school = myRegistration?.school || 'DIDAC Attendee';
    const phone = myRegistration?.phone || '';
    const email = myRegistration?.email || '';

    const text =
      `Hi STEM-Xpert Team! ` +
      `I just won a scholarship course on the Lucky Wheel at your DIDAC India 2026 booth! ` +
      ` *Name:* ${studentName} ` +
      ` *School/Org:* ${school} ` +
      ` *Course Won:* ${prizeLabel} ` +
      ` *Voucher Code:* ${voucher} ` +
      ` *Phone:* ${phone} ` +
      ` *Email:* ${email} ` +
      `Please verify my voucher code and send me the course access instructions. Thank you!`;

    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-brand-dark bg-cyber-grid text-slate-100 flex flex-col justify-between p-4 sm:p-6">

      {/* Mobile Header with Official STEM Xpert & DIDAC SKILLS Logos */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-3 border-b border-brand-border/60">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="STEM Xpert" className="h-7 sm:h-8 object-contain drop-shadow" />
          <img src="/didac-skills-logo.png" alt="DIDAC SKILLS" className="h-7 sm:h-8 object-contain drop-shadow brightness-110" />
        </div>
        <div className="flex items-center gap-2">
          {myRegistration && (
            <button
              onClick={handleClearSession}
              className="px-2.5 py-1 rounded-lg bg-brand-card hover:bg-brand-border text-brand-amber hover:text-white border border-brand-amber/40 text-[11px] font-bold flex items-center gap-1 transition-all"
              title="Start fresh or spin again"
            >
              <RotateCcw className="w-3 h-3 text-brand-orange" />
              <span>New Spin</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto my-5 flex-1 flex flex-col justify-center">

        {/* CASE 1: Student has won a scholarship prize */}
        {myRegistration?.status === 'completed' && (
          <div className="bg-gradient-to-b from-brand-card via-brand-dark to-brand-navy border-2 border-brand-orange rounded-3xl p-5 sm:p-6 text-center shadow-2xl relative overflow-hidden animate-fadeIn">

            {/* Header with Official Logos: STEM-Xpert & DIDAC SKILLS (Transparent PNGs) */}
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="STEM Xpert" className="h-6 sm:h-7 object-contain drop-shadow" />
                <div className="text-left hidden sm:block">
                  <div className="text-[9px] font-black text-white uppercase">STEM-Xpert</div>
                  <div className="text-[7px] text-brand-amber font-semibold">Nurturing Innovation</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[8px] font-black text-brand-amber uppercase tracking-wider">25-27 NOV 2026</div>
                  <div className="text-[7px] text-slate-400">BIEC, Bengaluru</div>
                </div>
                <img src="/didac-skills-logo.png" alt="DIDAC SKILLS" className="h-6 sm:h-7 object-contain drop-shadow brightness-110" />
              </div>
            </div>

            {/* Visitor Voucher Banner */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-orange/20 border border-brand-orange/50 text-brand-amber text-[10px] font-black tracking-widest uppercase mb-1.5">
              <span>DIDAC SKILLS 2026 • VISITOR VOUCHER</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-tight">
              Congratulations, {myRegistration.name}!
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {myRegistration.school}
            </p>

            {/* Official Voucher Ticket Card */}
            <div className="my-3.5 p-4 rounded-2xl bg-brand-dark/95 border-2 border-brand-border shadow-inner text-center relative">

              {/* 100% Scholarship Voucher Badge */}
              <div className="inline-block px-3.5 py-1 rounded-xl bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber text-white font-black text-xs sm:text-sm tracking-wider uppercase mb-2 shadow-md">
                100% SCHOLARSHIP VOUCHER
              </div>

              {/* Course Title from Voucher */}
              <div className="text-xl sm:text-2xl font-black text-white my-1 tracking-tight">
                {myRegistration.prizeWon?.label || 'Course Scholarship'}
              </div>

              {/* Course Description from Voucher */}
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed mt-1">
                {myRegistration.prizeWon?.description}
              </p>

              {/* Tags / Pills from Voucher */}
              {myRegistration.prizeWon?.tags && myRegistration.prizeWon.tags.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-2.5">
                  {myRegistration.prizeWon.tags.map((tag, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-md bg-brand-card border border-brand-border text-[10px] text-brand-amber font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Hexagon Voucher Code Box */}
              <div className="mt-3.5 pt-3 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-1.5">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">OFFICIAL VOUCHER CODE:</span>
                <span className="font-mono text-base font-black text-brand-amber px-4 py-1 rounded-lg bg-brand-card border-2 border-brand-orange/60 tracking-widest shadow-sm">
                  {getExactVoucherCode(myRegistration.prizeWon) || myRegistration.voucherCode}
                </span>
              </div>
            </div>

            <div className="text-xs text-emerald-400 flex items-center justify-center gap-1.5 mb-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Confirmation recorded for {myRegistration.email}</span>
            </div>

            {/* Step-by-Step Course Redemption Guide */}
            <div className="my-3.5 p-4 rounded-2xl bg-brand-dark/95 border-2 border-brand-orange/40 text-left shadow-lg">
              <div className="font-extrabold text-brand-amber text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2.5 pb-2 border-b border-brand-border/60">
                <span>📖</span>
                <span>Simple Steps to Access Your Course:</span>
              </div>

              {/* AI for Teachers */}
              {(myRegistration.prizeWon?.label || '').toLowerCase().includes('teacher') && (
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Visit: <a href="https://academy.stem-xpert.com/in/course/AI-for-Teachers" target="_blank" rel="noreferrer" className="text-cyan-400 font-bold underline">academy.stem-xpert.com/in/course/AI-for-Teachers</a></span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span><strong>Log in</strong> to your account or <strong>Sign Up</strong> if you're a new user.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Open the <strong>AI for Teachers</strong> course.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <span>Click <strong>Enroll Now</strong> and complete the enrollment.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange font-bold flex items-center justify-center shrink-0 text-[10px]">5</span>
                    <span>Go to your <strong>Dashboard</strong> and click <strong>Start Learning</strong>!</span>
                  </div>
                </div>
              )}

              {/* STEM-Xpert AI Virtual Lab */}
              {((myRegistration.prizeWon?.label || '').toLowerCase().includes('virtual') || (myRegistration.prizeWon?.label || '').toLowerCase().includes('lab') || (myRegistration.prizeWon?.label || '').toLowerCase().includes('robotics')) && (
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Visit: <a href="https://stem-xpert.com/in/school-registration" target="_blank" rel="noreferrer" className="text-cyan-400 font-bold underline">stem-xpert.com/in/school-registration</a></span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Complete the registration form with your school details.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Under lab selection, choose <strong>CTAI & CODING LAB</strong>.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <span>Submit your registration to activate hands-on virtual AI tinkering!</span>
                  </div>
                </div>
              )}

              {/* STEM Facilitator / Skill Trainer Course */}
              {((myRegistration.prizeWon?.label || '').toLowerCase().includes('trainer') || (myRegistration.prizeWon?.label || '').toLowerCase().includes('facilitator') || (myRegistration.prizeWon?.label || '').toLowerCase().includes('skill')) && (
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Visit: <a href="https://academy.stem-xpert.com/in/course/STEM-Facilitator-Course" target="_blank" rel="noreferrer" className="text-cyan-400 font-bold underline">academy.stem-xpert.com/in/course/STEM-Facilitator-Course</a></span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Sign up with your email ID and verify with the OTP.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Complete profile and go to <strong>Course List → Educator / Trainer Program → STEM Facilitator Course</strong>.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <span>Click <strong>Enroll Now</strong> and enter coupon code: <strong className="font-mono text-brand-amber font-bold">SF100</strong>.</span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">5</span>
                    <span>Click Apply & start learning from your Dashboard!</span>
                  </div>
                  <div className="mt-2 p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 text-[10px] text-blue-200">
                    🎓 <strong>Certificate:</strong> Complete course sessions, register & take the Evaluation Exam, then download certificate from Account → Certificate.
                  </div>
                </div>
              )}
            </div>

            {/* Direct WhatsApp Claim Button */}
            <div className="my-4 pt-2 border-t border-brand-border/60">
              <a
                href={getWhatsAppClaimUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] active:scale-95 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/40 border border-white/40 transition-all animate-bounce"
              >
                <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span>CLAIM YOUR PRIZE ON WHATSAPP</span>
              </a>
              <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                💬 Tap to send your voucher code to STEM-Xpert on WhatsApp for instant course activation!
              </p>
            </div>

            <div className="space-y-2 mt-3 pt-2 border-t border-brand-border/60">
              {myRegistration.prizeWon?.enrollUrl && (
                <a
                  href={myRegistration.prizeWon.enrollUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-navy border border-brand-border hover:bg-brand-border text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <span>Enroll / Access Course on STEM-Xpert</span>
                  <ExternalLink className="w-3.5 h-3.5 text-brand-orange" />
                </a>
              )}

              <button
                onClick={handleClearSession}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber hover:brightness-110 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Another Student / Spin Again</span>
              </button>
            </div>
          </div>
        )}

        {/* CASE 2: Registered and it is YOUR TURN (Active Player) */}
        {myRegistration && myRegistration.status !== 'completed' && isMyTurn && (
          <div className="space-y-3 animate-fadeIn">
            {/* Massive Glowing Robot Screen Callout Banner */}
            <div className="bg-gradient-to-b from-brand-orange/25 via-brand-card to-brand-navy border-2 border-brand-orange rounded-3xl p-5 text-center shadow-[0_0_50px_rgba(255,70,18,0.4)] relative overflow-hidden">

              {/* Flashing Top Pulse Beacon */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2.5 shadow-md animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>IT IS YOUR TURN RIGHT NOW!</span>
              </div>

              {/* Big Animated Robot + Pointing Hand + Wheel */}
              <div className="text-4xl sm:text-5xl my-1.5 animate-bounce">
                🤖 👈 🎡
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase">
                {myRegistration.name}, STEP UP TO THE ROBOT SCREEN!
              </h2>

              {/* THE BIG PROMINENT ACTION CARD */}
              <div className="my-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber text-white font-black text-base sm:text-lg shadow-2xl border-2 border-white/60 animate-pulse tracking-wide">
                👉 TAP THE ROBOT SCREEN WHEEL TO SPIN!
              </div>

              <p className="text-xs text-amber-100 font-bold max-w-xs mx-auto leading-relaxed">
                Look straight at the robot / booth screen in front of you. Tap the center of the wheel on the screen to start your lucky spin!
              </p>
            </div>

            {/* In case the wheel is spinning */}
            {isSpinningServer ? (
              <div className="w-full py-5 px-5 rounded-3xl bg-gradient-to-r from-brand-orange/30 via-orange-500/30 to-brand-amber/30 border-2 border-brand-orange text-center shadow-2xl animate-pulse">
                <div className="text-3xl mb-1.5 animate-spin-slow inline-block">🎡</div>
                <div className="text-base font-black text-brand-amber uppercase tracking-wider">
                  Wheel is Spinning Live on Robot Screen!
                </div>
                <p className="text-xs text-white font-bold mt-1">
                  👀 Look up at the screen! Your scholarship prize is landing now!
                </p>
              </div>
            ) : (
              /* Secondary option: Spin remotely from phone */
              <div className="text-center pt-0.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">
                  — OR SPIN REMOTELY FROM YOUR PHONE —
                </div>
                <button
                  onClick={handleRemoteSpin}
                  className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 bg-brand-card hover:bg-brand-border text-brand-amber hover:text-white border-2 border-brand-orange/50"
                >
                  <Sparkles className="w-4 h-4 text-brand-orange" />
                  <span>TAP HERE TO SPIN FROM PHONE</span>
                </button>
              </div>
            )}

            <button
              onClick={handleClearSession}
              className="text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto pt-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Cancel or Register Another Student</span>
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

            {/* Action button to immediately activate turn if ready */}
            <button
              onClick={handleActivateTurn}
              disabled={activating}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber hover:brightness-110 active:scale-95 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition-all mb-3 animate-pulse"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{activating ? 'Activating Your Turn...' : "⚡ Ready to Spin? Step Up to Wheel!"}</span>
            </button>

            <div className="text-xs text-slate-400 bg-brand-dark/50 p-3 rounded-xl border border-brand-border/40">
              💡 Tap above or watch the big screen — when your name is called, your spin button will unlock automatically!
            </div>

            <button
              onClick={handleClearSession}
              className="w-full mt-4 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors underline underline-offset-4"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Register Another Student / Clear</span>
            </button>
          </div>
        )}

        {/* CASE 4: New Student Registration Form */}
        {!myRegistration && (
          <div className="bg-gradient-to-b from-brand-card to-brand-navy border border-brand-border rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-amber/15 border border-brand-amber/40 text-brand-amber text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>DIDAC SKILLS 2026 • BIEC BENGALURU</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Register & Spin to Win
              </h2>
              <p className="text-xs text-brand-amber font-semibold mt-1">
                Guaranteed Free Course or Virtual Lab Access!
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
                className="w-full mt-4 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-brand-orange to-brand-amber hover:brightness-110 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/30 transition-all"
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
