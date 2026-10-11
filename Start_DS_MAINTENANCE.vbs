' DS MAINTENANCE — Silent Standalone Launcher (No Console / No C++ Window)
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strAppDir = fso.GetParentFolderName(WScript.ScriptFullName)
strExePath = strAppDir & "\dist\DS_MAINTENANCE\DS_MAINTENANCE.exe"

WshShell.CurrentDirectory = strAppDir

If fso.FileExists(strAppDir & "\DS_MAINTENANCE.exe") Then
    WshShell.Run """" & strAppDir & "\DS_MAINTENANCE.exe""", 0, False
ElseIf fso.FileExists(strExePath) Then
    WshShell.Run """" & strExePath & """", 0, False
Else
    strLocalApp = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
    strPy = strLocalApp & "\Programs\Python\Python312\pythonw.exe"
    If fso.FileExists(strPy) Then
        WshShell.Run """" & strPy & """ """ & strAppDir & "\app.py""", 0, False
    Else
        WshShell.Run "pythonw """ & strAppDir & "\app.py""", 0, False
    End If
End If
