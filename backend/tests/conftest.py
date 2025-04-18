import pytest
import asyncio
from fastapi.testclient import TestClient
import test_env  # This will set up the test environment
from app.main import app

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def test_client():
    """Create a test client for the FastAPI app."""
    with TestClient(app) as client:
        yield client

@pytest.fixture(autouse=True)
def setup_test_env():
    """Setup test environment before each test."""
    # This fixture runs automatically before each test
    # Add any test setup/cleanup here if needed
    yield
