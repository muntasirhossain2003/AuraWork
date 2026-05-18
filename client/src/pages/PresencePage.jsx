import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { Users } from 'lucide-react';
import api from '../utils/api';

const BORDER_COLORS = {
  home: 'border-l-green-400',
  office: 'border-l-blue-400',
  cafe: 'border-l-amber-400',
  client: 'border-l-purple-400',
  other: 'border-l-slate-300',
};

const supabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

function Avatar({ name }) {
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['bg-indigo-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500'];
  const color = colors[name?.charCodeAt(0) % colors.length] || 'bg-indigo-500';
  return (
    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
}

function timeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function PresencePage() {
  const [presence, setPresence] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPresence = async () => {
    try {
      const { data } = await api.get('/api/presence/workspace');
      setPresence(data || []);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPresence();

    // Subscribe to real-time presence updates via Supabase Realtime
    const channel = supabaseClient
      .channel('presence-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, () => {
        fetchPresence();
      })
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Presence</h1>
          <p className="text-slate-500 text-sm mt-0.5">Live location status of your teammates</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-600 font-medium">Live</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28" />)}
        </div>
      ) : presence.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-16 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No teammates online</p>
          <p className="text-slate-400 text-sm mt-1">Invite teammates to your workspace to see their live status</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <AnimatePresence>
            {presence.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={`card p-4 border-l-4 ${BORDER_COLORS[p.zone_type] || 'border-l-slate-300'}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={p.users?.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{p.users?.name || 'Unknown'}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{p.status_label}</p>
                    <p className="text-xs text-slate-400 mt-1">Updated {timeAgo(p.updated_at)}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 mt-1 animate-pulse" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
