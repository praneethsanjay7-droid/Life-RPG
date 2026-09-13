const express        = require("express");
const app            = express();
const path           = require("path");
const methodOverride = require("method-override");
const ejsMate        = require("ejs-mate");
const mongoose       = require("mongoose");
const session        = require("express-session");
const passport       = require("passport");
const LocalStrategy  = require("passport-local").Strategy;
const flash          = require("connect-flash");
const Task           = require("./Models/Tasks");
const User           = require("./Models/User");
const port = process.env.PORT || 9090;

if (require.main === module) {
  app.listen(port, () => console.log(`Dragon's Conquest listening on port ${port}`));
}

module.exports = app;

// --- Map positions for kingdoms
const MAP_POSITIONS = [
  { x:18, y:22 }, { x:48, y:14 }, { x:76, y:20 },
  { x:22, y:52 }, { x:52, y:46 }, { x:80, y:48 },
  { x:16, y:76 }, { x:46, y:72 }, { x:74, y:70 },
  { x:35, y:34 }, { x:64, y:30 }, { x:30, y:62 },
  { x:63, y:64 }, { x:88, y:78 }, { x: 8, y:42 },
];

function randomMapPosition(usedPositions) {
  const available = MAP_POSITIONS.filter(p =>
    !usedPositions.some(u => u.x === p.x && u.y === p.y)
  );
  const pool = available.length > 0 ? available : MAP_POSITIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- Middleware
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "dragons-conquest-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

function updateStreak(user) {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate).setHours(0,0,0,0) : null;
  if (lastActive === yesterday.getTime()) {
    user.conquestStreak = (user.conquestStreak || 0) + 1;
  } else if (lastActive !== today.getTime()) {
    user.conquestStreak = 1;
  }
  user.lastActiveDate = today;
}

// Make flash + user available in all templates
app.use((req, res, next) => {
  res.locals.messages     = { success: req.flash("success"), error: req.flash("error") };
  res.locals.currentUser  = req.user;
  next();
});

// --- Passport
passport.use(new LocalStrategy(
  { usernameField: "email" },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: "Incorrect email." });
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return done(null, false, { message: "Incorrect password." });
      return done(null, user);
    } catch (err) { return done(err); }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); } catch (err) { done(err); }
});

// --- DB
async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lifePRG");
}
main().then(() => console.log("Connected to DB")).catch(err => console.log(err));

// --- Auth guard
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash("error", "You must be logged in to enter the realm.");
  res.redirect("/login");
}

// Helper: deadline status
function getDeadlineStatus(task) {
  if (!task.deadline) return "normal";
  const now  = new Date();
  const diff = task.deadline - now;
  if (diff < 0)         return "overdue";
  if (diff < 172800000) return "approaching"; // 2 days
  return "normal";
}

// ===== ROUTES =====

// Redirect root
app.get("/", (req, res) => res.redirect("/allTasks"));

// --- All Tasks (Kingdom Map Dashboard)
app.get("/allTasks", isAuthenticated, async (req, res) => {
  updateStreak(req.user);
  await req.user.save();
  const cycle = req.user.conquestStreak + 1;
  const tasks = await Task.find({ user: req.user._id, conquestCycle: cycle });
  const total     = tasks.length;
  const conquered = tasks.filter(t => t.completed).length;
  const remaining = total - conquered;

  const tasksWithStatus = tasks.map(t => {
    const obj = t.toObject();
    obj.deadlineStatus     = getDeadlineStatus(t);
    obj.isOverdue          = getDeadlineStatus(t) === "overdue";
    obj.deadlineApproaching = getDeadlineStatus(t) === "approaching";
    if (!obj.mapPosition) obj.mapPosition = { x: 50, y: 50 };
    return obj;
  });

  res.render("allTasks.ejs", {
    tasks: tasksWithStatus,
    total, conquered, remaining,
    user: req.user,
    layout: "layouts/boilerplate"
  });
});

// --- Register
app.get("/register", (req, res) => {
  res.render("register.ejs", { layout: "layouts/auth" });
});

app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      req.flash("error", "A dragon with that name or email already exists.");
      return res.redirect("/register");
    }
    const user = new User({ username, email, password });
    await user.save();
    req.login(user, err => {
      if (err) { req.flash("error", "Login failed after registration."); return res.redirect("/login"); }
      req.flash("success", `Welcome, Dragon ${username}! Your conquest begins.`);
      res.redirect("/allTasks");
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Registration failed. Try again.");
    res.redirect("/register");
  }
});

// --- Login
app.get("/login", (req, res) => {
  res.render("login.ejs", { layout: "layouts/auth" });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash("error", info?.message || "Invalid credentials. The realm denies you.");
      return res.redirect("/login");
    }
    req.logIn(user, err => {
      if (err) return next(err);
      res.redirect("/allTasks");
    });
  })(req, res, next);
});

// --- Logout
app.get("/logout", (req, res) => {
  req.logout(() => {
    req.flash("success", "You have left the realm.");
    res.redirect("/login");
  });
});

// --- Create Task (Establish Kingdom)
app.post("/newTask", isAuthenticated, async (req, res) => {
  try {
    const { title, description, priority, category, deadline, startTime, endTime } = req.body;
const cycle = (req.user.conquestStreak || 0) + 1;

    // Get existing positions for this user+cycle
    const existing = await Task.find({ user: req.user._id, conquestCycle: cycle }, "mapPosition");
    const usedPositions = existing.map(t => t.mapPosition);
    const mapPosition = randomMapPosition(usedPositions);

    await Task.create({
      title, description, priority: priority || "medium",
      category: category || "other",
      deadline: deadline ? new Date(deadline) : undefined,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      mapPosition, conquestCycle: cycle,
      user: req.user._id
    });
    req.flash("success", `Kingdom "${title}" has been established!`);
    res.redirect("/allTasks");
  } catch (err) {
    console.log(err);
    req.flash("error", "Could not establish kingdom.");
    res.redirect("/allTasks");
  }
});

// --- Complete Task (JSON API for animation)
app.patch("/tasks/:id/complete", isAuthenticated, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ error: "Kingdom not found." });

    task.completed   = true;
    task.completedAt = new Date();
    await task.save();

    // Update user stats
    const user = req.user;
    updateStreak(user);

    // Category → stat mapping
    const categoryStats = { study: 'intellect', work: 'charisma', personal: 'strength', other: 'agility' };
    const statField = categoryStats[task.category] || 'agility';
    user[statField] = (user[statField] || 0) + 1;

    // Award XP and coins
    const xpEarned = task.priority === 'critical' ? 150 : task.priority === 'high' ? 100 : task.priority === 'medium' ? 50 : 25;
    const coinsEarned = task.priority === 'critical' ? 30 : task.priority === 'high' ? 20 : task.priority === 'medium' ? 10 : 5;
    user.addXP(xpEarned);
    user.coins = (user.coins || 0) + coinsEarned;
    user.totalKingdomsConquered = (user.totalKingdomsConquered || 0) + 1;

    // Check if any badges to unlock
    if (user.totalKingdomsConquered === 10 && !user.badges.find(b => b.name === 'Dragon Slayer')) {
      user.badges.push({ name: 'Dragon Slayer', unlockedAt: new Date() });
    }
    if (user.totalKingdomsConquered === 50 && !user.badges.find(b => b.name === 'Realm Lord')) {
      user.badges.push({ name: 'Realm Lord', unlockedAt: new Date() });
    }

    await user.save();

    // Count for current cycle
    const cycle = user.conquestStreak + 1;
    const allTasks  = await Task.find({ user: user._id, conquestCycle: cycle });
    const conquered = allTasks.filter(t => t.completed).length;
    const remaining = allTasks.length - conquered;
    const total     = allTasks.length;

    let newLevel = user.dragonLevel;
    if (remaining === 0 && total > 0) {
      newLevel = user.dragonLevel + 1;
      await User.findByIdAndUpdate(user._id, {
        dragonLevel:    newLevel,
        conquestStreak: cycle
      });
    }

    res.json({ success: true, conquered, remaining, total, newLevel, xpEarned, coinsEarned, stats: { intellect: user.intellect, strength: user.strength, agility: user.agility, charisma: user.charisma } });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error." });
  }
});

// --- New Conquest (after evolution)
app.get("/newConquest", isAuthenticated, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    conquestStreak: req.user.conquestStreak + 1
  });
  req.flash("success", "A new conquest begins! Establish your kingdoms.");
  res.redirect("/allTasks");
});

// --- Task Details
app.get("/taskDetails/:id", isAuthenticated, async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) { req.flash("error", "Kingdom not found."); return res.redirect("/allTasks"); }
  res.render("taskDetails.ejs", { task, layout: "layouts/boilerplate" });
});

// --- Edit Task
app.get("/editTask/:id", isAuthenticated, async (req, res) => {
  const taskDetails = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!taskDetails) { req.flash("error", "Kingdom not found."); return res.redirect("/allTasks"); }
  res.render("editTask.ejs", { taskDetails, layout: "layouts/boilerplate" });
});

app.post("/editTask/:id", isAuthenticated, async (req, res) => {
  try {
    const { title, description, priority, category, deadline, completed, startTime, endTime } = req.body;
    await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        title, description,
        priority: priority || "medium",
        category: category || "other",
        deadline: deadline ? new Date(deadline) : null,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        completed: completed === "true"
      },
      { returnDocument: 'after', runValidators: true }
    );
    req.flash("success", "Kingdom updated.");
    res.redirect("/allTasks");
  } catch (err) {
    console.log(err);
    req.flash("error", "Could not update kingdom.");
    res.redirect("/allTasks");
  }
});

// --- Delete Task
app.post("/deleteTask/:id", isAuthenticated, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    req.flash("success", "Kingdom abandoned.");
  } catch (err) {
    console.log(err);
    req.flash("error", "Could not abandon kingdom.");
  }
  res.redirect("/allTasks");
});

// --- Stats
app.get("/stats", isAuthenticated, async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const allTasks = await Task.find({ user: req.user._id });
  const cycle = (req.user.conquestStreak || 0) + 1;
  const cycleTasks = allTasks.filter(t => (t.toObject ? t.toObject().conquestCycle : t.conquestCycle) === cycle);

  const dailyCompleted = await Task.countDocuments({
    user: req.user._id, completed: true,
    completedAt: { $gte: today, $lt: tomorrow }
  });
  const dailyRemaining = cycleTasks.filter(t => !t.completed).length;

  const conqueredTasks = allTasks
    .filter(t => t.completed)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .map(t => { const obj = t.toObject(); if (!obj.mapPosition) obj.mapPosition = { x: 50, y: 50 }; return obj; });

  // --- Daily chart data (last 7 days)
  const dailyChartLabels = [];
  const dailyChartCompleted = [];
  const dailyChartRemaining = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);
    const label = d.toLocaleDateString('en-US', {weekday:'short', month:'numeric', day:'numeric'});
    const c = await Task.countDocuments({user: req.user._id, completed: true, completedAt: {$gte: dayStart, $lt: dayEnd}});
    const t = await Task.countDocuments({user: req.user._id, createdAt: {$gte: dayStart, $lt: dayEnd}});
    dailyChartLabels.push(label);
    dailyChartCompleted.push(c);
    dailyChartRemaining.push(t - c);
  }

  // --- Weekly chart data (last 4 weeks)
  const weeklyChartLabels = [];
  const weeklyChartCompleted = [];
  const weeklyChartRemaining = [];
  for (let i = 3; i >= 0; i--) {
    const ws = new Date(today); ws.setDate(today.getDate() - (i * 7) - today.getDay());
    const we = new Date(ws); we.setDate(ws.getDate() + 7);
    const label = `Week ${4 - i} (${ws.toLocaleDateString('en-US', {month:'short', day:'numeric'})} - ${we.toLocaleDateString('en-US', {month:'short', day:'numeric'})})`;
    const c = await Task.countDocuments({user: req.user._id, completed: true, completedAt: {$gte: ws, $lt: we}});
    const t = await Task.countDocuments({user: req.user._id, createdAt: {$gte: ws, $lt: we}});
    weeklyChartLabels.push(label);
    weeklyChartCompleted.push(c);
    weeklyChartRemaining.push(t - c);
  }

  // --- Monthly chart data (last 3 months)
  const monthlyChartLabels = [];
  const monthlyChartCompleted = [];
  const monthlyChartRemaining = [];
  for (let i = 2; i >= 0; i--) {
    const ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const me = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const label = ms.toLocaleDateString('en-US', {month:'short', year:'numeric'});
    const c = await Task.countDocuments({user: req.user._id, completed: true, completedAt: {$gte: ms, $lt: me}});
    const t = await Task.countDocuments({user: req.user._id, createdAt: {$gte: ms, $lt: me}});
    monthlyChartLabels.push(label);
    monthlyChartCompleted.push(c);
    monthlyChartRemaining.push(t - c);
  }

  res.render("stats.ejs", {
    dailyCompleted, dailyRemaining,
    totalConquered: allTasks.filter(t => t.completed).length,
    totalKingdoms: allTasks.length,
    conqueredTasks,
    user: req.user,
    dailyChartLabels, dailyChartCompleted, dailyChartRemaining,
    weeklyChartLabels, weeklyChartCompleted, weeklyChartRemaining,
    monthlyChartLabels, monthlyChartCompleted, monthlyChartRemaining,
    layout: "layouts/boilerplate"
  });
});

// --- Shop
const SHOP_ITEMS = [
  { id: "potion", name: "Health Potion", price: 10, icon: "💊" },
  { id: "sword", name: "Iron Sword", price: 50, icon: "⚔️" },
  { id: "shield", name: "Dragon Shield", price: 75, icon: "🛡️" },
  { id: "crown", name: "Golden Crown", price: 200, icon: "👑" },
  { id: "wings", name: "Dragon Wings", price: 300, icon: "🦋" }
];

app.get("/shop", isAuthenticated, async (req, res) => {
  res.render("shop.ejs", { items: SHOP_ITEMS, user: req.user, layout: "layouts/boilerplate" });
});

app.post("/shop/buy", isAuthenticated, async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return res.redirect("/shop");
    if ((req.user.coins || 0) < item.price) return res.redirect("/shop");

    req.user.coins -= item.price;
    const existing = req.user.inventory.find(i => i.itemId === itemId);
    if (existing) { existing.quantity += 1; }
    else { req.user.inventory.push({ itemId, quantity: 1 }); }
    await req.user.save();

    req.flash("success", `${item.icon} ${item.name} purchased!`);
    res.redirect("/shop");
  } catch (err) {
    console.log(err);
    res.redirect("/shop");
  }
});
