const mongoose = require("mongoose");
const Task = require("./Models/Tasks");
const User = require("./Models/User");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lifePRG");
}

const seedTasks = [
  { title: "Making protein shake", startTime: new Date("2025-01-01T08:00"), endTime: new Date("2025-01-01T09:00"), completed: false, mapPosition: { x: 18, y: 22 }, conquestCycle: 1 },
  { title: "Exposing to sunlight", startTime: new Date("2025-01-01T09:00"), endTime: new Date("2025-01-01T10:00"), completed: false, mapPosition: { x: 48, y: 14 }, conquestCycle: 1 },
  { title: "Jogging", startTime: new Date("2025-01-01T10:00"), endTime: new Date("2025-01-01T11:00"), completed: false, mapPosition: { x: 76, y: 20 }, conquestCycle: 1 },
  { title: "Sprinting", startTime: new Date("2025-01-01T11:00"), endTime: new Date("2025-01-01T12:00"), completed: false, mapPosition: { x: 22, y: 52 }, conquestCycle: 1 },
  { title: "Having Breakfast", startTime: new Date("2025-01-01T12:00"), endTime: new Date("2025-01-01T13:00"), completed: false, mapPosition: { x: 52, y: 46 }, conquestCycle: 1 },
  { title: "Heading to work", startTime: new Date("2025-01-01T13:00"), endTime: new Date("2025-01-01T14:00"), completed: false, mapPosition: { x: 80, y: 48 }, conquestCycle: 1 },
  { title: "Going to gym", startTime: new Date("2025-01-01T14:00"), endTime: new Date("2025-01-01T15:00"), completed: false, mapPosition: { x: 16, y: 76 }, conquestCycle: 1 },
  { title: "having dinner", startTime: new Date("2025-01-01T18:00"), endTime: new Date("2025-01-01T19:00"), completed: false, mapPosition: { x: 46, y: 72 }, conquestCycle: 1 },
  { title: "sleep", startTime: new Date("2025-01-01T22:00"), endTime: new Date("2025-01-02T06:00"), completed: false, mapPosition: { x: 74, y: 70 }, conquestCycle: 1 }
];

async function seed() {
  await main();
  const user = await User.findOne().sort({ createdAt: 1 });
  const userId = user ? user._id : null;
  const tasksWithUser = seedTasks.map(t => ({ ...t, user: userId }));
  await Task.insertMany(tasksWithUser)
    .then(() => console.log("Database seeded!"))
    .catch((err) => console.log(err));
  await mongoose.connection.close();
}

async function del(){
  await main();
  await Task.deleteMany({})
    .then(()=>console.log("previous data has been deleted"))
    .catch((err)=> console.log(err));
  await mongoose.connection.close();
}
// del();
seed();
