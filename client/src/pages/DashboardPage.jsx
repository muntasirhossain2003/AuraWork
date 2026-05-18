import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { RefreshCw, Plus, CheckCircle, Clock, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import api from '../utils/api';
import useGeofence from '../hooks/useGeofence';

const ZONE_ICONS = { home: '🏠', office: '🏢', cafe: '☕', client: '🤝', other: '📍' };
const ZONE_BORDER = { home: 'border-green-400 bg-green-50', office: 'border-blue-400 bg-blue-50', cafe: 'border-amber-400 bg-amber-50', client: 'border-purple-400 bg-purple-50', other: 'border-slate-300 bg-slate-50' };
const PRIORITY_BADGE = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600' };

function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  );
}

export default function DashboardPage() {
  const [zones, setZones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '' });
  const [showAddTask, setShowAddTask] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [zoneBanner, setZoneBanner] = useState(null);
  const sessionRef = useRef(null);
  const addingTask = useRef(false);

  useEffect(() => {
    api.get('/api/zones').then(r => setZones(r.data)).catch(() => {});
    api.get('/api/tasks').then(r => setTasks(r.data)).catch(() => {});
  }, []);

  const generatePlan = useCallback(async (zone) => {
    if (!zone) return;
    setPlanLoading(true);
    try {
      const pending = tasks.filter(t => t.status === 'pending');
      const { data } = await api.post('/api/ai/plan', { zone, tasks: pending });
      setPlan(data);
    } catch { toast.error('Failed to generate plan'); }
    finally { setPlanLoading(false); }
  }, [tasks]);

  const onZoneChange = useCallback(async (newZone, prevZone) => {
    setZoneBanner(newZone);

    // End previous session
    if (sessionRef.current && prevZone) {
      const done = tasks.filter(t => t.status === 'done');
      const total = tasks.length;
      try {
        const { data: handoff } = await api.post('/api/ai/handoff', {
          zone: prevZone,
          completedTasks: done,
          incompleteTasks: tasks.filter(t => t.status === 'pending'),
          sessionDuration: 'this session',
        });
        await api.put(`/api/sessions/${sessionRef.current}/end`, { tasks_completed: done.length, tasks_total: total, handoff_note: handoff.note });
        setSessions(s => [{ zone: prevZone, note: handoff.note, time: new Date().toLocaleTimeString() }, ...s]);
        toast.success('Session handoff note generated!', { icon: '📝' });
      } catch {}
    }

    if (newZone) {
      // Start new session
      try {
        const { data: session } = await api.post('/api/sessions/start', { zone_id: newZone.id });
        sessionRef.current = session.id;
        await api.put('/api/presence', { zone_id: newZone.id, zone_name: newZone.name, zone_type: newZone.zone_type });
      } catch {}
      toast.success(`Entered ${newZone.name} — generating your work plan...`, { icon: ZONE_ICONS[newZone.zone_type] });
      generatePlan(newZone);
    }
  }, [tasks, generatePlan]);

  const { currentZone, permissionDenied } = useGeofence(zones, onZoneChange);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (addingTask.current) return;
    addingTask.current = true;
    try {
      const { data } = await api.post('/api/tasks', newTask);
      setTasks(t => [...t, data]);
      setNewTask({ title: '', priority: 'medium', due_date: '' });
      setShowAddTask(false);
      toast.success('Task added!');
    } catch { toast.error('Failed to add task'); }
    finally { addingTask.current = false; }
  };

  const toggleTaskDone = async (task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    try {
      await api.put(`/api/tasks/${task.id}`, { status: newStatus });
      setTasks(t => t.map(tk => tk.id === task.id ? { ...tk, status: newStatus } : tk));
    } catch { toast.error('Failed to update task'); }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Zone Banner */}
      <AnimatePresence mode="wait">
        {currentZone ? (
          <motion.div key={currentZone.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`card p-4 mb-6 border-l-4 ${ZONE_BORDER[currentZone.zone_type]}`}
          >
            <div className="flex items-center gap-3">
              <motion.span className="text-3xl" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}>
                {ZONE_ICONS[currentZone.zone_type]}
              </motion.span>
              <div>
                <p className="font-semibold text-slate-900">{currentZone.name}</p>
                <p className="text-sm text-slate-500 capitalize">{currentZone.zone_type} zone detected · AI plan generated</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="no-zone" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="card p-4 mb-6 border-l-4 border-slate-200 bg-slate-50">
            <p className="text-slate-500 text-sm">
              {permissionDenied
                ? '⚠️ Location permission denied — enable it to use zone detection'
                : '📍 No zone detected — move to a defined area or set up zones first'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* AI Work Plan — 3/5 width */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">AI Work Plan</h2>
            {currentZone && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => generatePlan(currentZone)} disabled={planLoading}
                className="btn-secondary text-xs flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${planLoading ? 'animate-spin' : ''}`} />
                Refresh Plan
              </motion.button>
            )}
          </div>

          {planLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : plan ? (
            <div className="space-y-3">
              {/* Summary */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="card p-4 bg-slate-50">
                <p className="text-sm text-slate-600">{plan.summary}</p>
              </motion.div>

              {/* Plan items */}
              {plan.plan?.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }} className="card p-4">
                  <div className="flex items-start gap-4">
                    <div className="text-right min-w-[64px]">
                      <p className="text-xs font-semibold text-indigo-600">{item.time}</p>
                      <p className="text-xs text-slate-400">{item.duration}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{item.task}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Tip */}
              {plan.tip && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="card p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">{plan.tip}</p>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <p className="text-slate-400 text-sm">Enter a zone to get your AI-generated work plan</p>
            </div>
          )}
        </div>

        {/* Task List — 2/5 width */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Tasks</h2>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddTask(!showAddTask)}
              className="btn-primary text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Task
            </motion.button>
          </div>

          {/* Add task form */}
          <AnimatePresence>
            {showAddTask && (
              <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} onSubmit={handleAddTask}
                className="card p-4 space-y-3 overflow-hidden">
                <input className="input-field" placeholder="Task title..." value={newTask.title}
                  onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))} required />
                <div className="grid grid-cols-2 gap-2">
                  <select className="input-field text-xs" value={newTask.priority}
                    onChange={e => setNewTask(n => ({ ...n, priority: e.target.value }))}>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                  <input type="date" className="input-field text-xs" value={newTask.due_date}
                    onChange={e => setNewTask(n => ({ ...n, due_date: e.target.value }))} />
                </div>
                <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary w-full text-xs">Add Task</motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Pending tasks */}
          <div className="space-y-2">
            {pendingTasks.length === 0 && !showAddTask && (
              <p className="text-center text-slate-400 text-sm py-6">No pending tasks — add your first task!</p>
            )}
            <AnimatePresence>
              {pendingTasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 30 }} transition={{ delay: i * 0.04 }}
                  className="card p-3 flex items-center gap-3">
                  <button onClick={() => toggleTaskDone(task)} className="flex-shrink-0">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 hover:border-indigo-500 transition-colors" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{task.title}</p>
                    {task.due_date && <p className="text-xs text-slate-400">{new Date(task.due_date).toLocaleDateString()}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
                    {task.priority}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Done tasks */}
          {doneTasks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Done ({doneTasks.length})
              </p>
              <div className="space-y-1.5">
                {doneTasks.map(task => (
                  <div key={task.id} className="card p-3 flex items-center gap-3 opacity-50">
                    <button onClick={() => toggleTaskDone(task)}>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </button>
                    <p className="text-sm text-slate-500 line-through truncate">{task.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Previous sessions panel */}
      {sessions.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowSessions(!showSessions)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-3">
            <Clock className="w-4 h-4" />
            Previous Sessions ({sessions.length})
            {showSessions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <AnimatePresence>
            {showSessions && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                {sessions.map((s, i) => (
                  <div key={i} className="card p-4">
                    <p className="text-sm font-medium text-slate-700">{ZONE_ICONS[s.zone?.zone_type]} {s.zone?.name} · {s.time}</p>
                    <p className="text-sm text-slate-500 mt-1">{s.note}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
