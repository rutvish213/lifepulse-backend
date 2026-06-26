const express = require('express');
const router = express.Router();
const { Camp } = require('../models/Models');
const { protect, authorize } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { city, status = 'upcoming', page = 1, limit = 10 } = req.query;
    const filter = {};
    if (city) filter.city = new RegExp(city, 'i');
    if (status) filter.status = status;

    const camps = await Camp.find(filter)
      .skip((page - 1) * limit).limit(Number(limit))
      .sort('date');
    const total = await Camp.countDocuments(filter);

    res.json({ success: true, count: camps.length, total, data: camps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/register', protect, async (req, res) => {
  try {
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ success: false, error: 'Camp not found' });
    if (camp.registrations.length >= camp.maxRegistrations) {
      return res.status(400).json({ success: false, error: 'Camp is fully booked' });
    }

    const alreadyRegistered = camp.registrations.some(r => r.user?.toString() === req.user._id.toString());
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, error: 'You are already registered for this camp' });
    }

    camp.registrations.push({
      user: req.user._id,
      name: req.user.name,
      mobile: req.body.mobile || '',
      bloodGroup: req.body.bloodGroup || ''
    });
    await camp.save();

    res.json({ success: true, message: 'Successfully registered for camp!', data: camp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const camp = await Camp.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: camp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
