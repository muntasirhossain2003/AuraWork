const groq = require('../utils/groq');
const supabase = require('../utils/supabase');

// Fetch open issues, recent commits, open PRs from a GitHub repo
async function fetchGitHubContext(repoUrl, token) {
  try {
    // Parse owner/repo from URL like https://github.com/owner/repo
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s]+)/);
    if (!match) return null;
    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, '');

    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const base = `https://api.github.com/repos/${owner}/${repoName}`;

    const [issuesRes, commitsRes, prsRes] = await Promise.all([
      fetch(`${base}/issues?state=open&per_page=10`, { headers }),
      fetch(`${base}/commits?per_page=7`, { headers }),
      fetch(`${base}/pulls?state=open&per_page=5`, { headers }),
    ]);

    const [issues, commits, prs] = await Promise.all([
      issuesRes.ok ? issuesRes.json() : [],
      commitsRes.ok ? commitsRes.json() : [],
      prsRes.ok ? prsRes.json() : [],
    ]);

    return {
      repoName: `${owner}/${repoName}`,
      openIssues: issues.filter(i => !i.pull_request).map(i => `#${i.number}: ${i.title} [${(i.labels || []).map(l => l.name).join(', ') || 'no label'}]`),
      recentCommits: commits.map(c => `${c.sha?.slice(0, 7)}: ${c.commit?.message?.split('\n')[0]}`),
      openPRs: prs.map(p => `PR #${p.number}: ${p.title} (${p.user?.login})`),
    };
  } catch {
    return null;
  }
}

exports.generatePlan = async (req, res) => {
  try {
    const { zone, tasks, githubRepo, githubToken } = req.body;
    const taskList = (tasks || []).map(t => `- [${t.priority}] ${t.title}`).join('\n') || 'No tasks yet';

    // Fetch GitHub context if repo URL provided
    let ghContext = null;
    if (githubRepo) {
      ghContext = await fetchGitHubContext(githubRepo, githubToken);
    }

    const githubSection = ghContext ? `
GitHub Project: ${ghContext.repoName}
Open Issues (${ghContext.openIssues.length}):
${ghContext.openIssues.join('\n') || 'none'}
Open PRs (${ghContext.openPRs.length}):
${ghContext.openPRs.join('\n') || 'none'}
Recent Commits:
${ghContext.recentCommits.join('\n') || 'none'}
` : '';

    const prompt = `You are a productivity coach with full context of the developer's work.

Location: ${zone.zone_type} zone called "${zone.name}"
Zone profile: Focus hours: ${zone.focus_hours || 'not set'}, Availability: ${zone.availability || 'not set'}, Preferred task types: ${(zone.task_types || []).join(', ') || 'not set'}

Personal task list:
${taskList}
${githubSection ? `\nReal project progress from GitHub:\n${githubSection}` : ''}
Based on ALL of the above context (location, personal tasks${ghContext ? ', AND the real GitHub project state' : ''}), generate a smart prioritized time-blocked work plan.
If GitHub data is present, reference specific issue/PR numbers in the plan items.

Return ONLY valid JSON:
{
  "summary": "1-2 sentence summary referencing actual project state",
  "plan": [{ "time": "9:00 AM", "task": "task description", "duration": "45 min", "reason": "why this now, referencing specific issues/PRs if available" }],
  "tip": "one actionable tip specific to this location and project"
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const text = response.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const plan = JSON.parse(jsonMatch[0]);
    // Include the github context metadata in response so frontend can show it
    res.json({ ...plan, githubContext: ghContext });
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
