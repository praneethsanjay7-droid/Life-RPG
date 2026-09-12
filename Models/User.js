const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const userSchema = new mongoose.Schema({
  username:               { type: String, required: true, unique: true },
  email:                  { type: String, required: true, unique: true },
  password:               { type: String, required: true },
  dragonLevel:            { type: Number, default: 1 },
  conquestStreak:         { type: Number, default: 0 },
  totalKingdomsConquered: { type: Number, default: 0 }
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return ;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
