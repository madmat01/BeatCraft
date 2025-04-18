from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="BeatCraft API",
    description="Audio analysis and MIDI generation API",
    version="0.1.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
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

# Import and include API routes
from app.api import audio
app.include_router(audio.router)
