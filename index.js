const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require('ejs-mate');
const mongoose = require("mongoose");
const Task = require("./Models/Tasks");
const port = 9090;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/lifePRG");
}

main()
  .then(() => console.log("connected to db"))
  .catch((err) => console.log(err));

app.get("/allTasks", async (req, res) => {
  const tasks = await Task.find({});
  
const total = tasks.length;
const completed = tasks.filter(t => t.completed).length;
const remaining = total - completed;

  res.render("allTasks.ejs", { tasks,total,completed,remaining});
});
//create
app.get("/newTask", (req, res) => {
  res.render("newTaskForm.ejs");
});

app.post("/newTask", async (req, res) => {
  const { title, startTime, endTime } = req.body;
  await Task.create({ title, startTime, endTime });
  res.redirect("/allTasks");
});
//read
app.get("/taskDetails/:id", async (req, res) => {
  const task = await Task.findById(req.params.id);
  res.render("taskDetails.ejs", { task });
});

//update
app.get("/editTask/:id",async(req,res)=>{
    let{id}=req.params;
    let taskDetails=await Task.findById(id);
    res.render("editTask.ejs",{taskDetails});
})
app.post("/editTask/:id",async(req,res)=>{
    let{id}=req.params;
    const{title,startTime,endTime,completed}=req.body;
    const completedTask= completed === 'true' ? true : false;
    try{
        await Task.findByIdAndUpdate(id,{title,startTime,endTime,completed:completedTask},{new:true,runValidators:true});
        res.redirect("/allTasks");
    }catch(err){
        console.log(err);
    }
})
//del
app.post("/deleteTask/:id",async(req,res)=>{
    try{
         let{id}=req.params;

    let deletedTask=await Task.findByIdAndDelete(id);
        deletedTask.completed=true;
     res.redirect("/allTasks");
    }catch(err){
        console.log(err);
        res.redirect("/allTasks");
    }
   
   
})

app.get("/stats", async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const dailyCompleted = await Task.countDocuments({ completed: true, createdAt: { $gte: today, $lt: tomorrow } });
  const dailyRemaining = await Task.countDocuments({ completed: false, createdAt: { $gte: today, $lt: tomorrow } });

  res.render("stats.ejs", { dailyCompleted, dailyRemaining });
});

app.listen(port, () => {
  console.log("app is listening");
});
