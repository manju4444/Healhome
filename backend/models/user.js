const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  role:         { type: String, enum: ['patient', 'homemaker'], required: true },
  location:     { type: String, default: '' },
  profileImage: { type: String, default: '' },
  menu: [{
    dishName: String,
    price:    Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);