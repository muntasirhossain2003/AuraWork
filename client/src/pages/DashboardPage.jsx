import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { RefreshCw, Plus, CheckCircle, Clock, ChevronDown, ChevronUp, Lightbulb, Navigation, Crosshair, Pencil, Trash2, X, GitBranch, Link, CheckCircle2 } from 'lucide-react';
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
  const [manualZone, setManualZone] = useState(null);
  const [showCoords, setShowCoords] = useState(false);
  // Edit task state
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', priority: 'medium', due_date: '' });
  // GitHub repo connection
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('aw_github_repo') || '');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('aw_github_token') || '');
  const [showGithubForm, setShowGithubForm] = useState(false);
  const [githubContext, setGithubContext] = useState(null);
  const sessionRef = useRef(null);
  const addingTask = useRef(false);

  useEffect(() => {
    api.get('/api/zones').then(r => setZones(r.data)).catch(() => {});
    api.get('/api/tasks').then(r => setTasks(r.data)).catch(() => {});
  }, []);

  const generatePlan = useCallback(async (zone) => {
    if (!zone) return;
    setPlanLoading(true);
    setPlan(null);
    try {
      const pending = tasks.filter(t => t.status === 'pending');
      const { data } = await api.post('/api/ai/plan', {
        zone,
        tasks: pending,
        githubRepo: githubRepo || undefined,
        githubToken: githubToken || undefined,
      });
      setPlan(data);
      if (data.githubContext) setGithubContext(data.githubContext);
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI plan failed — check GROQ_API_KEY');
    }
    finally { setPlanLoading(false); }
  }, [tasks, githubRepo, githubToken]);

  const onZoneChange = useCallback(async (newZone, prevZone) => {
    // End previous session
    if (sessionRef.current && prevZone) {
      const done = tasks.filter(t => t.status === 'done');
      try {
        const { data: handoff } = await api.post('/api/ai/handoff', {
          zone: prevZone,
          completedTasks: done,
          incompleteTasks: tasks.filter(t => t.status === 'pending'),
          sessionDuration: 'this session',
        });
        await api.put(`/api/sessions/${sessionRef.current}/end`, {
          tasks_completed: done.length,
          tasks_total: tasks.length,
          handoff_note: handoff.note,
        });
        setSessions(s => [{ zone: prevZone, note: handoff.note, time: new Date().toLocaleTimeString() }, ...s]);
        toast.success('Session handoff note generated!', { icon: '📝' });
      } catch {}
    }

    if (newZone) {
      try {
        const { data: session } = await api.post('/api/sessions/start', { zone_id: newZone.id });
        sessionRef.current = session.id;
        await api.put('/api/presence', { zone_id: newZone.id, zone_name: newZone.name, zone_type: newZone.zone_type });
      } catch {}
      toast.success(`Entered ${newZone.name}`, { icon: ZONE_ICONS[newZone.zone_type] });
      generatePlan(newZone);
    }
  }, [tasks, generatePlan]);

  const { currentZone, coordinates, permissionDenied } = useGeofence(zones, onZoneChange);

  // The active zone is either GPS-detected or manually selected
  const activeZone = currentZone || manualZone;

  // When user manually selects a zone, treat it like entering
  const handleManualZoneSelect = (zoneId) => {
    const zone = zones.find(z => z.id === zoneId) || null;
    if (zone?.id === manualZone?.id) return;
    setManualZone(zone);
    if (zone) {
      toast.success(`Switched to ${zone.name}`, { icon: ZONE_ICONS[zone.zone_type] });
      generatePlan(zone);
    } else {
      setPlan(null);
    }
  };

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

  const openEditTask = (task) => {
    setEditingTask(task);
    setEditForm({ title: task.title, priority: task.priority, due_date: task.due_date || '' });
  };

  const saveEditTask = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/api/tasks/${editingTask.id}`, editForm);
      setTasks(t => t.map(tk => tk.id === editingTask.id ? { ...tk, ...data } : tk));
      setEditingTask(null);
      toast.success('Task updated!');
    } catch { toast.error('Failed to update task'); }
  };

  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      setTasks(t => t.filter(tk => tk.id !== taskId));
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete task'); }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Zone Banner ── */}
      <AnimatePresence mode="wait">
        {activeZone ? (
          <motion.div key={activeZone.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`card p-4 mb-4 border-l-4 ${ZONE_BORDER[activeZone.zone_type]}`}
          >
            <div className="flex items-center gap-3">
              <motion.span className="text-2xl md:text-3xl"
                animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}>
                {ZONE_ICONS[activeZone.zone_type]}
              </motion.span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{activeZone.name}</p>
                <p className="text-xs text-slate-500 capitalize">
                  {currentZone ? '📡 GPS detected' : '👆 Manually selected'} · {activeZone.zone_type}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="no-zone" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="card p-4 mb-4 border-l-4 border-slate-200 bg-slate-50">
            <p className="text-slate-500 text-sm">
              {permissionDenied
                ? '⚠️ Location permission denied — enable it or select a zone manually below'
                : '📍 No GPS zone detected — select a zone manually below to generate your AI plan'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manual Zone Selector + GPS Debug ── */}
      <div className="card p-3 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Navigation className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-medium text-slate-600 shrink-0">Select Zone:</span>
          <select
            className="input-field text-xs flex-1"
            value={manualZone?.id || ''}
            onChange={e => handleManualZoneSelect(e.target.value)}
            disabled={!!currentZone}
          >
            <option value="">{currentZone ? `${ZONE_ICONS[currentZone.zone_type]} ${currentZone.name} (GPS)` : '— pick a zone —'}</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{ZONE_ICONS[z.zone_type]} {z.name}</option>
            ))}
          </select>
        </div>

        {/* GPS coordinates debug */}
        <button
          onClick={() => setShowCoords(v => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        >
          <Crosshair className="w-3.5 h-3.5" />
          GPS
        </button>

        <AnimatePresence>
          {showCoords && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 font-mono overflow-hidden"
            >
              {coordinates
                ? `Lat: ${coordinates.latitude.toFixed(5)}  Lng: ${coordinates.longitude.toFixed(5)} — if zone not detecting, update your zone lat/lng to match these values`
                : permissionDenied
                  ? 'Location permission denied'
                  : 'Waiting for GPS signal...'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* AI Work Plan — 3/5 */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">AI Work Plan</h2>
            {activeZone && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => generatePlan(activeZone)} disabled={planLoading}
                className="btn-secondary text-xs flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${planLoading ? 'animate-spin' : ''}`} />
                Refresh Plan
              </motion.button>
            )}
          </div>

          {planLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
          ) : plan ? (
            <div className="space-y-3">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="card p-4 bg-slate-50">
                <p className="text-sm text-slate-600">{plan.summary}</p>
              </motion.div>

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

              {plan.tip && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="card p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">{plan.tip}</p>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <p className="text-slate-400 text-sm">
                {activeZone ? 'Click Refresh Plan to generate' : 'Select a zone above to get your AI work plan'}
              </p>
            </div>
          )}
        </div>

        {/* Task List — 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Tasks</h2>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddTask(!showAddTask)}
              className="btn-primary text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Task
            </motion.button>
          </div>

          {/* ── GitHub Repo Connect (inside Tasks) ── */}
          <div className="card p-3 border border-dashed border-slate-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-xs text-slate-600 truncate">
                  {githubContext
                    ? <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                        <span className="font-medium text-indigo-600 truncate">{githubContext.repoName}</span>
                      </span>
                    : githubRepo
                      ? <span className="truncate">{githubRepo.replace('https://github.com/', '')}</span>
                      : 'Connect repo — AI uses your issues & PRs'
                  }
                </span>
              </div>
              <button onClick={() => setShowGithubForm(v => !v)}
                className="text-xs text-indigo-600 hover:underline shrink-0">
                {showGithubForm ? 'Hide' : githubRepo ? 'Edit' : 'Connect'}
              </button>
            </div>

            {/* Context pills */}
            {githubContext && !showGithubForm && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">🐛 {githubContext.openIssues.length} issues</span>
                <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">🔀 {githubContext.openPRs.length} PRs</span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">📦 {githubContext.recentCommits.length} commits</span>
              </div>
            )}

            <AnimatePresence>
              {showGithubForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-3 space-y-2">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Repo URL</label>
                      <input className="input-field text-xs" placeholder="https://github.com/you/project"
                        value={githubRepo} onChange={e => setGithubRepo(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Token <span className="text-slate-400">(optional, for private repos)</span>
                      </label>
                      <input className="input-field text-xs font-mono" type="password" placeholder="ghp_..."
                        value={githubToken} onChange={e => setGithubToken(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          localStorage.setItem('aw_github_repo', githubRepo);
                          localStorage.setItem('aw_github_token', githubToken);
                          setShowGithubForm(false);
                          setGithubContext(null);
                          toast.success('Repo connected — refresh AI plan to use it', { icon: '🐙' });
                        }}
                        className="btn-primary text-xs flex items-center gap-1.5">
                        <Link className="w-3 h-3" /> Save
                      </motion.button>
                      {githubRepo && (
                        <button onClick={() => {
                          setGithubRepo(''); setGithubToken(''); setGithubContext(null);
                          localStorage.removeItem('aw_github_repo');
                          localStorage.removeItem('aw_github_token');
                          setShowGithubForm(false);
                        }} className="btn-secondary text-xs">Disconnect</button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
                <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary w-full text-xs">
                  Add Task
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {pendingTasks.length === 0 && !showAddTask && (
              <p className="text-center text-slate-400 text-sm py-6">No pending tasks — add your first!</p>
            )}
            <AnimatePresence>
              {pendingTasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 30 }} transition={{ delay: i * 0.04 }}
                  className="card p-3 flex items-center gap-2 group">
                  <button onClick={() => toggleTaskDone(task)} className="shrink-0">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 hover:border-indigo-500 transition-colors" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{task.title}</p>
                    {task.due_date && <p className="text-xs text-slate-400">{new Date(task.due_date).toLocaleDateString()}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_BADGE[task.priority]}`}>
                    {task.priority}
                  </span>
                  {/* Edit / Delete — visible on hover */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEditTask(task)}
                      className="p-1 rounded hover:bg-indigo-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                    <button onClick={() => deleteTask(task.id)}
                      className="p-1 rounded hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

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

      {/* Edit task modal */}
      <AnimatePresence>
        {editingTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setEditingTask(null)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Edit Task</h3>
                <button onClick={() => setEditingTask(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <form onSubmit={saveEditTask} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Title</label>
                  <input className="input-field" value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Priority</label>
                    <select className="input-field text-sm" value={editForm.priority}
                      onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Due Date</label>
                    <input type="date" className="input-field text-sm" value={editForm.due_date}
                      onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary flex-1 text-sm">
                    Save Changes
                  </motion.button>
                  <button type="button" onClick={() => setEditingTask(null)} className="btn-secondary text-sm px-4">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previous sessions */}
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
                    <p className="text-sm font-medium text-slate-700">
                      {ZONE_ICONS[s.zone?.zone_type]} {s.zone?.name} · {s.time}
                    </p>
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
