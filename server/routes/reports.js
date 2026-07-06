const express = require('express');
const { protect } = require('../middleware/auth');
const Report = require('../models/Report');

const router = express.Router();

// @desc    Submit a content report
// @route   POST /api/reports
// @access  Protected
router.post('/', protect, async (req, res, next) => {
  try {
    const { contentId, contentType, reason, description } = req.body;
    if (!contentId || !contentType || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide contentId, contentType, and reason' });
    }

    const report = await Report.create({
      reporter: req.user.id,
      contentId,
      contentType,
      reason,
      description: description || '',
    });

    res.status(201).json({ success: true, message: 'Content reported successfully', report });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
