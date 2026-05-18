const router = require('express').Router();
const auth = require('../middleware/auth');
const { getZones, createZone, updateZone, deleteZone } = require('../controllers/zoneController');

router.use(auth);
router.get('/', getZones);
router.post('/', createZone);
router.put('/:id', updateZone);
router.delete('/:id', deleteZone);

module.exports = router;
