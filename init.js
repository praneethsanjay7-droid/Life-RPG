const mongoose = require("mongoose");
const Task = require("./Models/Tasks");

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/lifePRG");
}

const seedTasks = [
  { title: "Making protein shake", startTime: new Date("2025-01-01T08:00"), endTime: new Date("2025-01-01T09:00"),completed:false },
  { title: "Exposing to sunlight", startTime: new Date("2025-01-01T09:00"), endTime: new Date("2025-01-01T10:00"),completed:false },
  { title: "Jogging", startTime: new Date("2025-01-01T10:00"), endTime: new Date("2025-01-01T11:00"),completed:false },
  { title: "Sprinting", startTime: new Date("2025-01-01T11:00"), endTime: new Date("2025-01-01T12:00"),completed:false },
  { title: "Having Breakfast", startTime: new Date("2025-01-01T12:00"), endTime: new Date("2025-01-01T13:00"),completed:false },
  { title: "Heading to work", startTime: new Date("2025-01-01T13:00"), endTime: new Date("2025-01-01T14:00"),completed:false },
  { title: "Going to gym", startTime: new Date("2025-01-01T14:00"), endTime: new Date("2025-01-01T15:00"),completed:false },
  { title: "having dinner", startTime: new Date("2025-01-01T18:00"), endTime: new Date("2025-01-01T19:00"),completed:false },
  { title: "sleep", startTime: new Date("2025-01-01T22:00"), endTime: new Date("2025-01-02T06:00"),completed:false }
];

async function seed() {
  await main();
  await Task.insertMany(seedTasks)
    .then(() => console.log("Database seeded!"))
    .catch((err) => console.log(err));
}

async function del(){
  await main();
  await Task.deleteMany({})
    .then(()=>console.log("previous data has been deleted"))
    .catch((err)=> console.log(err));
}
// del();
seed();
