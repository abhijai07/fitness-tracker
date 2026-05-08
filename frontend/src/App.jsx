import { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const API = "https://fitness-tracker-c160.onrender.com";
const today = new Date().toISOString().split("T")[0];

const exerciseOptions = {
  push: ["Pec Deck Fly Machine", "Incline Chest Press Machine", "Decline Chest Press Machine", "Chest Press Machine", "Lateral Raises", "Shoulder Press Machine", "Wide Grip Push Down", "Close Grip Push Down", "Overhead Tricep Extension", "Tricep Extension Machine", "Other"],
  pull: ["Rear Delt Machine", "Close Grip Lat Pull Down", "Chest Supported Row Machine", "Back Extension Machine", "Dumbbell Shrugs", "Assisted Pull Ups", "Preacher Curl Machine", "Bicep Curl Machine", "Hammer Curl", "Forearm Curls", "Reverse Cable Curl", "Other"],
  legs: ["Leg Extension", "Leg Press", "Seated/Lying Leg Curl Machine", "Glute Drive / Hip Thrust Machine", "Hack Squat", "Sitting Calf Raise", "Abductor", "Adductor", "Ab Crunch Machine", "Rotary Torso", "Other"],
  chest: ["Pec Deck Fly Machine", "Incline Chest Press Machine", "Decline Chest Press Machine", "Chest Press Machine", "Other"],
  custom: ["Other"],
};

const muscleTargets = {
  "Pec Deck Fly Machine": "Chest",
  "Incline Chest Press Machine": "Chest",
  "Decline Chest Press Machine": "Chest",
  "Chest Press Machine": "Chest",
  "Lateral Raises": "Shoulders",
  "Shoulder Press Machine": "Shoulders",
  "Wide Grip Push Down": "Triceps",
  "Close Grip Push Down": "Triceps",
  "Overhead Tricep Extension": "Triceps",
  "Tricep Extension Machine": "Triceps",
  "Rear Delt Machine": "Rear Delts",
  "Close Grip Lat Pull Down": "Back",
  "Chest Supported Row Machine": "Back",
  "Back Extension Machine": "Back",
  "Dumbbell Shrugs": "Traps",
  "Assisted Pull Ups": "Back",
  "Preacher Curl Machine": "Biceps",
  "Bicep Curl Machine": "Biceps",
  "Hammer Curl": "Biceps",
  "Forearm Curls": "Forearms",
  "Reverse Cable Curl": "Forearms",
  "Leg Extension": "Quads",
  "Leg Press": "Quads",
  "Seated/Lying Leg Curl Machine": "Hamstrings",
  "Glute Drive / Hip Thrust Machine": "Glutes",
  "Hack Squat": "Glutes / Quads",
  "Sitting Calf Raise": "Calves",
  "Abductor": "Hip Stability",
  "Adductor": "Hip Stability",
  "Ab Crunch Machine": "Abs",
  "Rotary Torso": "Abs",
};

const emptyExercise = {
  exercise_name: "",
  custom_exercise_name: "",
  machine_name: "",
  muscle_targeted: "",
  exercise_note: "",
  sets: [{ set_number: 1, reps: "", weight: "", weight_unit: "lbs" }],
};

function ProgressRing({ label, value, goal, unit }) {
  const safeGoal = Number(goal) || 1;
  const safeValue = Number(value) || 0;
  const percent = Math.min(Math.round((safeValue / safeGoal) * 100), 100);
  return (
    <div className="ring-card">
      <div className="progress-ring" style={{ "--percent": `${percent}%` }}>
        <div><strong>{percent}%</strong><span>{unit}</span></div>
      </div>
      <h3>{label}</h3>
      <p>{safeValue} / {goal} {unit}</p>
    </div>
  );
}

function Heatmap({ data }) {
  const countMap = {};
  data.forEach((item) => { countMap[item.date] = item.count; });
  const days = [];
  const start = new Date();
  start.setDate(start.getDate() - 83);
  for (let i = 0; i < 84; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().split("T")[0];
    days.push({ date: key, count: countMap[key] || 0 });
  }
  return <div className="heatmap">{days.map((day) => <div key={day.date} title={`${day.date}: ${day.count} workout(s)`} className={`heatmap-day level-${Math.min(day.count, 4)}`} />)}</div>;
}

function RestTimer() {
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionRunning, setSessionRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return undefined;
    const timer = setInterval(() => setSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [running, seconds]);

  useEffect(() => {
    if (!sessionRunning) return undefined;
    const timer = setInterval(() => setSessionSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [sessionRunning]);

  const fmt = (value) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;

  return (
    <div className="rest-timer">
      <h3>Workout Session Timer</h3>
      <div className="timer-columns">
        <div><span>Session</span><strong>{fmt(sessionSeconds)}</strong></div>
        <div><span>Rest</span><strong>{fmt(seconds)}</strong></div>
      </div>
      <div className="timer-buttons">
        <button onClick={() => setSessionRunning(true)}>Start Session</button>
        <button className="secondary" onClick={() => setSessionRunning(false)}>Pause</button>
        <button className="secondary" onClick={() => { setSessionRunning(false); setSessionSeconds(0); }}>Reset</button>
        <button onClick={() => setRunning(true)}>Start Rest</button>
        <button className="secondary" onClick={() => setRunning(false)}>Pause Rest</button>
        <button className="secondary" onClick={() => { setRunning(false); setSeconds(90); }}>90s</button>
        <button className="secondary" onClick={() => { setRunning(false); setSeconds(120); }}>120s</button>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("default");
  const [password, setPassword] = useState("password");

  const submit = async () => {
    const response = await axios.post(`${API}/auth/${mode}`, { username, password });
    if (response.data.error) {
      alert(response.data.error);
      return;
    }
    localStorage.setItem("fitnessUser", JSON.stringify(response.data.user));
    localStorage.setItem("fitnessToken", response.data.token);
    onLogin(response.data.user);
  };

  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Fitness Tracker</h1>
        <p className="muted">Login or create a local account. Default account: default / password.</p>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={submit}>{mode === "login" ? "Login" : "Create Account"}</button>
        <button className="secondary" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Need an account? Register" : "Already have an account? Login"}</button>
      </section>
    </div>
  );
}

function App() {
  const savedUser = localStorage.getItem("fitnessUser");
  const [user, setUser] = useState(savedUser ? JSON.parse(savedUser) : null);
  const userId = user?.id || 1;
  const [activePage, setActivePage] = useState("dashboard");
  const [visibleWidgets, setVisibleWidgets] = useState(() => JSON.parse(localStorage.getItem("fitnessWidgets") || "null") || {
    rings: true,
    today: true,
    streaks: true,
    insights: true,
    recovery: true,
    heatmap: true,
    weekly: true,
    achievements: true,
    leaderboard: true,
  });

  const [profile, setProfile] = useState({ height_cm: 180, weight_kg: 74, goal: "maintain", calorie_goal: 2700, protein_goal: 150, carbs_goal: 330, fat_goal: 75, water_goal: 3, steps_goal: 10000, sleep_goal: 8 });
  const [meal, setMeal] = useState({ user_id: userId, date: today, meal_type: "", food_name: "", calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const [mealList, setMealList] = useState([]);
  const [workout, setWorkout] = useState({ user_id: userId, date: today, workout_type: "push", muscle_group: "Push Day", notes: "", exercises: [{ ...emptyExercise }] });
  const [dailyLog, setDailyLog] = useState({ user_id: userId, date: today, body_weight_kg: "", water_liters: "", sleep_hours: "", steps: "", notes: "" });
  const [totals, setTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [dailyLogHistory, setDailyLogHistory] = useState([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [progressData, setProgressData] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const [macroData, setMacroData] = useState([]);
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [personalRecords, setPersonalRecords] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [weeklyAnalytics, setWeeklyAnalytics] = useState({ days: [], summary: {}, muscle_counts: [] });
  const [recovery, setRecovery] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [insights, setInsights] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ exercises: [], muscles: [] });
  const [splitAnalytics, setSplitAnalytics] = useState({ splits: [], monthly: [], summary: {} });
  const [achievements, setAchievements] = useState({ unlocked_count: 0, total_count: 0, achievements: [] });
  const [friends, setFriends] = useState([]);
  const [friendLeaderboards, setFriendLeaderboards] = useState({ volume: [], weekly_volume: [], streaks: [], prs: [], workouts: [] });
  const [friendCompare, setFriendCompare] = useState(null);
  const [friendUsername, setFriendUsername] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dragExerciseIndex, setDragExerciseIndex] = useState(null);

  const todayLog = dailyLogHistory.find((log) => String(log.date) === today) || {};
  const todayWorkout = workoutHistory.find((item) => String(item.date) === today) || null;

  const toggleWidget = (name) => {
    const next = { ...visibleWidgets, [name]: !visibleWidgets[name] };
    setVisibleWidgets(next);
    localStorage.setItem("fitnessWidgets", JSON.stringify(next));
  };

  const syncKey = `fitnessPendingActions_${userId}`;

  const getPendingActions = () => JSON.parse(localStorage.getItem(syncKey) || "[]");

  const updatePendingCount = () => setPendingSyncCount(getPendingActions().length);

  const queueOfflineAction = (action) => {
    const actions = getPendingActions();
    actions.push({ ...action, id: Date.now(), created_at: new Date().toISOString() });
    localStorage.setItem(syncKey, JSON.stringify(actions));
    setPendingSyncCount(actions.length);
  };

  const syncPendingActions = async () => {
    const actions = getPendingActions();
    if (!navigator.onLine || actions.length === 0) return;
    const remaining = [];
    for (const action of actions) {
      try {
        await axios.post(`${API}${action.url}`, action.payload);
      } catch (error) {
        remaining.push(action);
      }
    }
    localStorage.setItem(syncKey, JSON.stringify(remaining));
    setPendingSyncCount(remaining.length);
    if (actions.length !== remaining.length) await refreshAll();
  };

  const fetchSocial = async () => {
    const [friendResponse, leaderboardResponse] = await Promise.all([
      axios.get(`${API}/friends/${userId}`),
      axios.get(`${API}/friends/leaderboard/${userId}`),
    ]);
    setFriends(friendResponse.data);
    setFriendLeaderboards(leaderboardResponse.data);
  };

  const addFriend = async () => {
    if (!friendUsername.trim()) return;
    const response = await axios.post(`${API}/friends/add`, { user_id: userId, friend_username: friendUsername });
    if (response.data.error) {
      alert(response.data.error);
      return;
    }
    setFriendUsername("");
    await fetchSocial();
    alert(response.data.message);
  };

  const compareFriend = async (friendId = selectedFriendId) => {
    if (!friendId) return;
    const response = await axios.get(`${API}/friends/compare/${userId}/${friendId}`);
    if (response.data.error) {
      alert(response.data.error);
      return;
    }
    setFriendCompare(response.data);
  };

  const fetchProfile = async () => {
    const response = await axios.get(`${API}/profile/${userId}`);
    setProfile(response.data);
  };

  const fetchMeals = async (dateValue = meal.date) => {
    if (!dateValue) return;
    const response = await axios.get(`${API}/meals/${userId}/${dateValue}`);
    setTotals(response.data.totals);
    setMealList(response.data.meals);
  };

  const fetchWorkouts = async () => {
    const response = await axios.get(`${API}/workouts/details/${userId}`);
    setWorkoutHistory(response.data);
  };

  const fetchDailyLogs = async () => {
    const response = await axios.get(`${API}/daily-logs/${userId}`);
    setDailyLogHistory(response.data);
  };

  const fetchAnalytics = async () => {
    const [pr, streak, weekly, rec, heat, insight, lead, split, ach] = await Promise.all([
      axios.get(`${API}/progress/personal-records/${userId}`),
      axios.get(`${API}/analytics/streaks/${userId}`),
      axios.get(`${API}/analytics/weekly/${userId}`),
      axios.get(`${API}/analytics/recovery/${userId}`),
      axios.get(`${API}/analytics/heatmap/${userId}`),
      axios.get(`${API}/analytics/insights/${userId}`),
      axios.get(`${API}/analytics/leaderboard/${userId}`),
      axios.get(`${API}/analytics/splits/${userId}`),
      axios.get(`${API}/analytics/achievements/${userId}`),
    ]);
    setPersonalRecords(pr.data);
    setStreaks(streak.data);
    setWeeklyAnalytics(weekly.data);
    setRecovery(rec.data);
    setHeatmap(heat.data);
    setInsights(insight.data.insights || []);
    setLeaderboard(lead.data);
    setSplitAnalytics(split.data);
    setAchievements(ach.data);
  };

  const refreshAll = async () => {
    if (!user) return;
    try {
      await Promise.all([fetchProfile(), fetchMeals(today), fetchWorkouts(), fetchDailyLogs(), fetchAnalytics(), fetchSocial()]);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setMeal((prev) => ({ ...prev, user_id: userId }));
    setWorkout((prev) => ({ ...prev, user_id: userId }));
    setDailyLog((prev) => ({ ...prev, user_id: userId }));
    refreshAll();
  }, [userId, user]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    updatePendingCount();
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [userId]);

  const handleWorkoutChange = (e) => {
    const { name, value } = e.target;
    if (name === "workout_type") {
      const labelMap = { push: "Push Day", pull: "Pull Day", legs: "Leg Day", chest: "Chest Day", custom: "Custom Day" };
      setWorkout({ ...workout, workout_type: value, muscle_group: labelMap[value], exercises: [{ ...emptyExercise }] });
    } else {
      setWorkout({ ...workout, [name]: value });
    }
  };

  const updateExercise = (exerciseIndex, field, value) => {
    const exercises = workout.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, [field]: value } : exercise);
    if (field === "exercise_name" && value !== "Other") {
      exercises[exerciseIndex].machine_name = value;
      exercises[exerciseIndex].muscle_targeted = muscleTargets[value] || "";
    }
    if (field === "exercise_name" && value === "Other") {
      exercises[exerciseIndex].machine_name = "";
      exercises[exerciseIndex].muscle_targeted = "";
    }
    if (field === "custom_exercise_name") exercises[exerciseIndex].machine_name = value;
    setWorkout({ ...workout, exercises });
  };

  const addExercise = () => setWorkout({ ...workout, exercises: [...workout.exercises, { ...emptyExercise }] });
  const removeExercise = (i) => setWorkout({ ...workout, exercises: workout.exercises.filter((_, index) => index !== i) });
  const addSet = (i) => setWorkout({ ...workout, exercises: workout.exercises.map((ex, index) => index === i ? { ...ex, sets: [...ex.sets, { set_number: ex.sets.length + 1, reps: "", weight: "", weight_unit: "lbs" }] } : ex) });
  const removeSet = (i, j) => setWorkout({ ...workout, exercises: workout.exercises.map((ex, index) => index === i ? { ...ex, sets: ex.sets.filter((_, setIndex) => setIndex !== j).map((set, setIndex) => ({ ...set, set_number: setIndex + 1 })) } : ex) });
  const updateSet = (i, j, field, value) => setWorkout({ ...workout, exercises: workout.exercises.map((ex, index) => index === i ? { ...ex, sets: ex.sets.map((set, setIndex) => setIndex === j ? { ...set, [field]: value } : set) } : ex) });

  const moveExercise = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= workout.exercises.length) return;
    const exercises = [...workout.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    setWorkout({ ...workout, exercises });
  };

  const handleExerciseDrop = (targetIndex) => {
    if (dragExerciseIndex === null || dragExerciseIndex === targetIndex) return;
    moveExercise(dragExerciseIndex, targetIndex);
    setDragExerciseIndex(null);
  };

  const saveProfile = async () => {
    await axios.put(`${API}/profile/${userId}`, { ...profile, height_cm: Number(profile.height_cm), weight_kg: Number(profile.weight_kg), calorie_goal: Number(profile.calorie_goal), protein_goal: Number(profile.protein_goal), carbs_goal: Number(profile.carbs_goal), fat_goal: Number(profile.fat_goal), water_goal: Number(profile.water_goal), steps_goal: Number(profile.steps_goal), sleep_goal: Number(profile.sleep_goal) });
    await refreshAll();
    alert("Profile saved!");
  };

  const submitMeal = async () => {
    const payload = { ...meal, user_id: userId, calories: Number(meal.calories), protein_g: Number(meal.protein_g), carbs_g: Number(meal.carbs_g), fat_g: Number(meal.fat_g) };
    if (!navigator.onLine) {
      queueOfflineAction({ url: "/meals", payload, type: "meal" });
      alert("You are offline. Meal saved locally and will sync later.");
      return;
    }
    try {
      await axios.post(`${API}/meals`, payload);
      await refreshAll();
      alert("Meal added successfully!");
    } catch (error) {
      queueOfflineAction({ url: "/meals", payload, type: "meal" });
      alert("Network issue. Meal saved locally and will sync later.");
    }
  };

  const deleteMeal = async (id) => {
    await axios.delete(`${API}/meals/${id}`);
    await refreshAll();
  };

  const submitWorkout = async () => {
    const workoutData = {
      ...workout,
      user_id: userId,
      exercises: workout.exercises.map((exercise) => {
        const finalExerciseName = exercise.exercise_name === "Other" ? exercise.custom_exercise_name : exercise.exercise_name;
        return { ...exercise, exercise_name: finalExerciseName, machine_name: finalExerciseName, sets: exercise.sets.map((set) => ({ ...set, reps: Number(set.reps), weight: Number(set.weight) })) };
      }),
    };
    if (!navigator.onLine) {
      queueOfflineAction({ url: "/workouts", payload: workoutData, type: "workout" });
      alert("You are offline. Workout saved locally and will sync later.");
      return;
    }
    try {
      await axios.post(`${API}/workouts`, workoutData);
      await refreshAll();
      alert("Workout added successfully!");
    } catch (error) {
      queueOfflineAction({ url: "/workouts", payload: workoutData, type: "workout" });
      alert("Network issue. Workout saved locally and will sync later.");
    }
  };

  const deleteWorkout = async (id) => {
    await axios.delete(`${API}/workouts/${id}`);
    await refreshAll();
  };

  const submitDailyLog = async () => {
    const payload = { ...dailyLog, user_id: userId, body_weight_kg: Number(dailyLog.body_weight_kg), water_liters: Number(dailyLog.water_liters), sleep_hours: Number(dailyLog.sleep_hours), steps: Number(dailyLog.steps) };
    if (!navigator.onLine) {
      queueOfflineAction({ url: "/daily-log", payload, type: "daily-log" });
      alert("You are offline. Daily log saved locally and will sync later.");
      return;
    }
    try {
      await axios.post(`${API}/daily-log`, payload);
      await refreshAll();
      alert("Daily log added successfully!");
    } catch (error) {
      queueOfflineAction({ url: "/daily-log", payload, type: "daily-log" });
      alert("Network issue. Daily log saved locally and will sync later.");
    }
  };

  const deleteDailyLog = async (id) => {
    await axios.delete(`${API}/daily-log/${id}`);
    await refreshAll();
  };

  const fetchExerciseProgress = async () => {
    if (!exerciseSearch) return;
    const response = await axios.get(`${API}/progress/exercise/${userId}/${exerciseSearch}`);
    setProgressData(response.data);
  };

  const fetchWeightProgress = async () => {
    const response = await axios.get(`${API}/progress/body-weight/${userId}`);
    setWeightData(response.data);
  };

  const fetchMacroProgress = async () => {
    const response = await axios.get(`${API}/progress/macros/${userId}`);
    setMacroData(response.data);
  };

  const exportReport = (format) => {
    window.open(`${API}/reports/export/${userId}?format=${format}`, "_blank");
  };

  const logout = () => {
    localStorage.removeItem("fitnessUser");
    localStorage.removeItem("fitnessToken");
    setUser(null);
  };

  const sortedWorkouts = [...workoutHistory]
    .filter((item) => {
      const search = workoutSearch.toLowerCase();
      return item.muscle_group?.toLowerCase().includes(search) || item.exercises?.some((exercise) => exercise.exercise_name?.toLowerCase().includes(search));
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!user) return <AuthScreen onLogin={setUser} />;

  return (
    <div className="app">
      <header className="top-header">
        <div>
          <h1>Fitness Tracker</h1>
          <p>Track macros, workouts, analytics, achievements, and progress.</p>
        </div>
        <div className="user-pill"><span>{user.username}</span><button className="secondary" onClick={logout}>Logout</button></div>
      </header>

      <nav className="tabs">
        <button onClick={() => setActivePage("dashboard")}>Dashboard</button>
        <button onClick={() => setActivePage("meals")}>Meals</button>
        <button onClick={() => setActivePage("workouts")}>Workouts</button>
        <button onClick={() => setActivePage("daily")}>Daily Log</button>
        <button onClick={() => setActivePage("progress")}>Progress</button>
        <button onClick={() => setActivePage("social")}>Social</button>
        <button onClick={() => setActivePage("profile")}>Profile</button>
      </nav>

      <div className="sync-status">
        <span className={isOnline ? "online-dot" : "offline-dot"}></span>
        {isOnline ? "Online" : "Offline"} · Pending sync items: {pendingSyncCount}
        {pendingSyncCount > 0 && <button className="secondary tiny-button" onClick={syncPendingActions}>Sync Now</button>}
      </div>

      {activePage === "dashboard" && (
        <main className="grid">
          <section className="card full-width">
            <h2>Smart Dashboard Widgets</h2>
            <div className="widget-toggle-grid">
              {Object.keys(visibleWidgets).map((key) => <button key={key} className={visibleWidgets[key] ? "" : "secondary"} onClick={() => toggleWidget(key)}>{visibleWidgets[key] ? "Show" : "Hide"} {key}</button>)}
            </div>
          </section>

          {visibleWidgets.rings && <section className="dashboard full-width"><ProgressRing label="Calories" value={totals.calories} goal={profile.calorie_goal} unit="cal" /><ProgressRing label="Protein" value={totals.protein_g} goal={profile.protein_goal} unit="g" /><ProgressRing label="Water" value={todayLog.water_liters || 0} goal={profile.water_goal} unit="L" /><ProgressRing label="Steps" value={todayLog.steps || 0} goal={profile.steps_goal} unit="steps" /><ProgressRing label="Sleep" value={todayLog.sleep_hours || 0} goal={profile.sleep_goal} unit="hrs" /></section>}

          {visibleWidgets.today && <section className="card"><h2>Today</h2><div className="mini-list"><p><strong>Workout:</strong> {todayWorkout ? todayWorkout.muscle_group : "No workout logged"}</p><p><strong>Meals:</strong> {mealList.length}</p><p><strong>Calories:</strong> {totals.calories} / {profile.calorie_goal}</p><p><strong>Protein:</strong> {totals.protein_g}g / {profile.protein_goal}g</p><p><strong>Water:</strong> {todayLog.water_liters || 0}L / {profile.water_goal}L</p><p><strong>Sleep:</strong> {todayLog.sleep_hours || 0} hrs / {profile.sleep_goal} hrs</p><p><strong>Steps:</strong> {todayLog.steps || 0} / {profile.steps_goal}</p></div></section>}

          {visibleWidgets.streaks && <section className="card"><h2>Streaks</h2><div className="streak-grid"><div><strong>{streaks.workout_streak || 0}</strong><span>Workout</span></div><div><strong>{streaks.protein_streak || 0}</strong><span>Protein</span></div><div><strong>{streaks.water_streak || 0}</strong><span>Water</span></div><div><strong>{streaks.sleep_streak || 0}</strong><span>Sleep</span></div><div><strong>{streaks.steps_streak || 0}</strong><span>Steps</span></div></div></section>}

          {visibleWidgets.insights && <section className="card"><h2>Smart Insights</h2>{insights.length === 0 ? <p className="muted">No insights yet.</p> : <ul className="insight-list">{insights.map((item, index) => <li key={index}>{item}</li>)}</ul>}</section>}

          {visibleWidgets.recovery && <section className="card"><h2>Muscle Recovery</h2>{recovery.length === 0 ? <p className="muted">No recovery data yet.</p> : recovery.slice(0, 6).map((item) => <div key={item.muscle} className="recovery-row"><div><strong>{item.muscle}</strong><span>{item.status} · {item.days_since} day(s)</span></div><div className="recovery-bar"><div style={{ width: `${item.recovery_percent}%` }} /></div></div>)}</section>}

          {visibleWidgets.heatmap && <section className="card full-width"><h2>Workout Calendar Heatmap</h2><Heatmap data={heatmap} /></section>}

          {visibleWidgets.weekly && <section className="card full-width"><h2>Weekly Overview</h2><div className="summary-grid"><div><strong>{weeklyAnalytics.summary?.total_workouts || 0}</strong><span>Workouts</span></div><div><strong>{weeklyAnalytics.summary?.total_volume || 0}</strong><span>Total Volume</span></div><div><strong>{weeklyAnalytics.summary?.avg_protein || 0}g</strong><span>Avg Protein</span></div><div><strong>{weeklyAnalytics.summary?.avg_sleep || 0}h</strong><span>Avg Sleep</span></div><div><strong>{weeklyAnalytics.summary?.most_trained_muscle || "None"}</strong><span>Most Trained</span></div></div><div className="chart-box"><ResponsiveContainer width="100%" height={300}><BarChart data={weeklyAnalytics.days || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="volume" fill="#38bdf8" /><Bar dataKey="workouts" fill="#22c55e" /></BarChart></ResponsiveContainer></div></section>}

          {visibleWidgets.leaderboard && <section className="card full-width"><h2>Exercise Volume Leaderboard</h2><div className="leaderboard-grid">{leaderboard.exercises?.slice(0, 8).map((item, index) => <div className="leaderboard-row" key={item.exercise}><strong>#{index + 1} {item.exercise}</strong><span>{item.volume} volume · {item.sets} sets</span></div>)}</div></section>}

          {visibleWidgets.achievements && <section className="card full-width"><h2>Achievements</h2><p className="muted">Unlocked {achievements.unlocked_count} of {achievements.total_count}</p><div className="badge-grid">{achievements.achievements?.map((badge) => <div key={badge.name} className={badge.unlocked ? "badge unlocked" : "badge locked"}><strong>{badge.unlocked ? "🏆" : "🔒"} {badge.name}</strong><span>{badge.description}</span></div>)}</div></section>}
        </main>
      )}

      {activePage === "meals" && (
        <main className="grid">
          <section className="card"><h2>Add Meal</h2><label>Date</label><input type="date" name="date" value={meal.date} onChange={(e) => setMeal({ ...meal, date: e.target.value })} /><label>Meal Type</label><input name="meal_type" value={meal.meal_type} onChange={(e) => setMeal({ ...meal, meal_type: e.target.value })} /><label>Food Name</label><input name="food_name" value={meal.food_name} onChange={(e) => setMeal({ ...meal, food_name: e.target.value })} /><label>Calories</label><input type="number" name="calories" value={meal.calories} onChange={(e) => setMeal({ ...meal, calories: e.target.value })} /><label>Protein g</label><input type="number" name="protein_g" value={meal.protein_g} onChange={(e) => setMeal({ ...meal, protein_g: e.target.value })} /><label>Carbs g</label><input type="number" name="carbs_g" value={meal.carbs_g} onChange={(e) => setMeal({ ...meal, carbs_g: e.target.value })} /><label>Fat g</label><input type="number" name="fat_g" value={meal.fat_g} onChange={(e) => setMeal({ ...meal, fat_g: e.target.value })} /><button onClick={submitMeal}>Add Meal</button><button className="secondary" onClick={() => fetchMeals()}>Show Meals/Totals</button></section>
          <section className="card"><h2>Meals for Selected Date</h2>{mealList.length === 0 ? <p className="muted">No meals loaded yet.</p> : mealList.map((item) => <div key={item.id} className="history-item"><h3>{item.food_name}</h3><p>{item.meal_type}</p><p>{item.calories} cal | {item.protein_g}g protein | {item.carbs_g}g carbs | {item.fat_g}g fat</p><button className="danger" onClick={() => deleteMeal(item.id)}>Delete Meal</button></div>)}</section>
        </main>
      )}

      {activePage === "workouts" && (
        <main className="grid">
          <section className="card"><h2>Add Workout</h2><RestTimer /><label>Date</label><input type="date" name="date" value={workout.date} onChange={handleWorkoutChange} /><label>Workout Type</label><select name="workout_type" value={workout.workout_type} onChange={handleWorkoutChange}><option value="push">Push Day</option><option value="pull">Pull Day</option><option value="legs">Leg Day</option><option value="chest">Chest Day</option><option value="custom">Custom Day</option></select><label>Workout Name</label><input name="muscle_group" value={workout.muscle_group} onChange={handleWorkoutChange} />
            {workout.exercises.map((exercise, exerciseIndex) => <div key={exerciseIndex} className="exercise-entry" draggable onDragStart={() => setDragExerciseIndex(exerciseIndex)} onDragOver={(e) => e.preventDefault()} onDrop={() => handleExerciseDrop(exerciseIndex)}><div className="exercise-header"><h3>Exercise {exerciseIndex + 1}</h3><div><button className="secondary tiny-button" onClick={() => moveExercise(exerciseIndex, exerciseIndex - 1)}>↑</button><button className="secondary tiny-button" onClick={() => moveExercise(exerciseIndex, exerciseIndex + 1)}>↓</button></div></div><p className="muted">Drag this card or use arrows to reorder exercises.</p><label>Exercise Name</label><select value={exercise.exercise_name} onChange={(e) => updateExercise(exerciseIndex, "exercise_name", e.target.value)}><option value="">Select Exercise</option>{exerciseOptions[workout.workout_type].map((option) => <option key={option} value={option}>{option}</option>)}</select>{exercise.exercise_name === "Other" && <><label>Custom Exercise Name</label><input value={exercise.custom_exercise_name || ""} onChange={(e) => updateExercise(exerciseIndex, "custom_exercise_name", e.target.value)} /><label>Muscle Targeted</label><input value={exercise.muscle_targeted} onChange={(e) => updateExercise(exerciseIndex, "muscle_targeted", e.target.value)} /></>} {exercise.exercise_name !== "Other" && <p className="auto-fill-text">Muscle Targeted: <strong>{exercise.muscle_targeted || "Auto-filled"}</strong></p>}<label>Exercise Notes</label><textarea placeholder="Form notes, pain, tempo, next-week reminder..." value={exercise.exercise_note || ""} onChange={(e) => updateExercise(exerciseIndex, "exercise_note", e.target.value)} />{exercise.sets.map((set, setIndex) => <div key={setIndex} className="set-box"><label>Set Number</label><input type="number" value={set.set_number} readOnly /><label>Reps</label><input type="number" value={set.reps} onChange={(e) => updateSet(exerciseIndex, setIndex, "reps", e.target.value)} /><label>Weight</label><input type="number" value={set.weight} onChange={(e) => updateSet(exerciseIndex, setIndex, "weight", e.target.value)} />{exercise.sets.length > 1 && <button className="danger" onClick={() => removeSet(exerciseIndex, setIndex)}>Remove Set</button>}</div>)}<button className="secondary" onClick={() => addSet(exerciseIndex)}>+ Add Set</button>{workout.exercises.length > 1 && <button className="danger" onClick={() => removeExercise(exerciseIndex)}>Remove Exercise</button>}</div>)}<button className="secondary" onClick={addExercise}>+ Add Exercise</button><label>Workout Notes</label><input name="notes" value={workout.notes} onChange={handleWorkoutChange} /><button onClick={submitWorkout}>Add Workout</button></section>
          <section className="card"><h2>Workout History</h2><input placeholder="Search by muscle group or exercise" value={workoutSearch} onChange={(e) => setWorkoutSearch(e.target.value)} /><button onClick={fetchWorkouts}>Refresh Workouts</button>{sortedWorkouts.length === 0 ? <p className="muted">No workouts loaded yet.</p> : sortedWorkouts.map((item) => <div key={item.id} className="history-item"><h3>{item.muscle_group}</h3><p>Date: {item.date}</p><p>Notes: {item.notes}</p><button className="danger" onClick={() => deleteWorkout(item.id)}>Delete Workout</button>{item.exercises.map((exercise, index) => <div key={index} className="exercise-box"><h4>{exercise.exercise_name}</h4><p>Target: {exercise.muscle_targeted}</p>{exercise.exercise_note && <p>Note: {exercise.exercise_note}</p>}{exercise.sets.map((set, setIndex) => <p key={setIndex}>Set {set.set_number}: {set.reps} reps x {set.weight} {set.weight_unit} | Volume: {set.volume || set.reps * set.weight}</p>)}</div>)}</div>)}</section>
        </main>
      )}

      {activePage === "daily" && (
        <main className="grid"><section className="card"><h2>Daily Log</h2><label>Date</label><input type="date" name="date" value={dailyLog.date} onChange={(e) => setDailyLog({ ...dailyLog, date: e.target.value })} /><label>Body Weight kg</label><input type="number" value={dailyLog.body_weight_kg} onChange={(e) => setDailyLog({ ...dailyLog, body_weight_kg: e.target.value })} /><label>Water Liters</label><input type="number" value={dailyLog.water_liters} onChange={(e) => setDailyLog({ ...dailyLog, water_liters: e.target.value })} /><label>Sleep Hours</label><input type="number" value={dailyLog.sleep_hours} onChange={(e) => setDailyLog({ ...dailyLog, sleep_hours: e.target.value })} /><label>Steps</label><input type="number" value={dailyLog.steps} onChange={(e) => setDailyLog({ ...dailyLog, steps: e.target.value })} /><label>Notes</label><input value={dailyLog.notes} onChange={(e) => setDailyLog({ ...dailyLog, notes: e.target.value })} /><button onClick={submitDailyLog}>Save Daily Log</button></section><section className="card"><h2>Daily Log History</h2>{dailyLogHistory.length === 0 ? <p className="muted">No daily logs loaded yet.</p> : dailyLogHistory.map((log) => <div key={log.id} className="history-item"><h3>{log.date}</h3><p>Body Weight: {log.body_weight_kg} kg</p><p>Water: {log.water_liters} L</p><p>Sleep: {log.sleep_hours} hours</p><p>Steps: {log.steps}</p><p>Notes: {log.notes}</p><button className="danger" onClick={() => deleteDailyLog(log.id)}>Delete Daily Log</button></div>)}</section></main>
      )}

      {activePage === "progress" && (
        <main className="grid"><section className="card full-width"><h2>Export Workout Reports</h2><button onClick={() => exportReport("csv")}>Export CSV</button><button className="secondary" onClick={() => exportReport("txt")}>Export TXT Summary</button></section><section className="card full-width"><h2>Workout Split Analytics</h2><p className="muted">{splitAnalytics.summary?.message}</p><div className="summary-grid">{splitAnalytics.splits?.map((item) => <div key={item.split}><strong>{item.count}</strong><span>{item.split} · {item.percent}%</span></div>)}</div><div className="chart-box"><ResponsiveContainer width="100%" height={300}><BarChart data={splitAnalytics.splits || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="split" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#38bdf8" /></BarChart></ResponsiveContainer></div></section><section className="card full-width"><h2>Personal Records</h2><button onClick={fetchAnalytics}>Refresh Records</button>{personalRecords.length === 0 ? <p className="muted">No personal records yet.</p> : <div className="pr-grid">{personalRecords.map((record) => <div key={record.exercise_name} className="pr-card"><h3>{record.exercise_name}</h3><p>Max Weight: <strong>{record.max_weight} lbs</strong></p><p>Best Set: {record.best_set || "N/A"}</p><p>Best Reps: {record.best_reps}</p><p>Best Volume: {record.best_volume}</p><span>{record.date}</span></div>)}</div>}</section><section className="card full-width"><h2>Exercise Volume Leaderboard</h2><div className="leaderboard-grid">{leaderboard.muscles?.map((item, index) => <div className="leaderboard-row" key={item.muscle}><strong>#{index + 1} {item.muscle}</strong><span>{item.volume} volume · {item.sessions} sessions</span></div>)}</div></section><section className="card full-width"><h2>Exercise Progress</h2><input placeholder="Exercise name" value={exerciseSearch} onChange={(e) => setExerciseSearch(e.target.value)} /><button onClick={fetchExerciseProgress}>Show Progress</button><div className="chart-box"><ResponsiveContainer width="100%" height={300}><LineChart data={progressData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="weight" stroke="#38bdf8" /><Line type="monotone" dataKey="volume" stroke="#22c55e" /></LineChart></ResponsiveContainer></div></section><section className="card full-width"><h2>Body Weight Progress</h2><button onClick={fetchWeightProgress}>Show Weight Progress</button><div className="chart-box"><ResponsiveContainer width="100%" height={300}><LineChart data={weightData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="body_weight_kg" stroke="#22c55e" /></LineChart></ResponsiveContainer></div></section><section className="card full-width"><h2>Macro Progress</h2><button onClick={fetchMacroProgress}>Show Macro Progress</button><div className="chart-box"><ResponsiveContainer width="100%" height={300}><LineChart data={macroData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="calories" stroke="#38bdf8" /><Line type="monotone" dataKey="protein_g" stroke="#22c55e" /><Line type="monotone" dataKey="carbs_g" stroke="#f59e0b" /><Line type="monotone" dataKey="fat_g" stroke="#ef4444" /></LineChart></ResponsiveContainer></div></section></main>
      )}

      {activePage === "social" && (
        <main className="grid">
          <section className="card">
            <h2>Add Friends</h2>
            <p className="muted">Add another local username, then compare PRs, volume, streaks, and body weight trends.</p>
            <label>Friend Username</label>
            <input placeholder="example: default" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} />
            <button onClick={addFriend}>Add Friend</button>
          </section>

          <section className="card">
            <h2>Your Friends</h2>
            {friends.length === 0 ? <p className="muted">No friends yet. Create another account and add that username.</p> : friends.map((friend) => (
              <div className="friend-card" key={friend.user_id}>
                <h3>{friend.username}</h3>
                <p>Total Volume: {friend.total_volume}</p>
                <p>Workout Streak: {friend.workout_streak}</p>
                <p>Max PR: {friend.max_pr} lbs</p>
                <button onClick={() => { setSelectedFriendId(friend.user_id); compareFriend(friend.user_id); }}>Compare</button>
              </div>
            ))}
          </section>

          <section className="card full-width">
            <h2>Friend Leaderboards</h2>
            <div className="leaderboard-columns">
              <div><h3>Total Volume</h3>{friendLeaderboards.volume?.map((item, index) => <p key={item.user_id}>#{index + 1} {item.username}: {item.total_volume}</p>)}</div>
              <div><h3>Weekly Volume</h3>{friendLeaderboards.weekly_volume?.map((item, index) => <p key={item.user_id}>#{index + 1} {item.username}: {item.weekly_volume}</p>)}</div>
              <div><h3>Streaks</h3>{friendLeaderboards.streaks?.map((item, index) => <p key={item.user_id}>#{index + 1} {item.username}: {item.workout_streak} days</p>)}</div>
              <div><h3>Max PR</h3>{friendLeaderboards.prs?.map((item, index) => <p key={item.user_id}>#{index + 1} {item.username}: {item.max_pr} lbs</p>)}</div>
            </div>
          </section>

          {friendCompare && (
            <>
              <section className="card full-width">
                <h2>You vs {friendCompare.friend.username}</h2>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={friendCompare.summary_chart || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="you" fill="#38bdf8" />
                      <Bar dataKey="friend" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="card full-width">
                <h2>PR Comparison</h2>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={(friendCompare.pr_comparison || []).slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exercise" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="you" fill="#38bdf8" />
                      <Bar dataKey="friend" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="card full-width">
                <h2>Body Weight Comparison</h2>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={[...(friendCompare.your_body_weight || []).map((x) => ({ date: x.date, you: x.body_weight_kg })), ...(friendCompare.friend_body_weight || []).map((x) => ({ date: x.date, friend: x.body_weight_kg }))]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="you" stroke="#38bdf8" />
                      <Line type="monotone" dataKey="friend" stroke="#22c55e" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </main>
      )}

      {activePage === "profile" && (
        <main className="grid"><section className="card"><h2>Profile & Goals</h2><label>Height cm</label><input type="number" name="height_cm" value={profile.height_cm} onChange={(e) => setProfile({ ...profile, height_cm: e.target.value })} /><label>Current Weight kg</label><input type="number" name="weight_kg" value={profile.weight_kg} onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value })} /><label>Goal</label><input name="goal" value={profile.goal} onChange={(e) => setProfile({ ...profile, goal: e.target.value })} /><label>Calories Goal</label><input type="number" name="calorie_goal" value={profile.calorie_goal} onChange={(e) => setProfile({ ...profile, calorie_goal: e.target.value })} /><label>Protein Goal g</label><input type="number" name="protein_goal" value={profile.protein_goal} onChange={(e) => setProfile({ ...profile, protein_goal: e.target.value })} /><label>Carbs Goal g</label><input type="number" name="carbs_goal" value={profile.carbs_goal} onChange={(e) => setProfile({ ...profile, carbs_goal: e.target.value })} /><label>Fat Goal g</label><input type="number" name="fat_goal" value={profile.fat_goal} onChange={(e) => setProfile({ ...profile, fat_goal: e.target.value })} /><label>Water Goal L</label><input type="number" name="water_goal" value={profile.water_goal} onChange={(e) => setProfile({ ...profile, water_goal: e.target.value })} /><label>Steps Goal</label><input type="number" name="steps_goal" value={profile.steps_goal} onChange={(e) => setProfile({ ...profile, steps_goal: e.target.value })} /><label>Sleep Goal hours</label><input type="number" name="sleep_goal" value={profile.sleep_goal} onChange={(e) => setProfile({ ...profile, sleep_goal: e.target.value })} /><button onClick={saveProfile}>Save Profile</button></section></main>
      )}
    </div>
  );
}

export default App;
