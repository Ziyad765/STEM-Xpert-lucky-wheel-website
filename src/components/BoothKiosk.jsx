import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Maximize,
  Minimize,
  QrCode,
  Sparkles,
  Bot,
  Cpu,
  GraduationCap,
  Wifi,
  Edit2,
  Check
} from 'lucide-react';
import SpinWheel from './SpinWheel';
import { DEFAULT_PRIZES } from '../utils/prizes';

export default function BoothKiosk() {
  const [prizes, setPrizes] = useState(DEFAULT_PRIZES);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Smart QR Code URL
  const [registrationUrl, setRegistrationUrl] = useState(`${window.location.origin}/register`);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(`${window.location.origin}/register`);

  // Detect Smart QR URL & optionally sync prizes once (zero polling needed on static TV display)
  useEffect(() => {
    async function initStaticTV() {
      try {
        const res = await fetch('/api/network-info');
        if (res.ok) {
          const data = await res.json();
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            if (data.localIp && data.localIp !== 'localhost') {
              const wifiUrl = `http://${data.localIp}:3000/register`;
              setRegistrationUrl(wifiUrl);
              setCustomUrlInput(wifiUrl);
            }
          }
        }
      } catch (e) {}

      try {
        const prizeRes = await fetch('/api/prizes');
        if (prizeRes.ok) {
          const prizeData = await prizeRes.json();
          if (prizeData.prizes && prizeData.prizes.length > 0) {
            setPrizes(prizeData.prizes);
          }
        }
      } catch (e) {}
    }

    initStaticTV();
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSaveCustomUrl = () => {
    setRegistrationUrl(customUrlInput.trim());
    setIsEditingUrl(false);
  };

  return (
    <div className="h-screen h-[100dvh] max-h-screen bg-brand-dark bg-cyber-grid text-slate-100 flex flex-col justify-between select-none relative overflow-hidden">

      {/* Discreet Fullscreen Control (Top-Right for TV Display) */}
      <div className="fixed top-2.5 right-2.5 z-50 flex items-center gap-1.5">
        <button
          onClick={handleToggleFullscreen}
          className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white backdrop-blur-md transition-colors shadow-lg"
          title="Toggle TV Fullscreen"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* ---------------- STATIC TV STAGE: Scaled for Zero-Scroll ---------------- */}
      <main className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-2 py-0.5 flex flex-col justify-between items-center z-10 relative overflow-hidden">

        {/* TOP HEADER: Clean Transparent PNG Logos Flanking Priority Callout */}
        <div className="w-full max-w-6xl mx-auto px-3 pt-2 pb-0.5 flex items-center justify-between gap-3 sm:gap-6 animate-fadeIn shrink-0">
          {/* Left: STEM-Xpert Logo */}
          <div className="shrink-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="STEM Xpert"
              className="h-14 sm:h-18 md:h-22 lg:h-24 w-auto max-w-[150px] sm:max-w-[210px] md:max-w-[260px] object-contain drop-shadow-[0_4px_16px_rgba(255,70,18,0.35)]"
            />
          </div>

          {/* Center: Priority Writing for Passersby to Scan & Spin on Phone */}
          <div className="flex-1 flex flex-col items-center justify-center text-center min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-brand-amber/15 to-brand-orange/15 border border-brand-orange/40 text-brand-amber text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-brand-amber animate-spin-slow" />
              <span>DIDAC SKILLS 2026 • 100% GUARANTEED COURSE SCHOLARSHIP</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white text-center tracking-tight leading-tight">
              SCAN WITH PHONE & SPIN THE{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-amber via-brand-orange to-red-500">
                STEM-XPERT
              </span>{' '}
              WHEEL!
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-300 text-center max-w-xl mt-0.5">
              Scan the center QR code to register & spin right on your phone for a{' '}
              <strong className="text-brand-amber font-black">100% Free Course Scholarship</strong>!
            </p>
          </div>

          {/* Right: DIDAC SKILLS Logo */}
          <div className="shrink-0 flex items-center justify-center">
            <img
              src="/didac-skills-logo.png"
              alt="DIDAC SKILLS"
              className="h-14 sm:h-18 md:h-22 lg:h-24 w-auto max-w-[130px] sm:max-w-[180px] md:max-w-[220px] object-contain drop-shadow-[0_4px_16px_rgba(147,51,234,0.35)] brightness-110"
            />
          </div>
        </div>

        {/* CENTRAL STAGE: Gentle Rotating Wheel in BG + Translucent QR Overlay */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center w-full my-auto">

          {/* THE REAL LUCKY WHEEL: Ambient TV Display */}
          <div className="filter drop-shadow-[0_0_45px_rgba(255,70,18,0.28)] flex items-center justify-center">
            <SpinWheel
              prizes={prizes}
              isSpinning={false}
              canSpin={false}
              idleSpin={true}
              sizeClass="w-[min(94vw,min(74vh,640px))] h-[min(94vw,min(74vh,640px))]"
            />
          </div>

          {/* TRANSLUCENT QR OVERLAY */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center animate-fadeIn p-2 pointer-events-none">
            <div className="pointer-events-auto max-w-[285px] sm:max-w-[325px] backdrop-blur-[2px] bg-slate-950/50 border-2 border-brand-orange/80 rounded-3xl p-4 text-center shadow-[0_0_60px_rgba(0,0,0,0.95)] relative flex flex-col items-center">

              {/* Tech Corner Accents */}
              <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-brand-amber" />
              <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-brand-amber" />
              <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-brand-amber" />
              <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-brand-amber" />

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-orange text-white text-xs sm:text-sm font-black uppercase tracking-wider mb-2.5 shadow-md">
                <QrCode className="w-4 h-4 text-white" />
                <span>Scan with Phone to Spin</span>
              </div>

              {/* Crisp White QR Box */}
              <div className="p-2.5 sm:p-3 bg-white rounded-2xl shadow-2xl border-2 border-brand-orange">
                <QRCodeSVG
                  value={registrationUrl || 'http://localhost:3000/register'}
                  size={210}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Clean URL Indicator */}
              <div className="mt-2 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] text-brand-amber font-mono font-bold tracking-tight">
                {isEditingUrl ? (
                  <div className="flex items-center gap-1 w-full max-w-[190px]">
                    <input
                      type="text"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      className="px-2 py-0.5 rounded bg-brand-dark border border-brand-amber text-[10px] text-white w-full outline-none"
                    />
                    <button
                      onClick={handleSaveCustomUrl}
                      className="p-1 rounded bg-brand-orange text-white"
                      title="Apply URL"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 text-brand-orange shrink-0" />
                    <span className="truncate max-w-[175px]">{registrationUrl}</span>
                    <button
                      onClick={() => setIsEditingUrl(true)}
                      className="text-slate-400 hover:text-white p-0.5"
                      title="Edit URL"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              <p className="text-[11px] sm:text-xs text-slate-100 mt-1.5 font-extrabold drop-shadow">
                📱 Scan, Register & Spin on Your Phone!
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------- Bottom Ticker / Brand Footer ---------------- */}
      <footer className="border-t border-brand-border/60 bg-brand-navy/95 py-1.5 px-4 sm:px-6 z-20 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-[10px] sm:text-[11px]">
          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            <Bot className="w-3 h-3 text-brand-orange" />
            Robotics & AI Labs
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:flex items-center gap-1 text-slate-300 font-semibold">
            <Cpu className="w-3 h-3 text-brand-amber" />
            STEM Tinkering Kits
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            <GraduationCap className="w-3 h-3 text-emerald-400" />
            Skill Accelerator
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
          <a
            href="https://academy.stem-xpert.com/in/home"
            target="_blank"
            rel="noreferrer"
            className="text-brand-amber hover:underline font-bold"
          >
            academy.stem-xpert.com
          </a>
          <span>•</span>
          <a
            href="https://www.stem-xpert.com/in/home"
            target="_blank"
            rel="noreferrer"
            className="text-brand-orange hover:underline font-bold"
          >
            stem-xpert.com
          </a>
        </div>
      </footer>
    </div>
  );
}
