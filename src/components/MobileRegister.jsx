import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  UserPlus,
  Volume2,
  VolumeX
} from 'lucide-react';
import SpinWheel from './SpinWheel';
import { audio } from '../utils/audio';
import { getExactVoucherCode } from '../utils/voucher';
import { DEFAULT_PRIZES, pickWinningPrize, calculateTargetAngle } from '../utils/prizes';

export default function MobileRegister() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    school: '',
    grade: 'Grade 6 - 8 (Middle School)',
    interest: 'Robotics & AI'
  });

  const [prizes, setPrizes] = useState(DEFAULT_PRIZES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [myRegistration, setMyRegistration] = useState(null);

  // Local smartphone spin state
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPreparingSpin, setIsPreparingSpin] = useState(false);
  const [targetAngle, setTargetAngle] = useState(0);
  const [spinDuration, setSpinDuration] = useState(6500);
  const [isMuted, setIsMuted] = useState(false);

  const spinLockRef = useRef(false);
  const pendingSpinResultRef = useRef(null);
  const spinFinalizedRef = useRef(false);
  const backupTimerRef = useRef(null);

  // Restore saved session & optionally fetch latest prizes once
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stem_xpert_didac_reg');
      if (saved) {
        const parsed = JSON.parse(saved);
        setMyRegistration(parsed);

        const lookupKey = parsed._id || parsed.phone;
        if (lookupKey && !String(lookupKey).startsWith('local_')) {
          fetch(`/api/participant/${encodeURIComponent(lookupKey)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.participant) {
                if (data.participant.status === 'cancelled') {
                  localStorage.removeItem('stem_xpert_didac_reg');
                  setMyRegistration(null);
                } else {
                  setMyRegistration(data.participant);
                  localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(data.participant));
                }
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {}

    fetch('/api/prizes')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.prizes && data.prizes.length > 0) {
          setPrizes(data.prizes);
        }
      })
      .catch(() => {});

    return () => {
      if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Register attendee (with resilient static fallback so expo visitors never get blocked)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const participant = {
        ...data.participant,
        status: data.participant?.status === 'completed' ? 'completed' : 'active'
      };
      setMyRegistration(participant);
      localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(participant));
      setLoading(false);
      return;
    } catch (err) {
      // If user left required fields blank or server returned a 400 validation message, surface it
      if (err.name !== 'AbortError' && err.message && err.message.includes('required')) {
        setError(err.message);
        setLoading(false);
        return;
      }
      // Otherwise fall back seamlessly to local session so the attendee can still spin immediately
      console.warn('Register fallback to static local mode:', err.message);
      const localParticipant = {
        _id: 'local_' + Date.now(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        school: formData.school.trim() || 'DIDAC Attendee',
        grade: formData.grade,
        interest: formData.interest,
        status: 'active',
        prizeWon: null,
        voucherCode: null
      };
      setMyRegistration(localParticipant);
      localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(localParticipant));
      setLoading(false);
    }
  };

  // Finalize spin & launch celebration confetti on smartphone
  const finalizeSmartphoneSpin = () => {
    if (spinFinalizedRef.current) return;
    spinFinalizedRef.current = true;
    if (backupTimerRef.current) {
      clearTimeout(backupTimerRef.current);
      backupTimerRef.current = null;
    }

    const result = pendingSpinResultRef.current;
    setIsSpinning(false);
    setIsPreparingSpin(false);
    spinLockRef.current = false;

    if (!result) return;

    audio.playFanfare();
    try {
      confetti({
        particleCount: 90,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#FF4612', '#FBA94B', '#FFD700', '#2563EB', '#059669']
      });
    } catch (e) {}

    setMyRegistration((prev) => {
      const completedDoc = {
        ...(prev || {}),
        ...(result.participant || {}),
        status: 'completed',
        prizeWon: result.prize,
        voucherCode: result.voucherCode || getExactVoucherCode(result.prize)
      };
      localStorage.setItem('stem_xpert_didac_reg', JSON.stringify(completedDoc));
      return completedDoc;
    });
    pendingSpinResultRef.current = null;
  };

  // Trigger spin right inside the smartphone screen!
  const handleSpinClick = async () => {
    if (spinLockRef.current || isSpinning || isPreparingSpin || !myRegistration || myRegistration.status === 'completed') {
      return;
    }
    spinLockRef.current = true;
    setIsPreparingSpin(true);
    spinFinalizedRef.current = false;
    audio.init();

    const beginWheelAnimation = (spinData) => {
      pendingSpinResultRef.current = spinData;
      const dur = spinData.durationMs || 6500;
      setTargetAngle(spinData.targetAngle);
      setSpinDuration(dur);
      setIsPreparingSpin(false);
      setIsSpinning(true);

      // Backup timer ensures completion even if mobile browser pauses animation frame briefly
      backupTimerRef.current = setTimeout(() => {
        finalizeSmartphoneSpin();
      }, dur + 400);
    };

    // Only hit backend if participant was created on server; otherwise instant local spin
    const hasServerId = myRegistration._id && !String(myRegistration._id).startsWith('local_');
    if (hasServerId) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch('/api/spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestedBy: 'mobile-phone',
            participantId: myRegistration._id,
            phone: myRegistration.phone
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (data.success && data.prize) {
          beginWheelAnimation({
            prize: data.prize,
            voucherCode: getExactVoucherCode(data.prize) || data.voucherCode,
            targetAngle: data.targetAngle,
            durationMs: data.durationMs || 6500,
            participant: data.participant || myRegistration
          });
          return;
        }
      } catch (err) {
        console.warn('Spin falling back to local static selection:', err.message);
      }
    }

    // Instant client-side spin fallback
    const localPrize = pickWinningPrize(prizes);
    const idx = Math.max(0, prizes.findIndex((p) => p.id === localPrize.id));
    const localAngle = calculateTargetAngle(idx, prizes.length);
    beginWheelAnimation({
      prize: localPrize,
      voucherCode: getExactVoucherCode(localPrize),
      targetAngle: localAngle,
      durationMs: 6500,
      participant: myRegistration
    });
  };

  // Clear session to register another student / spin again
  const handleClearSession = () => {
    if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    spinLockRef.current = false;
    pendingSpinResultRef.current = null;
    setIsSpinning(false);
    setIsPreparingSpin(false);
    localStorage.removeItem('stem_xpert_didac_reg');
    setMyRegistration(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      school: '',
      grade: 'Grade 6 - 8 (Middle School)',
      interest: 'Robotics & AI'
    });
  };

  const handleToggleSound = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

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
        <div className="flex items-center gap-3.5 sm:gap-4">
          <img src="/logo.png" alt="STEM Xpert" className="h-9 sm:h-11 object-contain drop-shadow" />
          <img src="/didac-skills-logo.png" alt="DIDAC SKILLS" className="h-9 sm:h-11 object-contain drop-shadow brightness-110" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-lg bg-brand-card border border-brand-border text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-brand-amber" />}
          </button>
          {myRegistration && !isSpinning && (
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
      <main className="max-w-md w-full mx-auto my-4 flex-1 flex flex-col justify-center">

        {/* CASE 1: Won a Scholarship Prize -> Voucher + Big WhatsApp Claim Button */}
        {myRegistration?.status === 'completed' && (
          <div className="bg-gradient-to-b from-brand-card via-brand-dark to-brand-navy border-2 border-brand-orange rounded-3xl p-5 sm:p-6 text-center shadow-2xl relative overflow-hidden animate-fadeIn">

            {/* Header with Official Logos */}
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="STEM Xpert" className="h-8 sm:h-10 object-contain drop-shadow" />
                <div className="text-left hidden sm:block">
                  <div className="text-[10px] font-black text-white uppercase">STEM-Xpert</div>
                  <div className="text-[8px] text-brand-amber font-semibold">Nurturing Innovation</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[9px] font-black text-brand-amber uppercase tracking-wider">25-27 NOV 2026</div>
                  <div className="text-[8px] text-slate-400">BIEC, Bengaluru</div>
                </div>
                <img src="/didac-skills-logo.png" alt="DIDAC SKILLS" className="h-8 sm:h-10 object-contain drop-shadow brightness-110" />
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

              {/* Voucher Code Box */}
              <div className="mt-3.5 pt-3 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-1.5">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">OFFICIAL VOUCHER CODE:</span>
                <span className="font-mono text-base font-black text-brand-amber px-4 py-1 rounded-lg bg-brand-card border-2 border-brand-orange/60 tracking-widest shadow-sm">
                  {getExactVoucherCode(myRegistration.prizeWon) || myRegistration.voucherCode}
                </span>
              </div>
            </div>

            {/* Big Prominent Claim Your Prize on WhatsApp Button */}
            <div className="my-5">
              <a
                href={getWhatsAppClaimUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 sm:py-5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] active:scale-95 text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-2xl shadow-emerald-950/50 border-2 border-white/40 transition-all animate-bounce"
              >
                <svg className="w-6 h-6 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span>CLAIM YOUR PRIZE ON WHATSAPP</span>
              </a>
            </div>

            {/* Option to Register Another Student / Spin Again */}
            <div className="pt-3 border-t border-brand-border/60">
              <button
                onClick={handleClearSession}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber hover:brightness-110 active:scale-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Another Student / Spin Again</span>
              </button>
            </div>
          </div>
        )}

        {/* CASE 2: Registered -> Interactive Spin Wheel Right on Smartphone! */}
        {myRegistration && myRegistration.status !== 'completed' && (
          <div className="bg-gradient-to-b from-brand-card to-brand-navy border-2 border-brand-orange/70 rounded-3xl p-4 sm:p-5 text-center shadow-2xl animate-fadeIn flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-amber animate-spin-slow" />
              <span>Wheel Unlocked for {myRegistration.name}!</span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {isSpinning ? 'Spinning for Your Prize...' : 'Tap the Wheel to Spin & Win!'}
            </h2>
            <p className="text-[11px] text-slate-300 mt-0.5 mb-3">
              Guaranteed 100% Free Course Scholarship!
            </p>

            {/* Full Interactive Spin Wheel on Smartphone */}
            <div className="my-1 flex items-center justify-center w-full">
              <SpinWheel
                prizes={prizes}
                isSpinning={isSpinning}
                targetAngle={targetAngle}
                duration={spinDuration}
                canSpin={!isSpinning && !isPreparingSpin}
                onSpinRequest={handleSpinClick}
                onSpinEnd={finalizeSmartphoneSpin}
                idleSpin={false}
                sizeClass="w-[min(82vw,350px)] h-[min(82vw,350px)]"
              />
            </div>

            {/* Big Spin Button below the wheel */}
            <button
              onClick={handleSpinClick}
              disabled={isSpinning || isPreparingSpin}
              className={`w-full mt-4 py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 ${
                isSpinning || isPreparingSpin
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber text-white hover:brightness-110 border-2 border-white/40 animate-pulse'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>
                {isSpinning
                  ? 'SPINNING WITH SUSPENSE...'
                  : isPreparingSpin
                  ? 'STARTING WHEEL...'
                  : 'TAP TO SPIN & WIN!'}
              </span>
            </button>

            {!isSpinning && !isPreparingSpin && (
              <button
                onClick={handleClearSession}
                className="text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto mt-3"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Register Another Student</span>
              </button>
            )}
          </div>
        )}

        {/* CASE 3: New Student Registration Form */}
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
                Spin right on your phone for a Free Course Scholarship!
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
                  <span>Unlocking Wheel...</span>
                ) : (
                  <>
                    <span>Register & Unlock Wheel!</span>
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
