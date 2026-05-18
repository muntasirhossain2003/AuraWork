const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name, workspace_id: user.workspace_id }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password: hashed, name })
      .select('id,email,name,avatar_url,workspace_id')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: user, error } = await supabase
      .from('users')
      .select('id,email,name,avatar_url,workspace_id,password')
      .eq('email', email)
      .single();
    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const { password: _, ...safeUser } = user;
    res.json({ token: signToken(safeUser), user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = (req, res) => {
  res.json({ user: req.user });
};
