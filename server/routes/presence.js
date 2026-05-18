const router = require('express').Router();
const auth = require('../middleware/auth');
const { updatePresence, getWorkspacePresence } = require('../controllers/presenceController');

router.use(auth);
router.put('/', updatePresence);
router.get('/workspace', getWorkspacePresence);

module.exports = router;
