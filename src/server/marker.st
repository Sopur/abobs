"marker.st"
"------------------------------------------------------------
 This is a utility class that trims JSON code block markers
 Basically the '```json' and the ending '```'
------------------------------------------------------------"
Object subclass: #MarkerUtils
    instanceVariableNames: ''
    classVariableNames: ''
    poolDictionaries: ''
    category: 'Utilities'.

MarkerUtils class >> trimMarkers: aString
    | trimmed |
    trimmed := aString.
    (aString beginsWith: '```json') ifTrue: [
        trimmed := trimmed copyFrom: ('```json' size + 1) to: trimmed size.
    ].
    (trimmed endsWith: '```') ifTrue: [
        trimmed := trimmed copyFrom: 1 to: trimmed size - 3.
    ].
    ^ trimmed
