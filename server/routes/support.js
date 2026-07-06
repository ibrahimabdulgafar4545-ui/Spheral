const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const { protect } = require('../middleware/auth');

// @desc    Create a support ticket or feedback
// @route   POST /api/support
// @access  Protected
router.post('/', protect, async (req, res, next) => {
  try {
    const { type, subject, message } = req.body;

    if (!type || !message) {
      return res.status(400).json({ success: false, message: 'Type and message are required' });
    }

    const ticket = await SupportTicket.create({
      user: req.user.id,
      type,
      subject: subject || '',
      message,
    });

    res.status(201).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
