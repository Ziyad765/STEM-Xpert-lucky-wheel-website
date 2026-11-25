// Client-side prize catalog & wheel math (mirrors server/prizes.js for instant/static resilience)
export const DEFAULT_PRIZES = [
  {
    id: 'p1',
    label: 'Virtual Lab AI',
    shortLabel: 'Virtual Lab AI',
    worth: '',
    color: '#059669',
    textColor: '#FFFFFF',
    icon: 'Bot',
    description: 'Explore hands-on Robotics & AI tinkering in a virtual lab — access from STEM-Xpert.',
    voucherCode: 'AILAB100',
    voucherPrefix: 'AILAB',
    tags: ['100% Online', 'Robotics & AI'],
    enrollUrl: 'https://www.stem-xpert.com/in/robotics-atl-tinkering-lab',
    weight: 30,
    stock: 9999,
    isLoss: false
  },
  {
    id: 'p2',
    label: 'Better Luck Next Time',
    shortLabel: 'Better Luck',
    worth: '',
    color: '#334155',
    textColor: '#94A3B8',
    icon: 'RotateCcw',
    description: 'Thank you for playing!',
    voucherCode: 'TRYAGAIN',
    voucherPrefix: 'TRYAGAIN',
    tags: [],
    enrollUrl: '',
    weight: 0,
    stock: 0,
    isLoss: true
  },
  {
    id: 'p3',
    label: 'Certified Skill Trainer Course',
    shortLabel: 'Skill Trainer',
    worth: '',
    color: '#FF4612',
    textColor: '#FFFFFF',
    icon: 'Award',
    description: 'Build the skills to train and facilitate hands-on skill and STEM learning — online with STEM Academy.',
    voucherCode: 'SF100',
    voucherPrefix: 'SF',
    tags: ['100% Online', 'STEM Academy'],
    enrollUrl: 'https://academy.stem-xpert.com/in/course/STEM-Facilitator-Course',
    weight: 40,
    stock: 9999,
    isLoss: false
  },
  {
    id: 'p4',
    label: 'Better Luck Next Time',
    shortLabel: 'Better Luck',
    worth: '',
    color: '#1E293B',
    textColor: '#94A3B8',
    icon: 'RotateCcw',
    description: 'Thank you for playing!',
    voucherCode: 'TRYAGAIN',
    voucherPrefix: 'TRYAGAIN',
    tags: [],
    enrollUrl: '',
    weight: 0,
    stock: 0,
    isLoss: true
  },
  {
    id: 'p5',
    label: 'AI for Teachers Course',
    shortLabel: 'AI for Teachers',
    worth: '',
    color: '#FBA94B',
    textColor: '#0B1120',
    icon: 'Cpu',
    description: 'Bring AI into your classroom with confidence — learn online with STEM Academy.',
    voucherCode: 'DIDACAIT100',
    voucherPrefix: 'DIDACAIT',
    tags: ['100% Online', 'STEM Academy'],
    enrollUrl: 'https://academy.stem-xpert.com/in/course/AI-for-Teachers',
    weight: 30,
    stock: 9999,
    isLoss: false
  },
  {
    id: 'p6',
    label: 'Better Luck Next Time',
    shortLabel: 'Better Luck',
    worth: '',
    color: '#334155',
    textColor: '#94A3B8',
    icon: 'RotateCcw',
    description: 'Thank you for playing!',
    voucherCode: 'TRYAGAIN',
    voucherPrefix: 'TRYAGAIN',
    tags: [],
    enrollUrl: '',
    weight: 0,
    stock: 0,
    isLoss: true
  },
  {
    id: 'p7',
    label: 'Virtual Lab AI',
    shortLabel: 'Virtual Lab AI',
    worth: '',
    color: '#0D9488',
    textColor: '#FFFFFF',
    icon: 'Bot',
    description: 'Explore hands-on Robotics & AI tinkering in a virtual lab — access from STEM-Xpert.',
    voucherCode: 'AILAB100',
    voucherPrefix: 'AILAB',
    tags: ['100% Online', 'Robotics & AI'],
    enrollUrl: 'https://www.stem-xpert.com/in/robotics-atl-tinkering-lab',
    weight: 30,
    stock: 9999,
    isLoss: false
  },
  {
    id: 'p8',
    label: 'Better Luck Next Time',
    shortLabel: 'Better Luck',
    worth: '',
    color: '#1E293B',
    textColor: '#94A3B8',
    icon: 'RotateCcw',
    description: 'Thank you for playing!',
    voucherCode: 'TRYAGAIN',
    voucherPrefix: 'TRYAGAIN',
    tags: [],
    enrollUrl: '',
    weight: 0,
    stock: 0,
    isLoss: true
  },
  {
    id: 'p9',
    label: 'Certified Skill Trainer Course',
    shortLabel: 'Skill Trainer',
    worth: '',
    color: '#2563EB',
    textColor: '#FFFFFF',
    icon: 'Award',
    description: 'Build the skills to train and facilitate hands-on skill and STEM learning — online with STEM Academy.',
    voucherCode: 'SF100',
    voucherPrefix: 'SF',
    tags: ['100% Online', 'STEM Academy'],
    enrollUrl: 'https://academy.stem-xpert.com/in/course/STEM-Facilitator-Course',
    weight: 40,
    stock: 9999,
    isLoss: false
  },
  {
    id: 'p10',
    label: 'Better Luck Next Time',
    shortLabel: 'Better Luck',
    worth: '',
    color: '#334155',
    textColor: '#94A3B8',
    icon: 'RotateCcw',
    description: 'Thank you for playing!',
    voucherCode: 'TRYAGAIN',
    voucherPrefix: 'TRYAGAIN',
    tags: [],
    enrollUrl: '',
    weight: 0,
    stock: 0,
    isLoss: true
  },
  {
    id: 'p11',
    label: 'AI for Teachers Course',
    shortLabel: 'AI for Teachers',
    worth: '',
    color: '#7C3AED',
    textColor: '#FFFFFF',
    icon: 'Cpu',
    description: 'Bring AI into your classroom with confidence — learn online with STEM Academy.',
    voucherCode: 'DIDACAIT100',
    voucherPrefix: 'DIDACAIT',
    tags: ['100% Online', 'STEM Academy'],
    enrollUrl: 'https://academy.stem-xpert.com/in/course/AI-for-Teachers',
    weight: 30,
    stock: 9999,
    isLoss: false
  },
  {
    id: 'p12',
    label: 'Better Luck Next Time',
    shortLabel: 'Better Luck',
    worth: '',
    color: '#1E293B',
    textColor: '#94A3B8',
    icon: 'RotateCcw',
    description: 'Thank you for playing!',
    voucherCode: 'TRYAGAIN',
    voucherPrefix: 'TRYAGAIN',
    tags: [],
    enrollUrl: '',
    weight: 0,
    stock: 0,
    isLoss: true
  }
];

export function pickWinningPrize(prizes = DEFAULT_PRIZES) {
  const pool = prizes.filter(
    (p) => !p.isLoss && (p.weight || 0) > 0 && !p.label.toLowerCase().includes('better luck') && (p.stock === undefined || p.stock > 0)
  );
  const safePool = pool.length > 0 ? pool : DEFAULT_PRIZES.filter((p) => !p.isLoss);
  const totalWeight = safePool.reduce((sum, p) => sum + (p.weight || 10), 0);
  let rand = Math.random() * totalWeight;
  for (const p of safePool) {
    rand -= p.weight || 10;
    if (rand <= 0) return p;
  }
  return safePool[0];
}

export function calculateTargetAngle(prizeIndex, totalSlices = 12) {
  const sliceDegrees = 360 / totalSlices;
  const landingOffsetInSlice = sliceDegrees * (0.42 + Math.random() * 0.16);
  const sliceTargetAngle = prizeIndex * sliceDegrees + landingOffsetInSlice;
  let baseRotation = (270 - sliceTargetAngle) % 360;
  if (baseRotation < 0) baseRotation += 360;
  return 360 * 7 + baseRotation;
}
