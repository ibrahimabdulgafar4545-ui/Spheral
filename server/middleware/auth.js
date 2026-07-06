const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'spheral_local_secret_session_2026_very_long_string');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }

    if (user.accountStatus === 'suspended' || user.accountStatus === 'banned') {
      return res.status(403).json({ 
        success: false, 
        message: `Your account has been ${user.accountStatus}.`,
        reason: user.statusReason
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

const adminProtect = async (req, res, next) => {
  try {
    // Re-use the logic from protect by calling it, or just do the check here
    // Since we need to run protect first, we can assume req.user is set if we run them sequentially,
    // but a cleaner way is just an adminProtect middleware that is run AFTER protect:
    if (req.user && req.user.isAdmin) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Not authorized as an admin' });
    }
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized as an admin' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'spheral_local_secret_session_2026_very_long_string');
      const user = await User.findById(decoded.id);
      if (user && user.accountStatus === 'active') {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { protect, adminProtect, optionalAuth };
