// ===== LIFE PULSE — DONOR MODEL =====
const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 18, max: 65 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  mobile: { type: String, required: true },
  email: { type: String, lowercase: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  pincode: { type: String },
  weight: { type: Number, min: 50 },
  lastDonationDate: { type: Date },
  totalDonations: { type: Number, default: 0 },
  preferredTime: {
    type: String,
    enum: ['Morning', 'Afternoon', 'Evening'],
    default: 'Morning'
  },
  isAvailable: { type: Boolean, default: true },
  isEligible: { type: Boolean, default: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  medicalConditions: [String],
  emergencyConsent: { type: Boolean, default: true },
  donationHistory: [{
    date: Date,
    hospital: String,
    units: { type: Number, default: 1 },
    bloodGroup: String
  }],
  certificates: [{ type: String }],
  rating: { type: Number, default: 5, min: 1, max: 5 }
}, {
  timestamps: true
});

donorSchema.index({ location: '2dsphere' });
donorSchema.index({ bloodGroup: 1, city: 1 });
donorSchema.index({ isAvailable: 1, isEligible: 1 });

donorSchema.methods.checkEligibility = function() {
  if (!this.lastDonationDate) return true;
  const daysSince = (Date.now() - this.lastDonationDate) / (1000 * 60 * 60 * 24);
  return daysSince >= 56;
};

donorSchema.virtual('nextEligibleDate').get(function() {
  if (!this.lastDonationDate) return new Date();
  const next = new Date(this.lastDonationDate);
  next.setDate(next.getDate() + 56);
  return next;
});

module.exports = mongoose.model('Donor', donorSchema);
