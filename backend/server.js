require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const seedDemoUsers = require('./seed');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/ambulance', require('./routes/ambulance'));
app.use('/api/route', require('./routes/route'));
app.use('/api/hospitals', require('./routes/hospital'));
app.use('/api/traffic', require('./routes/traffic'));
app.use('/api/signal', require('./routes/signal'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5001;
connectDB().then(async () => {
  await seedDemoUsers();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
