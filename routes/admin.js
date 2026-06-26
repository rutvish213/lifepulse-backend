const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const { BloodStock, BloodRequest, Hospital, Camp, EmergencyAlert } = require('../models/Models');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/stats', async (req, res) => {
  try {
    const [
      totalDonors, totalRequests, pendingRequests,
      totalHospitals, totalCamps, totalUsers,
      criticalStock, activeEmergencies
    ] = await Promise.all([
      Donor.countDocuments(),
      BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: 'pending' }),
      Hospital.countDocuments({ isActive: true }),
      Camp.countDocuments({ status: 'upcoming' }),
      User.countDocuments({ isActive: true }),
      BloodStock.countDocuments({ availableUnits: { $lte: 10 } }),
      EmergencyAlert.countDocuments({ status: 'active' })
    ]);

    const stockSummary = await BloodStock.aggregate([
      { $group: { _id: '$bloodGroup', totalUnits: { $sum: '$availableUnits' } } },
      { $sort: { _id: 1 } }
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyDonors = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, role: 'donor' } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalDonors, totalRequests, pendingRequests,
        totalHospitals, totalCamps, totalUsers,
        criticalStock, activeEmergencies,
        stockSummary, monthlyDonors
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter)
      .skip((page - 1) * limit).limit(Number(limit))
      .sort('-createdAt');
    const total = await User.countDocuments(filter);

    res.json({ success: true, count: users.length, total, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/users/:id/deactivate', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, message: 'User deactivated', data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
