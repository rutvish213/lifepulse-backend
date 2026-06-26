// ===== LIFE PULSE — AUTH ROUTES =====
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const { protect, generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const sendTokenResponse = (user, statusCode, res) => {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  User.findByIdAndUpdate(user._id, { refreshToken, lastLogin: Date.now() }).exec();

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id:         user._id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      bloodGroup: user.bloodGroup,
      isVerified: user.isVerified
    }
  });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, password, role, bloodGroup, city } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: existing.email === email ? 'Email already registered' : 'Mobile already registered'
      });
    }

    const otp = generateOTP();
    const user = await User.create({
      name, email, mobile, password,
      role: role || 'donor',
      bloodGroup: bloodGroup || null,
      city: city || '',
      otp,
      otpExpiry: Date.now() + 5 * 60 * 1000
    });

    console.log(`📱 OTP for ${mobile}: ${otp}`);

    res.status(201).json({
      success: true,
      message: `OTP sent to ${mobile}. Please verify to activate your account.`,
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select('+otp +otpExpiry');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }
    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked due to too many failed attempts. Try again in 30 minutes.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ success: false, error: `This account is not registered as ${role}` });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, error: 'Please verify your mobile number first.' });
    }

    if (user.loginAttempts > 0) {
      await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, error: 'No refresh token' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    const newAccessToken  = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Refresh token expired — please login again' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, message: 'If this email is registered, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetExpiry = Date.now() + 30 * 60 * 1000;

    await User.findByIdAndUpdate(user._id, {
      otp: resetToken,
      otpExpiry: resetExpiry
    });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5000'}/pages/reset-password.html?token=${resetToken}&id=${user._id}`;

    console.log(`🔗 Reset URL: ${resetUrl}`);

    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    const user = await User.findById(userId).select('+otp +otpExpiry');
    if (!user || user.otp !== token || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.refreshToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/logout', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: undefined });
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const otp = generateOTP();
    await User.findByIdAndUpdate(userId, {
      otp,
      otpExpiry: Date.now() + 5 * 60 * 1000
    });

    console.log(`📱 New OTP for ${user.mobile}: ${otp}`);

    res.json({ success: true, message: 'New OTP sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
