const router = require('express').Router();
const Order  = require('../models/Order');
const auth   = require('../middleware/auth');

// Get messages for an order
router.get('/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('messages.sender', 'username');
    res.json(order.messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;