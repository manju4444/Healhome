const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderRole:{ type: String },
  text:      { type: String },
  timestamp: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  homemaker:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  condition:   { type: String, required: true },
  mealTime:    { type: String },
  mealName:    { type: String, required: true },
  customMeal:  { type: String, default: '' },
  instructions:{ type: String, default: '' },
  payment:     { type: String, enum: ['online', 'cash'], default: 'cash' },
  paymentStatus:{ type: String, enum: ['pending','paid','failed'], default: 'pending' },
  status:      { type: String, enum: ['pending','accepted','cooking','dispatched','completed'], default: 'pending' },
  messages:    [MessageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);