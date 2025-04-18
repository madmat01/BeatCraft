from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import audio

app = FastAPI(
    title="BeatCraft API",
    description="API for analyzing audio files and generating MIDI patterns",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to BeatCraft API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include routers
app.include_router(audio.router)
