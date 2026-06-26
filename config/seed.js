// ===== LIFE PULSE — DATABASE SEED SCRIPT =====
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Donor = require('../models/Donor');
const { Hospital, BloodStock, Camp, BloodRequest } = require('../models/Models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifepulse';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Ahmedabad', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad'];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Donor.deleteMany({}),
    Hospital.deleteMany({}),
    BloodStock.deleteMany({}),
    Camp.deleteMany({}),
    BloodRequest.deleteMany({})
  ]);
  console.log('🗑️  Cleared existing data');

  const admin = await User.create({
    name: 'Life Pulse Admin',
    email: 'admin@lifepulse.in',
    mobile: '9000000000',
    password: 'Admin@2025',
    role: 'admin',
    isVerified: true
  });
  console.log('👤 Admin created:', admin.email);

  const hospitalData = [
    { name: 'AIIMS Mumbai',          type: 'government', city: 'Mumbai',    address: 'Andheri East, Mumbai', phone: '022-26730000', coordinates: [72.8697, 19.1197] },
    { name: 'Safdarjung Hospital',   type: 'government', city: 'Delhi',     address: 'Ring Road, New Delhi', phone: '011-26730000', coordinates: [77.1925, 28.5665] },
    { name: 'Manipal Hospital',      type: 'private',    city: 'Bangalore', address: 'HAL Airport Road, Bangalore', phone: '080-25022222', coordinates: [77.6573, 12.9761] },
    { name: 'Civil Hospital',        type: 'government', city: 'Ahmedabad', address: 'Asarwa, Ahmedabad',  phone: '079-22681234', coordinates: [72.5946, 23.0502] },
    { name: 'Apollo Hospital',       type: 'private',    city: 'Chennai',   address: 'Greams Road, Chennai', phone: '044-28290200', coordinates: [80.2492, 13.0594] },
    { name: 'SSKM Hospital',         type: 'government', city: 'Kolkata',   address: 'AJC Bose Road, Kolkata', phone: '033-22235400', coordinates: [88.3503, 22.5313] },
    { name: 'Ruby Hall Clinic',      type: 'private',    city: 'Pune',      address: 'Sassoon Road, Pune', phone: '020-26163391', coordinates: [73.8567, 18.5314] },
    { name: 'Yashoda Hospitals',     type: 'private',    city: 'Hyderabad', address: 'Secunderabad, Hyderabad', phone: '040-45674567', coordinates: [78.4983, 17.4399] }
  ];

  const hospitals = await Hospital.insertMany(hospitalData.map(h => ({
    ...h,
    location: { type: 'Point', coordinates: h.coordinates },
    hasBloodBank: true,
    bloodBankHours: '24/7',
    isPartner: true,
    isActive: true
  })));
  console.log(`🏥 Created ${hospitals.length} hospitals`);

  const stockUnits = { 'A+': 142, 'A-': 18, 'B+': 98, 'B-': 7, 'AB+': 64, 'AB-': 12, 'O+': 210, 'O-': 5 };
  const stockCapacity = { 'A+': 200, 'A-': 100, 'B+': 150, 'B-': 80, 'AB+': 100, 'AB-': 60, 'O+': 300, 'O-': 120 };

  const stockData = [];
  for (const hospital of hospitals) {
    for (const bg of bloodGroups) {
      stockData.push({
        hospital: hospital._id,
        bloodGroup: bg,
        availableUnits: stockUnits[bg] + Math.floor(Math.random() * 20),
        reservedUnits: Math.floor(Math.random() * 10),
        totalCapacity: stockCapacity[bg],
        lastUpdated: new Date()
      });
    }
  }
  await BloodStock.insertMany(stockData);
  console.log(`🩸 Created ${stockData.length} blood stock records`);

  const donorNames = ['Rahul Sharma', 'Priya Krishnan', 'Amit Patel', 'Sneha Rao', 'Dev Tiwari',
    'Pooja Verma', 'Karan Mehta', 'Anjali Singh', 'Rohit Gupta', 'Meera Nair'];

  for (let i = 0; i < donorNames.length; i++) {
    const bg = bloodGroups[i % bloodGroups.length];
    const city = cities[i % cities.length];
    const user = await User.create({
      name: donorNames[i],
      email: `donor${i + 1}@lifepulse.in`,
      mobile: `98765${String(43210 + i).padStart(5, '0')}`,
      password: 'Donor@2025',
      role: 'donor',
      bloodGroup: bg,
      city,
      isVerified: true
    });
    await Donor.create({
      user: user._id,
      name: donorNames[i],
      age: 22 + i,
      gender: i % 3 === 1 ? 'Female' : 'Male',
      bloodGroup: bg,
      mobile: user.mobile,
      email: user.email,
      address: `${i + 1} Main Street, ${city}`,
      city,
      weight: 60 + i * 2,
      totalDonations: Math.floor(Math.random() * 8),
      isAvailable: true,
      isEligible: true,
      emergencyConsent: true,
      location: { type: 'Point', coordinates: [72.87 + i * 0.01, 19.07 + i * 0.01] }
    });
  }
  console.log(`🤝 Created ${donorNames.length} donors`);

  const campData = [
    {
      name: 'Mumbai Mega Blood Drive 2025',
      organizer: 'Life Pulse Foundation',
      date: new Date('2025-06-19'),
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      venue: 'BKC Convention Centre',
      city: 'Mumbai',
      maxRegistrations: 200,
      status: 'upcoming',
      contactPhone: '022-12345678',
      description: 'India\'s largest single-day blood donation camp'
    },
    {
      name: 'NSS Life Camp — Pune University',
      organizer: 'NSS Unit, Pune University',
      date: new Date('2025-06-22'),
      startTime: '10:00 AM',
      endTime: '04:00 PM',
      venue: 'Fergusson College',
      city: 'Pune',
      maxRegistrations: 100,
      status: 'upcoming'
    },
    {
      name: 'Rotary Club Mega Camp',
      organizer: 'Rotary Club of Delhi',
      date: new Date('2025-06-28'),
      startTime: '08:00 AM',
      endTime: '06:00 PM',
      venue: 'Pragati Maidan',
      city: 'Delhi',
      maxRegistrations: 150,
      status: 'upcoming'
    }
  ];

  const camps = await Camp.insertMany(campData.map(c => ({ ...c, createdBy: admin._id })));
  console.log(`🎪 Created ${camps.length} camps`);

  const requestData = [
    { patientName: 'Rajesh S.', bloodGroup: 'O-', units: 2, hospitalName: 'KEM Hospital', city: 'Mumbai', emergencyLevel: 'critical', contactMobile: '9876543210', status: 'pending' },
    { patientName: 'Priya M.',  bloodGroup: 'B-', units: 3, hospitalName: 'Apollo Delhi',  city: 'Delhi',  emergencyLevel: 'urgent',   contactMobile: '9876543211', status: 'pending' },
    { patientName: 'Amit K.',   bloodGroup: 'AB+', units: 1, hospitalName: 'Manipal',      city: 'Bangalore', emergencyLevel: 'routine', contactMobile: '9876543212', status: 'matched' }
  ];

  await BloodRequest.insertMany(requestData.map(r => ({ ...r, requestedBy: admin._id })));
  console.log(`📋 Created ${requestData.length} sample blood requests`);

  console.log('\n✅ ===== DATABASE SEEDED SUCCESSFULLY =====');
  console.log('🔐 Admin Login:');
  console.log('   Email:    admin@lifepulse.in');
  console.log('   Password: Admin@2025');
  console.log('===========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
