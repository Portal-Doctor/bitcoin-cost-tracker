#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Bitcoin Cost Basis Tracker Database...\n');

// Check if prisma is installed
try {
  require('@prisma/client');
} catch (error) {
  console.error('❌ Prisma client not found. Please run: yarn install');
  process.exit(1);
}

// Create scripts directory if it doesn't exist
const scriptsDir = path.join(__dirname);
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

try {
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('🗄️  Pushing database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('✅ Database setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Create a .env file with your configuration');
  console.log('2. Run: yarn dev');
  console.log('3. Open http://localhost:3000');
  
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
}
