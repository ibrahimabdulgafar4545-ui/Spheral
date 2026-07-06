const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');

// @desc    Get all events
// @route   GET /api/events
// @access  Protected
router.get('/', protect, async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'name username avatar')
      .populate('going', 'name username avatar')
      .sort({ createdAt: -1 });

    const userId = req.user.id;
    const formatted = events.map(e => ({
      id: e._id,
      title: e.title,
      description: e.description,
      location: e.location,
      date: e.date,
      time: e.time,
      image: e.image,
      organizer: e.organizer,
      membersCount: e.going.length,
      rsvped: e.going.some(u => u._id.toString() === userId.toString()),
      going: e.going
    }));

    res.json({ success: true, events: formatted });
  } catch (err) {
    next(err);
  }
});

// @desc    Create an event
// @route   POST /api/events
// @access  Protected
router.post('/', protect, async (req, res, next) => {
  try {
    const { title, description, location, date, time, image } = req.body;

    if (!title || !location || !date || !time) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const event = await Event.create({
      title,
      description,
      location,
      date,
      time,
      image: image || undefined,
      organizer: req.user.id,
      going: [req.user.id] // Creator is going by default
    });

    const populated = await Event.findById(event._id)
      .populate('organizer', 'name username avatar')
      .populate('going', 'name username avatar');

    res.status(201).json({
      success: true,
      event: {
        id: populated._id,
        title: populated.title,
        description: populated.description,
        location: populated.location,
        date: populated.date,
        time: populated.time,
        image: populated.image,
        organizer: populated.organizer,
        membersCount: populated.going.length,
        rsvped: true,
        going: populated.going
      }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    RSVP/Toggle Going status
// @route   PUT /api/events/:id/rsvp
// @access  Protected
router.put('/:id/rsvp', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const userId = req.user.id;
    const isGoing = event.going.some(id => id.toString() === userId.toString());

    if (isGoing) {
      event.going.pull(userId);
    } else {
      event.going.addToSet(userId);
    }

    await event.save();
    
    const populated = await Event.findById(event._id)
      .populate('going', 'name username avatar');

    res.json({
      success: true,
      rsvped: !isGoing,
      membersCount: populated.going.length,
      going: populated.going
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
