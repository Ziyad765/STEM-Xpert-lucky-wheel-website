import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../utils/audio';

export default function SpinWheel({
  prizes = [],
  isSpinning = false,
  targetAngle = 0,
  duration = 7500,
  onSpinEnd,
  canSpin = false,
  onSpinRequest,
  idleSpin = false
}) {
  const canvasRef = useRef(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [pointerWobble, setPointerWobble] = useState(0);
  const animFrameRef = useRef(null);
  const lastPegRef = useRef(-1);

  // Wheel drawing function
  const drawWheel = (rotationDeg) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 24;

    ctx.clearRect(0, 0, width, height);

    if (!prizes || prizes.length === 0) return;

    const numSlices = prizes.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const rotationRad = (rotationDeg * Math.PI) / 180;

    // 1. Draw Outer Ambient Glow & Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#10192D';
    ctx.shadowColor = '#FF4612';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.restore();

    // Metallic Outer Rim
    ctx.save();
    const rimGrad = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
    rimGrad.addColorStop(0, '#FBA94B');
    rimGrad.addColorStop(0.5, '#FF4612');
    rimGrad.addColorStop(1, '#991B1B');
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
    ctx.lineWidth = 12;
    ctx.strokeStyle = rimGrad;
    ctx.stroke();
    ctx.restore();

    // 2. Draw Wheel Slices
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRad);

    prizes.forEach((prize, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Radial slice gradient for rich depth
      const grad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
      if (prize.isLoss) {
        grad.addColorStop(0, '#1E293B');
        grad.addColorStop(0.5, prize.color || '#334155');
        grad.addColorStop(1, '#0F172A');
      } else {
        grad.addColorStop(0, '#10192D');
        grad.addColorStop(0.35, prize.color || '#FF4612');
        grad.addColorStop(1, '#080D1A');
      }

      ctx.fillStyle = grad;
      ctx.fill();

      // Slice separator lines
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0B1120';
      ctx.stroke();

      // Slice Text
      ctx.save();
      const textAngle = startAngle + sliceAngle / 2;
      ctx.rotate(textAngle);
      ctx.textAlign = 'right';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const label = (prize.shortLabel || prize.label || '').toUpperCase();
      ctx.fillStyle = prize.textColor || '#FFFFFF';
      ctx.font = 'bold 13.5px "Outfit", system-ui, sans-serif';
      ctx.fillText(label, radius - 20, 5);
      ctx.restore();
    });

    // 3. Pegs / Rivets
    for (let i = 0; i < numSlices; i++) {
      const pegAngle = i * sliceAngle;
      const pegX = Math.cos(pegAngle) * (radius + 2);
      const pegY = Math.sin(pegAngle) * (radius + 2);

      ctx.beginPath();
      ctx.arc(pegX, pegY, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#FBA94B';
      ctx.shadowColor = '#FBA94B';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }

    ctx.restore(); // Restore from rotation

    // 4. Center Hub: STEM Xpert Hexagon Badge
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 54, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FF4612';
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FF4612';
    ctx.stroke();

    const drawHex = (hx, hy, r, strokeCol) => {
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = (s * Math.PI) / 3;
        const px = hx + r * Math.cos(a);
        const py = hy + r * Math.sin(a);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    };

    drawHex(centerX - 16, centerY + 6, 12, '#FBA94B');
    drawHex(centerX + 6, centerY - 6, 18, '#FF4612');

    ctx.fillStyle = '#FBA94B';
    ctx.font = '800 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STEM', centerX, centerY + 18);
    ctx.fillStyle = '#FF4612';
    ctx.font = '900 13px Outfit, sans-serif';
    ctx.fillText('Xpert', centerX, centerY + 32);

    ctx.restore();

    // 5. Accurate Peg Contact at 270 deg (Top pointer)
    const effectiveAngle = (270 - (rotationDeg % 360) + 360) % 360;
    const currentPeg = Math.floor(effectiveAngle / (360 / numSlices));
    if (currentPeg !== lastPegRef.current && isSpinning) {
      lastPegRef.current = currentPeg;
      audio.playTick();
      setPointerWobble(-14);
      setTimeout(() => setPointerWobble(7), 40);
      setTimeout(() => setPointerWobble(0), 80);
    }
  };

  useEffect(() => {
    drawWheel(currentRotation);
  }, [prizes, currentRotation]);

  // Continuous Majestic Idle Rotation (Attract Mode for Exhibition)
  useEffect(() => {
    if (!idleSpin || isSpinning) return;

    let animId = null;
    let lastTimestamp = performance.now();

    const idleLoop = (now) => {
      const dt = now - lastTimestamp;
      lastTimestamp = now;
      // Smooth continuous ~22 deg/sec rotation
      setCurrentRotation(prev => (prev + (dt * 0.022)) % 360);
      animId = requestAnimationFrame(idleLoop);
    };

    animId = requestAnimationFrame(idleLoop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [idleSpin, isSpinning]);

  // Dramatic Near-Miss Animation Curve
  useEffect(() => {
    if (!isSpinning || targetAngle <= 0) return;

    let startTime = null;
    const startAngle = currentRotation % 360;
    const totalDistance = targetAngle - startAngle;

    // Dramatic Ease Curve: Rapid initial blur, progressive slowdown,
    // and a suspenseful creeping deceleration over the final peg!
    const dramaticEase = (t) => 1 - Math.pow(1 - t, 4.2);

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = dramaticEase(progress);

      const nextRotation = startAngle + totalDistance * easedProgress;
      setCurrentRotation(nextRotation);
      drawWheel(nextRotation);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentRotation(targetAngle % 360);
        if (onSpinEnd) {
          onSpinEnd();
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpinning, targetAngle, duration]);

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Top Pointer */}
      <div
        className="absolute -top-3 z-30 pointer-events-none transition-transform duration-75"
        style={{
          transform: `translateX(-50%) rotate(${pointerWobble}deg)`,
          left: '50%',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))'
        }}
      >
        <svg width="44" height="50" viewBox="0 0 48 54" fill="none">
          <path
            d="M24 52L8 8C7 5 9 2 12 2H36C39 2 41 5 40 8L24 52Z"
            fill="url(#pointerGrad)"
            stroke="#0B1120"
            strokeWidth="2"
          />
          <circle cx="24" cy="14" r="5" fill="#FFFFFF" stroke="#0B1120" strokeWidth="1.5" />
          <defs>
            <linearGradient id="pointerGrad" x1="24" y1="2" x2="24" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FBA94B" />
              <stop offset="0.5" stopColor="#FF4612" />
              <stop offset="1" stopColor="#991B1B" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Canvas Wheel */}
      <div className="relative p-1.5 sm:p-2 rounded-full border-2 border-brand-orange/40 bg-gradient-to-b from-brand-card to-brand-navy shadow-2xl flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          className="w-[min(88vw,min(58vh,520px))] h-[min(88vw,min(58vh,520px))] aspect-square select-none cursor-pointer"
          onClick={() => {
            if (canSpin && !isSpinning && onSpinRequest) {
              onSpinRequest();
            }
          }}
        />

        {/* Center Tap to Spin Button */}
        {canSpin && !isSpinning && (
          <button
            onClick={onSpinRequest}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-brand-orange to-brand-amber text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-2xl hover:scale-105 active:scale-95 transition-transform flex flex-col items-center justify-center animate-pulse z-20 border-2 border-white/50"
          >
            <span className="text-lg">⚡</span>
            <span>TAP TO</span>
            <span className="text-sm font-black text-amber-100">SPIN</span>
          </button>
        )}
      </div>
    </div>
  );
}
