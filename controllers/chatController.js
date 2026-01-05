// server/controllers/chatController.js
const Chat = require('../models/Chat');

// GET /api/chat/support - Get support chat history (for customer or admin)
exports.getSupportHistory = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'admin') {
      // Admin sees all support messages
      filter = { receiver: 'admin_group' };
    } else {
      // Customer sees only their own messages + admin replies in support
      filter = {
        $or: [
          { sender: req.user._id },
          { receiver: 'admin_group' }
        ]
      };
    }

    const messages = await Chat.find(filter)
      .sort({ timestamp: 1 })
      .populate('sender', 'name email');

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error loading chat history' });
  }
};

// DELETE /api/chat/support/clear - Admin only: clear all support chats
exports.clearSupportChats = async (req, res) => {
  try {
    await Chat.deleteMany({ receiver: 'admin_group' });
    res.json({ message: 'All support chats cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Error clearing chats' });
  }
};