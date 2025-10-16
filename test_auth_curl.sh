#!/bin/bash

# Test Supabase authentication directly
curl -X POST 'https://vhgddpxytbxqqmyicxgb.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZ2RkcHh5dGJ4cXFteWljeGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0Nzc3NjMsImV4cCI6MjA3NDA1Mzc2M30.woYsfOcAjm0futIyilCyWnPkaXy8rPkcSFNlxVlykTQ" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin1@gmail.com",
    "password": "admin1"
  }'