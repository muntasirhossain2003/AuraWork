require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'AuraWork API', timestamp: new Date().toISOString() });
});

// Routes (mounted after each phase is built)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/presence', require('./routes/presence'));
app.use('/api/sessions', require('./routes/sessions'));

app.listen(PORT, () => {
  console.log(`AuraWork server running on port ${PORT}`);
});
