!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHELL_CONTEXT "Software\Classes\JSON Document\DefaultIcon" "" "$INSTDIR\json-file-icon-forge.ico"
  !insertmacro UPDATEFILEASSOC
!macroend
