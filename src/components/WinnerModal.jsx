import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { audio } from '../utils/audio';
import { 
  Trophy, 
  Sparkles, 
  Camera, 
  CheckCircle, 
  ArrowRight, 
  School,
  Clock
} from 'lucide-react';

export default function WinnerModal({
  winnerData,
  onNextStudent,
  onClose
}) {
  const [countdown, setCountdown] = useState(15);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const voucherCardRef = useRef(null);

  const participant = winnerData?.participant;
  const prize = winnerData?.prize;
  const voucherCode = winnerData?.voucherCode;

  // 1. Confetti & Audio fanfare
  useEffect(() => {
    audio.playFanfare();

    const end = Date.now() + 2500;
    const colors = ['#FF4612', '#FBA94B', '#FFD700', '#2563EB', '#059669'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors
    });
  }, []);

  // 2. Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onNextStudent();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onNextStudent]);

  // 3. Save voucher photo
  const handleSaveVoucher = async () => {
    if (!voucherCardRef.current) return;
    setIsCapturing(true);

    try {
      const canvas = await html2canvas(voucherCardRef.current, {
        scale: 2,
        backgroundColor: '#0B1120',
        useCORS: true
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `STEM-Xpert-Winner-${participant?.name?.replace(/\s+/g, '_') || 'Prize'}.png`;
      link.click();
      setCaptured(true);
      setTimeout(() => setCaptured(false), 3000);
    } catch (err) {
      console.error('Error generating voucher photo:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg flex flex-col items-center">
        
        {/* Floating Top Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange/20 border border-brand-orange/50 text-brand-amber text-xs font-bold uppercase tracking-wider mb-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-brand-gold animate-spin-slow" />
          <span>Official DIDAC Winner Moment</span>
        </div>

        {/* The Photogenic Voucher Certificate Card */}
        <div 
          ref={voucherCardRef}
          className="w-full bg-gradient-to-b from-brand-card to-brand-navy border-2 border-brand-orange rounded-3xl p-5 sm:p-7 text-center shadow-2xl relative overflow-hidden"
        >
          {/* Hexagon accents */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-brand-amber" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-brand-amber" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-brand-amber" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-brand-amber" />

          {/* Header with Official Logos: STEM-Xpert & DIDAC SKILLS */}
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                <img src="/logo.png" alt="STEM Xpert" className="h-6 sm:h-7 object-contain" />
              </div>
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
              <div className="bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                <img src="/didac-skills-logo.png" alt="DIDAC SKILLS" className="h-6 sm:h-7 object-contain" />
              </div>
            </div>
          </div>

          {/* Visitor Voucher Banner */}
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-orange/20 border border-brand-orange/50 text-brand-amber text-[10px] font-black tracking-widest uppercase mb-1">
            <span>DIDAC SKILLS 2026 • VISITOR VOUCHER</span>
          </div>

          {/* Winner Name */}
          <div className="my-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-tight">
              {participant?.name || 'Winner'}
            </h2>
            {participant?.school && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-brand-amber mt-0.5">
                <School className="w-3 h-3" />
                <span>{participant.school}</span>
              </div>
            )}
          </div>

          {/* Prize Banner Box */}
          <div className="my-3 p-3.5 rounded-2xl bg-brand-dark/95 border border-brand-border shadow-inner text-center">
            
            {/* 100% Scholarship Voucher Badge */}
            <div className="inline-block px-3 py-1 rounded-xl bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber text-white font-black text-xs sm:text-sm tracking-wider uppercase mb-1.5 shadow-md">
              100% SCHOLARSHIP VOUCHER
            </div>

            <div 
              className="text-lg sm:text-xl font-black mt-1 mb-1 tracking-tight"
              style={{ color: prize?.color || '#FF4612' }}
            >
              {prize?.label || 'STEM Award'}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 max-w-sm mx-auto">
              {prize?.description}
            </p>

            {/* Tags / Pills from Voucher */}
            {prize?.tags && prize.tags.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                {prize.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-brand-card border border-brand-border text-[9px] text-slate-300 font-semibold">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Voucher Code Box */}
            <div className="mt-3 pt-2.5 border-t border-brand-border/40 flex flex-col sm:flex-row items-center justify-between gap-1.5">
              <div className="text-left text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                VOUCHER CODE:
              </div>
              <div className="px-3 py-1 rounded-lg bg-brand-card border border-brand-orange/60 font-mono text-sm sm:text-base font-black text-brand-amber tracking-widest">
                {voucherCode}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3 h-3" /> Emailed to {participant?.email}
            </span>
            <span>•</span>
            <span>academy.stem-xpert.com</span>
          </div>
        </div>

        {/* Action Controls & Countdown */}
        <div className="w-full mt-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-brand-card/90 border border-brand-border p-3 rounded-2xl backdrop-blur-sm">
          
          <button
            onClick={handleSaveVoucher}
            disabled={isCapturing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-navy hover:bg-brand-border border border-brand-amber/40 text-brand-amber text-xs font-bold shadow-md transition-all active:scale-95"
          >
            {captured ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Saved to Photos!</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>📸 Take Photo / Save</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-brand-orange animate-pulse" />
              <span>Next in <strong className="text-white">{countdown}s</strong></span>
            </div>

            <button
              onClick={onNextStudent}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-orange to-brand-amber hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-brand-orange/30 transition-all active:scale-95"
            >
              <span>Next Student</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
