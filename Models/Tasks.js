const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  priority:    { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  category:    { type: String, enum: ['study','work','personal','other'], default: 'other' },
  deadline:    { type: Date },
  startTime:   { type: Date },
  endTime:     { type: Date },
  completed:   { type: Boolean, default: false },
  completedAt: { type: Date },
  mapPosition: {
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 }
  },
  conquestCycle: { type: Number, default: 1 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);
