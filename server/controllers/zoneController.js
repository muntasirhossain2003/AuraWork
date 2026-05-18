const supabase = require('../utils/supabase');

exports.getZones = async (req, res) => {
  try {
    const { data, error } = await supabase.from('zones').select('*').eq('user_id', req.user.id).order('created_at');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createZone = async (req, res) => {
  try {
    const { name, latitude, longitude, zone_type, radius_m, focus_hours, availability, task_types } = req.body;
    if (!name || !latitude || !longitude || !zone_type) {
      return res.status(400).json({ error: 'name, latitude, longitude, zone_type are required' });
    }
    const { data, error } = await supabase.from('zones')
      .insert({ user_id: req.user.id, name, latitude, longitude, zone_type, radius_m: radius_m || 200, focus_hours, availability, task_types })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('zones')
      .update(req.body).eq('id', id).eq('user_id', req.user.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteZone = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('zones').delete().eq('id', id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Zone deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
