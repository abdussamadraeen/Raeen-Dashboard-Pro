' Runs the Raeen Tor & Privacy Bridge Daemon silently in the background
' No command window, no popup, zero interference.
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
daemonScript = scriptDir & "\vpn-daemon.cjs"
WshShell.Run "node """ & daemonScript & """", 0, False
