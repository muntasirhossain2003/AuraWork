const supabase = require('../utils/supabase');

exports.getTasks = async (req, res) => {
  try {
    // Fetch tasks with their subtasks in one query
    const { data, error } = await supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .eq('user_id', req.user.id)
      .order('created_at');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createTask = async (req, res) => {
  try {
    const { title, priority, due_date, repo_url } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const { data, error } = await supabase.from('tasks')
      .insert({ user_id: req.user.id, title, priority: priority || 'medium', due_date, repo_url })
      .select('*, subtasks(*)').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateTask = async (req, res) => {
  try {
    const { data, error } = await supabase.from('tasks')
      .update(req.body).eq('id', req.params.id).eq('user_id', req.user.id)
      .select('*, subtasks(*)').single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteTask = async (req, res) => {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
