@echo off
echo Initializing Git repository...
git init
if %errorlevel% neq 0 (
    echo Failed to initialize git.
    pause
    exit /b %errorlevel%
)

echo Adding remote...
git remote remove origin
git remote add origin https://github.com/joemunene-by/Port-scanner.git

echo Adding files...
git add .

echo Committing...
git commit -m "Initialize project with Vercel support"

echo Pushing to main...
git branch -M main
git push -u origin main

echo Done!
pause
