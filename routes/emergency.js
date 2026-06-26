const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const { EmergencyAlert } = require('../models/Models');
const { protect, authorize } = require('../middleware/auth');

router.post('/sos', protect, async (req, res) => {
  try {
    const { bloodGroup, units, hospitalName, city, contactMobile, priority } = req.body;

    const alert = await EmergencyAlert.create({
      triggeredBy: req.user._id,
      patientName: req.body.patientName,
      bloodGroup, units, hospitalName, city, contactMobile,
      priority: priority || 'critical'
    });

    const donors = await Donor.find({
      bloodGroup,
      city: new RegExp(city, 'i'),
      isAvailable: true,
      isEligible: true,
      emergencyConsent: true
    }).populate('user', 'name mobile').limit(50);

    alert.alertsSentTo = donors.length;
    await alert.save();

    console.log(`🚨 Emergency SOS: ${bloodGroup} at ${city} — Alerted ${donors.length} donors`);

    res.json({
      success: true,
      message: `Emergency alert sent to ${donors.length} donors and nearby hospitals!`,
      alertId: alert._id,
      donorsAlerted: donors.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ status: 'active' })
      .populate('triggeredBy', 'name mobile')
      .sort('-createdAt').limit(20);
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id/resolve', protect, authorize('admin'), async (req, res) => {
  try {
    const alert = await EmergencyAlert.findByIdAndUpdate(req.params.id,
      { status: 'resolved', resolvedAt: Date.now() },
      { new: true }
    );
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
