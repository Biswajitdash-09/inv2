@echo off
REM Deployment script for InvoiceFlow (Windows)
REM This ensures cache is cleared on every deployment

echo Starting InvoiceFlow Deployment...

REM Get current version from package.json
for /f "usebackq tokens=*" %%a in (`node -p "require('./package.json').version"`) do set CURRENT_VERSION=%%a
echo Current version: %CURRENT_VERSION%

REM Version is now incremented automatically by 'npm run build' via prebuild script
echo Version management is handled by scripts/bump_version.js during build.

REM Build the application
echo Building application...
call npm run build

REM Deploy to Vercel
echo Deploying to production...
call vercel --prod

echo Deployment complete!
echo Users will auto-refresh to version %NEW_VERSION%
pause
