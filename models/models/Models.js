// ===== LIFE PULSE — BLOOD STOCK MODEL =====
const mongoose = require('mongoose');

const bloodStockSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  availableUnits: { type: Number, required: true, default: 0, min: 0 },
  reservedUnits:  { type: Number, default: 0, min: 0 },
  totalCapacity:  { type: Number, default: 100 },
  expiryDate: { type: Date },
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

bloodStockSchema.virtual('status').get(function() {
  const pct = (this.availableUnits / this.totalCapacity) * 100;
  if (pct <= 10) return 'critical';
  if (pct <= 25) return 'low';
  return 'available';
});

bloodStockSchema.index({ hospital: 1, bloodGroup: 1 }, { unique: true });

// ===== BLOOD REQUEST MODEL =====
const bloodRequestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: { type: String, required: true, trim: true },
  patientAge:  { type: Number },
  bloodGroup:  { type: String, required: true, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'] },
  units:       { type: Number, required: true, min: 1, max: 10 },
  hospital:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  hospitalName:{ type: String },
  city:        { type: String, required: true },
  requiredBy:  { type: Date },
  doctorName:  { type: String },
  contactMobile: { type: String, required: true },
  emergencyLevel: {
    type: String,
    enum: ['routine', 'urgent', 'critical'],
    default: 'routine'
  },
  prescription: { type: String },
  notes:        { type: String },
  status: {
    type: String,
    enum: ['pending', 'matched', 'fulfilled', 'cancelled'],
    default: 'pending'
  },
  assignedDonor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  fulfilledAt:   { type: Date },
  responseTime:  { type: Number }
}, { timestamps: true });

bloodRequestSchema.index({ bloodGroup: 1, city: 1, status: 1 });
bloodRequestSchema.index({ emergencyLevel: 1, status: 1 });

// ===== HOSPITAL MODEL =====
const hospitalSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  type:    { type: String, enum: ['government', 'private', 'trust'], default: 'private' },
  address: { type: String, required: true },
  city:    { type: String, required: true },
  state:   { type: String },
  pincode: { type: String },
  phone:   { type: String },
  email:   { type: String, lowercase: true },
  website: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  hasBloodBank:    { type: Boolean, default: true },
  bloodBankHours:  { type: String, default: '24/7' },
  isPartner:       { type: Boolean, default: true },
  isActive:        { type: Boolean, default: true },
  managedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bloodStock:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'BloodStock' }],
  totalDonations:  { type: Number, default: 0 },
  rating:          { type: Number, default: 4.5, min: 1, max: 5 }
}, { timestamps: true });

hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ city: 1, isActive: 1 });

// ===== CAMP MODEL =====
const campSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  organizer:  { type: String, required: true },
  date:       { type: Date, required: true },
  startTime:  { type: String, required: true },
  endTime:    { type: String, required: true },
  venue:      { type: String, required: true },
  address:    { type: String },
  city:       { type: String, required: true },
  state:      { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  maxRegistrations: { type: Number, default: 100 },
  registrations: [{
    user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:   String,
    mobile: String,
    bloodGroup: String,
    registeredAt: { type: Date, default: Date.now }
  }],
  contactPhone:  { type: String },
  contactEmail:  { type: String },
  description:   { type: String },
  image:         { type: String },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  totalDonationsCollected: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

campSchema.index({ location: '2dsphere' });
campSchema.index({ date: 1, status: 1 });

campSchema.virtual('registrationCount').get(function() {
  return this.registrations.length;
});

campSchema.virtual('spotsLeft').get(function() {
  return this.maxRegistrations - this.registrations.length;
});

// ===== EMERGENCY ALERT MODEL =====
const emergencyAlertSchema = new mongoose.Schema({
  triggeredBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName:  { type: String },
  bloodGroup:   { type: String, required: true },
  units:        { type: Number, default: 1 },
  hospitalName: { type: String },
  city:         { type: String },
  contactMobile:{ type: String },
  priority:     { type: String, enum: ['critical', 'urgent'], default: 'critical' },
  alertsSentTo: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active'
  },
  resolvedAt:   { type: Date },
  responseTime: { type: Number }
}, { timestamps: true });

module.exports = {
  BloodStock: mongoose.model('BloodStock', bloodStockSchema),
  BloodRequest: mongoose.model('BloodRequest', bloodRequestSchema),
  Hospital: mongoose.model('Hospital', hospitalSchema),
  Camp: mongoose.model('Camp', campSchema),
  EmergencyAlert: mongoose.model('EmergencyAlert', emergencyAlertSchema)
};
