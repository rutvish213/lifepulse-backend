const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', protect, async (req, res) => {
  try {
    const existing = await Donor.findOne({ user: req.user._id });
    if (existing) return res.status(400).json({ success: false, error: 'You are already registered as a donor' });

    const donor = await Donor.create({ ...req.body, user: req.user._id });
    await User.findByIdAndUpdate(req.user._id, { role: 'donor', bloodGroup: req.body.bloodGroup });
    res.status(201).json({ success: true, data: donor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { bloodGroup, city, isAvailable, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = new RegExp(city, 'i');
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';

    const donors = await Donor.find(filter)
      .populate('user', 'name email mobile')
      .skip((page - 1) * limit).limit(Number(limit))
      .sort('-createdAt');
    const total = await Donor.countDocuments(filter);

    res.json({ success: true, count: donors.length, total, pages: Math.ceil(total / limit), data: donors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/search', protect, async (req, res) => {
  try {
    const { bloodGroup, city, lat, lng, radius = 25 } = req.query;
    let filter = { isAvailable: true, isEligible: true };
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = new RegExp(city, 'i');

    let donors;
    if (lat && lng) {
      donors = await Donor.find({
        ...filter,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: radius * 1000
          }
        }
      }).populate('user', 'name mobile').limit(20);
    } else {
      donors = await Donor.find(filter).populate('user', 'name mobile').limit(20);
    }

    res.json({ success: true, count: donors.length, data: donors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user._id }).populate('user', 'name email mobile');
    if (!donor) return res.status(404).json({ success: false, error: 'Donor profile not found' });
    res.json({ success: true, data: donor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/me', protect, async (req, res) => {
  try {
    const donor = await Donor.findOneAndUpdate({ user: req.user._id }, req.body, { new: true, runValidators: true });
    if (!donor) return res.status(404).json({ success: false, error: 'Donor profile not found' });
    res.json({ success: true, data: donor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
