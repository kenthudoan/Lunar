@echo off
REM ============================================================
REM  Reset All Data - Project Lunar
REM  Xoa toan bo data: SQLite (events.db, scenarios.db)
REM  va Neo4j graph (tat ca campaign nodes)
REM ============================================================

cd /d "%~dp0backend"

echo [1/4] Stopping backend server (if running)...
for /f "tokens=*" %%i in ('wmic process where "commandline like '%%uvicorn%%'" get processid 2^>nul') do (
    for /f "delims= " %%p in ("%%i") do taskkill /PID %%p /F >nul 2>&1
)

echo [2/4] Deleting SQLite database files...
if exist "events.db" (
    del /f /q "events.db"
    echo    - events.db deleted
) else (
    echo    - events.db not found (skipped)
)
if exist "scenarios.db" (
    del /f /q "scenarios.db"
    echo    - scenarios.db deleted
) else (
    echo    - scenarios.db not found (skipped)
)

echo [3/4] Clearing Neo4j graph (all campaigns)...
docker exec lunar-neo4j cypher-shell -u neo4j -p lunar_password "MATCH (n) DETACH DELETE n;" >nul 2>&1
if %errorlevel%==0 (
    echo    - Neo4j graph cleared
) else (
    echo    - WARNING: Neo4j clear failed. Is the container running?
    docker ps | findstr lunar-neo4j >nul
    if %errorlevel% neq 0 (
        echo    - ERROR: lunar-neo4j container is NOT running!
        echo    - Run: docker-compose up -d neo4j
    )
)

echo [4/4] Restarting Neo4j container...
docker restart lunar-neo4j >nul 2>&1
echo    - Neo4j restarted

echo.
echo ============================================================
echo  DONE - All data has been reset.
echo  - events.db        : DA XOA (se tu tao lai khi chay)
echo  - scenarios.db     : DA XOA (se tu tao lai khi chay)
echo  - Neo4j graph       : DA CLEAR
echo.
echo  Khoi dong lai backend:
echo    cd backend ^&^& venv\Scripts\activate ^&^& uvicorn app.main:app --reload --port 8000
echo ============================================================
pause
