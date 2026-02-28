const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  institution: { type: String, required: true },
  degree: { type: String, required: true },
  fieldOfStudy: { type: String },

  startDate: { type: Date },
  endDate: { type: Date },
  isOngoing: { type: Boolean, default: false },

  grade: { type: String },
  description: { type: String },
  activities: [{ type: String }],

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

const Education = mongoose.model('Education', educationSchema);
module.exports = Education;