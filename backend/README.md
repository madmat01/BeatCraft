# BeatCraft Backend

This is the backend service for BeatCraft, built with FastAPI and Python.

## Setup

1. Install Python 3.8 or higher
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - Windows:
     ```bash
     .\venv\Scripts\activate
     ```
   - Unix/MacOS:
     ```bash
     source venv/bin/activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Development

To run the development server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API documentation will be available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── config.py        # Configuration settings
│   ├── api/             # API endpoints
│   ├── core/            # Core business logic
│   ├── models/          # Data models
│   └── utils/           # Utility functions
├── static/              # Static files
├── tests/               # Test files
└── requirements.txt     # Python dependencies
```
