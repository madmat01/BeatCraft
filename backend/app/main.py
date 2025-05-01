from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.audio import router as audio_router

app = FastAPI(
    title="BeatCraft API",
    description="Audio analysis and MIDI generation API for BeatCraft",
    version="0.1.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the audio API routes with /audio prefix to match frontend expectations
app.include_router(audio_router, prefix="/audio")

@app.get("/")
async def root():
    return {"message": "Welcome to BeatCraft API"}
