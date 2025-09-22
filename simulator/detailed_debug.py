#!/usr/bin/env python3
"""
Detailed debug test for HMAC authentication
"""

import json
import os
import uuid
import hashlib
import hmac
from datetime import datetime
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

api_url = "http://localhost:3000"
hmac_secret = os.getenv('HMAC_SECRET')
device_id = str(uuid.uuid4())

print(f"API URL: {api_url}")
print(f"HMAC Secret: {hmac_secret}")
print(f"Device ID: {device_id}")
print("-" * 50)

# Create a test payload
payload = {
    "readings": [
        {
            "sensor_id": "sensor_001",
            "temperature_c": 22.5,
            "ts": "2024-01-01T00:00:00Z"
        }
    ]
}

# Convert to JSON string
body = json.dumps(payload, separators=(',', ':'))
print(f"Request body: {body}")

# Generate timestamp
timestamp = datetime.utcnow().isoformat() + 'Z'
print(f"Timestamp: {timestamp}")

# Generate HMAC signature
message = body + timestamp + device_id
print(f"Message to sign: {message}")

signature = hmac.new(
    hmac_secret.encode('utf-8'),
    message.encode('utf-8'),
    hashlib.sha256
).hexdigest()
print(f"Generated signature: {signature}")

# Create headers
idempotency_key = str(uuid.uuid4())
headers = {
    'Content-Type': 'application/json',
    'X-Timestamp': timestamp,
    'X-Device-Id': device_id,
    'X-Signature': signature,
    'Idempotency-Key': idempotency_key
}

print(f"Headers: {json.dumps(headers, indent=2)}")
print("-" * 50)

# Send request
try:
    response = requests.post(f"{api_url}/api/ingest/readings", 
                           data=body,
                           headers=headers)
    print(f"Response status: {response.status_code}")
    print(f"Response body: {response.text}")
    
    # If error, try to parse JSON
    if response.status_code != 200:
        try:
            error_data = response.json()
            print(f"Error details: {json.dumps(error_data, indent=2)}")
        except:
            pass
            
except Exception as e:
    print(f"Request failed: {e}")