const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  name: { type: String, required: true },
  issuingOrganization: { type: String },

  issueDate: { type: Date },
  expirationDate: { type: Date },
  doesNotExpire: { type: Boolean, default: false },

  credentialId: { type: String },
  credentialUrl: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });


const Certification = mongoose.model('Certification', certificationSchema);
module.exports = Certification;