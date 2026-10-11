Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strAppDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strAppDir

strLocalApp = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
strPy = strLocalApp & "\Programs\Python\Python312\pythonw.exe"
If fso.FileExists(strPy) Then
    WshShell.Run """" & strPy & """ """ & strAppDir & "\app.py""", 0, False
Else
    WshShell.Run "pythonw """ & strAppDir & "\app.py""", 0, False
End If
