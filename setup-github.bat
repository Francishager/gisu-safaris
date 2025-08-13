@echo off
echo Setting up Gisu Safaris GitHub Repository...
echo.

REM Navigate to the project directory
cd "C:\Users\DELL\CascadeProjects\gisu-safaris"

echo Checking Git status...
git status

echo.
echo Checking remote repositories...
git remote -v

echo.
echo If no remote is shown above, you need to add your GitHub repository URL.
echo Example:
echo git remote add origin https://github.com/YOUR-USERNAME/gisu-safaris.git
echo.

echo Current files in repository:
dir /b

echo.
echo To push to GitHub:
echo 1. Make sure you have created a repository named 'gisu-safaris' on GitHub.com
echo 2. If no remote is configured, run: git remote add origin YOUR-REPO-URL
echo 3. Run the push-to-github.bat file
echo.

pause
