const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require('ejs-mate');
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const Task = require("./Models/Tasks");
const User = require("./Models/User");
const port = 9090;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

app.use(session({
  secret: "lifePRG-secret-key",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  { usernameField: "email" },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: "Incorrect email." });
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return done(null, false, { message: "Incorrect password." });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/lifePRG");
}
main().then(() => console.log("connected to db")).catch((err) => console.log(err));

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

app.get("/", (req, res) => {
  res.redirect("/allTasks");
});

app.get("/allTasks", isAuthenticated, async (req, res) => {
  const tasks = await Task.find({});
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const remaining = total - completed;
  res.render("allTasks.ejs", { tasks, total, completed, remaining, user: req.user });
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.send("User already exists. <a href='/register'>Register again</a>");
    }
    const user = new User({ username, email, password });
    await user.save();
    req.login(user, (err) => {
      if (err) return res.redirect("/register");
      res.redirect("/allTasks");
    });
  } catch (err) {
    console.log(err);
    res.redirect("/register");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/allTasks",
  failureRedirect: "/login"
}));

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

app.get("/newTask", isAuthenticated, (req, res) => {
  res.render("newTaskForm.ejs");
});

app.post("/newTask", isAuthenticated, async (req, res) => {
  const { title, startTime, endTime } = req.body;
  await Task.create({ title, startTime, endTime });
  res.redirect("/allTasks");
});

app.get("/taskDetails/:id", isAuthenticated, async (req, res) => {
  const task = await Task.findById(req.params.id);
  res.render("taskDetails.ejs", { task });
});

app.get("/editTask/:id", isAuthenticated, async (req, res) => {
  let { id } = req.params;
  let taskDetails = await Task.findById(id);
  res.render("editTask.ejs", { taskDetails });
});

app.post("/editTask/:id", isAuthenticated, async (req, res) => {
  let { id } = req.params;
  const { title, startTime, endTime, completed } = req.body;
  const completedVal = completed === 'true' ? true : false;
  try {
    await Task.findByIdAndUpdate(id, { title, startTime, endTime, completed: completedVal }, { new: true, runValidators: true });
    res.redirect("/allTasks");
  } catch (err) {
    console.log(err);
  }
});

app.post("/deleteTask/:id", isAuthenticated, async (req, res) => {
  try {
    let { id } = req.params;
    await Task.findByIdAndDelete(id);
    res.redirect("/allTasks");
  } catch (err) {
    console.log(err);
    res.redirect("/allTasks");
  }
});

app.get("/stats", isAuthenticated, async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dailyCompleted = await Task.countDocuments({ completed: true, createdAt: { $gte: today, $lt: tomorrow } });
  const dailyRemaining = await Task.countDocuments({ completed: false, createdAt: { $gte: today, $lt: tomorrow } });
  res.render("stats.ejs", { dailyCompleted, dailyRemaining });
});

app.listen(port, () => {
  console.log("app is listening");
});
