import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { MapPin, Plus, Edit2, Trash2, X, Navigation } from 'lucide-react';
import api from '../utils/api';

const ZONE_ICONS = { home: '🏠', office: '🏢', cafe: '☕', client: '🤝', other: '📍' };
const ZONE_COLORS = { home: 'text-green-600 bg-green-50 border-green-200', office: 'text-blue-600 bg-blue-50 border-blue-200', cafe: 'text-amber-600 bg-amber-50 border-amber-200', client: 'text-purple-600 bg-purple-50 border-purple-200', other: 'text-slate-600 bg-slate-50 border-slate-200' };
const TASK_TYPE_OPTIONS = ['deep-work', 'meetings', 'creative', 'admin', 'learning'];

const emptyForm = { name: '', zone_type: 'home', latitude: '', longitude: '', radius_m: 200, focus_hours: '', availability: '', task_types: [] };

export default function ZonesPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const fetchZones = async () => {
    try {
      const { data } = await api.get('/api/zones');
      setZones(data);
    } catch { toast.error('Failed to load zones'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchZones(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (z) => { setEditing(z.id); setForm({ ...z, task_types: z.task_types || [] }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const useMyLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })); setLocating(false); },
      () => { toast.error('Location access denied'); setLocating(false); }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/zones/${editing}`, form);
        toast.success('Zone updated!');
      } else {
        await api.post('/api/zones', form);
        toast.success('Zone created!');
      }
      closeForm();
      fetchZones();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save zone'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this zone?')) return;
    try {
      await api.delete(`/api/zones/${id}`);
      toast.success('Zone deleted');
      setZones(z => z.filter(z => z.id !== id));
    } catch { toast.error('Failed to delete zone'); }
  };

  const toggleTaskType = (type) => {
    setForm(f => ({
      ...f,
      task_types: f.task_types.includes(type) ? f.task_types.filter(t => t !== type) : [...f.task_types, type]
    }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Zones</h1>
          <p className="text-slate-500 text-sm mt-0.5">Define your work locations for AI context detection</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openAdd}
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Zone
        </motion.button>
      </div>

      {/* Zone list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32" />)}
        </div>
      ) : zones.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card p-16 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No zones set up yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first zone to start using AI context detection</p>
          <button onClick={openAdd} className="btn-primary mt-4 text-sm">Add your first zone</button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {zones.map((zone, i) => (
              <motion.div key={zone.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={`card p-4 border-l-4 ${ZONE_COLORS[zone.zone_type]}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ZONE_ICONS[zone.zone_type]}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{zone.name}</p>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{zone.zone_type} · {zone.radius_m}m radius</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(zone)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(zone.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                {zone.focus_hours && <p className="text-xs text-slate-400 mt-2">⏰ {zone.focus_hours}</p>}
                {zone.task_types?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {zone.task_types.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-white rounded-full border border-current opacity-70">{t}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Zone form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && closeForm()}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Zone' : 'New Zone'}</h2>
                <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Zone Name *</label>
                  <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Home Office" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Zone Type *</label>
                  <select className="input-field" value={form.zone_type} onChange={e => setForm(f => ({ ...f, zone_type: e.target.value }))}>
                    <option value="home">🏠 Home</option>
                    <option value="office">🏢 Office</option>
                    <option value="cafe">☕ Café</option>
                    <option value="client">🤝 Client Site</option>
                    <option value="other">📍 Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Latitude *</label>
                    <input className="input-field" type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="23.8103" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Longitude *</label>
                    <input className="input-field" type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="90.4125" required />
                  </div>
                </div>
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={useMyLocation}
                  className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                  <Navigation className="w-4 h-4" />
                  {locating ? 'Getting location...' : 'Use My Current Location'}
                </motion.button>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Radius (metres)</label>
                  <input className="input-field" type="number" value={form.radius_m} onChange={e => setForm(f => ({ ...f, radius_m: Number(e.target.value) }))} min="50" max="5000" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Focus Hours</label>
                  <input className="input-field" value={form.focus_hours} onChange={e => setForm(f => ({ ...f, focus_hours: e.target.value }))} placeholder="e.g. 9am–12pm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Availability</label>
                  <input className="input-field" value={form.availability} onChange={e => setForm(f => ({ ...f, availability: e.target.value }))} placeholder="e.g. async-only" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Task Types</label>
                  <div className="flex flex-wrap gap-2">
                    {TASK_TYPE_OPTIONS.map(type => (
                      <button key={type} type="button" onClick={() => toggleTaskType(type)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          form.task_types.includes(type) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                        }`}>{type}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={saving} className="btn-primary flex-1 text-sm">
                    {saving ? 'Saving...' : editing ? 'Update Zone' : 'Create Zone'}
                  </motion.button>
                  <button type="button" onClick={closeForm} className="btn-secondary text-sm px-4">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
