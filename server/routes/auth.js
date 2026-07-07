const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const SystemConfig = require('../models/SystemConfig');
const { checkProfileImpersonation } = require('../utils/aiModerator');
const { protect } = require('../middleware/auth');
const { getCountryByIp } = require('../utils/geolocation');
const SibApiV3Sdk = require('@getbrevo/brevo');

const router = express.Router();

// Initialize Brevo
const brevoApiKey = process.env.BREVO_API_KEY || '';

const transacEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
if (brevoApiKey && brevoApiKey !== 'YOUR_BREVO_API_KEY_HERE') {
  transacEmailsApi.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
}

const transacSmsApi = new SibApiV3Sdk.TransactionalSMSApi();
if (brevoApiKey && brevoApiKey !== 'YOUR_BREVO_API_KEY_HERE') {
  transacSmsApi.setApiKey(SibApiV3Sdk.TransactionalSMSApiApiKeys.apiKey, brevoApiKey);
}

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'spheral_local_secret_session_2026_very_long_string', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        avatar: user.avatar,
        coverPhoto: user.coverPhoto,
        location: user.location,
        website: user.website,
        workplace: user.workplace,
        education: user.education,
        age: user.age,
        relationshipStatus: user.relationshipStatus,
        city: user.city,
        country: user.country,
        school: user.school,
        friendsCount: user.friendsCount,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        verified: user.verified,
        preferences: user.preferences,
        friends: user.friends,
        isAdmin: user.isAdmin,
        accountStatus: user.accountStatus,
      },
    });
};

// @desc    Send Verification Code
// @route   POST /api/auth/send-code
// @access  Public
router.post(
  '/send-code',
  [
    body('identifier', 'Identifier is required').notEmpty().trim(),
    body('method', 'Method must be email or phone').isIn(['email', 'phone']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      // Check system settings for registration
      const config = await SystemConfig.findOne();
      if (config && !config.allowRegistrations) {
        return res.status(403).json({ success: false, message: 'New user registrations are currently disabled by the administrator.' });
      }

      const { identifier, method } = req.body;
      const normalizedIdentifier = method === 'email' ? identifier.toLowerCase() : identifier;

      // Rate limit check: max 3 requests per 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const count = await VerificationCode.countDocuments({
        identifier: normalizedIdentifier,
        createdAt: { $gte: tenMinutesAgo },
      });

      if (count >= 3) {
        return res.status(429).json({
          success: false,
          message: 'Too many verification code requests. Please wait 10 minutes before requesting another code.',
        });
      }

      // Check if username/email already registered
      if (method === 'email') {
        const userExists = await User.findOne({ email: normalizedIdentifier });
        if (userExists) {
          return res.status(400).json({ success: false, message: 'Email is already registered' });
        }
      } else {
        const userExists = await User.findOne({ phone: normalizedIdentifier });
        if (userExists) {
          return res.status(400).json({ success: false, message: 'Phone number is already registered' });
        }
      }

      // Generate 6 digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

      // Save code
      await VerificationCode.create({
        identifier: normalizedIdentifier,
        method,
        code,
        expiresAt,
      });

      // Send via Brevo
      const isBrevoConfigured = brevoApiKey && brevoApiKey !== 'YOUR_BREVO_API_KEY' && brevoApiKey !== 'YOUR_BREVO_API_KEY_HERE';

      if (isBrevoConfigured) {
        if (method === 'email') {
          let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
          sendSmtpEmail.subject = "Spheral Verification Code";
          sendSmtpEmail.htmlContent = `
            <html>
              <body style="font-family: Arial, sans-serif; background-color: #0a0b0d; color: #e8eaf0; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background-color: #16191f; border: 1px solid #2d3340; border-radius: 12px; padding: 30px; text-align: center;">
                  <h2 style="color: #1a73e8; margin-bottom: 20px;">Spheral Verification Code</h2>
                  <p>Thank you for signing up for Spheral! Use the verification code below to complete your registration:</p>
                  <div style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #1a73e8; margin: 30px 0; background: #0a0b0d; padding: 15px; border-radius: 8px;">${code}</div>
                  <p style="font-size: 12px; color: #9399a6;">This code is valid for 10 minutes. If you did not request this, you can ignore this email.</p>
                </div>
              </body>
            </html>
          `;
          const senderEmail = process.env.BREVO_SENDER_EMAIL || "verify@spheral.com";
          const senderName = process.env.BREVO_SENDER_NAME || "Spheral Support";
          sendSmtpEmail.sender = { name: senderName, email: senderEmail };
          sendSmtpEmail.to = [{ email: normalizedIdentifier }];

          await transacEmailsApi.sendTransacEmail(sendSmtpEmail);
        } else {
          let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
          sendTransacSms.sender = "Spheral";
          sendTransacSms.recipient = normalizedIdentifier;
          sendTransacSms.content = `Your Spheral verification code is: ${code}. Valid for 10 minutes.`;

          await transacSmsApi.sendTransacSms(sendTransacSms);
        }
      } else {
        // Fallback for local testing without API key setup
        console.log(`⚠️ Brevo API Key not configured. [DEBUG CODE] Identifier: ${normalizedIdentifier}, Code: ${code}`);
      }

      res.status(200).json({
        success: true,
        message: `Verification code sent to your ${method === 'email' ? 'email address' : 'phone number'}.`,
        // Include code in response ONLY when key is missing to allow easy local developer testing
        debugCode: !isBrevoConfigured ? code : undefined,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Verify Code
// @route   POST /api/auth/verify-code
// @access  Public
router.post(
  '/verify-code',
  [
    body('identifier', 'Identifier is required').notEmpty().trim(),
    body('code', '6-digit code is required').isLength({ min: 6, max: 6 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { identifier, code } = req.body;
      const normalizedIdentifier = identifier.includes('@') ? identifier.toLowerCase() : identifier;

      const record = await VerificationCode.findOne({
        identifier: normalizedIdentifier,
        code,
        expiresAt: { $gt: new Date() },
      });

      if (!record) {
        return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
      }

      record.verified = true;
      await record.save();

      res.status(200).json({ success: true, message: 'Code verified successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Authenticate Google User
// @route   POST /api/auth/google
// @access  Public
router.post('/google', async (req, res, next) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ success: false, message: 'Google access token is required' });
  }

  try {
    const axios = require('axios');
    const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const { email, name, picture } = googleRes.data;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Failed to retrieve email from Google' });
    }

    const emailLower = email.toLowerCase();
    let user = await User.findOne({ email: emailLower });

    if (!user) {
      // Check system settings for registration
      const config = await SystemConfig.findOne();
      if (config && !config.allowRegistrations) {
        return res.status(403).json({ success: false, message: 'New user registrations are currently disabled by the administrator.' });
      }

      let baseUsername = emailLower.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      if (baseUsername.length < 3) baseUsername = 'user_' + baseUsername;
      
      let username = baseUsername;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const country = await getCountryByIp(ip);

      user = await User.create({
        name: name || emailLower.split('@')[0],
        username,
        email: emailLower,
        avatar: picture || '',
        verified: false,
        country
      });
      console.log(`✅ New user registered via Google: ${emailLower}`);
      // Run AI impersonation check in background
      checkProfileImpersonation(user._id);
    } else {
      console.log(`✅ Existing user logged in via Google: ${emailLower}`);
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired Google access token' });
  }
});

// @desc    Register User
// @route   POST /api/auth/signup
// @access  Public
router.post(
  '/signup',
  [
    body('name', 'Name is required').notEmpty().trim(),
    body('username', 'Username must be 3-30 alphanumeric characters')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/),
    body('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      // Check system settings for registration
      const config = await SystemConfig.findOne();
      if (config && !config.allowRegistrations) {
        return res.status(403).json({ success: false, message: 'New user registrations are currently disabled by the administrator.' });
      }

      const { name, username, email, password } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email address is required' });
      }

      const identifier = email.toLowerCase();

      // Ensure code was verified for this identifier
      const isVerified = await VerificationCode.findOne({
        identifier,
        verified: true,
      });

      if (!isVerified) {
        return res.status(400).json({
          success: false,
          message: 'The email must be verified first before signing up.',
        });
      }

      // Check uniqueness of username
      const usernameExists = await User.findOne({ username: username.toLowerCase() });
      if (usernameExists) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }

      // Check identifier uniqueness in Users table
      const emailExists = await User.findOne({ email: identifier });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const country = await getCountryByIp(ip);

      const user = await User.create({
        name,
        username: username.toLowerCase(),
        email: identifier,
        password,
        country
      });

      // Clear verification record
      await VerificationCode.deleteMany({ identifier });

      // Run AI impersonation check in background
      checkProfileImpersonation(user._id);

      sendTokenResponse(user, 201, res);
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Login User
// @route   POST /api/auth/login
// @access  Public
router.post(
  '/login',
  [
    body('email', 'Please include a valid identifier').notEmpty().trim(),
    body('password', 'Password is required').notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      const user = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { phone: email }
        ]
      }).select('+password');

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (user.accountStatus === 'suspended' || user.accountStatus === 'banned') {
        return res.status(403).json({ 
          success: false, 
          message: `Your account has been ${user.accountStatus}.`,
          reason: user.statusReason || 'No reason provided.'
        });
      }

      user.isOnline = true;
      await user.save();

      sendTokenResponse(user, 200, res);
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Logout User / Clear cookie
// @route   POST /api/auth/logout
// @access  Protected
router.post('/logout', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.isOnline = false;
      await user.save();
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// @desc    Get Current User
// @route   GET /api/auth/me
// @access  Protected
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        avatar: user.avatar,
        coverPhoto: user.coverPhoto,
        location: user.location,
        website: user.website,
        workplace: user.workplace,
        education: user.education,
        age: user.age,
        relationshipStatus: user.relationshipStatus,
        city: user.city,
        country: user.country,
        school: user.school,
        friendsCount: user.friendsCount,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        verified: user.verified,
        preferences: user.preferences,
        friends: user.friends,
        isAdmin: user.isAdmin,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update Password
// @route   PUT /api/auth/password
// @access  Protected
router.put('/password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new passwords' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

// @desc    Unsubscribe email from marketing campaigns
// @route   GET /api/auth/unsubscribe
// @access  Public
router.get('/unsubscribe', async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).send('<h1>Email parameter is required</h1>');
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).send('<h1>User not found</h1>');
    
    // Explicitly update marketing subscription preference
    user.preferences = {
      ...user.preferences,
      emailMarketingSubscribed: false
    };
    // Mark modified for nested objects
    user.markModified('preferences');
    await user.save();
    
    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f9fafb; min-height: 100vh;">
        <div style="max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #3b82f6; margin-top: 0;">Unsubscribed Successfully</h1>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">You have been unsubscribed from Spheral bulk email campaigns.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.4;">You will still receive account-critical notifications (like security alerts and verification codes).</p>
        </div>
      </div>
    `);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
