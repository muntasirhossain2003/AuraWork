const supabase = require('../utils/supabase');

exports.getSubtasks = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subtasks').select('*')
      .eq('task_id', req.params.taskId)
      .order('created_at');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createSubtask = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const { data, error } = await supabase
      .from('subtasks').insert({ task_id: req.params.taskId, title })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSubtask = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subtasks').update(req.body)
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteSubtask = async (req, res) => {
  try {
    const { error } = await supabase.from('subtasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
