import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Lightbulb, TrendingUp, Clock, CheckCircle, MapPin } from 'lucide-react';
import api from '../utils/api';

const ZONE_COLORS = { home: '#22c55e', office: '#3b82f6', cafe: '#f59e0b', client: '#8b5cf6', other: '#64748b' };

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card p-4">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </motion.div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/ai/insights')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="skeleton h-8 w-48 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-28" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}
      </div>
    </div>
  );

  if (data?.insufficient) return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Insights</h1>
      <div className="card p-16 text-center">
        <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Come back after a few more sessions</p>
        <p className="text-slate-400 text-sm mt-1">
          You have {data.sessions || 0} session{data.sessions !== 1 ? 's' : ''} — insights unlock after 5
        </p>
      </div>
    </div>
  );

  const sessions = data?.sessions || [];
  const totalSessions = sessions.length;

  // Build chart data by zone type
  const zoneMap = {};
  sessions.forEach(s => {
    const zt = s.zones?.zone_type || 'other';
    if (!zoneMap[zt]) zoneMap[zt] = { zone: zt, completed: 0, count: 0 };
    zoneMap[zt].completed += s.tasks_completed || 0;
    zoneMap[zt].count += 1;
  });
  const zoneChartData = Object.values(zoneMap).map(z => ({ ...z, avg: z.count ? (z.completed / z.count).toFixed(1) : 0 }));

  // Sessions per day (last 14 days)
  const dayMap = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dayMap[key] = 0;
  }
  sessions.forEach(s => {
    const key = new Date(s.entered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (key in dayMap) dayMap[key]++;
  });
  const dayChartData = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

  const avgDuration = sessions.filter(s => s.exited_at).reduce((acc, s) => {
    return acc + (new Date(s.exited_at) - new Date(s.entered_at));
  }, 0) / (sessions.filter(s => s.exited_at).length || 1) / 60000;

  const doneThisWeek = sessions.filter(s => {
    const d = new Date(s.entered_at);
    return (Date.now() - d) < 7 * 24 * 3600 * 1000;
  }).reduce((a, s) => a + s.tasks_completed, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Insights</h1>
      <p className="text-slate-500 text-sm mb-6">AI-powered analysis of your work patterns</p>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock} label="Total Sessions" value={totalSessions} color="bg-indigo-500" />
        <StatCard icon={TrendingUp} label="Avg Session" value={`${Math.round(avgDuration)}m`} color="bg-blue-500" />
        <StatCard icon={CheckCircle} label="Done This Week" value={doneThisWeek} color="bg-green-500" />
        <StatCard icon={MapPin} label="Zones Active" value={Object.keys(zoneMap).length} color="bg-amber-500" />
      </div>

      {/* AI Insights */}
      {data?.insights?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-3">AI Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.insights.map((ins, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} className="card p-4 flex gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{ins.insight}</p>
                  {ins.metric && <p className="text-xs text-slate-400 mt-1">{ins.metric}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Tasks Completed by Zone</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneChartData}>
              <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="avg" name="Avg tasks">
                {zoneChartData.map((entry, i) => (
                  <Cell key={i} fill={ZONE_COLORS[entry.zone] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Sessions (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dayChartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
