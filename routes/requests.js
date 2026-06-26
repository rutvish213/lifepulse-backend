const express = require('express');
const router = express.Router();
const { BloodRequest } = require('../models/Models');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, async (req, res) => {
  try {
    const request = await BloodRequest.create({ ...req.body, requestedBy: req.user._id });

    if (request.emergencyLevel === 'critical') {
      console.log(`🚨 Critical request created: ${request.bloodGroup} at ${request.city}`);
    }

    res.status(201).json({ success: true, data: request, message: 'Blood request submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { requestedBy: req.user._id };
    const { status, bloodGroup, emergencyLevel, city } = req.query;
    if (status) filter.status = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (emergencyLevel) filter.emergencyLevel = emergencyLevel;
    if (city) filter.city = new RegExp(city, 'i');

    const requests = await BloodRequest.find(filter)
      .populate('requestedBy', 'name mobile')
      .populate('hospital', 'name city phone')
      .sort('-createdAt');

    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', protect, authorize('admin', 'hospital'), async (req, res) => {
  try {
    const request = await BloodRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!request) return res.status(404).json({ success: false, error: 'Request not found' });
    if (req.body.status === 'fulfilled') {
      request.fulfilledAt = Date.now();
      await request.save();
    }
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
