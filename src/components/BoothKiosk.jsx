import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  QrCode, 
  Sparkles, 
  ArrowRight,
  Bot,
  Cpu,
  GraduationCap,
  Wifi,
  Edit2,
  Check
} from 'lucide-react';
import SpinWheel from './SpinWheel';
import WinnerModal from './WinnerModal';
import { audio } from '../utils/audio';

export default function BoothKiosk({ socket }) {
  const [activeStudent, setActiveStudent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetAngle, setTargetAngle] = useState(0);
  const [spinDuration, setSpinDuration] = useState(7500);
  const [winnerModalData, setWinnerModalData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Smart QR Code URL
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  // View state: 'auto' | 'qr' | 'wheel'
  const [viewOverride, setViewOverride] = useState('auto');

  // Detect Smart QR URL (Production Vercel domain or Wi-Fi IP for local testing)
  useEffect(() => {
    async function resolveRegistrationUrl() {
      try {
        const res = await fetch('/api/network-info');
        const data = await res.json();
        
        // If on localhost, use local Wi-Fi IP so other phones on same Wi-Fi can scan
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          if (data.localIp && data.localIp !== 'localhost') {
            const wifiUrl = `http://${data.localIp}:3000/register`;
            setRegistrationUrl(wifiUrl);
            setCustomUrlInput(wifiUrl);
            return;
          }
        }
      } catch (e) {}

      // On production (e.g. Vercel: https://stem-xpert-lucky-wheel-website-delta.vercel.app/register)
      const currentOrigin = `${window.location.origin}/register`;
      setRegistrationUrl(currentOrigin);
      setCustomUrlInput(currentOrigin);
    }

    resolveRegistrationUrl();
  }, []);

  // Sync state via Socket.io AND Polling (Ensures Vercel Serverless runs seamlessly)
  useEffect(() => {
    if (socket) {
      socket.on('queue:init', (data) => {
        setActiveStudent(data.active);
        setQueue(data.queue || []);
        if (data.prizes) setPrizes(data.prizes);
      });

      socket.on('queue:update', (data) => {
        setActiveStudent(data.active);
        setQueue(data.queue || []);
        if (data.prizes) setPrizes(data.prizes);
      });

      socket.on('spin:started', (data) => {
        setIsSpinning(true);
        setTargetAngle(data.targetAngle);
        setSpinDuration(data.durationMs || 7500);
        setWinnerModalData(null);
      });

      socket.on('spin:completed', (data) => {
        setIsSpinning(false);
        setWinnerModalData(data);
      });
    }

    // High-reliability polling fallback (for Vercel serverless)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/queue');
        if (!res.ok) return;
        const data = await res.json();
        
        setActiveStudent(data.active);
        setQueue(data.queue || []);
        if (data.prizes && data.prizes.length > 0) {
          setPrizes(data.prizes);
        }

        // Auto-advance if idle and students are waiting in line
        if (!data.active && data.queue && data.queue.length > 0 && !isSpinning) {
          fetch('/api/queue/next', { method: 'POST' }).catch(() => {});
        }
      } catch (err) {}
    }, 1200);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        socket.off('queue:init');
        socket.off('queue:update');
        socket.off('spin:started');
        socket.off('spin:completed');
      }
    };
  }, [socket]);

  // Mode: if student is active OR in queue -> wheel stage; otherwise -> QR first
  const isWheelMode = viewOverride === 'wheel' || (viewOverride === 'auto' && Boolean(activeStudent || queue.length > 0));

  // Trigger spin
  const handleSpinClick = async () => {
    if (isSpinning) return;
    audio.init();

    try {
      // If no active student currently but someone is waiting in queue, auto-activate them!
      let currentStudent = activeStudent;
      if (!currentStudent && queue.length > 0) {
        const nextRes = await fetch('/api/queue/next', { method: 'POST' });
        const nextData = await nextRes.json();
        if (nextData.nextStudent) {
          currentStudent = nextData.nextStudent;
          setActiveStudent(currentStudent);
        } else {
          currentStudent = queue[0];
        }
      }

      if (!currentStudent) {
        alert('No registered student waiting. Please scan the QR code to register!');
        return;
      }

      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedBy: 'booth-screen' })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Could not start spin');
        return;
      }

      setIsSpinning(true);
      setTargetAngle(data.targetAngle);
      setSpinDuration(data.durationMs || 7500);

      setTimeout(async () => {
        setIsSpinning(false);
        setWinnerModalData({
          participant: currentStudent,
          prize: data.prize,
          voucherCode: `STEM-${data.prize?.voucherPrefix || 'COURSE'}-${Math.floor(1000 + Math.random() * 9000)}`
        });
      }, data.durationMs || 7500);

    } catch (err) {
      console.error('Failed to trigger spin:', err);
    }
  };

  const handleNextStudent = async () => {
    setWinnerModalData(null);
    try {
      const res = await fetch('/api/queue/next', { method: 'POST' });
      const data = await res.json();
      if (!data.nextStudent) {
        setViewOverride('auto');
      }
    } catch (err) {
      console.error('Failed to advance queue:', err);
    }
  };

  const handleToggleSound = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleSaveCustomUrl = () => {
    setRegistrationUrl(customUrlInput.trim());
    setIsEditingUrl(false);
  };

  return (
    <div className="min-h-screen bg-brand-dark bg-cyber-grid text-slate-100 flex flex-col justify-between select-none relative overflow-x-hidden">
      
      {/* ---------------- Top Navbar: Clean & Professional ---------------- */}
      <header className="px-5 py-3 border-b border-brand-border/60 bg-brand-navy/95 backdrop-blur-md flex items-center justify-between z-20 shadow-md">
        
        {/* Official Logo Banner */}
        <div className="flex items-center gap-4">
          <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-200 flex items-center">
            <img 
              src="/logo.png" 
              alt="STEM Xpert Logo" 
              className="h-8 sm:h-9 object-contain"
            />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              DIDAC INDIA 2026
            </div>
            <p className="text-[11px] text-slate-400">
              Bangalore International Exhibition Centre (BIEC)
            </p>
          </div>
        </div>

        {/* Minimal Controls: Sound & Fullscreen */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleSound}
            className="p-2.5 rounded-xl bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-brand-amber" />}
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="p-2.5 rounded-xl bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300 transition-colors"
            title="Toggle Kiosk Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ---------------- MAIN STAGE: QR First vs Wheel ---------------- */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col justify-center items-center z-10">

        {/* =========================================================================
            STATE 1: QR HERO ATTRACT SCREEN (SHOWS FIRST UNTIL REGISTRATION)
            ========================================================================= */}
        {!isWheelMode && (
          <div className="w-full flex flex-col items-center justify-center animate-fadeIn py-2">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-amber/15 to-brand-orange/15 border border-brand-orange/40 text-brand-amber text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-amber" />
              <span>DIDAC Exclusive • 100% Guaranteed Course Scholarship</span>
            </div>

            <h2 className="text-2xl sm:text-3xl tablet:text-4xl font-black text-white text-center tracking-tight max-w-2xl">
              Scan to Register & Spin the <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-amber via-brand-orange to-red-500">STEM-Xpert</span> Wheel!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 text-center max-w-xl mt-1 mb-5">
              Every participant wins a verified certification course or virtual robotics lab license!
            </p>

            {/* Tablet & Display Optimized QR Card */}
            <div className="w-full max-w-md bg-gradient-to-b from-brand-card to-brand-navy border-2 border-brand-orange/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
              
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-brand-amber" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-brand-amber" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-brand-amber" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-brand-amber" />

              <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-brand-amber uppercase tracking-wider mb-3">
                <QrCode className="w-4 h-4 text-brand-orange" />
                <span>Scan with Any Phone Camera</span>
              </div>

              {/* High Resolution QR Box */}
              <div className="inline-block p-4 bg-white rounded-2xl shadow-2xl mx-auto border-4 border-brand-orange/20">
                <QRCodeSVG
                  value={registrationUrl || 'http://localhost:3000/register'}
                  size={210}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Clean URL Indicator */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-brand-amber font-mono font-bold tracking-tight">
                {isEditingUrl ? (
                  <div className="flex items-center gap-1 w-full max-w-xs">
                    <input
                      type="text"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      className="px-2 py-1 rounded bg-brand-dark border border-brand-amber text-xs text-white w-full outline-none"
                    />
                    <button
                      onClick={handleSaveCustomUrl}
                      className="p-1 rounded bg-brand-orange text-white"
                      title="Apply URL"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                    <span className="truncate max-w-[260px]">{registrationUrl}</span>
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

              <p className="text-[12px] text-slate-300 mt-2">
                ⚡ <strong>Once you submit</strong>, this screen will instantly unlock your lucky wheel!
              </p>

              {/* 3 Step Pill Instructions */}
              <div className="mt-4 pt-3 border-t border-brand-border/60 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-300">
                <div className="bg-brand-dark/70 p-2 rounded-xl border border-brand-border">
                  <div className="text-brand-orange font-bold text-xs">1. SCAN</div>
                  <div>Camera on phone</div>
                </div>
                <div className="bg-brand-dark/70 p-2 rounded-xl border border-brand-border">
                  <div className="text-brand-amber font-bold text-xs">2. SUBMIT</div>
                  <div>Name & School</div>
                </div>
                <div className="bg-brand-dark/70 p-2 rounded-xl border border-brand-border">
                  <div className="text-emerald-400 font-bold text-xs">3. SPIN</div>
                  <div>Wheel unlocks live!</div>
                </div>
              </div>
            </div>

            {/* Waiting Queue Ticker */}
            {queue.length > 0 && (
              <div className="mt-5 w-full max-w-md bg-brand-card/90 border border-brand-border p-3 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-amber" />
                  <span className="text-slate-300">
                    <strong className="text-white">{queue.length}</strong> in queue:
                  </span>
                  <span className="text-brand-amber font-bold capitalize truncate max-w-[140px]">
                    {queue[0].name}
                  </span>
                </div>
                <button
                  onClick={handleNextStudent}
                  className="px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-md"
                >
                  <span>Start Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

          </div>
        )}

        {/* =========================================================================
            STATE 2: THE WHEEL STAGE (UNLOCKED UPON REGISTRATION OR SELECTION)
            ========================================================================= */}
        {isWheelMode && (
          <div className="w-full flex flex-col items-center animate-fadeIn py-1">
            
            {/* Active Student Callout Header */}
            <div className="w-full max-w-2xl mb-3">
              {(activeStudent || queue.length > 0) ? (
                (() => {
                  const currentPerson = activeStudent || queue[0];
                  return (
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-brand-card via-brand-navy to-brand-card border-2 border-brand-orange shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-orange to-brand-amber text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                          {currentPerson.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            <span className="text-xs text-brand-amber uppercase tracking-wider font-extrabold">Ready to Spin</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          </div>
                          <h2 className="text-lg sm:text-xl font-black text-white capitalize">
                            {currentPerson.name}
                          </h2>
                          <div className="text-xs text-slate-300">
                            {currentPerson.school} • <span className="text-brand-amber font-semibold">{currentPerson.interest}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setViewOverride('qr')}
                        className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-brand-dark/60 border border-brand-border shrink-0"
                      >
                        ← Back to QR
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="p-3 rounded-2xl bg-brand-card border border-brand-border flex items-center justify-between text-xs text-slate-400">
                  <span>No student currently selected. Waiting for registrations!</span>
                  <button
                    onClick={() => setViewOverride('qr')}
                    className="text-brand-amber font-bold hover:underline"
                  >
                    Open QR Scanner →
                  </button>
                </div>
              )}
            </div>

            {/* The 12-Slice Lucky Wheel with Dramatic Physics */}
            <SpinWheel
              prizes={prizes}
              isSpinning={isSpinning}
              targetAngle={targetAngle}
              duration={spinDuration}
              canSpin={Boolean(activeStudent || queue.length > 0)}
              onSpinRequest={handleSpinClick}
            />

            {/* Touch Action Button */}
            <div className="mt-4 sm:mt-5 w-full max-w-sm flex flex-col items-center">
              <button
                onClick={handleSpinClick}
                disabled={isSpinning || (!activeStudent && queue.length === 0)}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-base sm:text-lg tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 shadow-2xl active:scale-95 ${
                  isSpinning
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : (activeStudent || queue.length > 0)
                    ? 'bg-gradient-to-r from-brand-orange via-orange-500 to-brand-amber text-white shadow-brand-orange/40 hover:brightness-110 border-2 border-white/40 animate-pulse'
                    : 'bg-brand-card border border-brand-border text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-200" />
                <span>
                  {isSpinning 
                    ? 'SPINNING WITH SUSPENSE...' 
                    : activeStudent 
                    ? `SPIN FOR ${activeStudent.name.split(' ')[0].toUpperCase()}!` 
                    : queue.length > 0
                    ? `SPIN FOR ${queue[0].name.split(' ')[0].toUpperCase()}!`
                    : 'AWAITING REGISTRATION'}
                </span>
              </button>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                {activeStudent 
                  ? 'Student can also tap "Spin" from their phone!' 
                  : 'Scan the QR code to enter the queue!'}
              </p>
            </div>

            {/* Up Next Ticker */}
            {queue.length > 0 && (
              <div className="mt-3 w-full max-w-md bg-brand-card/70 border border-brand-border/60 px-4 py-1.5 rounded-xl flex items-center justify-between text-xs text-slate-300">
                <span className="text-slate-400 font-medium">Up Next:</span>
                <span className="font-bold text-white capitalize truncate max-w-[200px]">
                  1. {queue[0].name} ({queue[0].school})
                </span>
                <span className="text-brand-amber font-mono font-bold">
                  +{queue.length - 1} more
                </span>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ---------------- Bottom Ticker / Brand Footer ---------------- */}
      <footer className="border-t border-brand-border/60 bg-brand-navy/95 py-2.5 px-4 sm:px-6 z-20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center text-[11px] sm:text-xs">
          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            <Bot className="w-3.5 h-3.5 text-brand-orange" />
            Robotics & AI Labs
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            <Cpu className="w-3.5 h-3.5 text-brand-amber" />
            STEM Tinkering Kits
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-300 font-semibold">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            Future Skills Accelerator
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
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

      {/* ---------------- Winner Celebration Modal ---------------- */}
      {winnerModalData && (
        <WinnerModal
          winnerData={winnerModalData}
          onNextStudent={handleNextStudent}
          onClose={() => setWinnerModalData(null)}
        />
      )}

    </div>
  );
}
