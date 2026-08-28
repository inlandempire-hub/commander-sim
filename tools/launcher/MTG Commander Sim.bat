@echo off
setlocal EnableDelayedExpansion
title MTG Commander Sim
color 0B

REM ---------------------------------------------------------------------------
REM  Launcher for the MTG Commander Sim dev build.
REM  Pin this to the taskbar or Start menu and click it to play.
REM
REM  It rebuilds the engine, starts the web app in its OWN window, and opens
REM  your browser at whatever you picked. This menu then comes back, so you can
REM  keep switching - deck builder, then a bot game, then another deck - without
REM  closing anything or waiting for another rebuild.
REM
REM  The web app lives in the separate "web app" window. That's the one that
REM  has to stay open while you play; this menu window is only a launcher.
REM
REM  If you ever move the project folder, change PROJECT below to the new path.
REM ---------------------------------------------------------------------------

set "PROJECT=C:\Users\jmgil\Code Projects\mtg-commander-sim"
set "PORT=5180"

cd /d "%PROJECT%" 2>nul
if errorlevel 1 (
  echo.
  echo   Could not find the project folder:
  echo     %PROJECT%
  echo.
  echo   If you moved it, open this .bat in Notepad and update the PROJECT line.
  echo.
  pause
  exit /b 1
)

:menu
cls
echo.
echo   ===========================================
echo             M T G   C O M M A N D E R
echo   ===========================================
echo.
echo   Pick your deck - you'll play it against the bot:
echo.
echo     1   Winota          (Boros)    Cheap hate pieces, then non-Humans flip free Humans off the top
echo     2   Radiant Ranks   (white)    Lots of small creatures, pumped by an anthem
echo     3   Blech           (Golgari)  Trade creatures for cards and life, grind with removal
echo     4   Gravebound      (black)    Kill everything good, grind them down
echo     5   Tidewall        (blue)     Counter their spells, win in the air
echo     6   Felix Five-Boots (Sultai)  Grind card advantage, close with doubled combat triggers
echo     7   Winter          (Jund)     Draw the table into chaos, punish it, reset the board
echo.
echo   Or:
echo.
echo     D   Deck builder - build your own deck, then play it
echo     L   Card lab      - stand up any card on its own board and test what it does
echo     N   Host a game over the network for a friend
echo     Q   Quit
echo.
echo   You can come straight back here afterwards to switch - build a deck,
echo   then play it against the bot, without restarting anything.
echo.
set "CHOICE="
set /p "CHOICE=  Choose (or just press Enter for Winota):  "
if not defined CHOICE set "CHOICE=1"

REM All three must be cleared on every pass. Coming back to the menu with a
REM deck still set from last time would otherwise overwrite the URL further
REM down and send you into a bot game when you asked for the deck builder.
set "NETWORK="
set "URL="
set "MYDECK="

REM These keys must each be a word from the matching deck's name in
REM packages/engine/src/archetypes.ts - the web app picks the deck whose name
REM contains the key. If the archetypes there change, change these too, or a
REM number will quietly fall back to the default game (which is how choosing
REM "green" here used to load the white deck once Winota and Blech replaced the
REM old green and red decks).
if /i "%CHOICE%"=="1" set "MYDECK=winota"
if /i "%CHOICE%"=="2" set "MYDECK=radiant"
if /i "%CHOICE%"=="3" set "MYDECK=blech"
if /i "%CHOICE%"=="4" set "MYDECK=gravebound"
if /i "%CHOICE%"=="5" set "MYDECK=tidewall"
if /i "%CHOICE%"=="6" set "MYDECK=felix"
if /i "%CHOICE%"=="7" set "MYDECK=winter"
if /i "%CHOICE%"=="D" set "URL=http://localhost:%PORT%/?mode=deck"
if /i "%CHOICE%"=="L" set "URL=http://localhost:%PORT%/?mode=lab"
if /i "%CHOICE%"=="N" set "NETWORK=1"
if /i "%CHOICE%"=="Q" exit /b 0

if defined NETWORK set "URL=http://localhost:%PORT%/?mode=network&seat=donny"

REM A deck number was chosen: give the bot a random one of the other four.
if defined MYDECK (
  call :pickOpponent "%MYDECK%"
  set "URL=http://localhost:%PORT%/?mode=bot&deck=!MYDECK!&vs=!THEIRDECK!"
)

if not defined URL (
  echo.
  echo   "%CHOICE%" isn't one of the options - try again.
  timeout /t 2 >nul
  goto menu
)

cls

REM Build once per launcher session. The web app reads the engine from its
REM compiled output (see CLAUDE.md), so this has to happen before it starts -
REM but there's no reason to repeat it every time you come back to the menu.
if not defined BUILT (
  echo.
  echo   Getting the game ready - this takes a few seconds the first time.
  echo.
  call npm run build -w @mtg-commander-sim/engine
  if errorlevel 1 goto buildfailed
  call npm run build -w @mtg-commander-sim/protocol
  if errorlevel 1 goto buildfailed
  call npm run build -w @mtg-commander-sim/bot
  if errorlevel 1 goto buildfailed
  set "BUILT=1"
)

if defined NETWORK if not defined SERVERUP (
  echo.
  echo   Starting the game server in its own window...
  start "MTG Commander Sim - game server" cmd /k "cd /d "%PROJECT%" && npm run dev -w @mtg-commander-sim/server"
  set "SERVERUP=1"
  timeout /t 3 >nul
)

REM Is the web app serving yet? Asked as a page request rather than a port
REM check, because the dev server listens on IPv6 [::1] only - a plain
REM 127.0.0.1 socket check never sees it and the browser would never open.
call :webAppRunning
if errorlevel 1 (
  echo.
  echo   Starting the web app in its own window...
  echo.
  REM Its own window, so THIS one stays free to bring the menu back. That is
  REM what lets you leave the deck builder and start a bot game without
  REM restarting anything.
  start "MTG Commander Sim - web app  (KEEP OPEN)" cmd /k "cd /d "%PROJECT%" && npm run dev -w @mtg-commander-sim/client"

  echo   Waiting for it to come up...
  powershell -NoProfile -Command "for($i=0;$i -lt 120;$i++){ try{ $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://localhost:%PORT%/'; exit 0 }catch{ Start-Sleep -Milliseconds 500 } }; exit 1"
  if errorlevel 1 (
    echo.
    echo   The web app didn't start. Check the "web app" window for the error.
    echo.
    pause
    goto menu
  )
)

start "" "%URL%"

cls
echo.
echo   ===========================================
echo             M T G   C O M M A N D E R
echo   ===========================================
echo.
echo   Opened in your browser.
echo.
echo   The web app is running in its own window, titled
echo     "MTG Commander Sim - web app  (KEEP OPEN)"
echo   Keep that one open while you play. This window is just the menu.
echo.
if defined NETWORK (
  echo   Your friend joins from another computer on your network at:
  echo     http://YOUR-IP-ADDRESS:%PORT%/?mode=network^&seat=mike
  echo   Run  ipconfig  in a terminal to find YOUR-IP-ADDRESS.
  echo.
)
echo   ---------------------------------------------------------------
echo.
echo     M   Back to the main menu - pick a different deck or mode
echo     Q   Close this menu (the game keeps running)
echo.
set "AGAIN="
set /p "AGAIN=  Choose (or just press Enter for the menu):  "
if /i "%AGAIN%"=="Q" exit /b 0
goto menu

REM Exits 0 when the web app is already serving, 1 when it isn't.
:webAppRunning
powershell -NoProfile -Command "try{ $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://localhost:%PORT%/'; exit 0 }catch{ exit 1 }" >nul 2>&1
exit /b !errorlevel!

:buildfailed
echo.
echo   Something went wrong while building the game.
echo   The error is above. Nothing was started.
echo.
pause
exit /b 1

REM Picks a random deck that isn't the one the player chose.
:pickOpponent
set "POOL=winota radiant blech gravebound tidewall felix winter"
set "PICKED="
:reroll
set /a "N=(%RANDOM% %% 7) + 1"
for /f "tokens=%N%" %%D in ("%POOL%") do set "PICKED=%%D"
if /i "%PICKED%"=="%~1" goto reroll
set "THEIRDECK=%PICKED%"
exit /b 0
