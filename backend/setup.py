from setuptools import setup, find_packages

setup(
    name="beatcraft",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "uvicorn",
        "python-multipart",
        "librosa",
        "python-magic-bin",
        "midiutil",
    ],
)
