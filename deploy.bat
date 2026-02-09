@echo off
REM Deployment script for InvoiceFlow (Windows)
REM This ensures cache is cleared on every deployment

echo Starting InvoiceFlow Deployment...

REM Get current version
for /f "tokens=2 delims==" %%a in ('findstr "NEXT_PUBLIC_APP_VERSION" .env.local') do set CURRENT_VERSION=%%a
echo Current version: %CURRENT_VERSION%

REM Increment version manually or use timestamp
set NEW_VERSION=1.0.%date:~-4%%date:~-10,2%%date:~-7,2%.%time:~0,2%%time:~3,2%
echo New version: %NEW_VERSION%

REM Update .env.local
powershell -Command "(gc .env.local) -replace 'NEXT_PUBLIC_APP_VERSION=.*', 'NEXT_PUBLIC_APP_VERSION=%NEW_VERSION%' | Out-File -encoding ASCII .env.local"

echo Version updated to %NEW_VERSION%

REM Build the application
echo Building application...
call npm run build

REM Deploy to Vercel
echo Deploying to production...
call vercel --prod

echo Deployment complete!
echo Users will auto-refresh to version %NEW_VERSION%
pause
