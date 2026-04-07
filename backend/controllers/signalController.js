const Signal = require('../models/Signal');
const { computeSignalStates, haversine } = require('../services/aiService');

async function getSignals(req, res) {
  try {
    const { routeId } = req.query;
    const filter = routeId ? { routeId } : {};
    const signals = await Signal.find(filter).lean();
    res.json(signals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateSignal(req, res) {
  try {
    const { id } = req.params;
    const update = { ...req.body, updatedAt: new Date() };
    const signal = await Signal.findOneAndUpdate({ signalId: id }, update, { new: true });
    if (!signal) return res.status(404).json({ error: 'Signal not found' });
    res.json(signal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateSignalsByPosition(req, res) {
  try {
    const { signals, ambulanceLat, ambulanceLng, routeId } = req.body;
    if (!signals || ambulanceLat == null || ambulanceLng == null)
      return res.status(400).json({ error: 'signals, ambulanceLat, ambulanceLng required' });

    const updated = computeSignalStates(signals, ambulanceLat, ambulanceLng);

    // Persist to MongoDB (fire-and-forget)
    updated.forEach((s) => {
      Signal.findOneAndUpdate(
        { signalId: s.id },
        { status: s.status, updatedAt: new Date() },
        { upsert: false }
      ).catch(() => {});
    });

    res.json({ signals: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getSignals, updateSignal, updateSignalsByPosition };
