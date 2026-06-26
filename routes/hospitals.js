const express = require('express');
const router = express.Router();
const { Hospital, BloodStock } = require('../models/Models');
const { protect, authorize } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { city, type, hasBloodBank, page = 1, limit = 10 } = req.query;
    const filter = { isActive: true };
    if (city) filter.city = new RegExp(city, 'i');
    if (type) filter.type = type;
    if (hasBloodBank) filter.hasBloodBank = hasBloodBank === 'true';

    const hospitals = await Hospital.find(filter)
      .skip((page - 1) * limit).limit(Number(limit))
      .sort('name');
    const total = await Hospital.countDocuments(filter);

    res.json({ success: true, count: hospitals.length, total, data: hospitals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ success: false, error: 'Hospital not found' });
    const stock = await BloodStock.find({ hospital: req.params.id });
    res.json({ success: true, data: { ...hospital.toObject(), bloodStock: stock } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: hospital });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', protect, authorize('admin', 'hospital'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hospital) return res.status(404).json({ success: false, error: 'Hospital not found' });
    res.json({ success: true, data: hospital });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
