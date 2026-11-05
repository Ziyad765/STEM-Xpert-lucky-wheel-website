import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

import {
  initDB,
  isMongoConnected,
  registerParticipant,
  getActiveParticipant,
  getWaitingQueue,
  ensureActiveOrPopQueue,
  popNextInQueue,
  completeCurrentParticipant,
  markEmailSent,
  getAllParticipants,
  getPrizes,
  decrementPrizeStock,
  updatePrizeStock,
  resetQueue,
  reSpinParticipant
} from './db.js';

import { initEmailTransporter, sendWinnerEmail } from './emailService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize DB on cold start
let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    initEmailTransporter();
    dbInitialized = true;
  }
}

// Track in-memory spin state
let isSpinning = false;
let currentSpinData = null;
let ioInstance = null;

export function setSocketIO(io) {
  ioInstance = io;
}

// Helper: Broadcast live queue state via socket if available
export async function broadcastQueueState() {
  try {
    const active = await getActiveParticipant();
    const queue = await getWaitingQueue();
    const prizes = await getPrizes();

    if (ioInstance) {
      ioInstance.emit('queue:update', {
        active,
        queue,
        queueLength: queue.length,
        isSpinning,
        currentSpinData,
        prizes
      });
    }
  } catch (err) {
    console.error('Error broadcasting queue state:', err);
  }
}

// ----------------- Wheel Spin Math & Selection -----------------
export async function pickWinningPrize(prizes) {
  // CRITICAL RULE: "Better Luck Next Time" appears on the wheel for excitement,
  // but the wheel MUST NEVER land on it. Always land on one of the real courses!
  const winnablePrizes = prizes.filter(p => 
    !p.isLoss && 
    (p.weight || 0) > 0 && 
    !p.label.toLowerCase().includes('better luck') &&
    (p.stock === undefined || p.stock > 0)
  );

  const pool = winnablePrizes.length > 0 
    ? winnablePrizes 
    : prizes.filter(p => !p.isLoss && !p.label.toLowerCase().includes('better luck'));

  const totalWeight = pool.reduce((sum, p) => sum + (p.weight || 10), 0);
  let randomVal = Math.random() * totalWeight;

  for (const p of pool) {
    randomVal -= (p.weight || 10);
    if (randomVal <= 0) {
      return p;
    }
  }
  return pool[0];
}

export function calculateTargetAngle(prizeIndex, totalSlices = 12) {
  // Slices are 360 / totalSlices degrees each (30 deg for 12 slices).
  // The pointer needle is mounted at the TOP (12 o'clock, which is 270 deg).
  // Slice i starts at i * sliceDegrees and ends at (i + 1) * sliceDegrees.
  const sliceDegrees = 360 / totalSlices;
  const landingOffsetInSlice = sliceDegrees * (0.42 + Math.random() * 0.16);
  const sliceTargetAngle = (prizeIndex * sliceDegrees) + landingOffsetInSlice;
  
  // Exact mathematical alignment with top pointer (270 deg)
  let baseRotation = (270 - sliceTargetAngle) % 360;
  if (baseRotation < 0) baseRotation += 360;

  // 7 full dramatic rotations (7 * 360 = 2520 deg)
  const fullRotations = 360 * 7;
  return fullRotations + baseRotation;
}

export async function executeSpin(requestedBy = 'booth') {
  await ensureDB();

  if (isSpinning) {
    return { success: false, message: 'Wheel is already spinning!' };
  }

  const active = await getActiveParticipant();
  if (!active) {
    return { success: false, message: 'No active student at the wheel. Waiting for registrations!' };
  }

  const prizes = await getPrizes();
  const winningPrize = await pickWinningPrize(prizes);
  const prizeIndex = prizes.findIndex(p => p.id === winningPrize.id);
  const safeIndex = prizeIndex >= 0 ? prizeIndex : 0;

  const targetAngle = calculateTargetAngle(safeIndex, prizes.length);
  const durationMs = 7500; // 7.5 seconds for dramatic near-miss suspense

  const voucherCode = `STEM-${winningPrize.voucherPrefix || 'COURSE'}-${Math.floor(1000 + Math.random() * 9000)}`;

  isSpinning = true;
  currentSpinData = {
    participantId: active._id,
    participantName: active.name,
    prize: winningPrize,
    prizeIndex: safeIndex,
    targetAngle,
    durationMs,
    voucherCode,
    requestedBy,
    startedAt: Date.now()
  };

  if (ioInstance) {
    ioInstance.emit('spin:started', {
      participant: active,
      targetAngle,
      durationMs,
      prizeIndex: safeIndex
    });
  }

  setTimeout(async () => {
    try {
      await decrementPrizeStock(winningPrize.id);

      const updatedParticipant = await completeCurrentParticipant(
        active._id,
        winningPrize,
        voucherCode
      );

      sendWinnerEmail({
        participant: updatedParticipant || active,
        prize: winningPrize,
        voucherCode
      }).then(emailResult => {
        markEmailSent(active._id, emailResult.success);
      }).catch(err => {
        console.error('Email send background error:', err);
      });

      isSpinning = false;
      const completedData = {
        participant: updatedParticipant || active,
        prize: winningPrize,
        voucherCode
      };
      currentSpinData = null;

      if (ioInstance) {
        ioInstance.emit('spin:completed', completedData);
      }
      await broadcastQueueState();
    } catch (err) {
      console.error('Error in spin completion:', err);
      isSpinning = false;
      currentSpinData = null;
    }
  }, durationMs);

  return { 
    success: true, 
    message: 'Spin started',
    targetAngle, 
    durationMs,
    prize: winningPrize,
    prizeIndex: safeIndex
  };
}

// ----------------- Helper: Find Local Network IP -----------------
function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// ----------------- REST API Routes -----------------

// Network info (helps QR code on other devices find laptop IP on Wi-Fi)
app.get('/api/network-info', (req, res) => {
  const ip = getLocalNetworkIp();
  const configuredBoothUrl = process.env.BOOTH_PUBLIC_URL || '';
  res.json({
    localIp: ip,
    networkPort: 3000,
    configuredBoothUrl,
    recommendedUrl: configuredBoothUrl || `http://${ip}:3000`
  });
});

app.get('/api/participant/:id', async (req, res) => {
  await ensureDB();
  try {
    const { id } = req.params;
    const all = await getAllParticipants();
    const p = all.find(item => String(item._id) === String(id));
    if (!p) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    res.json({ participant: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status', async (req, res) => {
  await ensureDB();
  const active = await getActiveParticipant();
  const queue = await getWaitingQueue();
  res.json({
    status: 'ok',
    isMongo: isMongoConnected(),
    eventName: process.env.EVENT_NAME || 'DIDAC India 2026',
    isSpinning,
    active,
    queueCount: queue.length
  });
});

app.post('/api/register', async (req, res) => {
  await ensureDB();
  try {
    const { name, phone, email, school, grade, interest } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'Name, Phone, and Email are required.' });
    }

    const result = await registerParticipant({
      name,
      phone,
      email,
      school: school || 'DIDAC Attendee',
      grade: grade || 'Student / Learner',
      interest: interest || 'Robotics & STEM'
    });

    if (!result.success && result.alreadyExists) {
      return res.json({
        success: false,
        alreadyExists: true,
        participant: result.participant,
        message: result.participant.status === 'completed'
          ? 'You have already spun the wheel! Here is your winning voucher.'
          : 'You are already registered in the queue!'
      });
    }

    await broadcastQueueState();

    res.json({
      success: true,
      participant: result.participant,
      message: result.participant.status === 'active'
        ? 'You are up next! Watch the booth screen!'
        : `Registered successfully! You are #${result.participant.queuePosition} in line.`
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.get('/api/queue', async (req, res) => {
  await ensureDB();
  try {
    // Auto-promote first in line if active is empty, and auto-clear stale idle participants
    const active = await ensureActiveOrPopQueue();
    const queue = await getWaitingQueue();
    const prizes = await getPrizes();
    res.json({
      active,
      queue,
      isSpinning,
      currentSpinData,
      prizes
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

app.post('/api/queue/activate-me', async (req, res) => {
  await ensureDB();
  try {
    const active = await ensureActiveOrPopQueue();
    await broadcastQueueState();
    res.json({ success: true, active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/prizes', async (req, res) => {
  await ensureDB();
  try {
    const prizes = await getPrizes();
    res.json({ prizes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prizes' });
  }
});

app.post('/api/spin', async (req, res) => {
  await ensureDB();
  try {
    const requestedBy = req.body.requestedBy || 'booth';
    const result = await executeSpin(requestedBy);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queue/next', async (req, res) => {
  await ensureDB();
  try {
    if (isSpinning) {
      return res.status(400).json({ error: 'Cannot advance while wheel is spinning' });
    }

    const nextStudent = await popNextInQueue();
    await broadcastQueueState();

    res.json({
      success: true,
      nextStudent: nextStudent || null,
      message: nextStudent ? `Now serving: ${nextStudent.name}` : 'Queue is currently empty'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/participants', async (req, res) => {
  await ensureDB();
  try {
    const list = await getAllParticipants();
    res.json({ participants: list });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

app.get('/api/admin/export', async (req, res) => {
  await ensureDB();
  try {
    const list = await getAllParticipants();

    const headers = [
      'Registration ID',
      'Name',
      'Phone',
      'Email',
      'School/College',
      'Grade/Standard',
      'Course/Kit Interest',
      'Status',
      'Prize Won',
      'Voucher Code',
      'Spun At',
      'Email Sent',
      'Registered At'
    ];

    const rows = list.map(p => [
      p._id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.phone || ''}"`,
      `"${p.email || ''}"`,
      `"${(p.school || '').replace(/"/g, '""')}"`,
      `"${p.grade || ''}"`,
      `"${(p.interest || '').replace(/"/g, '""')}"`,
      p.status,
      `"${(p.prizeWon?.label || '').replace(/"/g, '""')}"`,
      p.voucherCode || '',
      p.spunAt ? new Date(p.spunAt).toLocaleString() : '',
      p.emailSent ? 'Yes' : 'No',
      p.registeredAt ? new Date(p.registeredAt).toLocaleString() : ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stem_xpert_didac_leads_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'CSV export failed' });
  }
});

app.post('/api/admin/reset-queue', async (req, res) => {
  await ensureDB();
  try {
    await resetQueue();
    isSpinning = false;
    currentSpinData = null;
    await broadcastQueueState();
    res.json({ success: true, message: 'Queue has been reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/prizes/:id/stock', async (req, res) => {
  await ensureDB();
  try {
    const { id } = req.params;
    const { stock } = req.body;
    await updatePrizeStock(id, parseInt(stock, 10));
    await broadcastQueueState();
    res.json({ success: true, message: 'Stock updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/participants/:id/respin', async (req, res) => {
  await ensureDB();
  try {
    const { id } = req.params;
    const updated = await reSpinParticipant(id);
    await broadcastQueueState();
    res.json({ success: true, participant: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

