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
  push: [
    "Pec Deck Fly Machine",
    "Incline Chest Press Machine",
    "Decline Chest Press Machine",
    "Chest Press Machine",
    "Lateral Raises",
    "Shoulder Press Machine",
    "Wide Grip Push Down",
    "Close Grip Push Down",
    "Overhead Tricep Extension",
    "Tricep Extension Machine",
    "Other",
  ],
  pull: [
    "Rear Delt Machine",
    "Close Grip Lat Pull Down",
    "Chest Supported Row Machine",
    "Back Extension Machine",
    "Dumbbell Shrugs",
    "Assisted Pull Ups",
    "Preacher Curl Machine",
    "Bicep Curl Machine",
    "Hammer Curl",
    "Forearm Curls",
    "Reverse Cable Curl",
    "Other",
  ],
  legs: [
    "Leg Extension",
    "Leg Press",
    "Seated/Lying Leg Curl Machine",
    "Glute Drive / Hip Thrust Machine",
    "Hack Squat",
    "Sitting Calf Raise",
    "Abductor",
    "Adductor",
    "Ab Crunch Machine",
    "Rotary Torso",
    "Other",
  ],
  chest: [
    "Pec Deck Fly Machine",
    "Incline Chest Press Machine",
    "Decline Chest Press Machine",
    "Chest Press Machine",
    "Other",
  ],
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
  Abductor: "Hip Stability",
  Adductor: "Hip Stability",
  "Ab Crunch Machine": "Abs",
  "Rotary Torso": "Abs",
};

const createEmptyExercise = () => ({
  exercise_name: "",
  custom_exercise_name: "",
  machine_name: "",
  muscle_targeted: "",
  exercise_note: "",
  saved: false,
  sets: [{ set_number: 1, reps: "", weight: "", weight_unit: "lbs" }],
});

function ProgressRing({ label, value, goal, unit }) {
  const safeGoal = Number(goal) || 1;
  const safeValue = Number(value) || 0;
  const percent = Math.min(Math.round((safeValue / safeGoal) * 100), 100);

  return (
    <div className="ring-card">
      <div className="progress-ring" style={{ "--percent": `${percent}%` }}>
        <div>
          <strong>{percent}%</strong>
          <span>{unit}</span>
        </div>
      </div>
      <h3>{label}</h3>
      <p>
        {safeValue} / {goal} {unit}
      </p>
    </div>
  );
}

function Heatmap({ data }) {
  const countMap = {};
  data.forEach((item) => {
    countMap[item.date] = item.count;
  });

  const days = [];
  const start = new Date();
  start.setDate(start.getDate() - 83);

  for (let i = 0; i < 84; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().split("T")[0];
    days.push({ date: key, count: countMap[key] || 0 });
  }

  return (
    <div className="heatmap">
      {days.map((day) => (
        <div
          key={day.date}
          title={`${day.date}: ${day.count} workout(s)`}
          className={`heatmap-day level-${Math.min(day.count, 4)}`}
        />
      ))}
    </div>
  );
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

  const fmt = (value) =>
    `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;

  return (
    <div className="rest-timer compact-timer">
      <div className="timer-columns">
        <div>
          <span>Session</span>
          <strong>{fmt(sessionSeconds)}</strong>
        </div>
        <div>
          <span>Rest</span>
          <strong>{fmt(seconds)}</strong>
        </div>
      </div>

      <div className="timer-buttons compact-buttons">
        <button onClick={() => setSessionRunning(true)}>Start</button>
        <button className="secondary" onClick={() => setSessionRunning(false)}>
          Pause
        </button>
        <button
          className="secondary"
          onClick={() => {
            setSessionRunning(false);
            setSessionSeconds(0);
          }}
        >
          Reset
        </button>
        <button onClick={() => setRunning(true)}>Rest</button>
        <button
          className="secondary"
          onClick={() => {
            setRunning(false);
            setSeconds(90);
          }}
        >
          90s
        </button>
        <button
          className="secondary"
          onClick={() => {
            setRunning(false);
            setSeconds(120);
          }}
        >
          120s
        </button>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("default");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/auth/${mode}`, {
        username,
        password,
      });

      if (response.data.error) {
        alert(response.data.error);
        return;
      }

      localStorage.setItem("fitnessUser", JSON.stringify(response.data.user));
      localStorage.setItem("fitnessToken", response.data.token);
      onLogin(response.data.user);
    } catch (error) {
      console.error(error);
      alert("Login/Register failed. Check backend or browser console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Fitness Tracker</h1>
        <p className="muted">Login or create an account.</p>

        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={submit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>

        <button
          className="secondary full-button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Login"}
        </button>
      </section>
    </div>
  );
}

function App() {
  const savedUser = localStorage.getItem("fitnessUser");
  const [user, setUser] = useState(savedUser ? JSON.parse(savedUser) : null);
  const userId = user?.id || 1;

  const [activePage, setActivePage] = useState("dashboard");
  const [showMealSheet, setShowMealSheet] = useState(false);
  const [showWorkoutSheet, setShowWorkoutSheet] = useState(false);
  const [showDailySheet, setShowDailySheet] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [showMoreDashboard, setShowMoreDashboard] = useState(false);

  const [visibleWidgets, setVisibleWidgets] = useState(
    () =>
      JSON.parse(localStorage.getItem("fitnessWidgets") || "null") || {
        rings: true,
        today: true,
        streaks: true,
        insights: true,
        recovery: true,
        heatmap: true,
        weekly: true,
        achievements: true,
        leaderboard: true,
      }
  );

  const [profile, setProfile] = useState({
    height_cm: 180,
    weight_kg: 74,
    goal: "maintain",
    calorie_goal: 2700,
    protein_goal: 150,
    carbs_goal: 330,
    fat_goal: 75,
    water_goal: 3,
    steps_goal: 10000,
    sleep_goal: 8,
  });

  const [meal, setMeal] = useState({
    user_id: userId,
    date: today,
    meal_type: "",
    food_name: "",
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
  });

  const [mealList, setMealList] = useState([]);

  const [workout, setWorkout] = useState({
    user_id: userId,
    date: today,
    workout_type: "push",
    muscle_group: "Push Day",
    notes: "",
    exercises: [createEmptyExercise()],
  });

  const [dailyLog, setDailyLog] = useState({
    user_id: userId,
    date: today,
    body_weight_kg: "",
    water_liters: "",
    sleep_hours: "",
    steps: "",
    notes: "",
  });

  const [totals, setTotals] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  });

  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [dailyLogHistory, setDailyLogHistory] = useState([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [progressData, setProgressData] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const [macroData, setMacroData] = useState([]);
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [personalRecords, setPersonalRecords] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [weeklyAnalytics, setWeeklyAnalytics] = useState({
    days: [],
    summary: {},
    muscle_counts: [],
  });
  const [recovery, setRecovery] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [insights, setInsights] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ exercises: [], muscles: [] });
  const [splitAnalytics, setSplitAnalytics] = useState({
    splits: [],
    monthly: [],
    summary: {},
  });
  const [achievements, setAchievements] = useState({
    unlocked_count: 0,
    total_count: 0,
    achievements: [],
  });

  const [friends, setFriends] = useState([]);
  const [friendLeaderboards, setFriendLeaderboards] = useState({
    volume: [],
    weekly_volume: [],
    streaks: [],
    prs: [],
    workouts: [],
  });
  const [friendCompare, setFriendCompare] = useState(null);
  const [friendUsername, setFriendUsername] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState("");

  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dragExerciseIndex, setDragExerciseIndex] = useState(null);

  const todayLog =
    dailyLogHistory.find((log) => String(log.date) === today) || {};
  const todayWorkout =
    workoutHistory.find((item) => String(item.date) === today) || null;

  const syncKey = `fitnessPendingActions_${userId}`;
    const getPendingActions = () =>
    JSON.parse(localStorage.getItem(syncKey) || "[]");

  const updatePendingCount = () => {
    setPendingSyncCount(getPendingActions().length);
  };

  const queueOfflineAction = (action) => {
    const actions = getPendingActions();
    actions.push({
      ...action,
      id: Date.now(),
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(syncKey, JSON.stringify(actions));
    setPendingSyncCount(actions.length);
  };

  const syncPendingActions = async () => {
    const actions = getPendingActions();

    if (!navigator.onLine || actions.length === 0) return;

    const remaining = [];

    for (const action of actions) {
      try {
        await axios({
          method: action.method || "post",
          url: `${API}${action.url}`,
          data: action.payload,
        });
      } catch (error) {
        remaining.push(action);
      }
    }

    localStorage.setItem(syncKey, JSON.stringify(remaining));
    setPendingSyncCount(remaining.length);

    if (actions.length !== remaining.length) {
      await refreshAll();
    }
  };

  const toggleWidget = (name) => {
    const next = {
      ...visibleWidgets,
      [name]: !visibleWidgets[name],
    };

    setVisibleWidgets(next);
    localStorage.setItem("fitnessWidgets", JSON.stringify(next));
  };

  const fetchProfile = async () => {
    const response = await axios.get(`${API}/profile/${userId}`);
    setProfile(response.data);
  };

  const fetchMeals = async (dateValue = meal.date || today) => {
    if (!dateValue) return;

    const response = await axios.get(`${API}/meals/${userId}/${dateValue}`);

    setTotals(response.data.totals || {});
    setMealList(response.data.meals || []);
  };

  const fetchWorkouts = async () => {
    const response = await axios.get(`${API}/workouts/details/${userId}`);
    setWorkoutHistory(response.data || []);
  };

  const fetchDailyLogs = async () => {
    const response = await axios.get(`${API}/daily-logs/${userId}`);
    setDailyLogHistory(response.data || []);
  };

  const fetchAnalytics = async () => {
    const [
      pr,
      streak,
      weekly,
      rec,
      heat,
      insight,
      lead,
      split,
      ach,
    ] = await Promise.all([
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

    setPersonalRecords(pr.data || []);
    setStreaks(streak.data || {});
    setWeeklyAnalytics(weekly.data || { days: [], summary: {}, muscle_counts: [] });
    setRecovery(rec.data || []);
    setHeatmap(heat.data || []);
    setInsights(insight.data?.insights || []);
    setLeaderboard(lead.data || { exercises: [], muscles: [] });
    setSplitAnalytics(split.data || { splits: [], monthly: [], summary: {} });
    setAchievements(
      ach.data || {
        unlocked_count: 0,
        total_count: 0,
        achievements: [],
      }
    );
  };

  const fetchSocial = async () => {
    const [friendResponse, leaderboardResponse] = await Promise.all([
      axios.get(`${API}/friends/${userId}`),
      axios.get(`${API}/friends/leaderboard/${userId}`),
    ]);

    setFriends(friendResponse.data || []);
    setFriendLeaderboards(
      leaderboardResponse.data || {
        volume: [],
        weekly_volume: [],
        streaks: [],
        prs: [],
        workouts: [],
      }
    );
  };

  const refreshAll = async () => {
    if (!user) return;

    try {
      await Promise.all([
        fetchProfile(),
        fetchMeals(today),
        fetchWorkouts(),
        fetchDailyLogs(),
        fetchAnalytics(),
        fetchSocial(),
      ]);
    } catch (error) {
      console.error("Refresh failed:", error);
    }
  };

  useEffect(() => {
    setMeal((prev) => ({
      ...prev,
      user_id: userId,
    }));

    setWorkout((prev) => ({
      ...prev,
      user_id: userId,
    }));

    setDailyLog((prev) => ({
      ...prev,
      user_id: userId,
    }));

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

    const handleOffline = () => {
      setIsOnline(false);
    };

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
      const labelMap = {
        push: "Push Day",
        pull: "Pull Day",
        legs: "Leg Day",
        chest: "Chest Day",
        custom: "Custom Day",
      };

      setWorkout({
        ...workout,
        workout_type: value,
        muscle_group: labelMap[value],
        exercises: [createEmptyExercise()],
      });

      setActiveExerciseIndex(0);
    } else {
      setWorkout({
        ...workout,
        [name]: value,
      });
    }
  };

  const updateExercise = (exerciseIndex, field, value) => {
    const exercises = workout.exercises.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;

      const updatedExercise = {
        ...exercise,
        [field]: value,
      };

      if (field === "exercise_name" && value !== "Other") {
        updatedExercise.machine_name = value;
        updatedExercise.muscle_targeted = muscleTargets[value] || "";
      }

      if (field === "exercise_name" && value === "Other") {
        updatedExercise.machine_name = "";
        updatedExercise.muscle_targeted = "";
      }

      if (field === "custom_exercise_name") {
        updatedExercise.machine_name = value;
      }

      return updatedExercise;
    });

    setWorkout({
      ...workout,
      exercises,
    });
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const exercises = workout.exercises.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;

      return {
        ...exercise,
        sets: exercise.sets.map((set, currentSetIndex) =>
          currentSetIndex === setIndex
            ? {
                ...set,
                [field]: value,
              }
            : set
        ),
      };
    });

    setWorkout({
      ...workout,
      exercises,
    });
  };

  const addSet = (exerciseIndex) => {
    const exercises = workout.exercises.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;

      return {
        ...exercise,
        sets: [
          ...exercise.sets,
          {
            set_number: exercise.sets.length + 1,
            reps: "",
            weight: "",
            weight_unit: "lbs",
          },
        ],
      };
    });

    setWorkout({
      ...workout,
      exercises,
    });
  };

  const removeSet = (exerciseIndex, setIndex) => {
    const exercises = workout.exercises.map((exercise, index) => {
      if (index !== exerciseIndex) return exercise;

      const nextSets = exercise.sets
        .filter((_, currentSetIndex) => currentSetIndex !== setIndex)
        .map((set, currentSetIndex) => ({
          ...set,
          set_number: currentSetIndex + 1,
        }));

      return {
        ...exercise,
        sets:
          nextSets.length > 0
            ? nextSets
            : [{ set_number: 1, reps: "", weight: "", weight_unit: "lbs" }],
      };
    });

    setWorkout({
      ...workout,
      exercises,
    });
  };

  const addExercise = () => {
    setWorkout({
      ...workout,
      exercises: [...workout.exercises, createEmptyExercise()],
    });

    setActiveExerciseIndex(workout.exercises.length);
  };

  const saveCurrentExerciseAndNext = () => {
    const currentExercise = workout.exercises[activeExerciseIndex];

    if (!currentExercise) return;

    const finalName =
      currentExercise.exercise_name === "Other"
        ? currentExercise.custom_exercise_name
        : currentExercise.exercise_name;

    const hasValidSet = currentExercise.sets.some(
      (set) => set.reps && set.weight
    );

    if (!finalName || !hasValidSet) {
      alert("Please select an exercise and add at least one set.");
      return;
    }

    const exercises = workout.exercises.map((exercise, index) =>
      index === activeExerciseIndex
        ? {
            ...exercise,
            saved: true,
          }
        : exercise
    );

    const hasNextExercise = activeExerciseIndex < exercises.length - 1;

    setWorkout({
      ...workout,
      exercises,
    });

    if (hasNextExercise) {
      setActiveExerciseIndex(activeExerciseIndex + 1);
    } else {
      setWorkout({
        ...workout,
        exercises: [...exercises, createEmptyExercise()],
      });

      setActiveExerciseIndex(exercises.length);
    }
  };

  const removeExercise = (exerciseIndex) => {
    const nextExercises = workout.exercises.filter(
      (_, index) => index !== exerciseIndex
    );

    setWorkout({
      ...workout,
      exercises: nextExercises.length > 0 ? nextExercises : [createEmptyExercise()],
    });

    setActiveExerciseIndex(0);
  };

  const moveExercise = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= workout.exercises.length) return;

    const exercises = [...workout.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);

    setWorkout({
      ...workout,
      exercises,
    });
  };

  const handleExerciseDrop = (targetIndex) => {
    if (dragExerciseIndex === null || dragExerciseIndex === targetIndex) return;

    moveExercise(dragExerciseIndex, targetIndex);
    setDragExerciseIndex(null);
  };

  const resetMealForm = () => {
    setMeal({
      user_id: userId,
      date: today,
      meal_type: "",
      food_name: "",
      calories: "",
      protein_g: "",
      carbs_g: "",
      fat_g: "",
    });

    setEditingMealId(null);
  };

  const submitMeal = async () => {
    const payload = {
      ...meal,
      user_id: userId,
      calories: Number(meal.calories),
      protein_g: Number(meal.protein_g),
      carbs_g: Number(meal.carbs_g),
      fat_g: Number(meal.fat_g),
    };

    if (!payload.food_name || !payload.calories) {
      alert("Please enter at least food name and calories.");
      return;
    }

    if (!navigator.onLine) {
      queueOfflineAction({
        url: editingMealId ? `/meals/${editingMealId}` : "/meals",
        payload,
        type: "meal",
        method: editingMealId ? "put" : "post",
      });

      alert("You are offline. Meal saved locally and will sync later.");
      setShowMealSheet(false);
      resetMealForm();
      return;
    }

    try {
      if (editingMealId) {
        await axios.put(`${API}/meals/${editingMealId}`, payload);
      } else {
        await axios.post(`${API}/meals`, payload);
      }

      await refreshAll();

      setShowMealSheet(false);
      resetMealForm();

      alert(editingMealId ? "Meal updated successfully!" : "Meal added successfully!");
    } catch (error) {
      console.error(error);

      queueOfflineAction({
        url: editingMealId ? `/meals/${editingMealId}` : "/meals",
        payload,
        type: "meal",
        method: editingMealId ? "put" : "post",
      });

      alert("Network issue. Meal saved locally and will sync later.");
    }
  };

  const startEditMeal = (item) => {
    setMeal({
      user_id: userId,
      date: item.date || today,
      meal_type: item.meal_type || "",
      food_name: item.food_name || "",
      calories: item.calories || "",
      protein_g: item.protein_g || "",
      carbs_g: item.carbs_g || "",
      fat_g: item.fat_g || "",
    });

    setEditingMealId(item.id);
    setShowMealSheet(true);
  };

  const deleteMeal = async (id) => {
    try {
      await axios.delete(`${API}/meals/${id}`);
      await refreshAll();
    } catch (error) {
      console.error(error);
      alert("Meal could not be deleted.");
    }
  };

  const submitWorkout = async () => {
    const validExercises = workout.exercises.filter((exercise) => {
      const finalName =
        exercise.exercise_name === "Other"
          ? exercise.custom_exercise_name
          : exercise.exercise_name;

      const validSets = exercise.sets.filter((set) => set.reps && set.weight);

      return finalName && validSets.length > 0;
    });

    if (validExercises.length === 0) {
      alert("Please add at least one exercise with reps and weight.");
      return;
    }

    const workoutData = {
      ...workout,
      user_id: userId,
      exercises: validExercises.map((exercise) => {
        const finalExerciseName =
          exercise.exercise_name === "Other"
            ? exercise.custom_exercise_name
            : exercise.exercise_name;

        return {
  exercise_name: finalExerciseName,
  machine_name: finalExerciseName,
  muscle_targeted:
    exercise.muscle_targeted || muscleTargets[finalExerciseName] || "",
  exercise_note: exercise.exercise_note || "",
  sets: exercise.sets
    .filter((set) => set.reps && set.weight)
    .map((set, index) => ({
      set_number: index + 1,
      reps: Number(set.reps),
      weight: Number(set.weight),
      weight_unit: set.weight_unit || "lbs",
    })),
};
}),
    };

    if (!navigator.onLine) {
      queueOfflineAction({
        url: "/workouts",
        payload: workoutData,
        type: "workout",
      });

      alert("You are offline. Workout saved locally and will sync later.");
      return;
    }

    try {
      await axios.post(`${API}/workouts`, workoutData);
      await refreshAll();

      setWorkout({
        user_id: userId,
        date: today,
        workout_type: "push",
        muscle_group: "Push Day",
        notes: "",
        exercises: [createEmptyExercise()],
      });

      setActiveExerciseIndex(0);
      setShowWorkoutSheet(false);

      alert("Workout saved successfully!");
    } catch (error) {
      console.error(error);

      queueOfflineAction({
        url: "/workouts",
        payload: workoutData,
        type: "workout",
      });

      alert("Network issue. Workout saved locally and will sync later.");
    }
  };

  const deleteWorkout = async (id) => {
    try {
      await axios.delete(`${API}/workouts/${id}`);
      await refreshAll();
    } catch (error) {
      console.error(error);
      alert("Workout could not be deleted.");
    }
  };

  const submitDailyLog = async () => {
    const payload = {
      ...dailyLog,
      user_id: userId,
      body_weight_kg: Number(dailyLog.body_weight_kg),
      water_liters: Number(dailyLog.water_liters),
      sleep_hours: Number(dailyLog.sleep_hours),
      steps: Number(dailyLog.steps),
    };

    if (!navigator.onLine) {
      queueOfflineAction({
        url: "/daily-log",
        payload,
        type: "daily-log",
      });

      alert("You are offline. Daily log saved locally and will sync later.");
      setShowDailySheet(false);
      return;
    }

    try {
      await axios.post(`${API}/daily-log`, payload);
      await refreshAll();
      setShowDailySheet(false);
      alert("Daily log added successfully!");
    } catch (error) {
      console.error(error);

      queueOfflineAction({
        url: "/daily-log",
        payload,
        type: "daily-log",
      });

      alert("Network issue. Daily log saved locally and will sync later.");
    }
  };

  const deleteDailyLog = async (id) => {
    try {
      await axios.delete(`${API}/daily-log/${id}`);
      await refreshAll();
    } catch (error) {
      console.error(error);
      alert("Daily log could not be deleted.");
    }
  };

  const saveProfile = async () => {
    await axios.put(`${API}/profile/${userId}`, {
      ...profile,
      height_cm: Number(profile.height_cm),
      weight_kg: Number(profile.weight_kg),
      calorie_goal: Number(profile.calorie_goal),
      protein_goal: Number(profile.protein_goal),
      carbs_goal: Number(profile.carbs_goal),
      fat_goal: Number(profile.fat_goal),
      water_goal: Number(profile.water_goal),
      steps_goal: Number(profile.steps_goal),
      sleep_goal: Number(profile.sleep_goal),
    });

    await refreshAll();
    alert("Profile saved!");
  };

  const fetchExerciseProgress = async () => {
    if (!exerciseSearch) {
      alert("Enter an exercise name first.");
      return;
    }

    const response = await axios.get(
      `${API}/progress/exercise/${userId}/${exerciseSearch}`
    );

    setProgressData(response.data || []);
  };

  const fetchWeightProgress = async () => {
    const response = await axios.get(`${API}/progress/body-weight/${userId}`);
    setWeightData(response.data || []);
  };

  const fetchMacroProgress = async () => {
    const response = await axios.get(`${API}/progress/macros/${userId}`);
    setMacroData(response.data || []);
  };

  const exportReport = (format) => {
    window.open(`${API}/reports/export/${userId}?format=${format}`, "_blank");
  };

  const addFriend = async () => {
    if (!friendUsername.trim()) return;

    const response = await axios.post(`${API}/friends/add`, {
      user_id: userId,
      friend_username: friendUsername,
    });

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

  const logout = () => {
    localStorage.removeItem("fitnessUser");
    localStorage.removeItem("fitnessToken");
    setUser(null);
  };

  const sortedWorkouts = [...workoutHistory]
    .filter((item) => {
      const search = workoutSearch.toLowerCase();

      return (
        item.muscle_group?.toLowerCase().includes(search) ||
        item.exercises?.some((exercise) =>
          exercise.exercise_name?.toLowerCase().includes(search)
        )
      );
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const currentExercise =
    workout.exercises[activeExerciseIndex] || workout.exercises[0];

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }
    return (
    <div className="app">
      <header className="top-header">
        <div>
          <h1>Fitness Tracker</h1>
          <p>
            Welcome back, {user.username} · {isOnline ? "Online" : "Offline"} ·
            Pending sync: {pendingSyncCount}
          </p>
        </div>

        <div className="user-pill">
          <span>{user.username}</span>
          <button className="secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="mobile-bottom-nav">
        <button onClick={() => setActivePage("dashboard")}>
          🏠
          <span>Home</span>
        </button>

        <button onClick={() => setActivePage("workouts")}>
          🏋️
          <span>Workout</span>
        </button>

        <button onClick={() => setActivePage("meals")}>
          🍽️
          <span>Meals</span>
        </button>

        <button onClick={() => setActivePage("progress")}>
          📈
          <span>Progress</span>
        </button>

        <button onClick={() => setActivePage("social")}>
          👥
          <span>Social</span>
        </button>

        <button onClick={() => setActivePage("profile")}>
          ⚙️
          <span>More</span>
        </button>
      </nav>

      {pendingSyncCount > 0 && (
        <div className="sync-status">
          <span className={isOnline ? "online-dot" : "offline-dot"}></span>
          {pendingSyncCount} item(s) waiting to sync
          <button className="secondary tiny-button" onClick={syncPendingActions}>
            Sync Now
          </button>
        </div>
      )}

      {activePage === "dashboard" && (
        <main className="grid">
          <section className="hero-card full-width">
            <div>
              <span className="hero-label">Today</span>
              <h2>{totals.calories || 0} cal</h2>
              <p>
                Protein {totals.protein_g || 0}g · Meals {mealList.length} ·{" "}
                {todayWorkout ? todayWorkout.muscle_group : "No workout yet"}
              </p>
            </div>

            <div className="quick-actions">
              <button onClick={() => setShowWorkoutSheet(true)}>
                🏋️ Log Workout
              </button>
              <button onClick={() => setShowMealSheet(true)}>🍽️ Add Meal</button>
              <button onClick={() => setShowDailySheet(true)}>📝 Daily Log</button>
              <button onClick={() => setShowMoreDashboard(!showMoreDashboard)}>
                {showMoreDashboard ? "Less" : "More"}
              </button>
            </div>
          </section>

          {visibleWidgets.rings && (
            <section className="dashboard full-width">
              <ProgressRing
                label="Calories"
                value={totals.calories}
                goal={profile.calorie_goal}
                unit="cal"
              />
              <ProgressRing
                label="Protein"
                value={totals.protein_g}
                goal={profile.protein_goal}
                unit="g"
              />
              <ProgressRing
                label="Water"
                value={todayLog.water_liters || 0}
                goal={profile.water_goal}
                unit="L"
              />
              <ProgressRing
                label="Steps"
                value={todayLog.steps || 0}
                goal={profile.steps_goal}
                unit="steps"
              />
              <ProgressRing
                label="Sleep"
                value={todayLog.sleep_hours || 0}
                goal={profile.sleep_goal}
                unit="hrs"
              />
            </section>
          )}

          <section className="card">
            <div className="section-title-row">
              <h2>Smart Insights</h2>
              <button className="secondary tiny-button" onClick={fetchAnalytics}>
                Refresh
              </button>
            </div>

            {insights.length === 0 ? (
              <p className="muted">No insights yet.</p>
            ) : (
              <ul className="insight-list">
                {insights.slice(0, 4).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Streaks</h2>
            <div className="streak-grid">
              <div>
                <strong>{streaks.workout_streak || 0}</strong>
                <span>Workout</span>
              </div>
              <div>
                <strong>{streaks.protein_streak || 0}</strong>
                <span>Protein</span>
              </div>
              <div>
                <strong>{streaks.water_streak || 0}</strong>
                <span>Water</span>
              </div>
              <div>
                <strong>{streaks.sleep_streak || 0}</strong>
                <span>Sleep</span>
              </div>
            </div>
          </section>

          {showMoreDashboard && (
            <>
              <section className="card full-width">
                <h2>Workout Calendar Heatmap</h2>
                <Heatmap data={heatmap} />
              </section>

              <section className="card full-width">
                <h2>Weekly Overview</h2>
                <div className="summary-grid">
                  <div>
                    <strong>{weeklyAnalytics.summary?.total_workouts || 0}</strong>
                    <span>Workouts</span>
                  </div>
                  <div>
                    <strong>{weeklyAnalytics.summary?.total_volume || 0}</strong>
                    <span>Total Volume</span>
                  </div>
                  <div>
                    <strong>{weeklyAnalytics.summary?.avg_protein || 0}g</strong>
                    <span>Avg Protein</span>
                  </div>
                  <div>
                    <strong>{weeklyAnalytics.summary?.avg_sleep || 0}h</strong>
                    <span>Avg Sleep</span>
                  </div>
                </div>
              </section>

              <section className="card full-width">
                <h2>Achievements</h2>
                <p className="muted">
                  Unlocked {achievements.unlocked_count} of{" "}
                  {achievements.total_count}
                </p>

                <div className="badge-grid">
                  {achievements.achievements?.map((badge) => (
                    <div
                      key={badge.name}
                      className={badge.unlocked ? "badge unlocked" : "badge locked"}
                    >
                      <strong>{badge.unlocked ? "🏆" : "🔒"} {badge.name}</strong>
                      <span>{badge.description}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card full-width">
                <h2>Widget Settings</h2>
                <div className="widget-toggle-grid">
                  {Object.keys(visibleWidgets).map((key) => (
                    <button
                      key={key}
                      className={visibleWidgets[key] ? "" : "secondary"}
                      onClick={() => toggleWidget(key)}
                    >
                      {visibleWidgets[key] ? "Show" : "Hide"} {key}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      )}

      {activePage === "meals" && (
        <main className="grid">
          <section className="card full-width">
            <div className="section-title-row">
              <h2>Today's Meals</h2>
              <button
                onClick={() => {
                  resetMealForm();
                  setShowMealSheet(true);
                }}
              >
                + Add
              </button>
            </div>

            <div className="summary-grid">
              <div>
                <strong>{totals.calories || 0}</strong>
                <span>Calories</span>
              </div>
              <div>
                <strong>{totals.protein_g || 0}g</strong>
                <span>Protein</span>
              </div>
              <div>
                <strong>{totals.carbs_g || 0}g</strong>
                <span>Carbs</span>
              </div>
              <div>
                <strong>{totals.fat_g || 0}g</strong>
                <span>Fat</span>
              </div>
            </div>
          </section>

          <section className="card full-width">
            {mealList.length === 0 ? (
              <p className="muted">No meals logged yet.</p>
            ) : (
              mealList.map((item) => (
                <div key={item.id} className="history-item compact-history">
                  <div>
                    <h3>{item.food_name}</h3>
                    <p>{item.meal_type}</p>
                    <p>
                      {item.calories} cal · {item.protein_g}g protein ·{" "}
                      {item.carbs_g}g carbs · {item.fat_g}g fat
                    </p>
                  </div>

                  <div className="row-buttons">
                    <button className="secondary tiny-button" onClick={() => startEditMeal(item)}>
                      Edit
                    </button>
                    <button className="danger tiny-button" onClick={() => deleteMeal(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      )}

      {activePage === "workouts" && (
        <main className="grid">
          <section className="card full-width">
            <div className="section-title-row">
              <h2>Workouts</h2>
              <button onClick={() => setShowWorkoutSheet(true)}>Start Workout</button>
            </div>

            <input
              placeholder="Search workout or exercise"
              value={workoutSearch}
              onChange={(e) => setWorkoutSearch(e.target.value)}
            />
          </section>

          <section className="card full-width">
            {sortedWorkouts.length === 0 ? (
              <p className="muted">No workouts logged yet.</p>
            ) : (
              sortedWorkouts.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="section-title-row">
                    <div>
                      <h3>{item.muscle_group}</h3>
                      <p>{item.date}</p>
                      {item.notes && <p>{item.notes}</p>}
                    </div>

                    <button className="danger tiny-button" onClick={() => deleteWorkout(item.id)}>
                      Delete
                    </button>
                  </div>

                  {item.exercises?.map((exercise, index) => (
                    <div key={index} className="exercise-box">
                      <h4>{exercise.exercise_name}</h4>
                      <p>Target: {exercise.muscle_targeted}</p>
                      {exercise.exercise_note && <p>Note: {exercise.exercise_note}</p>}

                      {exercise.sets?.map((set, setIndex) => (
                        <p key={setIndex}>
                          Set {set.set_number}: {set.reps} reps x {set.weight}{" "}
                          {set.weight_unit} · Volume:{" "}
                          {set.volume || set.reps * set.weight}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>
        </main>
      )}
            {activePage === "progress" && (
        <main className="grid">
          <section className="card full-width">
            <h2>Progress Center</h2>

            <div className="quick-actions">
              <button onClick={fetchWeightProgress}>Body Weight</button>
              <button onClick={fetchMacroProgress}>Macros</button>
              <button onClick={fetchAnalytics}>Records</button>
              <button onClick={() => exportReport("csv")}>Export CSV</button>
            </div>
          </section>

          <section className="card full-width">
            <h2>Exercise Progress</h2>
            <input
              placeholder="Type exercise name, e.g. Leg Press"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
            />
            <button onClick={fetchExerciseProgress}>Show Exercise Progress</button>

            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="#38bdf8" />
                  <Line type="monotone" dataKey="volume" stroke="#22c55e" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card full-width">
            <h2>Body Weight Progress</h2>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weightData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="body_weight_kg" stroke="#38bdf8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card full-width">
            <h2>Macro Progress</h2>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={macroData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="calories" stroke="#38bdf8" />
                  <Line type="monotone" dataKey="protein_g" stroke="#22c55e" />
                  <Line type="monotone" dataKey="carbs_g" stroke="#f59e0b" />
                  <Line type="monotone" dataKey="fat_g" stroke="#ef4444" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card full-width">
            <h2>Personal Records</h2>
            {personalRecords.length === 0 ? (
              <p className="muted">No personal records yet.</p>
            ) : (
              <div className="pr-grid">
                {personalRecords.map((record) => (
                  <div key={record.exercise_name} className="pr-card">
                    <h3>{record.exercise_name}</h3>
                    <p>
                      Max Weight: <strong>{record.max_weight} lbs</strong>
                    </p>
                    <p>Best Set: {record.best_set || "N/A"}</p>
                    <p>Best Reps: {record.best_reps}</p>
                    <p>Best Volume: {record.best_volume}</p>
                    <span>{record.date}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card full-width">
            <h2>Workout Split Analytics</h2>
            <p className="muted">{splitAnalytics.summary?.message}</p>

            <div className="summary-grid">
              {splitAnalytics.splits?.map((item) => (
                <div key={item.split}>
                  <strong>{item.count}</strong>
                  <span>
                    {item.split} · {item.percent}%
                  </span>
                </div>
              ))}
            </div>

            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={splitAnalytics.splits || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="split" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card full-width">
            <h2>Volume Leaderboards</h2>

            <div className="leaderboard-grid">
              {leaderboard.exercises?.slice(0, 8).map((item, index) => (
                <div className="leaderboard-row" key={item.exercise}>
                  <strong>
                    #{index + 1} {item.exercise}
                  </strong>
                  <span>
                    {item.volume} volume · {item.sets} sets
                  </span>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {activePage === "social" && (
        <main className="grid">
          <section className="card">
            <h2>Add Friends</h2>
            <p className="muted">
              Add another username, then compare PRs, volume, streaks, and body
              weight trends.
            </p>

            <label>Friend Username</label>
            <input
              placeholder="example: default"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
            />

            <button onClick={addFriend}>Add Friend</button>
          </section>

          <section className="card">
            <h2>Your Friends</h2>

            {friends.length === 0 ? (
              <p className="muted">No friends yet. Create another account and add that username.</p>
            ) : (
              friends.map((friend) => (
                <div className="friend-card" key={friend.user_id}>
                  <h3>{friend.username}</h3>
                  <p>Total Volume: {friend.total_volume}</p>
                  <p>Workout Streak: {friend.workout_streak}</p>
                  <p>Max PR: {friend.max_pr} lbs</p>
                  <button
                    onClick={() => {
                      setSelectedFriendId(friend.user_id);
                      compareFriend(friend.user_id);
                    }}
                  >
                    Compare
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="card full-width">
            <h2>Friend Leaderboards</h2>

            <div className="leaderboard-columns">
              <div>
                <h3>Total Volume</h3>
                {friendLeaderboards.volume?.map((item, index) => (
                  <p key={item.user_id}>
                    #{index + 1} {item.username}: {item.total_volume}
                  </p>
                ))}
              </div>

              <div>
                <h3>Weekly Volume</h3>
                {friendLeaderboards.weekly_volume?.map((item, index) => (
                  <p key={item.user_id}>
                    #{index + 1} {item.username}: {item.weekly_volume}
                  </p>
                ))}
              </div>

              <div>
                <h3>Streaks</h3>
                {friendLeaderboards.streaks?.map((item, index) => (
                  <p key={item.user_id}>
                    #{index + 1} {item.username}: {item.workout_streak} days
                  </p>
                ))}
              </div>

              <div>
                <h3>Max PR</h3>
                {friendLeaderboards.prs?.map((item, index) => (
                  <p key={item.user_id}>
                    #{index + 1} {item.username}: {item.max_pr} lbs
                  </p>
                ))}
              </div>
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
                    <LineChart
                      data={[
                        ...(friendCompare.your_body_weight || []).map((x) => ({
                          date: x.date,
                          you: x.body_weight_kg,
                        })),
                        ...(friendCompare.friend_body_weight || []).map((x) => ({
                          date: x.date,
                          friend: x.body_weight_kg,
                        })),
                      ]}
                    >
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
        <main className="grid">
          <section className="card">
            <h2>Profile & Goals</h2>

            <label>Height cm</label>
            <input
              type="number"
              value={profile.height_cm}
              onChange={(e) => setProfile({ ...profile, height_cm: e.target.value })}
            />

            <label>Current Weight kg</label>
            <input
              type="number"
              value={profile.weight_kg}
              onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value })}
            />

            <label>Goal</label>
            <input
              value={profile.goal}
              onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
            />

            <label>Calories Goal</label>
            <input
              type="number"
              value={profile.calorie_goal}
              onChange={(e) => setProfile({ ...profile, calorie_goal: e.target.value })}
            />

            <label>Protein Goal g</label>
            <input
              type="number"
              value={profile.protein_goal}
              onChange={(e) => setProfile({ ...profile, protein_goal: e.target.value })}
            />

            <label>Carbs Goal g</label>
            <input
              type="number"
              value={profile.carbs_goal}
              onChange={(e) => setProfile({ ...profile, carbs_goal: e.target.value })}
            />

            <label>Fat Goal g</label>
            <input
              type="number"
              value={profile.fat_goal}
              onChange={(e) => setProfile({ ...profile, fat_goal: e.target.value })}
            />

            <label>Water Goal L</label>
            <input
              type="number"
              value={profile.water_goal}
              onChange={(e) => setProfile({ ...profile, water_goal: e.target.value })}
            />

            <label>Steps Goal</label>
            <input
              type="number"
              value={profile.steps_goal}
              onChange={(e) => setProfile({ ...profile, steps_goal: e.target.value })}
            />

            <label>Sleep Goal hours</label>
            <input
              type="number"
              value={profile.sleep_goal}
              onChange={(e) => setProfile({ ...profile, sleep_goal: e.target.value })}
            />

            <button onClick={saveProfile}>Save Profile</button>
          </section>

          <section className="card">
            <h2>More Tools</h2>
            <button onClick={() => setShowDailySheet(true)}>Daily Log</button>
            <button className="secondary" onClick={() => exportReport("csv")}>
              Export CSV
            </button>
            <button className="secondary" onClick={() => exportReport("txt")}>
              Export TXT Summary
            </button>
            <button className="secondary" onClick={refreshAll}>
              Refresh App Data
            </button>
          </section>
        </main>
      )}
            {showMealSheet && (
        <div className="sheet-overlay">
          <div className="bottom-sheet">
            <div className="sheet-header">
              <h2>{editingMealId ? "Edit Meal" : "Add Meal"}</h2>
              <button
                className="secondary"
                onClick={() => {
                  setShowMealSheet(false);
                  resetMealForm();
                }}
              >
                Close
              </button>
            </div>

            <label>Date</label>
            <input
              type="date"
              value={meal.date}
              onChange={(e) => setMeal({ ...meal, date: e.target.value })}
            />

            <label>Meal Type</label>
            <input
              placeholder="Breakfast, lunch, dinner, snack"
              value={meal.meal_type}
              onChange={(e) => setMeal({ ...meal, meal_type: e.target.value })}
            />

            <label>Food Name</label>
            <input
              placeholder="Chicken rice, eggs, protein shake..."
              value={meal.food_name}
              onChange={(e) => setMeal({ ...meal, food_name: e.target.value })}
            />

            <div className="set-row">
              <div>
                <label>Calories</label>
                <input
                  type="number"
                  value={meal.calories}
                  onChange={(e) => setMeal({ ...meal, calories: e.target.value })}
                />
              </div>

              <div>
                <label>Protein g</label>
                <input
                  type="number"
                  value={meal.protein_g}
                  onChange={(e) => setMeal({ ...meal, protein_g: e.target.value })}
                />
              </div>
            </div>

            <div className="set-row">
              <div>
                <label>Carbs g</label>
                <input
                  type="number"
                  value={meal.carbs_g}
                  onChange={(e) => setMeal({ ...meal, carbs_g: e.target.value })}
                />
              </div>

              <div>
                <label>Fat g</label>
                <input
                  type="number"
                  value={meal.fat_g}
                  onChange={(e) => setMeal({ ...meal, fat_g: e.target.value })}
                />
              </div>
            </div>

            <button onClick={submitMeal}>
              {editingMealId ? "Update Meal" : "Save Meal"}
            </button>
          </div>
        </div>
      )}

      {showDailySheet && (
        <div className="sheet-overlay">
          <div className="bottom-sheet">
            <div className="sheet-header">
              <h2>Daily Log</h2>
              <button
                className="secondary"
                onClick={() => setShowDailySheet(false)}
              >
                Close
              </button>
            </div>

            <label>Date</label>
            <input
              type="date"
              value={dailyLog.date}
              onChange={(e) =>
                setDailyLog({ ...dailyLog, date: e.target.value })
              }
            />

            <div className="set-row">
              <div>
                <label>Weight kg</label>
                <input
                  type="number"
                  value={dailyLog.body_weight_kg}
                  onChange={(e) =>
                    setDailyLog({ ...dailyLog, body_weight_kg: e.target.value })
                  }
                />
              </div>

              <div>
                <label>Water L</label>
                <input
                  type="number"
                  value={dailyLog.water_liters}
                  onChange={(e) =>
                    setDailyLog({ ...dailyLog, water_liters: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="set-row">
              <div>
                <label>Sleep hrs</label>
                <input
                  type="number"
                  value={dailyLog.sleep_hours}
                  onChange={(e) =>
                    setDailyLog({ ...dailyLog, sleep_hours: e.target.value })
                  }
                />
              </div>

              <div>
                <label>Steps</label>
                <input
                  type="number"
                  value={dailyLog.steps}
                  onChange={(e) =>
                    setDailyLog({ ...dailyLog, steps: e.target.value })
                  }
                />
              </div>
            </div>

            <label>Notes</label>
            <textarea
              value={dailyLog.notes}
              onChange={(e) =>
                setDailyLog({ ...dailyLog, notes: e.target.value })
              }
            />

            <button onClick={submitDailyLog}>Save Daily Log</button>
          </div>
        </div>
      )}

      {showWorkoutSheet && (
        <div className="sheet-overlay">
          <div className="bottom-sheet large-sheet">
            <div className="sheet-header">
              <h2>Workout Builder</h2>
              <button
                className="secondary"
                onClick={() => setShowWorkoutSheet(false)}
              >
                Close
              </button>
            </div>

            <RestTimer />

            <label>Date</label>
            <input
              type="date"
              name="date"
              value={workout.date}
              onChange={handleWorkoutChange}
            />

            <label>Workout Type</label>
            <select
              name="workout_type"
              value={workout.workout_type}
              onChange={handleWorkoutChange}
            >
              <option value="push">Push Day</option>
              <option value="pull">Pull Day</option>
              <option value="legs">Leg Day</option>
              <option value="chest">Chest Day</option>
              <option value="custom">Custom Day</option>
            </select>

            <label>Workout Name</label>
            <input
              name="muscle_group"
              value={workout.muscle_group}
              onChange={handleWorkoutChange}
            />

            <div className="exercise-stepper">
              {workout.exercises.map((exercise, index) => (
                <button
                  key={index}
                  className={
                    activeExerciseIndex === index
                      ? "step-chip active-step"
                      : exercise.saved
                      ? "step-chip saved-step"
                      : "step-chip"
                  }
                  onClick={() => setActiveExerciseIndex(index)}
                >
                  {exercise.saved ? "✓ " : ""}
                  {index + 1}
                </button>
              ))}
            </div>

            {currentExercise && (
              <div className="exercise-entry active-exercise-card">
                <div className="section-title-row">
                  <div>
                    <h3>Exercise {activeExerciseIndex + 1}</h3>
                    <p className="muted">
                      Fill this exercise, save it, then move to the next one.
                    </p>
                  </div>

                  <button
                    className="danger tiny-button"
                    onClick={() => removeExercise(activeExerciseIndex)}
                  >
                    Delete
                  </button>
                </div>

                <label>Exercise Name</label>
                <select
                  value={currentExercise.exercise_name}
                  onChange={(e) =>
                    updateExercise(
                      activeExerciseIndex,
                      "exercise_name",
                      e.target.value
                    )
                  }
                >
                  <option value="">Select Exercise</option>
                  {exerciseOptions[workout.workout_type]?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                {currentExercise.exercise_name === "Other" && (
                  <>
                    <label>Custom Exercise Name</label>
                    <input
                      value={currentExercise.custom_exercise_name || ""}
                      onChange={(e) =>
                        updateExercise(
                          activeExerciseIndex,
                          "custom_exercise_name",
                          e.target.value
                        )
                      }
                    />

                    <label>Muscle Targeted</label>
                    <input
                      value={currentExercise.muscle_targeted || ""}
                      onChange={(e) =>
                        updateExercise(
                          activeExerciseIndex,
                          "muscle_targeted",
                          e.target.value
                        )
                      }
                    />
                  </>
                )}

                {currentExercise.exercise_name !== "Other" && (
                  <p className="auto-fill-text">
                    Muscle Targeted:{" "}
                    <strong>
                      {currentExercise.muscle_targeted || "Auto-filled"}
                    </strong>
                  </p>
                )}

                <label>Exercise Notes</label>
                <textarea
                  placeholder="Form notes, pain, tempo, next-week reminder..."
                  value={currentExercise.exercise_note || ""}
                  onChange={(e) =>
                    updateExercise(
                      activeExerciseIndex,
                      "exercise_note",
                      e.target.value
                    )
                  }
                />

                <div className="sets-section">
                  <div className="section-title-row">
                    <h3>Sets</h3>
                    <button
                      className="secondary tiny-button"
                      onClick={() => addSet(activeExerciseIndex)}
                    >
                      + Set
                    </button>
                  </div>

                  {currentExercise.sets.map((set, setIndex) => (
                    <div key={setIndex} className="set-card">
                      <div className="set-card-title">
                        <strong>Set {set.set_number}</strong>
                        {currentExercise.sets.length > 1 && (
                          <button
                            className="danger tiny-button"
                            onClick={() =>
                              removeSet(activeExerciseIndex, setIndex)
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="set-row">
                        <div>
                          <label>Reps</label>
                          <input
                            type="number"
                            value={set.reps}
                            onChange={(e) =>
                              updateSet(
                                activeExerciseIndex,
                                setIndex,
                                "reps",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <label>Weight</label>
                          <input
                            type="number"
                            value={set.weight}
                            onChange={(e) =>
                              updateSet(
                                activeExerciseIndex,
                                setIndex,
                                "weight",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sticky-action-row">
                  <button
                    className="secondary"
                    onClick={saveCurrentExerciseAndNext}
                  >
                    Save Exercise & Next
                  </button>

                  <button onClick={addExercise}>+ Add Exercise</button>
                </div>
              </div>
            )}

            <label>Workout Notes</label>
            <textarea
              name="notes"
              value={workout.notes}
              onChange={handleWorkoutChange}
            />

            <button className="save-workout-button" onClick={submitWorkout}>
              Save Full Workout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;