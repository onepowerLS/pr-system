#!/bin/bash

# Script to set up and run the email notification E2E tests
# Following functional programming principles with clear, single-purpose steps

set -e # Exit on any error

echo "🔍 Setting up PR System E2E Tests..."

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers
echo "🎭 Setting up Playwright browsers..."
npx playwright install chromium

# Ensure the main app is running, start it if not
if ! curl -s http://localhost:5173 > /dev/null; then
  echo "🚀 Starting the PR system app..."
  cd ..
  npm run dev &
  APP_PID=$!
  
  # Wait for the app to start
  echo "⏳ Waiting for the app to start..."
  until curl -s http://localhost:5173 > /dev/null; do
    sleep 1
  done
fi

# Run the tests
echo "🧪 Running E2E tests to verify email notifications..."
npx playwright test email-notification.test.ts

# Check and display the results
echo "📊 Test Results:"
if [ -f "logs/email-output.json" ]; then
  echo "📧 Email Details:"
  cat logs/email-output.json | grep -E 'requestorInfo|resolvedCategory|resolvedVendor|hasLowerAndUpperCaseEmails'
  
  # Check for our specific fixes
  echo -e "\n✅ Verification of fixes:"
  
  # 1. Check requestor name issues
  if grep -q "Not specified" logs/browser-console.log; then
    echo "❌ ISSUE: Requestor name shows as 'Not specified' in some places"
  else
    echo "✅ Requestor name properly displayed"
  fi
  
  # 2. Check for duplicate emails
  if grep -q "DUPLICATE EMAILS DETECTED" logs/browser-console.log; then
    echo "❌ ISSUE: Duplicate emails detected in CC list"
  else
    echo "✅ No duplicate emails in CC list"
  fi
  
  # 3. Check for category/vendor showing as IDs
  if grep -q "Resolved category.*to '[0-9]*'" logs/browser-console.log; then
    echo "❌ ISSUE: Category still showing as numeric ID"
  else
    echo "✅ Categories showing proper names instead of IDs"
  fi
  
  if grep -q "Resolved vendor.*to '[0-9]*'" logs/browser-console.log; then
    echo "❌ ISSUE: Vendor still showing as numeric ID"
  else
    echo "✅ Vendors showing proper names instead of IDs"
  fi
else
  echo "❌ No test results found. Tests may have failed."
fi

# Clean up the app process if we started it
if [ ! -z "$APP_PID" ]; then
  echo "🛑 Stopping the PR system app..."
  kill $APP_PID
fi

echo "✨ Done!"
