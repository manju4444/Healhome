const router = require('express').Router();
const Order  = require('../models/Order');
const auth   = require('../middleware/auth');

// Place order (patient)
router.post('/', auth, async (req, res) => {
  try {
    const { condition, mealTime, mealName, customMeal, instructions, payment } = req.body;
    const order = await Order.create({
      patient: req.user.id,
      condition, mealTime, mealName, customMeal, instructions, payment
    });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get all orders — patient sees own, homemaker sees pending + theirs
router.get('/', auth, async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'patient') {
      orders = await Order.find({ patient: req.user.id })
        .populate('homemaker', 'username profileImage')
        .sort({ createdAt: -1 });
    } else {
      orders = await Order.find({
        $or: [{ status: 'pending' }, { homemaker: req.user.id }]
      }).populate('patient', 'username location').sort({ createdAt: -1 });
    }
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Accept order (homemaker)
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { homemaker: req.user.id, status: 'accepted' },
      { new: true }
    );
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update status (homemaker)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Send chat message
router.post('/:id/message', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    order.messages.push({
      sender: req.user.id,
      senderRole: req.user.role,
      text: req.body.text
    });
    await order.save();
    res.json(order.messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;