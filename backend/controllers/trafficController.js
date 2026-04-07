const { getTrafficLevel } = require('../services/aiService');
const TrafficLog = require('../models/TrafficLog');

async function fetchTraffic(req, res) {
  const level = getTrafficLevel();
  const messages = {
    low: 'Traffic is clear. Optimal route active.',
    medium: 'Moderate traffic. Minor delays expected.',
    high: 'Heavy traffic! Activating green corridor.',
  };
  const message = messages[level];
  TrafficLog.create({ level, message }).catch(() => {});
  res.json({ level, message });
}

module.exports = { fetchTraffic };
