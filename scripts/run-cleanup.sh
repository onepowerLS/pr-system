#!/bin/bash

# Load environment variables
source .env

# Run the cleanup script with specific tsconfig
npx ts-node --project scripts/tsconfig.json scripts/cleanup-legacy-collections.ts
