from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, datetime, timedelta
from collections import defaultdict, Counter
import hashlib
import secrets
import csv
import io
import models
import schemas
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fitness Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://fitness-tracker-1-c1f7.onrender.com",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_PROFILE = {
    "height_cm": 180,
    "weight_kg": 74,
    "goal": "maintain",
    "calorie_goal": 2700,
    "protein_goal": 150,
    "carbs_goal": 330,
    "fat_goal": 75,
    "water_goal": 3,
    "steps_goal": 10000,
    "sleep_goal": 8,
}

profile = DEFAULT_PROFILE.copy()
sessions = {}


def init_extra_tables():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS app_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS app_profiles (
                user_id INTEGER PRIMARY KEY,
                height_cm REAL DEFAULT 180,
                weight_kg REAL DEFAULT 74,
                goal TEXT DEFAULT 'maintain',
                calorie_goal REAL DEFAULT 2700,
                protein_goal REAL DEFAULT 150,
                carbs_goal REAL DEFAULT 330,
                fat_goal REAL DEFAULT 75,
                water_goal REAL DEFAULT 3,
                steps_goal REAL DEFAULT 10000,
                sleep_goal REAL DEFAULT 8
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS exercise_notes (
                exercise_id INTEGER PRIMARY KEY,
                note TEXT DEFAULT ''
            )
        """))
        existing = conn.execute(text("SELECT id FROM app_users WHERE username = 'default'" )).fetchone()
        if existing is None:
            default_hash = hashlib.sha256("password".encode()).hexdigest()
            conn.execute(
                text("INSERT INTO app_users (username, password_hash, created_at) VALUES (:u, :p, :c)"),
                {"u": "default", "p": default_hash, "c": datetime.now().isoformat()},
            )
            conn.execute(text("INSERT OR IGNORE INTO app_profiles (user_id) VALUES (1)"))


init_extra_tables()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def parse_date(value):
    if isinstance(value, date):
        return value
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


def row_to_profile(row):
    if row is None:
        return DEFAULT_PROFILE.copy()
    return {
        "height_cm": row.height_cm,
        "weight_kg": row.weight_kg,
        "goal": row.goal,
        "calorie_goal": row.calorie_goal,
        "protein_goal": row.protein_goal,
        "carbs_goal": row.carbs_goal,
        "fat_goal": row.fat_goal,
        "water_goal": row.water_goal,
        "steps_goal": row.steps_goal,
        "sleep_goal": row.sleep_goal,
    }


def get_user_profile(user_id: int):
    with engine.begin() as conn:
        conn.execute(text("INSERT OR IGNORE INTO app_profiles (user_id) VALUES (:uid)"), {"uid": user_id})
        row = conn.execute(text("SELECT * FROM app_profiles WHERE user_id = :uid"), {"uid": user_id}).fetchone()
    return row_to_profile(row)


def get_exercise_note(exercise_id: int):
    with engine.begin() as conn:
        row = conn.execute(text("SELECT note FROM exercise_notes WHERE exercise_id = :id"), {"id": exercise_id}).fetchone()
    return row.note if row else ""


def get_workout_details_data(user_id: int, db: Session):
    workouts = db.query(models.Workout).filter(models.Workout.user_id == user_id).all()
    result = []

    for workout in workouts:
        exercises = db.query(models.Exercise).filter(models.Exercise.workout_id == workout.id).all()
        exercise_list = []

        for exercise in exercises:
            sets = db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == exercise.id).all()
            exercise_list.append({
                "id": exercise.id,
                "exercise_name": exercise.exercise_name,
                "machine_name": exercise.machine_name,
                "muscle_targeted": exercise.muscle_targeted,
                "exercise_note": get_exercise_note(exercise.id),
                "sets": [
                    {
                        "set_number": s.set_number,
                        "reps": s.reps,
                        "weight": s.weight,
                        "weight_unit": s.weight_unit,
                        "volume": s.reps * s.weight,
                    }
                    for s in sets
                ],
            })

        result.append({
            "id": workout.id,
            "date": str(workout.date),
            "muscle_group": workout.muscle_group,
            "notes": workout.notes,
            "exercises": exercise_list,
        })

    return result


def get_daily_totals(user_id: int, db: Session):
    meals = db.query(models.Meal).filter(models.Meal.user_id == user_id).all()
    daily_totals = {}
    for meal in meals:
        date_key = str(meal.date)
        daily_totals.setdefault(date_key, {"date": date_key, "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0})
        daily_totals[date_key]["calories"] += meal.calories
        daily_totals[date_key]["protein_g"] += meal.protein_g
        daily_totals[date_key]["carbs_g"] += meal.carbs_g
        daily_totals[date_key]["fat_g"] += meal.fat_g
    return daily_totals


def calculate_streak(dates):
    if not dates:
        return 0
    unique_dates = sorted({parse_date(d) for d in dates}, reverse=True)
    current_day = date.today()
    if unique_dates[0] < current_day:
        current_day = unique_dates[0]
    streak = 0
    date_set = set(unique_dates)
    while current_day in date_set:
        streak += 1
        current_day -= timedelta(days=1)
    return streak


def all_workout_metrics(user_id: int, db: Session):
    workouts = get_workout_details_data(user_id, db)
    exercise_volume = defaultdict(float)
    exercise_sets = defaultdict(int)
    exercise_frequency = defaultdict(int)
    muscle_volume = defaultdict(float)
    muscle_frequency = defaultdict(int)
    split_counts = defaultdict(int)
    monthly_split_counts = defaultdict(int)
    total_volume = 0
    total_sets = 0
    total_reps = 0
    total_workouts = len(workouts)

    current_month = date.today().strftime("%Y-%m")

    for workout in workouts:
        split_counts[workout["muscle_group"]] += 1
        if workout["date"].startswith(current_month):
            monthly_split_counts[workout["muscle_group"]] += 1
        for exercise in workout["exercises"]:
            name = exercise["exercise_name"]
            muscle = exercise["muscle_targeted"] or workout["muscle_group"]
            exercise_frequency[name] += 1
            muscle_frequency[muscle] += 1
            for s in exercise["sets"]:
                volume = (s["weight"] or 0) * (s["reps"] or 0)
                exercise_volume[name] += volume
                muscle_volume[muscle] += volume
                exercise_sets[name] += 1
                total_volume += volume
                total_sets += 1
                total_reps += s["reps"] or 0

    return {
        "workouts": workouts,
        "exercise_volume": exercise_volume,
        "exercise_sets": exercise_sets,
        "exercise_frequency": exercise_frequency,
        "muscle_volume": muscle_volume,
        "muscle_frequency": muscle_frequency,
        "split_counts": split_counts,
        "monthly_split_counts": monthly_split_counts,
        "total_volume": total_volume,
        "total_sets": total_sets,
        "total_reps": total_reps,
        "total_workouts": total_workouts,
    }


@app.get("/")
def home():
    return {"message": "Fitness Tracker API is running"}


@app.post("/auth/register")
def register(payload: dict):
    username = str(payload.get("username", "")).strip().lower()
    password = str(payload.get("password", "")).strip()
    if not username or not password:
        return {"error": "Username and password are required"}
    with engine.begin() as conn:
        existing = conn.execute(text("SELECT id FROM app_users WHERE username = :u"), {"u": username}).fetchone()
        if existing:
            return {"error": "Username already exists"}
        conn.execute(
            text("INSERT INTO app_users (username, password_hash, created_at) VALUES (:u, :p, :c)"),
            {"u": username, "p": hash_password(password), "c": datetime.now().isoformat()},
        )
        user = conn.execute(text("SELECT id, username FROM app_users WHERE username = :u"), {"u": username}).fetchone()
        conn.execute(text("INSERT OR IGNORE INTO app_profiles (user_id) VALUES (:uid)"), {"uid": user.id})
    token = secrets.token_hex(24)
    sessions[token] = user.id
    return {"token": token, "user": {"id": user.id, "username": user.username}}


@app.post("/auth/login")
def login(payload: dict):
    username = str(payload.get("username", "")).strip().lower()
    password = str(payload.get("password", "")).strip()
    with engine.begin() as conn:
        user = conn.execute(text("SELECT id, username, password_hash FROM app_users WHERE username = :u"), {"u": username}).fetchone()
    if user is None or user.password_hash != hash_password(password):
        return {"error": "Invalid username or password"}
    token = secrets.token_hex(24)
    sessions[token] = user.id
    return {"token": token, "user": {"id": user.id, "username": user.username}}


@app.get("/auth/users")
def list_users():
    with engine.begin() as conn:
        users = conn.execute(text("SELECT id, username, created_at FROM app_users ORDER BY id")).fetchall()
    return [{"id": u.id, "username": u.username, "created_at": u.created_at} for u in users]


@app.get("/profile")
def get_profile():
    return profile


@app.get("/profile/{user_id}")
def get_profile_for_user(user_id: int):
    return get_user_profile(user_id)


@app.put("/profile")
def update_profile(updated_profile: dict):
    profile.update(updated_profile)
    return profile


@app.put("/profile/{user_id}")
def update_profile_for_user(user_id: int, updated_profile: dict):
    current = get_user_profile(user_id)
    current.update(updated_profile)
    with engine.begin() as conn:
        conn.execute(text("""
            UPDATE app_profiles SET
            height_cm=:height_cm, weight_kg=:weight_kg, goal=:goal,
            calorie_goal=:calorie_goal, protein_goal=:protein_goal,
            carbs_goal=:carbs_goal, fat_goal=:fat_goal, water_goal=:water_goal,
            steps_goal=:steps_goal, sleep_goal=:sleep_goal
            WHERE user_id=:user_id
        """), {**current, "user_id": user_id})
    return current


@app.post("/daily-log")
def create_daily_log(log: schemas.DailyLogCreate, db: Session = Depends(get_db)):
    db_log = models.DailyLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@app.get("/daily-logs/{user_id}")
def get_daily_logs(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.DailyLog).filter(models.DailyLog.user_id == user_id).all()


@app.delete("/daily-log/{log_id}")
def delete_daily_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.DailyLog).filter(models.DailyLog.id == log_id).first()
    if log is None:
        return {"error": "Daily log not found"}
    db.delete(log)
    db.commit()
    return {"message": "Daily log deleted successfully"}


@app.post("/meals")
def create_meal(meal: schemas.MealCreate, db: Session = Depends(get_db)):
    db_meal = models.Meal(**meal.dict())
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal


@app.get("/meals/{user_id}/{log_date}")
def get_meals(user_id: int, log_date: str, db: Session = Depends(get_db)):
    meals = db.query(models.Meal).filter(models.Meal.user_id == user_id, models.Meal.date == log_date).all()
    return {
        "meals": meals,
        "totals": {
            "calories": sum(meal.calories for meal in meals),
            "protein_g": sum(meal.protein_g for meal in meals),
            "carbs_g": sum(meal.carbs_g for meal in meals),
            "fat_g": sum(meal.fat_g for meal in meals),
        },
    }


@app.delete("/meals/{meal_id}")
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(models.Meal).filter(models.Meal.id == meal_id).first()
    if meal is None:
        return {"error": "Meal not found"}
    db.delete(meal)
    db.commit()
    return {"message": "Meal deleted successfully"}


@app.post("/workouts")
def create_workout(workout: dict, db: Session = Depends(get_db)):
    db_workout = models.Workout(
        user_id=workout.get("user_id", 1),
        date=workout.get("date"),
        muscle_group=workout.get("muscle_group", "Workout"),
        notes=workout.get("notes", ""),
    )
    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)

    for exercise in workout.get("exercises", []):
        db_exercise = models.Exercise(
            workout_id=db_workout.id,
            exercise_name=exercise.get("exercise_name", ""),
            machine_name=exercise.get("machine_name", exercise.get("exercise_name", "")),
            muscle_targeted=exercise.get("muscle_targeted", ""),
        )
        db.add(db_exercise)
        db.commit()
        db.refresh(db_exercise)

        note = exercise.get("exercise_note", "") or exercise.get("note", "")
        if note:
            with engine.begin() as conn:
                conn.execute(
                    text("INSERT OR REPLACE INTO exercise_notes (exercise_id, note) VALUES (:id, :note)"),
                    {"id": db_exercise.id, "note": note},
                )

        for set_data in exercise.get("sets", []):
            db_set = models.WorkoutSet(
                exercise_id=db_exercise.id,
                set_number=set_data.get("set_number", 1),
                reps=set_data.get("reps", 0),
                weight=set_data.get("weight", 0),
                weight_unit=set_data.get("weight_unit", "lbs"),
            )
            db.add(db_set)

    db.commit()
    return {"message": "Workout saved successfully", "workout_id": db_workout.id}


@app.get("/workouts/{user_id}")
def get_workouts(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Workout).filter(models.Workout.user_id == user_id).all()


@app.get("/workouts/details/{user_id}")
def get_workout_details(user_id: int, db: Session = Depends(get_db)):
    return get_workout_details_data(user_id, db)


@app.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(models.Workout).filter(models.Workout.id == workout_id).first()
    if workout is None:
        return {"error": "Workout not found"}
    exercises = db.query(models.Exercise).filter(models.Exercise.workout_id == workout_id).all()
    for exercise in exercises:
        sets = db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == exercise.id).all()
        for s in sets:
            db.delete(s)
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM exercise_notes WHERE exercise_id = :id"), {"id": exercise.id})
        db.delete(exercise)
    db.delete(workout)
    db.commit()
    return {"message": "Workout deleted successfully"}


@app.get("/progress/exercise/{user_id}/{exercise_name}")
def get_exercise_progress(user_id: int, exercise_name: str, db: Session = Depends(get_db)):
    workouts = db.query(models.Workout).filter(models.Workout.user_id == user_id).all()
    progress = []
    for workout in workouts:
        exercises = db.query(models.Exercise).filter(models.Exercise.workout_id == workout.id, models.Exercise.exercise_name.ilike(f"%{exercise_name}%")).all()
        for exercise in exercises:
            sets = db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == exercise.id).all()
            for s in sets:
                progress.append({"date": str(workout.date), "exercise_name": exercise.exercise_name, "weight": s.weight, "reps": s.reps, "set_number": s.set_number, "volume": s.weight * s.reps})
    return progress


@app.get("/progress/body-weight/{user_id}")
def get_body_weight_progress(user_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.DailyLog).filter(models.DailyLog.user_id == user_id, models.DailyLog.body_weight_kg != None).all()
    return [{"date": str(log.date), "body_weight_kg": log.body_weight_kg} for log in logs]


@app.get("/progress/macros/{user_id}")
def get_macro_progress(user_id: int, db: Session = Depends(get_db)):
    return list(get_daily_totals(user_id, db).values())


@app.get("/progress/personal-records/{user_id}")
def get_personal_records(user_id: int, db: Session = Depends(get_db)):
    workouts = get_workout_details_data(user_id, db)
    prs = {}
    for workout in workouts:
        for exercise in workout["exercises"]:
            name = exercise["exercise_name"]
            prs.setdefault(name, {"exercise_name": name, "max_weight": 0, "best_reps": 0, "best_set": "", "best_volume": 0, "date": workout["date"]})
            for s in exercise["sets"]:
                volume = s["weight"] * s["reps"]
                if s["weight"] > prs[name]["max_weight"]:
                    prs[name]["max_weight"] = s["weight"]
                    prs[name]["best_set"] = f'{s["weight"]} {s["weight_unit"]} x {s["reps"]}'
                    prs[name]["date"] = workout["date"]
                if s["reps"] > prs[name]["best_reps"]:
                    prs[name]["best_reps"] = s["reps"]
                if volume > prs[name]["best_volume"]:
                    prs[name]["best_volume"] = volume
    return sorted(prs.values(), key=lambda item: item["max_weight"], reverse=True)


@app.get("/analytics/streaks/{user_id}")
def get_streaks(user_id: int, db: Session = Depends(get_db)):
    goals = get_user_profile(user_id)
    workouts = db.query(models.Workout).filter(models.Workout.user_id == user_id).all()
    logs = db.query(models.DailyLog).filter(models.DailyLog.user_id == user_id).all()
    meals = get_daily_totals(user_id, db)
    return {
        "workout_streak": calculate_streak([w.date for w in workouts]),
        "water_streak": calculate_streak([log.date for log in logs if log.water_liters is not None and log.water_liters >= goals["water_goal"]]),
        "sleep_streak": calculate_streak([log.date for log in logs if log.sleep_hours is not None and log.sleep_hours >= goals["sleep_goal"]]),
        "steps_streak": calculate_streak([log.date for log in logs if log.steps is not None and log.steps >= goals["steps_goal"]]),
        "protein_streak": calculate_streak([item["date"] for item in meals.values() if item["protein_g"] >= goals["protein_goal"]]),
    }


@app.get("/analytics/weekly/{user_id}")
def get_weekly_analytics(user_id: int, db: Session = Depends(get_db)):
    today_date = date.today()
    week_start = today_date - timedelta(days=6)
    workouts = get_workout_details_data(user_id, db)
    logs = db.query(models.DailyLog).filter(models.DailyLog.user_id == user_id).all()
    meals = get_daily_totals(user_id, db)
    weekly_days, total_volume, total_workouts = [], 0, 0
    muscle_counts = defaultdict(int)
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_key = str(day)
        day_workouts = [w for w in workouts if w["date"] == day_key]
        day_meals = meals.get(day_key, {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0})
        day_log = next((log for log in logs if str(log.date) == day_key), None)
        day_volume = 0
        for workout in day_workouts:
            total_workouts += 1
            for exercise in workout["exercises"]:
                if exercise["muscle_targeted"]:
                    muscle_counts[exercise["muscle_targeted"]] += 1
                for s in exercise["sets"]:
                    day_volume += s["weight"] * s["reps"]
        total_volume += day_volume
        weekly_days.append({"date": day_key, "workouts": len(day_workouts), "volume": day_volume, "calories": day_meals["calories"], "protein_g": day_meals["protein_g"], "water_liters": day_log.water_liters if day_log else 0, "sleep_hours": day_log.sleep_hours if day_log else 0, "steps": day_log.steps if day_log else 0})
    return {
        "days": weekly_days,
        "summary": {
            "total_workouts": total_workouts,
            "total_volume": total_volume,
            "avg_protein": round(sum(day["protein_g"] for day in weekly_days) / 7, 1),
            "avg_sleep": round(sum(day["sleep_hours"] or 0 for day in weekly_days) / 7, 1),
            "avg_water": round(sum(day["water_liters"] or 0 for day in weekly_days) / 7, 1),
            "avg_steps": round(sum(day["steps"] or 0 for day in weekly_days) / 7),
            "most_trained_muscle": max(muscle_counts.items(), key=lambda item: item[1])[0] if muscle_counts else "None",
        },
        "muscle_counts": [{"muscle": k, "count": v} for k, v in muscle_counts.items()],
    }


@app.get("/analytics/recovery/{user_id}")
def get_recovery(user_id: int, db: Session = Depends(get_db)):
    workouts = get_workout_details_data(user_id, db)
    last_trained = {}
    for workout in workouts:
        workout_date = parse_date(workout["date"])
        for exercise in workout["exercises"]:
            muscle = exercise["muscle_targeted"] or workout["muscle_group"]
            if muscle not in last_trained or workout_date > last_trained[muscle]:
                last_trained[muscle] = workout_date
    recovery = []
    for muscle, trained_date in last_trained.items():
        days_since = (date.today() - trained_date).days
        if days_since <= 1:
            status, percent = "Recovering", 35
        elif days_since == 2:
            status, percent = "Almost Ready", 70
        else:
            status, percent = "Ready", 100
        recovery.append({"muscle": muscle, "last_trained": str(trained_date), "days_since": days_since, "status": status, "recovery_percent": percent})
    return sorted(recovery, key=lambda item: item["days_since"])


@app.get("/analytics/heatmap/{user_id}")
def get_heatmap(user_id: int, db: Session = Depends(get_db)):
    workouts = db.query(models.Workout).filter(models.Workout.user_id == user_id).all()
    counts = defaultdict(int)
    for workout in workouts:
        counts[str(workout.date)] += 1
    return [{"date": date_key, "count": count} for date_key, count in sorted(counts.items())]


@app.get("/analytics/leaderboard/{user_id}")
def get_volume_leaderboard(user_id: int, db: Session = Depends(get_db)):
    metrics = all_workout_metrics(user_id, db)
    exercises = sorted([
        {"exercise": name, "volume": round(volume, 1), "sets": metrics["exercise_sets"][name], "sessions": metrics["exercise_frequency"][name]}
        for name, volume in metrics["exercise_volume"].items()
    ], key=lambda item: item["volume"], reverse=True)
    muscles = sorted([
        {"muscle": name, "volume": round(volume, 1), "sessions": metrics["muscle_frequency"][name]}
        for name, volume in metrics["muscle_volume"].items()
    ], key=lambda item: item["volume"], reverse=True)
    return {"exercises": exercises[:15], "muscles": muscles[:15]}


@app.get("/analytics/splits/{user_id}")
def get_split_analytics(user_id: int, db: Session = Depends(get_db)):
    metrics = all_workout_metrics(user_id, db)
    total = sum(metrics["split_counts"].values()) or 1
    splits = [{"split": k, "count": v, "percent": round((v / total) * 100, 1)} for k, v in metrics["split_counts"].items()]
    monthly = [{"split": k, "count": v} for k, v in metrics["monthly_split_counts"].items()]
    warning = "Balanced split so far."
    if metrics["split_counts"]:
        counts = metrics["split_counts"]
        leg_count = sum(v for k, v in counts.items() if "leg" in k.lower())
        upper_count = total - leg_count
        if upper_count >= 2 and leg_count == 0:
            warning = "Leg frequency is low compared with upper-body work."
        elif max(counts.values()) >= total * 0.6 and total >= 4:
            warning = "One workout type is dominating your split. Consider balancing the week."
    return {"splits": splits, "monthly": monthly, "summary": {"total_workouts": total, "message": warning}}


@app.get("/analytics/achievements/{user_id}")
def get_achievements(user_id: int, db: Session = Depends(get_db)):
    metrics = all_workout_metrics(user_id, db)
    streaks = get_streaks(user_id, db)
    prs = get_personal_records(user_id, db)
    meals = get_daily_totals(user_id, db)
    logs = db.query(models.DailyLog).filter(models.DailyLog.user_id == user_id).all()
    goals = get_user_profile(user_id)
    max_weight = max([item["max_weight"] for item in prs], default=0)
    protein_days = sum(1 for item in meals.values() if item["protein_g"] >= goals["protein_goal"])
    water_days = sum(1 for log in logs if log.water_liters is not None and log.water_liters >= goals["water_goal"])
    sleep_days = sum(1 for log in logs if log.sleep_hours is not None and log.sleep_hours >= goals["sleep_goal"])
    steps_days = sum(1 for log in logs if log.steps is not None and log.steps >= goals["steps_goal"])

    definitions = [
        ("First Workout", "Log your first workout", metrics["total_workouts"] >= 1),
        ("Getting Consistent", "Log 5 workouts", metrics["total_workouts"] >= 5),
        ("Gym Regular", "Log 15 workouts", metrics["total_workouts"] >= 15),
        ("Built Different", "Log 30 workouts", metrics["total_workouts"] >= 30),
        ("Hundred Set Club", "Complete 100 total sets", metrics["total_sets"] >= 100),
        ("Rep Machine", "Complete 1,000 total reps", metrics["total_reps"] >= 1000),
        ("Volume Rookie", "Reach 10,000 total volume", metrics["total_volume"] >= 10000),
        ("Volume Beast", "Reach 50,000 total volume", metrics["total_volume"] >= 50000),
        ("Volume Monster", "Reach 100,000 total volume", metrics["total_volume"] >= 100000),
        ("Three Day Streak", "Workout streak of 3 days", streaks["workout_streak"] >= 3),
        ("One Week Warrior", "Workout streak of 7 days", streaks["workout_streak"] >= 7),
        ("Protein Starter", "Hit protein goal 3 times", protein_days >= 3),
        ("Protein Pro", "Hit protein goal 10 times", protein_days >= 10),
        ("Hydration Hero", "Hit water goal 7 times", water_days >= 7),
        ("Sleep Supporter", "Hit sleep goal 7 times", sleep_days >= 7),
        ("Step Crusher", "Hit step goal 7 times", steps_days >= 7),
        ("First PR", "Record at least one PR", len(prs) >= 1),
        ("PR Collector", "Record PRs for 5 exercises", len(prs) >= 5),
        ("Heavy Hitter", "Lift 100 lbs or more", max_weight >= 100),
        ("Big Lift Energy", "Lift 200 lbs or more", max_weight >= 200),
        ("Push Specialist", "Log 5 push/chest workouts", sum(v for k, v in metrics["split_counts"].items() if "push" in k.lower() or "chest" in k.lower()) >= 5),
        ("Pull Specialist", "Log 5 pull workouts", sum(v for k, v in metrics["split_counts"].items() if "pull" in k.lower()) >= 5),
        ("Leg Day Loyal", "Log 5 leg workouts", sum(v for k, v in metrics["split_counts"].items() if "leg" in k.lower()) >= 5),
        ("Meal Tracker", "Log meals on 7 different days", len(meals) >= 7),
        ("Daily Logger", "Log daily stats 10 times", len(logs) >= 10),
    ]
    achievements = [{"name": n, "description": d, "unlocked": bool(u)} for n, d, u in definitions]
    return {"unlocked_count": sum(1 for a in achievements if a["unlocked"]), "total_count": len(achievements), "achievements": achievements}


@app.get("/analytics/insights/{user_id}")
def get_insights(user_id: int, db: Session = Depends(get_db)):
    goals = get_user_profile(user_id)
    weekly = get_weekly_analytics(user_id, db)
    streaks = get_streaks(user_id, db)
    recovery = get_recovery(user_id, db)
    split = get_split_analytics(user_id, db)
    leaderboard = get_volume_leaderboard(user_id, db)
    insights = []
    if weekly["summary"]["total_workouts"] >= 4:
        insights.append("Strong workout consistency this week. You trained 4 or more times.")
    elif weekly["summary"]["total_workouts"] == 0:
        insights.append("No workouts logged this week yet. Add one workout to restart your streak.")
    else:
        insights.append("You have logged workouts this week. Try to reach 3-4 sessions for better consistency.")
    if weekly["summary"]["avg_protein"] >= goals["protein_goal"]:
        insights.append("Your average protein intake is meeting your daily goal.")
    else:
        insights.append("Your average protein intake is below your goal. Add more high-protein meals.")
    if weekly["summary"]["avg_sleep"] < goals["sleep_goal"]:
        insights.append("Sleep is below your goal. Recovery may improve if you increase sleep.")
    if streaks["workout_streak"] >= 3:
        insights.append(f'Great job. Your workout streak is {streaks["workout_streak"]} days.')
    ready_muscles = [item["muscle"] for item in recovery if item["status"] == "Ready"]
    if ready_muscles:
        insights.append(f'Ready to train: {", ".join(ready_muscles[:3])}.')
    if leaderboard["exercises"]:
        top = leaderboard["exercises"][0]
        insights.append(f'Highest total volume exercise: {top["exercise"]} with {top["volume"]} volume.')
    insights.append(split["summary"]["message"])
    return {"insights": insights}


@app.get("/reports/export/{user_id}")
def export_report(user_id: int, format: str = "csv", db: Session = Depends(get_db)):
    workouts = get_workout_details_data(user_id, db)
    meals = get_daily_totals(user_id, db)
    logs = db.query(models.DailyLog).filter(models.DailyLog.user_id == user_id).all()
    prs = get_personal_records(user_id, db)
    achievements = get_achievements(user_id, db)

    if format.lower() == "txt":
        lines = ["FITNESS TRACKER REPORT", f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ""]
        lines.append(f"Total Workouts: {len(workouts)}")
        lines.append(f"Meal Days Logged: {len(meals)}")
        lines.append(f"Daily Logs: {len(logs)}")
        lines.append(f"Achievements: {achievements['unlocked_count']} / {achievements['total_count']}")
        lines.append("\nPERSONAL RECORDS")
        for pr in prs[:20]:
            lines.append(f"- {pr['exercise_name']}: {pr['best_set']} | Best Volume {pr['best_volume']}")
        return Response("\n".join(lines), media_type="text/plain", headers={"Content-Disposition": "attachment; filename=fitness_report.txt"})

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["section", "date", "name", "detail", "value"])
    for workout in workouts:
        writer.writerow(["workout", workout["date"], workout["muscle_group"], workout["notes"], ""])
        for exercise in workout["exercises"]:
            writer.writerow(["exercise", workout["date"], exercise["exercise_name"], exercise["muscle_targeted"], exercise.get("exercise_note", "")])
            for s in exercise["sets"]:
                writer.writerow(["set", workout["date"], exercise["exercise_name"], f"{s['reps']} reps x {s['weight']} {s['weight_unit']}", s["volume"]])
    for day in meals.values():
        writer.writerow(["macros", day["date"], "daily totals", "calories/protein/carbs/fat", f"{day['calories']}/{day['protein_g']}/{day['carbs_g']}/{day['fat_g']}"])
    for pr in prs:
        writer.writerow(["personal_record", pr["date"], pr["exercise_name"], pr["best_set"], pr["best_volume"]])
    return Response(output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=fitness_report.csv"})


# -------------------------
# Social / friends features
# -------------------------
def init_social_tables():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS friend_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requester_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                status TEXT DEFAULT 'accepted',
                created_at TEXT NOT NULL,
                UNIQUE(requester_id, receiver_id)
            )
        """))


init_social_tables()


def get_username(user_id: int):
    with engine.begin() as conn:
        row = conn.execute(text("SELECT username FROM app_users WHERE id = :id"), {"id": user_id}).fetchone()
    return row.username if row else f"User {user_id}"


def get_friend_ids(user_id: int):
    with engine.begin() as conn:
        rows = conn.execute(text("""
            SELECT requester_id, receiver_id FROM friend_requests
            WHERE status = 'accepted' AND (requester_id = :uid OR receiver_id = :uid)
        """), {"uid": user_id}).fetchall()
    ids = []
    for row in rows:
        ids.append(row.receiver_id if row.requester_id == user_id else row.requester_id)
    return sorted(set(ids))


def social_summary(user_id: int, db: Session):
    metrics = all_workout_metrics(user_id, db)
    prs = get_personal_records(user_id, db)
    streaks = get_streaks(user_id, db)
    weekly = get_weekly_analytics(user_id, db)
    max_pr = max([item.get("max_weight", 0) for item in prs], default=0)
    return {
        "user_id": user_id,
        "username": get_username(user_id),
        "total_workouts": metrics["total_workouts"],
        "total_volume": round(metrics["total_volume"], 1),
        "weekly_volume": weekly["summary"].get("total_volume", 0),
        "workout_streak": streaks.get("workout_streak", 0),
        "max_pr": max_pr,
        "pr_count": len(prs),
    }


@app.post("/friends/add")
def add_friend(payload: dict):
    user_id = int(payload.get("user_id", 1))
    friend_username = str(payload.get("friend_username", "")).strip().lower()
    if not friend_username:
        return {"error": "Friend username is required"}
    with engine.begin() as conn:
        friend = conn.execute(text("SELECT id, username FROM app_users WHERE username = :u"), {"u": friend_username}).fetchone()
        if friend is None:
            return {"error": "User not found"}
        if friend.id == user_id:
            return {"error": "You cannot add yourself"}
        a, b = sorted([user_id, friend.id])
        conn.execute(text("""
            INSERT OR IGNORE INTO friend_requests (requester_id, receiver_id, status, created_at)
            VALUES (:a, :b, 'accepted', :created_at)
        """), {"a": a, "b": b, "created_at": datetime.now().isoformat()})
    return {"message": f"{friend.username} added as a friend", "friend": {"id": friend.id, "username": friend.username}}


@app.get("/friends/{user_id}")
def list_friends(user_id: int, db: Session = Depends(get_db)):
    return [social_summary(fid, db) for fid in get_friend_ids(user_id)]


@app.get("/friends/leaderboard/{user_id}")
def friends_leaderboard(user_id: int, db: Session = Depends(get_db)):
    ids = [user_id] + get_friend_ids(user_id)
    rows = [social_summary(uid, db) for uid in ids]
    return {
        "volume": sorted(rows, key=lambda item: item["total_volume"], reverse=True),
        "weekly_volume": sorted(rows, key=lambda item: item["weekly_volume"], reverse=True),
        "streaks": sorted(rows, key=lambda item: item["workout_streak"], reverse=True),
        "prs": sorted(rows, key=lambda item: item["max_pr"], reverse=True),
        "workouts": sorted(rows, key=lambda item: item["total_workouts"], reverse=True),
    }


@app.get("/friends/compare/{user_id}/{friend_id}")
def compare_friend(user_id: int, friend_id: int, db: Session = Depends(get_db)):
    allowed = friend_id in get_friend_ids(user_id) or user_id == friend_id
    if not allowed:
        return {"error": "This user is not in your friends list"}
    user_summary = social_summary(user_id, db)
    friend_summary = social_summary(friend_id, db)
    user_prs = {item["exercise_name"]: item for item in get_personal_records(user_id, db)}
    friend_prs = {item["exercise_name"]: item for item in get_personal_records(friend_id, db)}
    exercise_names = sorted(set(user_prs.keys()) | set(friend_prs.keys()))
    pr_comparison = []
    for name in exercise_names:
        pr_comparison.append({
            "exercise": name,
            "you": user_prs.get(name, {}).get("max_weight", 0),
            "friend": friend_prs.get(name, {}).get("max_weight", 0),
        })
    return {
        "you": user_summary,
        "friend": friend_summary,
        "summary_chart": [
            {"metric": "Total Volume", "you": user_summary["total_volume"], "friend": friend_summary["total_volume"]},
            {"metric": "Weekly Volume", "you": user_summary["weekly_volume"], "friend": friend_summary["weekly_volume"]},
            {"metric": "Workout Streak", "you": user_summary["workout_streak"], "friend": friend_summary["workout_streak"]},
            {"metric": "Max PR", "you": user_summary["max_pr"], "friend": friend_summary["max_pr"]},
            {"metric": "Total Workouts", "you": user_summary["total_workouts"], "friend": friend_summary["total_workouts"]},
        ],
        "pr_comparison": pr_comparison[:20],
        "your_body_weight": get_body_weight_progress(user_id, db),
        "friend_body_weight": get_body_weight_progress(friend_id, db),
    }
