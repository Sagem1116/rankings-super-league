@echo off
echo Starting FM Elite Manager...
start /B npm run dev
timeout /t 5 /nobreak > nul
start http://localhost:8081
echo App opened in browser. Press Ctrl+C to stop the server.