const router = require('express').Router();
const auth = require('../middleware/auth');
const { generatePlan, generateHandoff, getInsights } = require('../controllers/aiController');

router.use(auth);
router.post('/plan', generatePlan);
router.post('/handoff', generateHandoff);
router.get('/insights', getInsights);

module.exports = router;
