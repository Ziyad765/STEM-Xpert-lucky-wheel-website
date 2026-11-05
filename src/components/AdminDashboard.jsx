import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Download, 
  RefreshCw, 
  Trophy, 
  Package, 
  ArrowRight,
  Database,
  Search
} from 'lucide-react';

export default function AdminDashboard({ socket }) {
  const [participants, setParticipants] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resParts, resPrizes, resStatus] = await Promise.all([
        fetch('/api/admin/participants').then(r => r.json()),
        fetch('/api/prizes').then(r => r.json()),
        fetch('/api/status').then(r => r.json())
      ]);

      if (resParts.participants) setParticipants(resParts.participants);
      if (resPrizes.prizes) setPrizes(resPrizes.prizes);
      if (resStatus) setSystemStatus(resStatus);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue:update', () => {
      fetchData();
    });
    socket.on('spin:completed', () => {
      fetchData();
    });
  }, [socket]);

  const handleCallNext = async () => {
    try {
      await fetch('/api/queue/next', { method: 'POST' });
      fetchData();
    } catch (err) {
      alert('Failed to call next student');
    }
  };

  const handleResetQueue = async () => {
    if (window.confirm('Are you sure you want to clear all waiting students from the queue? Completed spins are preserved.')) {
      try {
        await fetch('/api/admin/reset-queue', { method: 'POST' });
        fetchData();
      } catch (err) {
        alert('Failed to reset queue');
      }
    }
  };

  const handleUpdateStock = async (prizeId, newStock) => {
    try {
      await fetch(`/api/admin/prizes/${prizeId}/stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      fetchData();
    } catch (err) {
      alert('Failed to update stock');
    }
  };

  const handleRespin = async (id) => {
    if (window.confirm('Allow this student to re-spin at the booth?')) {
      try {
        await fetch(`/api/admin/participants/${id}/respin`, { method: 'POST' });
        fetchData();
      } catch (err) {
        alert('Failed to trigger re-spin');
      }
    }
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = 
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone || '').includes(searchQuery) ||
      (p.school || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  const completedCount = participants.filter(p => p.status === 'completed').length;
  const waitingCount = participants.filter(p => p.status === 'waiting' || p.status === 'active').length;

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 p-4 sm:p-8">
      
      {/* Top Bar with Official Logo */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-brand-border/60">
        <div className="flex items-center gap-4">
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            <img src="/logo.png" alt="STEM Xpert" className="h-8 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                DIDAC Booth Control
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                systemStatus?.isMongo 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                <Database className="w-3.5 h-3.5" />
                <span>{systemStatus?.isMongo ? 'MongoDB Connected' : 'Local Storage Mode'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time DIDAC Lead Capture, Live Queue & Prize Inventory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href="/api/admin/export"
            download
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Leads to Excel (CSV)</span>
          </a>

          <a
            href="/"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-orange to-brand-amber text-white font-bold text-xs shadow-md transition-all"
          >
            Back to Tablet Kiosk
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 space-y-6">

        {/* ---------------- KPI Stat Cards ---------------- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Registrations</span>
              <Users className="w-4 h-4 text-brand-amber" />
            </div>
            <div className="text-2xl font-black text-white mt-2 font-mono">
              {participants.length}
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Prizes Won</span>
              <Trophy className="w-4 h-4 text-brand-gold" />
            </div>
            <div className="text-2xl font-black text-brand-gold mt-2 font-mono">
              {completedCount}
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Waiting in Line</span>
              <ArrowRight className="w-4 h-4 text-brand-orange" />
            </div>
            <div className="text-2xl font-black text-brand-orange mt-2 font-mono">
              {waitingCount}
            </div>
          </div>

          <div className="bg-brand-card border border-brand-border p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Hardware Kits Left</span>
              <Package className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
              {prizes.find(p => p.id === 'p1')?.stock ?? 25}
            </div>
          </div>
        </div>

        {/* ---------------- Live Queue Controls ---------------- */}
        <div className="bg-brand-card border border-brand-border p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-sm text-white">Live Queue Management</h3>
            <p className="text-xs text-slate-400">
              Manage the tablet queue manually if a visitor steps away.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCallNext}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-orange to-brand-amber text-white font-bold text-xs shadow-md"
            >
              Force Call Next Student
            </button>
            <button
              onClick={handleResetQueue}
              className="px-4 py-2 rounded-xl bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 font-bold text-xs"
            >
              Reset Waiting Queue
            </button>
          </div>
        </div>

        {/* ---------------- Prize Stock Grid ---------------- */}
        <div className="bg-brand-card border border-brand-border p-5 rounded-2xl">
          <h3 className="font-extrabold text-sm text-white mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-orange" />
            <span>Prize Inventory & Probability Allocation</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {prizes.map((prize) => (
              <div 
                key={prize.id}
                className="p-3 rounded-xl bg-brand-dark border border-brand-border/70 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-xs font-bold truncate max-w-[170px]"
                      style={{ color: prize.color }}
                    >
                      {prize.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-border text-slate-300">
                      {prize.weight}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {prize.description}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-brand-border/40 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Stock Left:</span>
                  <input
                    type="number"
                    defaultValue={prize.stock}
                    onBlur={(e) => handleUpdateStock(prize.id, e.target.value)}
                    className="w-16 px-2 py-0.5 rounded-lg bg-brand-card border border-brand-border text-right text-xs font-mono font-bold text-white outline-none focus:border-brand-orange"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- Leads Table ---------------- */}
        <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-xl">
          
          <div className="p-4 border-b border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student, phone, school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-brand-dark border border-brand-border text-xs text-white placeholder-slate-500 outline-none focus:border-brand-orange"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-brand-dark border border-brand-border text-xs text-white outline-none"
              >
                <option value="all">All Registrations</option>
                <option value="completed">Completed Spins</option>
                <option value="waiting">Waiting in Line</option>
                <option value="active">Active Now</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-dark/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-brand-border">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Phone / WhatsApp</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">School / College</th>
                  <th className="py-3 px-4">Interest</th>
                  <th className="py-3 px-4">Prize Won</th>
                  <th className="py-3 px-4">Voucher Code</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map((p) => (
                    <tr key={p._id} className="hover:bg-brand-navy/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-white capitalize">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {p.phone}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {p.email}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {p.school}
                      </td>
                      <td className="py-3 px-4 text-brand-amber font-semibold">
                        {p.interest}
                      </td>
                      <td className="py-3 px-4">
                        {p.prizeWon?.label ? (
                          <span className="font-bold text-brand-gold">
                            {p.prizeWon.label}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {p.voucherCode || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : p.status === 'active'
                            ? 'bg-brand-orange/20 text-brand-orange animate-pulse'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRespin(p._id)}
                          className="px-2.5 py-1 rounded-lg bg-brand-border/50 hover:bg-brand-border text-slate-300 hover:text-white text-[11px]"
                          title="Allow Re-spin"
                        >
                          Re-spin
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No registrations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
