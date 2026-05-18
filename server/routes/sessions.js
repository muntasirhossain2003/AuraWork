const router = require('express').Router();
const auth = require('../middleware/auth');
const { startSession, endSession, getSessions } = require('../controllers/sessionController');

router.use(auth);
router.post('/start', startSession);
router.put('/:id/end', endSession);
router.get('/', getSessions);

module.exports = router;
