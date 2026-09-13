# Richard (the ops app) for browser UI checks.
#
# Separate from run-alfred.ps1 on purpose: that script points at a
# "Budget App\Alfred" folder that does not exist on this machine, so the
# preview it starts never comes up. The real app is in "Budget App\Richard".
#
# RICHARD_DISABLE_AUTH_LOCAL is the escape hatch middleware.ts honours in
# development builds only, so the browser tools get the app instead of a 401
# and no password is ever read or transmitted.
$env:Path = "C:\Program Files\nodejs;" + $env:Path
$env:RICHARD_DISABLE_AUTH_LOCAL = "true"
Set-Location "C:\Users\ackal\Downloads\Budget App\Richard"
npm run dev -- --port 3947
