const groq = require('../utils/groq');
const supabase = require('../utils/supabase');

exports.generatePlan = async (req, res) => {
  try {
    const { zone, tasks } = req.body;
    const taskList = (tasks || []).map(t => `- [${t.priority}] ${t.title}`).join('\n') || 'No tasks yet';
    const prompt = `You are a productivity coach. The user is now at their ${zone.zone_type} zone called "${zone.name}".
Zone profile: Focus hours: ${zone.focus_hours || 'not set'}, Availability: ${zone.availability || 'not set'}, Preferred task types: ${(zone.task_types || []).join(', ') || 'not set'}.
Pending tasks:
${taskList}

Generate a prioritized, time-blocked work plan for this context.
Return ONLY valid JSON in this exact format:
{
  "summary": "1-2 sentence context summary",
  "plan": [{ "time": "9:00 AM", "task": "task name", "duration": "45 min", "reason": "why this task now" }],
  "tip": "one actionable tip for this location"
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const text = response.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const plan = JSON.parse(jsonMatch[0]);
    res.json(plan);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.generateHandoff = async (req, res) => {
  try {
    const { zone, completedTasks, incompleteTasks, sessionDuration } = req.body;
    const prompt = `Generate a handoff note for a work session. Zone: ${zone?.name} (${zone?.zone_type}). Duration: ${sessionDuration || 'unknown'}. Completed: ${(completedTasks || []).map(t => t.title).join(', ') || 'none'}. Incomplete: ${(incompleteTasks || []).map(t => t.title).join(', ') || 'none'}. Write 3-4 sentences: what was done, what to carry over, and a recommendation. Return ONLY the note text.`;
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    res.json({ note: response.choices[0].message.content });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getInsights = async (req, res) => {
  try {
    const { data: sessions } = await supabase.from('sessions')
      .select('*, zones(name, zone_type)').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30);
    if (!sessions || sessions.length < 5) {
      return res.json({ insufficient: true, sessions: sessions?.length || 0 });
    }
    const summary = sessions.map(s => `Zone: ${s.zones?.zone_type}, Tasks: ${s.tasks_completed}/${s.tasks_total}, Day: ${new Date(s.entered_at).toLocaleDateString('en-US', { weekday: 'short' })}`).join('\n');
    const prompt = `Analyze these work sessions:\n${summary}\n\nReturn 3-5 productivity insights as JSON array: [{"insight": "observation text", "metric": "supporting stat"}]. Return ONLY valid JSON array.`;
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });
    const text = response.choices[0].message.content;
    const arrMatch = text.match(/\[[\s\S]*\]/);
    const insights = JSON.parse(arrMatch[0]);
    res.json({ insights, sessions });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
