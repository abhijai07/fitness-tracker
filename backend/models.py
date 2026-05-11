from sqlalchemy import Column, Integer, String, Float, Date
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    height_cm = Column(Float)
    weight_kg = Column(Float)
    goal = Column(String)


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    date = Column(Date)
    body_weight_kg = Column(Float)
    water_liters = Column(Float)
    sleep_hours = Column(Float)
    steps = Column(Integer)
    notes = Column(String)


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    date = Column(Date)
    meal_type = Column(String)
    food_name = Column(String)
    calories = Column(Float)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fat_g = Column(Float)


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    date = Column(Date)
    muscle_group = Column(String)
    notes = Column(String)


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer)
    exercise_name = Column(String)
    machine_name = Column(String)
    muscle_targeted = Column(String)
    exercise_note = Column(String)


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer)
    set_number = Column(Integer)
    reps = Column(Integer)
    weight = Column(Float)
    weight_unit = Column(String)