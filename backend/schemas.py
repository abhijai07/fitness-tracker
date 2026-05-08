from pydantic import BaseModel
from datetime import date
from typing import Optional, List


class DailyLogCreate(BaseModel):
    user_id: int
    date: date
    body_weight_kg: Optional[float] = None
    water_liters: Optional[float] = None
    sleep_hours: Optional[float] = None
    steps: Optional[int] = None
    notes: Optional[str] = None


class MealCreate(BaseModel):
    user_id: int
    date: date
    meal_type: str
    food_name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


class WorkoutSetCreate(BaseModel):
    set_number: int
    reps: int
    weight: float
    weight_unit: str = "lbs"


class ExerciseCreate(BaseModel):
    exercise_name: str
    machine_name: Optional[str] = None
    muscle_targeted: str
    sets: List[WorkoutSetCreate]


class WorkoutCreate(BaseModel):
    user_id: int
    date: date
    muscle_group: str
    notes: Optional[str] = None
    exercises: List[ExerciseCreate]