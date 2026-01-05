// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');

// GET: Fetch all live support chat history
router.get('/support-messages', async (req, res) => {
  try {
    const messages = await Chat.find({ receiver: 'admin_group' })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email _id')  // Get sender details (name, etc.)
      .lean();

    res.json(messages);
  } catch (err) {
    console.error('Error fetching support messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;