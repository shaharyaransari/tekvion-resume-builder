const mongoose = require('mongoose');

const awardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, required: true },
  issuer: { type: String },
  date: { type: Date },
  description: { type: String },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

const Award = mongoose.model('Award', awardSchema);
module.exports = Award;