import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

import {
  app,
  setSocketIO,
  broadcastQueueState,
  executeSpin
} from './app.js';

import {
  initDB,
  getActiveParticipant,
  getWaitingQueue,
  getPrizes,
  popNextInQueue
} from './db.js';

import { initEmailTransporter } from './emailService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setSocketIO(io);

// ----------------- Socket.IO Real-Time Engine -----------------
io.on('connection', async (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  try {
    const active = await getActiveParticipant();
    const queue = await getWaitingQueue();
    const prizes = await getPrizes();

    socket.emit('queue:init', {
      active,
      queue,
      prizes
    });
  } catch (err) {
    console.error('Socket init error:', err);
  }

  socket.on('spin:trigger', async (data) => {
    console.log(`🎯 Spin triggered via socket from ${data?.requestedBy || 'client'}`);
    await executeSpin(data?.requestedBy || 'client');
  });

  socket.on('queue:next', async () => {
    await popNextInQueue();
    await broadcastQueueState();
  });
});

// In production, serve the built Vite dist files
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  await initDB();
  initEmailTransporter();

  server.listen(PORT, () => {
    console.log(`\n🚀 STEM-Xpert DIDAC Backend running on http://localhost:${PORT}`);
    console.log(`🎯 Kiosk & Registration ready! Mode: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer();
