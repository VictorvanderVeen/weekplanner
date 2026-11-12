-- Afspraken van vandaag uit "Werk kalender" (BusyCal-accounts, via Calendar.app).
-- Uitvoer: één regel per afspraak, tab-gescheiden: HH:MM <tab> HH:MM <tab> titel <tab> locatie
-- Hele-dag-afspraken krijgen "hele dag" als begintijd en een lege eindtijd.
-- Gebruikt door morning-brief.mjs. Traag (~2 min) door de whose-filter op een
-- kalender met herhalende afspraken; eigenschappen daarom in één keer ophalen.

on hhmm(d)
	set h to hours of d
	set m to minutes of d
	return (text -2 thru -1 of ("0" & h)) & ":" & (text -2 thru -1 of ("0" & m))
end hhmm

on run
	set todayStart to current date
	set time of todayStart to 0
	set todayEnd to todayStart + 1 * days
	set output to ""
	tell application "Calendar"
		tell calendar "Werk kalender"
			set theEvents to (every event whose start date ≥ todayStart and start date < todayEnd)
			repeat with e in theEvents
				set p to properties of e
				set loc to location of p
				if loc is missing value then set loc to ""
				set ttl to summary of p
				if ttl is missing value then set ttl to ""
				if allday event of p then
					set t1 to "hele dag"
					set t2 to ""
				else
					set t1 to my hhmm(start date of p)
					set t2 to my hhmm(end date of p)
				end if
				set output to output & t1 & tab & t2 & tab & ttl & tab & loc & linefeed
			end repeat
		end tell
	end tell
	return output
end run
