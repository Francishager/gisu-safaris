@echo off
echo Pushing Gisu Safaris to GitHub...
echo.

REM Navigate to the project directory
cd "C:\Users\DELL\CascadeProjects\gisu-safaris"

REM Add all files
git add .

REM Commit changes
git commit -m "Add complete Gisu Safaris website with interactive WhatsApp widget"

REM Push to GitHub (assuming origin main branch)
git push origin main

echo.
echo Push completed! Check your GitHub repository.
pause
