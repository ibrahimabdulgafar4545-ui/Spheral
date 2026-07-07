const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const { protect } = require('../middleware/auth');
const { activeLiveStreams } = require('../config/socket');
const router = express.Router();

router.get('/active', protect, (req, res) => {
  const list = [];
  if (activeLiveStreams) {
    for (let [channelName, data] of activeLiveStreams.entries()) {
      list.push(data);
    }
  }
  return res.json({ success: true, streams: list });
});

router.get('/token', protect, (req, res) => {
  const appId = process.env.AGORA_APP_ID || '109f352202884564ab396c732df1364e'; // fallback to default testing App ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  const channelName = req.query.channelName;
  if (!channelName) {
    return res.status(400).json({ success: false, message: 'channelName query parameter is required' });
  }

  // If no certificate is configured on the server, return empty token (works if App Certificate is disabled in Agora Console)
  if (!appCertificate) {
    console.warn('⚠️ AGORA_APP_CERTIFICATE env var is not set. Returning null token (unsecured mode fallback).');
    return res.json({ success: true, token: null, appId });
  }

  const uid = 0; // 0 allows any UID
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );
    return res.json({ success: true, token, appId });
  } catch (err) {
    console.error('Error generating Agora token:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate Agora token' });
  }
});

module.exports = router;
