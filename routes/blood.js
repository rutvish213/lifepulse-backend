const express = require('express');
const router = express.Router();
const { BloodStock } = require('../models/Models');
const { protect, authorize } = require('../middleware/auth');

router.get('/stock', async (req, res) => {
  try {
    const { hospitalId, bloodGroup, city, status } = req.query;
    const filter = {};
    if (hospitalId) filter.hospital = hospitalId;
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    let stock = await BloodStock.find(filter)
      .populate({ path: 'hospital', select: 'name city address phone', match: city ? { city: new RegExp(city, 'i') } : {} })
      .sort('bloodGroup');

    if (status) {
      stock = stock.filter(s => {
        const pct = (s.availableUnits / s.totalCapacity) * 100;
        if (status === 'critical') return pct <= 10;
        if (status === 'low') return pct > 10 && pct <= 25;
        if (status === 'available') return pct > 25;
        return true;
      });
    }

    const summary = await BloodStock.aggregate([
      { $group: { _id: '$bloodGroup', totalUnits: { $sum: '$availableUnits' }, totalReserved: { $sum: '$reservedUnits' } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, summary, data: stock });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/stock/:id', protect, authorize('hospital', 'admin'), async (req, res) => {
  try {
    const stock = await BloodStock.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: Date.now(), updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!stock) return res.status(404).json({ success: false, error: 'Stock record not found' });
    res.json({ success: true, data: stock });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/stock', protect, authorize('hospital', 'admin'), async (req, res) => {
  try {
    const { hospitalId, bloodGroup, units } = req.body;
    let stock = await BloodStock.findOne({ hospital: hospitalId, bloodGroup });
    if (stock) {
      stock.availableUnits += units;
      stock.lastUpdated = Date.now();
      await stock.save();
    } else {
      stock = await BloodStock.create({ hospital: hospitalId, bloodGroup, availableUnits: units, updatedBy: req.user._id });
    }
    res.json({ success: true, data: stock });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
