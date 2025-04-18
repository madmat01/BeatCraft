from pydantic import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    APP_NAME: str = "BeatCraft"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # Add more settings as needed (database, file storage, etc.)
    
    class Config:
        env_file = ".env"

settings = Settings()
