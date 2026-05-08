from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
import schemas
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fitness Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {"message": "Fitness Tracker API is running"}


@app.post("/daily-log")
def create_daily_log(log: schemas.DailyLogCreate, db: Session = Depends(get_db)):
    db_log = models.DailyLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@app.post("/meals")
def create_meal(meal: schemas.MealCreate, db: Session = Depends(get_db)):
    db_meal = models.Meal(**meal.dict())
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal


@app.get("/meals/{user_id}/{log_date}")
def get_meals(user_id: int, log_date: str, db: Session = Depends(get_db)):
    meals = db.query(models.Meal).filter(
        models.Meal.user_id == user_id,
        models.Meal.date == log_date
    ).all()

    return {
        "meals": meals,
        "totals": {
            "calories": sum(meal.calories for meal in meals),
            "protein_g": sum(meal.protein_g for meal in meals),
            "carbs_g": sum(meal.carbs_g for meal in meals),
            "fat_g": sum(meal.fat_g for meal in meals)
        }
    }


@app.post("/workouts")
def create_workout(workout: schemas.WorkoutCreate, db: Session = Depends(get_db)):
    db_workout = models.Workout(
        user_id=workout.user_id,
        date=workout.date,
        muscle_group=workout.muscle_group,
        notes=workout.notes
    )

    db.add(db_workout)
    db.commit()
    db.refresh(db_workout)

    for exercise in workout.exercises:
        db_exercise = models.Exercise(
            workout_id=db_workout.id,
            exercise_name=exercise.exercise_name,
            machine_name=exercise.machine_name,
            muscle_targeted=exercise.muscle_targeted
        )

        db.add(db_exercise)
        db.commit()
        db.refresh(db_exercise)

        for set_data in exercise.sets:
            db_set = models.WorkoutSet(
                exercise_id=db_exercise.id,
                set_number=set_data.set_number,
                reps=set_data.reps,
                weight=set_data.weight,
                weight_unit=set_data.weight_unit
            )
            db.add(db_set)

    db.commit()

    return {"message": "Workout saved successfully", "workout_id": db_workout.id}


@app.get("/workouts/{user_id}")
def get_workouts(user_id: int, db: Session = Depends(get_db)):
    workouts = db.query(models.Workout).filter(
        models.Workout.user_id == user_id
    ).all()

    return workouts