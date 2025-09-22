#!/usr/bin/env python3
"""
Temperature Dashboard Data Ingestion Simulator

This script reads temperature data from a CSV file and sends it to the
temperature dashboard API endpoint with proper HMAC authentication.

Usage:
    python ingest_simulator.py --csv data.csv --speed 1.0 --start 2024-01-01T00:00:00Z
    
Requirements:
    pip install requests pandas python-dotenv
"""

import argparse
import csv
import hashlib
import hmac
import json
import os
import sys
import time
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class IngestionSimulator:
    def __init__(self, api_url: str, hmac_secret: str, device_id: str):
        self.api_url = api_url.rstrip('/')
        self.hmac_secret = hmac_secret
        self.device_id = device_id
        self.session = requests.Session()
        
    def generate_hmac_signature(self, body: str, timestamp: str) -> str:
        """Generate HMAC-SHA256 signature for request authentication."""
        message = body + timestamp + self.device_id
        signature = hmac.new(
            self.hmac_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def send_readings(self, readings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Send a batch of readings to the ingestion endpoint."""
        # Prepare request body
        payload = {"readings": readings}
        body = json.dumps(payload, separators=(',', ':'))
        
        # Generate timestamp and signature
        timestamp = datetime.utcnow().isoformat() + 'Z'
        signature = self.generate_hmac_signature(body, timestamp)
        idempotency_key = str(uuid.uuid4())
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'X-Timestamp': timestamp,
            'X-Device-Id': self.device_id,
            'X-Signature': signature,
            'Idempotency-Key': idempotency_key
        }
        
        # Send request
        try:
            response = self.session.post(
                f"{self.api_url}/api/ingest/readings",
                data=body,
                headers=headers,
                timeout=30
            )
            
            return {
                'status_code': response.status_code,
                'response': response.json() if response.content else {},
                'headers': dict(response.headers)
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'status_code': 0,
                'error': str(e),
                'response': {}
            }
    
    def load_csv_data(self, csv_file: str) -> List[Dict[str, Any]]:
        """Load temperature data from CSV file."""
        readings = []
        
        try:
            with open(csv_file, 'r', newline='', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                # Validate required columns
                required_columns = {'timestamp', 'sensor_id', 'temperature_c'}
                if not required_columns.issubset(reader.fieldnames or []):
                    raise ValueError(f"CSV must contain columns: {required_columns}")
                
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # Parse and validate data
                        timestamp_str = row['timestamp'].strip()
                        sensor_id = row['sensor_id'].strip()
                        temperature = float(row['temperature_c'])
                        
                        # Validate timestamp format
                        try:
                            datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        except ValueError:
                            print(f"Warning: Invalid timestamp format in row {row_num}: {timestamp_str}")
                            continue
                        
                        # Validate sensor ID format (should be UUID)
                        try:
                            uuid.UUID(sensor_id)
                        except ValueError:
                            print(f"Warning: Invalid sensor ID format in row {row_num}: {sensor_id}")
                            continue
                        
                        readings.append({
                            'ts': timestamp_str,
                            'sensor_id': sensor_id,
                            'value': temperature
                        })
                        
                    except (ValueError, KeyError) as e:
                        print(f"Warning: Skipping invalid row {row_num}: {e}")
                        continue
                        
        except FileNotFoundError:
            raise FileNotFoundError(f"CSV file not found: {csv_file}")
        except Exception as e:
            raise Exception(f"Error reading CSV file: {e}")
        
        return readings
    
    def simulate_ingestion(self, csv_file: str, speed: float = 1.0, 
                          start_time: str = None, end_time: str = None,
                          batch_size: int = 100):
        """
        Simulate real-time data ingestion from CSV file.
        
        Args:
            csv_file: Path to CSV file containing temperature data
            speed: Speed multiplier (1.0 = real-time, 2.0 = 2x speed, etc.)
            start_time: ISO timestamp to start simulation from
            end_time: ISO timestamp to end simulation at
            batch_size: Number of readings to send per request
        """
        print(f"Loading data from {csv_file}...")
        readings = self.load_csv_data(csv_file)
        
        if not readings:
            print("No valid readings found in CSV file.")
            return
        
        # Filter by time range if specified
        if start_time:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            readings = [r for r in readings if datetime.fromisoformat(r['ts'].replace('Z', '+00:00')) >= start_dt]
        
        if end_time:
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            readings = [r for r in readings if datetime.fromisoformat(r['ts'].replace('Z', '+00:00')) <= end_dt]
        
        # Sort by timestamp
        readings.sort(key=lambda x: x['ts'])
        
        print(f"Loaded {len(readings)} readings")
        print(f"Time range: {readings[0]['ts']} to {readings[-1]['ts']}")
        print(f"Speed: {speed}x")
        print(f"Batch size: {batch_size}")
        print(f"Device ID: {self.device_id}")
        print("-" * 50)
        
        # Process readings in batches
        total_sent = 0
        total_errors = 0
        last_timestamp = None
        
        for i in range(0, len(readings), batch_size):
            batch = readings[i:i + batch_size]
            
            # Calculate delay based on timestamp difference and speed
            if last_timestamp and speed > 0:
                current_time = datetime.fromisoformat(batch[0]['ts'].replace('Z', '+00:00'))
                last_time = datetime.fromisoformat(last_timestamp.replace('Z', '+00:00'))
                time_diff = (current_time - last_time).total_seconds()
                delay = max(0, time_diff / speed)
                
                if delay > 0:
                    print(f"Waiting {delay:.1f}s...")
                    time.sleep(delay)
            
            # Send batch
            print(f"Sending batch {i//batch_size + 1}/{(len(readings) + batch_size - 1)//batch_size} "
                  f"({len(batch)} readings)...")
            
            result = self.send_readings(batch)
            
            if result['status_code'] == 200:
                processed = result['response'].get('processed', 0)
                total_sent += processed
                print(f"✓ Successfully processed {processed} readings")
                
                if 'errors' in result['response']:
                    error_count = len(result['response']['errors'])
                    total_errors += error_count
                    print(f"⚠ {error_count} errors in batch")
                    for error in result['response']['errors'][:3]:  # Show first 3 errors
                        print(f"  - {error}")
                    if error_count > 3:
                        print(f"  ... and {error_count - 3} more errors")
                        
            else:
                total_errors += len(batch)
                print(f"✗ Batch failed with status {result['status_code']}")
                if 'error' in result['response']:
                    print(f"  Error: {result['response']['error'].get('message', 'Unknown error')}")
                elif 'error' in result:
                    print(f"  Error: {result['error']}")
            
            # Show rate limit headers if present
            if 'X-RateLimit-Remaining' in result.get('headers', {}):
                remaining = result['headers']['X-RateLimit-Remaining']
                print(f"  Rate limit remaining: {remaining}")
            
            last_timestamp = batch[-1]['ts']
            print()
        
        print("-" * 50)
        print(f"Simulation complete!")
        print(f"Total readings sent: {total_sent}")
        print(f"Total errors: {total_errors}")
        print(f"Success rate: {(total_sent / len(readings) * 100):.1f}%")

def main():
    parser = argparse.ArgumentParser(description='Temperature Dashboard Ingestion Simulator')
    parser.add_argument('--csv', required=True, help='Path to CSV file with temperature data')
    parser.add_argument('--speed', type=float, default=1.0, help='Speed multiplier (default: 1.0)')
    parser.add_argument('--start', help='Start timestamp (ISO format)')
    parser.add_argument('--end', help='End timestamp (ISO format)')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size (default: 100)')
    parser.add_argument('--device-id', help='Device ID (default: random UUID)')
    parser.add_argument('--api-url', help='API base URL (default: from .env)')
    
    args = parser.parse_args()
    
    # Get configuration from environment or arguments
    api_url = args.api_url or os.getenv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    hmac_secret = os.getenv('HMAC_SECRET')
    device_id = args.device_id or str(uuid.uuid4())
    
    if not hmac_secret:
        print("Error: HMAC_SECRET environment variable is required")
        sys.exit(1)
    
    # Create simulator instance
    simulator = IngestionSimulator(api_url, hmac_secret, device_id)
    
    try:
        simulator.simulate_ingestion(
            csv_file=args.csv,
            speed=args.speed,
            start_time=args.start,
            end_time=args.end,
            batch_size=args.batch_size
        )
    except KeyboardInterrupt:
        print("\nSimulation interrupted by user")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
