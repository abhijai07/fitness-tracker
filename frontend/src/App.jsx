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
    "Chest Press Machine",
    "Incline Chest Press Machine",
    "Pec Deck Fly Machine",
    "Shoulder Press Machine",
    "Lateral Raises",
    "Tricep Extension Machine",
    "Other",
  ],
  pull: [
    "Close Grip Lat Pull Down",
    "Chest Supported Row Machine",
    "Rear Delt Machine",
    "Preacher Curl Machine",
    "Hammer Curl",
    "Other",
  ],
  legs: [
    "Leg Press",
    "Hack Squat",
    "Leg Extension",
    "Seated/Lying Leg Curl Machine",
    "Sitting Calf Raise",
    "Abductor",
    "Adductor",
    "Other",
  ],
  custom: ["Other"],
};

const muscleTargets = {
  "Chest Press Machine": "Chest",
  "Incline Chest Press Machine": "Upper Chest",
  "Pec Deck Fly Machine": "Chest",
  "Shoulder Press Machine": "Shoulders",
  "Lateral Raises": "Shoulders",
  "Tricep Extension Machine": "Triceps",
  "Close Grip Lat Pull Down": "Back",
  "Chest Supported Row Machine": "Back",
  "Rear Delt Machine": "Rear Delts",
  "Preacher Curl Machine": "Biceps",
  "Hammer Curl": "Biceps",
  "Leg Press": "Quads",
  "Hack Squat": "Quads",
  "Leg Extension": "Quads",
  "Seated/Lying Leg Curl Machine": "Hamstrings",
  "Sitting Calf Raise": "Calves",
  "Abductor": "Glutes",
  "Adductor": "Adductors",
};

const emptyExercise = {
  exercise_name: "",
  custom_exercise_name: "",
  muscle_targeted: "",
  exercise_note: "",
  sets: [{ set_number: 1, reps: "", weight: "" }],
};

function App() {
  const savedUser = localStorage.getItem("fitnessUser");

  const [user, setUser] = useState(
    savedUser ? JSON.parse(savedUser) : null
  );

  const userId = user?.id || 1;

  const [activePage, setActivePage] = useState("dashboard");

  const [showMealSheet, setShowMealSheet] = useState(false);

  const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(false);

  const [selectedExerciseIndex, setSelectedExerciseIndex] =
    useState(null);

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

  const [workout, setWorkout] = useState({
    user_id: userId,
    date: today,
    workout_type: "push",
    muscle_group: "Push Day",
    notes: "",
    exercises: [{ ...emptyExercise }],
  });

  const [mealList, setMealList] = useState([]);

  const [workoutHistory, setWorkoutHistory] = useState([]);

  const [totals, setTotals] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  });

  const [profile, setProfile] = useState({
    calorie_goal: 2700,
    protein_goal: 150,
  });

  const fetchMeals = async () => {
    const response = await axios.get(
      `${API}/meals/${userId}/${today}`
    );

    setMealList(response.data.meals || []);
    setTotals(response.data.totals || {});
  };

  const fetchWorkouts = async () => {
    const response = await axios.get(
      `${API}/workouts/details/${userId}`
    );

    setWorkoutHistory(response.data || []);
  };

  const refreshAll = async () => {
    await Promise.all([fetchMeals(), fetchWorkouts()]);
  };

  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user]);

  const submitMeal = async () => {
    const payload = {
      ...meal,
      user_id: userId,
      calories: Number(meal.calories),
      protein_g: Number(meal.protein_g),
      carbs_g: Number(meal.carbs_g),
      fat_g: Number(meal.fat_g),
    };

    await axios.post(`${API}/meals`, payload);

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

    setShowMealSheet(false);

    refreshAll();
  };

  const updateExercise = (index, field, value) => {
    const exercises = [...workout.exercises];

    exercises[index][field] = value;

    if (field === "exercise_name") {
      exercises[index].muscle_targeted =
        muscleTargets[value] || "";
    }

    setWorkout({
      ...workout,
      exercises,
    });
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    const exercises = [...workout.exercises];

    exercises[exerciseIndex].sets[setIndex][field] = value;

    setWorkout({
      ...workout,
      exercises,
    });
  };

  const addExercise = () => {
    setWorkout({
      ...workout,
      exercises: [
        ...workout.exercises,
        { ...emptyExercise },
      ],
    });
  };

  const addSet = (exerciseIndex) => {
    const exercises = [...workout.exercises];

    exercises[exerciseIndex].sets.push({
      set_number:
        exercises[exerciseIndex].sets.length + 1,
      reps: "",
      weight: "",
    });

    setWorkout({
      ...workout,
      exercises,
    });
  };

  const submitWorkout = async () => {
    const payload = {
      ...workout,
      user_id: userId,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          reps: Number(set.reps),
          weight: Number(set.weight),
        })),
      })),
    };

    await axios.post(`${API}/workouts`, payload);

    setShowWorkoutBuilder(false);

    setWorkout({
      user_id: userId,
      date: today,
      workout_type: "push",
      muscle_group: "Push Day",
      notes: "",
      exercises: [{ ...emptyExercise }],
    });

    refreshAll();
  };

  const logout = () => {
    localStorage.removeItem("fitnessUser");
    localStorage.removeItem("fitnessToken");

    setUser(null);
  };

  if (!user) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>Fitness Tracker</h1>

          <p className="muted">
            Login system already connected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">

      <header className="mobile-header">

        <div>
          <h1>Fitness Tracker</h1>

          <p className="muted">
            Welcome back, {user.username}
          </p>
        </div>

        <button
          className="secondary"
          onClick={logout}
        >
          Logout
        </button>

      </header>

      <main className="mobile-content">

        {activePage === "dashboard" && (
          <>
            <section className="hero-card">

              <div className="hero-top">
                <div>
                  <span className="hero-label">
                    Today's Calories
                  </span>

                  <h2>
                    {totals.calories || 0}
                  </h2>
                </div>

                <div className="hero-goal">
                  / {profile.calorie_goal}
                </div>
              </div>

              <div className="macro-row">

                <div className="macro-pill">
                  Protein
                  <strong>
                    {totals.protein_g || 0}g
                  </strong>
                </div>

                <div className="macro-pill">
                  Carbs
                  <strong>
                    {totals.carbs_g || 0}g
                  </strong>
                </div>

                <div className="macro-pill">
                  Fat
                  <strong>
                    {totals.fat_g || 0}g
                  </strong>
                </div>

              </div>

            </section>

            <section className="quick-actions">

              <button
                className="action-card"
                onClick={() =>
                  setShowWorkoutBuilder(true)
                }
              >
                🏋️
                <span>Log Workout</span>
              </button>

              <button
                className="action-card"
                onClick={() =>
                  setShowMealSheet(true)
                }
              >
                🍽️
                <span>Add Meal</span>
              </button>

            </section>

            <section className="card">

              <div className="section-title-row">
                <h2>Recent Workouts</h2>
              </div>

              <div className="compact-list">

                {workoutHistory
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="compact-item"
                    >
                      <div>
                        <strong>
                          {item.muscle_group}
                        </strong>

                        <p>{item.date}</p>
                      </div>

                      <span>
                        {
                          item.exercises?.length
                        }{" "}
                        exercises
                      </span>
                    </div>
                  ))}

              </div>

            </section>
          </>
        )}

                {activePage === "meals" && (
          <>
            <section className="card">

              <div className="section-title-row">
                <h2>Today's Meals</h2>

                <button
                  onClick={() =>
                    setShowMealSheet(true)
                  }
                >
                  + Add
                </button>
              </div>

              <div className="compact-list">

                {mealList.length === 0 && (
                  <p className="muted">
                    No meals logged yet.
                  </p>
                )}

                {mealList.map((item) => (
                  <div
                    key={item.id}
                    className="meal-card"
                  >
                    <div>
                      <strong>
                        {item.food_name}
                      </strong>

                      <p>
                        {item.meal_type}
                      </p>
                    </div>

                    <div className="meal-macros">
                      <span>
                        {item.calories} cal
                      </span>

                      <span>
                        {item.protein_g}P
                      </span>
                    </div>
                  </div>
                ))}

              </div>

            </section>
          </>
        )}

        {activePage === "workouts" && (
          <>
            <section className="card">

              <div className="section-title-row">

                <h2>Workout Builder</h2>

                <button
                  onClick={() =>
                    setShowWorkoutBuilder(true)
                  }
                >
                  Start
                </button>

              </div>

              <div className="compact-list">

                {workoutHistory
                  .slice(0, 10)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="workout-history-card"
                    >
                      <div>

                        <strong>
                          {item.muscle_group}
                        </strong>

                        <p>{item.date}</p>

                      </div>

                      <span>
                        {
                          item.exercises?.length
                        }{" "}
                        exercises
                      </span>
                    </div>
                  ))}

              </div>

            </section>
          </>
        )}

        {activePage === "progress" && (
          <>
            <section className="card">

              <h2>Progress Analytics</h2>

              <div className="chart-box">

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <LineChart
                    data={mealList.map((m) => ({
                      name: m.food_name,
                      calories: m.calories,
                    }))}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis dataKey="name" />

                    <YAxis />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="#38bdf8"
                    />
                  </LineChart>
                </ResponsiveContainer>

              </div>

            </section>
          </>
        )}

        {activePage === "social" && (
          <>
            <section className="card">

              <h2>Social</h2>

              <p className="muted">
                Friend system already connected
                to backend.
              </p>

            </section>
          </>
        )}

      </main>

      <nav className="mobile-bottom-nav">

        <button
          onClick={() =>
            setActivePage("dashboard")
          }
        >
          🏠
          <span>Home</span>
        </button>

        <button
          onClick={() =>
            setActivePage("workouts")
          }
        >
          🏋️
          <span>Workout</span>
        </button>

        <button
          onClick={() =>
            setActivePage("meals")
          }
        >
          🍽️
          <span>Meals</span>
        </button>

        <button
          onClick={() =>
            setActivePage("progress")
          }
        >
          📈
          <span>Progress</span>
        </button>

        <button
          onClick={() =>
            setActivePage("social")
          }
        >
          👥
          <span>Social</span>
        </button>

      </nav>

      {showMealSheet && (
        <div className="sheet-overlay">

          <div className="bottom-sheet">

            <div className="sheet-header">

              <h2>Add Meal</h2>

              <button
                className="secondary"
                onClick={() =>
                  setShowMealSheet(false)
                }
              >
                Close
              </button>

            </div>

            <div className="sheet-content">

              <label>Meal Type</label>

              <input
                value={meal.meal_type}
                onChange={(e) =>
                  setMeal({
                    ...meal,
                    meal_type: e.target.value,
                  })
                }
              />

              <label>Food Name</label>

              <input
                value={meal.food_name}
                onChange={(e) =>
                  setMeal({
                    ...meal,
                    food_name: e.target.value,
                  })
                }
              />

              <div className="inline-grid">

                <div>
                  <label>Calories</label>

                  <input
                    type="number"
                    value={meal.calories}
                    onChange={(e) =>
                      setMeal({
                        ...meal,
                        calories:
                          e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Protein</label>

                  <input
                    type="number"
                    value={meal.protein_g}
                    onChange={(e) =>
                      setMeal({
                        ...meal,
                        protein_g:
                          e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <button onClick={submitMeal}>
                Save Meal
              </button>

            </div>

          </div>

        </div>
      )}

      {showWorkoutBuilder && (
        <div className="sheet-overlay">

          <div className="bottom-sheet large-sheet">

            <div className="sheet-header">

              <h2>Workout Builder</h2>

              <button
                className="secondary"
                onClick={() =>
                  setShowWorkoutBuilder(false)
                }
              >
                Close
              </button>

            </div>

            <div className="sheet-content">

              <label>Workout Type</label>

              <select
                value={workout.workout_type}
                onChange={(e) =>
                  setWorkout({
                    ...workout,
                    workout_type:
                      e.target.value,
                  })
                }
              >
                <option value="push">
                  Push Day
                </option>

                <option value="pull">
                  Pull Day
                </option>

                <option value="legs">
                  Leg Day
                </option>

                <option value="custom">
                  Custom
                </option>
              </select>

              <div className="exercise-list">

                {workout.exercises.map(
                  (exercise, index) => (
                    <div
                      key={index}
                      className="exercise-tile"
                    >
                      <div
                        className="exercise-top"
                        onClick={() =>
                          setSelectedExerciseIndex(
                            selectedExerciseIndex ===
                              index
                              ? null
                              : index
                          )
                        }
                      >
                        <div>

                          <strong>
                            {exercise.exercise_name ||
                              `Exercise ${
                                index + 1
                              }`}
                          </strong>

                          <p>
                            {
                              exercise.muscle_targeted
                            }
                          </p>

                        </div>

                        <span>
                          {
                            exercise.sets.length
                          }{" "}
                          sets
                        </span>
                      </div>

                      {selectedExerciseIndex ===
                        index && (
                        <div className="exercise-expanded">

                          <label>
                            Exercise
                          </label>

                          <select
                            value={
                              exercise.exercise_name
                            }
                            onChange={(e) =>
                              updateExercise(
                                index,
                                "exercise_name",
                                e.target.value
                              )
                            }
                          >
                            <option value="">
                              Select Exercise
                            </option>

                            {exerciseOptions[
                              workout
                                .workout_type
                            ]?.map((option) => (
                              <option
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>
                            ))}
                          </select>

                          {exercise.sets.map(
                            (
                              set,
                              setIndex
                            ) => (
                              <div
                                key={setIndex}
                                className="set-row"
                              >

                                <div>
                                  <label>
                                    Reps
                                  </label>

                                  <input
                                    type="number"
                                    value={
                                      set.reps
                                    }
                                    onChange={(e) =>
                                      updateSet(
                                        index,
                                        setIndex,
                                        "reps",
                                        e.target
                                          .value
                                      )
                                    }
                                  />
                                </div>

                                <div>
                                  <label>
                                    Weight
                                  </label>

                                  <input
                                    type="number"
                                    value={
                                      set.weight
                                    }
                                    onChange={(e) =>
                                      updateSet(
                                        index,
                                        setIndex,
                                        "weight",
                                        e.target
                                          .value
                                      )
                                    }
                                  />
                                </div>

                              </div>
                            )
                          )}

                          <button
                            className="secondary"
                            onClick={() =>
                              addSet(index)
                            }
                          >
                            + Add Set
                          </button>

                        </div>
                      )}
                    </div>
                  )
                )}

              </div>

              <button
                className="secondary"
                onClick={addExercise}
              >
                + Add Exercise
              </button>

              <button onClick={submitWorkout}>
                Save Workout
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;