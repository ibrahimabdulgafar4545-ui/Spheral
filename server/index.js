require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const musicRoutes = require('./routes/music');
const reelsRoutes = require('./routes/reels');
const supportRoutes = require('./routes/support');
const activityRoutes = require('./routes/activity');
const adminRoutes = require('./routes/admin');
const groupRoutes = require('./routes/groups');
const notifRoutes = require('./routes/notifications');

connectDB();

// Test Brevo connection on startup
const SibApiV3Sdk = require('@getbrevo/brevo');
const testBrevoConnection = () => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey === 'YOUR_BREVO_API_KEY_HERE' || apiKey === 'YOUR_BREVO_API_KEY') {
    console.log('⚠️ Brevo API Key not configured. Using local verification code fallback [DEBUG mode].');
    return;
  }
  
  const accountApi = new SibApiV3Sdk.AccountApi();
  accountApi.setApiKey(SibApiV3Sdk.AccountApiApiKeys.apiKey, apiKey);
  
  accountApi.getAccount().then(
    (data) => {
      console.log(`✉️ Brevo Connected Successfully! Owner: ${data.email} (${data.planType} plan)`);
    },
    (err) => {
      console.error(`❌ Brevo Connection Failed: Please check if your BREVO_API_KEY is correct.`);
    }
  );
};
testBrevoConnection();

// Test RapidAPI (Deezer) connection on startup
const testRapidAPIConnection = () => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey === 'YOUR_RAPIDAPI_KEY_HERE') {
    console.log('⚠️ RapidAPI Key not configured. Using free iTunes fallback for music search.');
    return;
  }

  const https = require('https');
  const options = {
    hostname: 'deezerdevs-deezer.p.rapidapi.com',
    path: '/search?q=test&limit=1',
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
    }
  };

  const req = https.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('🎵 RapidAPI (Deezer) Connected Successfully!');
    } else {
      console.error(`❌ RapidAPI Connection Failed: HTTP Status ${res.statusCode}. Please check if your RAPIDAPI_KEY is correct.`);
    }
  });

  req.on('error', (err) => {
    console.error(`❌ RapidAPI Connection Error: ${err.message}`);
  });

  req.end();
};
testRapidAPIConnection();

// Test Groq connection on startup
const testGroqConnection = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log('⚠️ Groq API Key not configured. AI features will not be active.');
    return;
  }

  const https = require('https');
  const payload = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: 'Ping' }],
    max_tokens: 2
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    if (res.statusCode === 200) {
      console.log('🤖 Groq AI API Connected Successfully! Model: llama-3.3-70b-versatile');
    } else {
      console.error(`❌ Groq API Connection Failed: HTTP Status ${res.statusCode}. Please check if your GROQ_API_KEY is correct.`);
    }
  });

  req.on('error', (err) => {
    console.error(`❌ Groq API Connection Error: ${err.message}`);
  });

  req.write(payload);
  req.end();
};
testGroqConnection();

// Start Background Jobs
const startAISupportJob = require('./jobs/aiSupportJob');
startAISupportJob();


const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/stories', require('./routes/stories'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/support', require('./routes/support'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/music', require('./routes/music'));
app.use('/api/events', require('./routes/events'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

const http = require('http');
const { initSocket } = require('./config/socket');

const server = http.createServer(app);
const { io } = initSocket(server);
app.set('io', io);

// Start scheduled announcements background worker
const { startAnnouncementScheduler } = require('./utils/announcementScheduler');
startAnnouncementScheduler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Spheral server running on port ${PORT}`));
