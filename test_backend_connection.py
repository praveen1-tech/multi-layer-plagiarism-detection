import requests
import json

try:
    print("Testing Root Endpoint...")
    r = requests.get("http://localhost:8000/")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")

    print("\nTesting Detect Endpoint...")
    payload = {"text": "Artificial Intelligence is similar to human intelligence."}
    r = requests.post("http://localhost:8000/detect", json=payload)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}")

except Exception as e:
    print(f"Error: {e}")
