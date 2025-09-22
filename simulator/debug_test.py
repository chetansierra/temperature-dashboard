#!/usr/bin/env python3
"""
Debug version of the ingestion simulator
"""

import json
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Simple test
api_url = "http://localhost:3000"
hmac_secret = os.getenv('HMAC_SECRET')

print(f"API URL: {api_url}")
print(f"HMAC Secret: {hmac_secret[:10]}..." if hmac_secret else "HMAC Secret: None")

# Test basic connectivity
try:
    response = requests.get(f"{api_url}/api/health")
    print(f"Health check: {response.status_code}")
    print(f"Health response: {response.text}")
except Exception as e:
    print(f"Health check failed: {e}")

# Try a simple ingestion request without proper authentication
payload = {
    "readings": [
        {
            "sensor_id": "sensor_001",
            "temperature_c": 22.5,
            "ts": "2024-01-01T00:00:00Z"
        }
    ]
}

headers = {
    'Content-Type': 'application/json'
}

try:
    response = requests.post(f"{api_url}/api/ingest/readings", 
                           json=payload, 
                           headers=headers)
    print(f"Ingestion test: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Ingestion test failed: {e}")