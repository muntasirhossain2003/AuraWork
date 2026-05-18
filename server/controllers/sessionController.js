const supabase = require('../utils/supabase');

exports.startSession = async (req, res) => {
  try {
    const { zone_id } = req.body;
    const { data, error } = await supabase.from('sessions')
      .insert({ user_id: req.user.id, zone_id, entered_at: new Date() })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.endSession = async (req, res) => {
  try {
    const { tasks_completed, tasks_total, handoff_note } = req.body;
    const { data, error } = await supabase.from('sessions')
      .update({ exited_at: new Date(), tasks_completed, tasks_total, handoff_note })
      .eq('id', req.params.id).eq('user_id', req.user.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSessions = async (req, res) => {
  try {
    const { data, error } = await supabase.from('sessions')
      .select('*, zones(name, zone_type)').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
