const supabase = require('../utils/supabase');

const STATUS_LABELS = {
  home: '🏠 Home — Deep Focus',
  office: '🏢 Office — In Meetings',
  cafe: '☕ Café — Available',
  client: '🤝 Client Site — Async Only',
  other: '📍 On the Move',
};

exports.updatePresence = async (req, res) => {
  try {
    const { zone_id, zone_name, zone_type } = req.body;
    const status_label = STATUS_LABELS[zone_type] || STATUS_LABELS.other;
    const { data, error } = await supabase.from('presence')
      .upsert({ user_id: req.user.id, zone_id, zone_name, zone_type, status_label, updated_at: new Date() }, { onConflict: 'user_id' })
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getWorkspacePresence = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('presence')
      .select('*, users(name, avatar_url, workspace_id)')
      .eq('users.workspace_id', req.user.workspace_id);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
