Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

If CreateObject("Scripting.FileSystemObject").FileExists("DS_MAINTENANCE.exe") Then
    WshShell.Run """DS_MAINTENANCE.exe""", 0, False
ElseIf CreateObject("Scripting.FileSystemObject").FileExists("dist\DS_MAINTENANCE\DS_MAINTENANCE.exe") Then
    WshShell.Run """dist\DS_MAINTENANCE\DS_MAINTENANCE.exe""", 0, False
ElseIf CreateObject("Scripting.FileSystemObject").FileExists("dist\DS_Maintenance_Suite\DS_Maintenance_Suite.exe") Then
    WshShell.Run """dist\DS_Maintenance_Suite\DS_Maintenance_Suite.exe""", 0, False
ElseIf CreateObject("Scripting.FileSystemObject").FileExists("dist\DS_Maintenance_Suite.exe") Then
    WshShell.Run """dist\DS_Maintenance_Suite.exe""", 0, False
Else
    WshShell.Run "pythonw app.py", 0, False
End If
