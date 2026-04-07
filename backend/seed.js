const User = require('./models/User');
const Ambulance = require('./models/Ambulance');

async function seedDemoUsers() {
  try {
    const demos = [
      { name: 'Admin User', email: 'admin@demo.com', password: 'demo1234', role: 'admin' },
      { name: 'Driver One', email: 'driver@demo.com', password: 'demo1234', role: 'driver' },
    ];

    for (const d of demos) {
      const exists = await User.findOne({ email: d.email });
      if (exists) continue;
      const user = await User.create(d);
      if (user.role === 'driver') {
        const ambulanceId = `AMB-${String(user._id).slice(-6).toUpperCase()}`;
        await Ambulance.create({ ambulanceId, driverId: user._id, driverName: user.name });
      }
      console.log(`Demo user created: ${d.email} (${d.role})`);
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

module.exports = seedDemoUsers;
