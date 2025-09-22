#!/usr/bin/env python3
"""
Test with exact sample data format
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

# Use exact data from sample CSV
payload = {
    "readings": [
        {
            "ts": "2024-01-01T00:00:00Z",
            "sensor_id": "550e8400-e29b-41d4-a716-446655440031",
            "value": -18.5
        }
    ]
}

# Convert to JSON string
body = json.dumps(payload, separators=(',', ':'))
print(f"Request body: {body}")

# Generate timestamp
timestamp = datetime.utcnow().isoformat() + 'Z'

# Generate HMAC signature
message = body + timestamp + device_id
signature = hmac.new(
    hmac_secret.encode('utf-8'),
    message.encode('utf-8'),
    hashlib.sha256
).hexdigest()

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
            
except Exception as e:
    print(f"Request failed: {e}")