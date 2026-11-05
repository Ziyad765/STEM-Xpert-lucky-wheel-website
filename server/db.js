import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_PRIZES } from './prizes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');
const PRIZES_FILE = path.join(DATA_DIR, 'prizes.json');

let isConnectedToMongo = false;

// ----------------- Mongoose Schemas -----------------
const participantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  school: { type: String, required: true },
  grade: { type: String, required: true },
  interest: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['waiting', 'active', 'completed', 'cancelled'], 
    default: 'waiting' 
  },
  queuePosition: { type: Number, default: 0 },
  prizeWon: { type: Object, default: null },
  voucherCode: { type: String, default: null },
  spunAt: { type: Date, default: null },
  emailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date, default: null },
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

const prizeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  label: String,
  shortLabel: String,
  color: String,
  textColor: String,
  icon: String,
  description: String,
  voucherPrefix: String,
  weight: Number,
  stock: Number,
  isPhysical: Boolean,
  isLoss: { type: Boolean, default: false }
});

let MongoParticipant;
let MongoPrize;

// ----------------- In-Memory / File Fallback Store -----------------
let localParticipants = [];
let localPrizes = [...DEFAULT_PRIZES];

function loadLocalData() {
  try {
    if (fs.existsSync(PARTICIPANTS_FILE)) {
      const data = fs.readFileSync(PARTICIPANTS_FILE, 'utf-8');
      localParticipants = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading local participants:', err);
    localParticipants = [];
  }

  try {
    localPrizes = [...DEFAULT_PRIZES];
    fs.writeFileSync(PRIZES_FILE, JSON.stringify(localPrizes, null, 2));
  } catch (err) {
    console.error('Error saving local prizes:', err);
    localPrizes = [...DEFAULT_PRIZES];
  }
}

function saveLocalParticipants() {
  try {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(localParticipants, null, 2));
  } catch (err) {
    console.error('Error saving local participants:', err);
  }
}

function saveLocalPrizes() {
  try {
    fs.writeFileSync(PRIZES_FILE, JSON.stringify(localPrizes, null, 2));
  } catch (err) {
    console.error('Error saving local prizes:', err);
  }
}

loadLocalData();

// ----------------- DB Initialization -----------------
export async function initDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('ℹ️  No MONGODB_URI set. Using zero-config local storage.');
    return false;
  }

  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnectedToMongo = true;
    MongoParticipant = mongoose.model('Participant', participantSchema);
    MongoPrize = mongoose.model('Prize', prizeSchema);
    console.log('✅ Connected successfully to MongoDB Atlas!');

    // Sync prizes collection with DEFAULT_PRIZES
    await MongoPrize.deleteMany({});
    await MongoPrize.insertMany(DEFAULT_PRIZES);
    console.log('📦 Synchronized course prizes with MongoDB Atlas.');

    return true;
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed. Falling back to local storage:', err.message);
    isConnectedToMongo = false;
    return false;
  }
}

export function isMongoConnected() {
  return isConnectedToMongo;
}

// ----------------- Unified DB API -----------------

export async function findParticipantByPhoneOrEmail(phone, email) {
  const cleanPhone = phone?.trim().replace(/\D/g, '');
  const cleanEmail = email?.trim().toLowerCase();

  if (isConnectedToMongo) {
    return await MongoParticipant.findOne({
      $or: [
        { phone: cleanPhone },
        { email: cleanEmail }
      ]
    });
  } else {
    return localParticipants.find(p => 
      p.phone === cleanPhone || p.email.toLowerCase() === cleanEmail
    );
  }
}

export async function registerParticipant(data) {
  const cleanPhone = data.phone?.trim().replace(/\D/g, '');
  const cleanEmail = data.email?.trim().toLowerCase();

  const existing = await findParticipantByPhoneOrEmail(cleanPhone, cleanEmail);
  if (existing) {
    return {
      success: false,
      alreadyExists: true,
      participant: existing
    };
  }

  const currentQueue = await getWaitingQueue();
  const activePerson = await getActiveParticipant();
  
  const shouldBeActive = !activePerson;
  const status = shouldBeActive ? 'active' : 'waiting';
  const queuePosition = shouldBeActive ? 0 : (currentQueue.length + 1);

  const newDoc = {
    _id: isConnectedToMongo ? undefined : 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: data.name.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    school: data.school.trim(),
    grade: data.grade.trim(),
    interest: data.interest.trim(),
    status,
    queuePosition,
    prizeWon: null,
    voucherCode: null,
    spunAt: null,
    emailSent: false,
    emailSentAt: null,
    registeredAt: new Date()
  };

  if (isConnectedToMongo) {
    const created = await MongoParticipant.create(newDoc);
    return { success: true, participant: created };
  } else {
    localParticipants.push(newDoc);
    saveLocalParticipants();
    return { success: true, participant: newDoc };
  }
}

export async function getActiveParticipant() {
  if (isConnectedToMongo) {
    return await MongoParticipant.findOne({ status: 'active' });
  } else {
    return localParticipants.find(p => p.status === 'active') || null;
  }
}

export async function getWaitingQueue() {
  if (isConnectedToMongo) {
    return await MongoParticipant.find({ status: 'waiting' }).sort({ registeredAt: 1 });
  } else {
    return localParticipants
      .filter(p => p.status === 'waiting')
      .sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));
  }
}

export async function popNextInQueue() {
  const queue = await getWaitingQueue();
  if (queue.length === 0) {
    return null;
  }

  const nextPerson = queue[0];
  const nextId = isConnectedToMongo ? nextPerson._id : nextPerson._id;

  if (isConnectedToMongo) {
    nextPerson.status = 'active';
    nextPerson.queuePosition = 0;
    await nextPerson.save();

    const remaining = await MongoParticipant.find({ status: 'waiting' }).sort({ registeredAt: 1 });
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].queuePosition = i + 1;
      await remaining[i].save();
    }

    return nextPerson;
  } else {
    const person = localParticipants.find(p => p._id === nextId);
    if (person) {
      person.status = 'active';
      person.queuePosition = 0;
    }

    const remaining = localParticipants.filter(p => p.status === 'waiting');
    remaining.sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));
    remaining.forEach((p, idx) => {
      p.queuePosition = idx + 1;
    });

    saveLocalParticipants();
    return person;
  }
}

export async function completeCurrentParticipant(id, prize, voucherCode) {
  if (isConnectedToMongo) {
    const p = await MongoParticipant.findById(id);
    if (p) {
      p.status = 'completed';
      p.prizeWon = prize;
      p.voucherCode = voucherCode;
      p.spunAt = new Date();
      await p.save();
      return p;
    }
  } else {
    const p = localParticipants.find(item => item._id === id);
    if (p) {
      p.status = 'completed';
      p.prizeWon = prize;
      p.voucherCode = voucherCode;
      p.spunAt = new Date();
      saveLocalParticipants();
      return p;
    }
  }
  return null;
}

export async function markEmailSent(id, success) {
  if (isConnectedToMongo) {
    await MongoParticipant.findByIdAndUpdate(id, {
      emailSent: success,
      emailSentAt: new Date()
    });
  } else {
    const p = localParticipants.find(item => item._id === id);
    if (p) {
      p.emailSent = success;
      p.emailSentAt = new Date();
      saveLocalParticipants();
    }
  }
}

export async function getAllParticipants() {
  if (isConnectedToMongo) {
    return await MongoParticipant.find().sort({ registeredAt: -1 });
  } else {
    return [...localParticipants].sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  }
}

export async function getPrizes() {
  if (isConnectedToMongo) {
    return await MongoPrize.find();
  } else {
    return localPrizes;
  }
}

export async function decrementPrizeStock(prizeId) {
  if (isConnectedToMongo) {
    const prize = await MongoPrize.findOne({ id: prizeId });
    if (prize && prize.stock > 0) {
      prize.stock -= 1;
      await prize.save();
      return prize.stock;
    }
  } else {
    const prize = localPrizes.find(p => p.id === prizeId);
    if (prize && prize.stock > 0) {
      prize.stock -= 1;
      saveLocalPrizes();
      return prize.stock;
    }
  }
  return 0;
}

export async function updatePrizeStock(prizeId, newStock) {
  if (isConnectedToMongo) {
    await MongoPrize.findOneAndUpdate({ id: prizeId }, { stock: newStock });
  } else {
    const prize = localPrizes.find(p => p.id === prizeId);
    if (prize) {
      prize.stock = newStock;
      saveLocalPrizes();
    }
  }
}

export async function resetQueue() {
  if (isConnectedToMongo) {
    await MongoParticipant.updateMany(
      { status: { $in: ['waiting', 'active'] } },
      { status: 'cancelled' }
    );
  } else {
    localParticipants.forEach(p => {
      if (p.status === 'waiting' || p.status === 'active') {
        p.status = 'cancelled';
      }
    });
    saveLocalParticipants();
  }
}

export async function reSpinParticipant(id) {
  if (isConnectedToMongo) {
    const p = await MongoParticipant.findById(id);
    if (p) {
      p.status = 'active';
      p.prizeWon = null;
      p.voucherCode = null;
      p.spunAt = null;
      await p.save();
      return p;
    }
  } else {
    const p = localParticipants.find(item => item._id === id);
    if (p) {
      p.status = 'active';
      p.prizeWon = null;
      p.voucherCode = null;
      p.spunAt = null;
      saveLocalParticipants();
      return p;
    }
  }
  return null;
}
