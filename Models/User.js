const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const userSchema = new mongoose.Schema({
  username:               { type: String, required: true, unique: true },
  email:                  { type: String, required: true, unique: true },
  password:               { type: String, required: true },
  dragonLevel:            { type: Number, default: 1 },
  conquestStreak:         { type: Number, default: 0 },
  totalKingdomsConquered: { type: Number, default: 0 },
  currentXP:              { type: Number, default: 0 },
  totalXP:                { type: Number, default: 0 },
  intellect:              { type: Number, default: 0 },
  strength:               { type: Number, default: 0 },
  agility:                { type: Number, default: 0 },
  charisma:               { type: Number, default: 0 },
  coins:                  { type: Number, default: 0 },
  lastActiveDate:         { type: Date },
  inventory:              [{ itemId: String, quantity: Number }],
  badges:                 [{ name: String, unlockedAt: Date }]
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return ;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.addXP = function(xp) {
  this.currentXP += xp;
  this.totalXP += xp;
  const thresholds = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];
  while (this.dragonLevel < thresholds.length && this.currentXP >= thresholds[this.dragonLevel]) {
    this.currentXP -= thresholds[this.dragonLevel];
    this.dragonLevel++;
  }
};

module.exports = mongoose.model('User', userSchema);
