'use client'

import {useEffect, useState} from "react"
import {ParserError, parseWithParentheses} from "@/app/parser.mjs"

export default function Home() {
    const [valid, setValidity] = useState(true)
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('0')
    const [tooltip, setTooltip] = useState('')
    const [toolTipX, setToolTipX] = useState(0)
    const [toolTipY, setToolTipY] = useState(0)
    const [currentPrompt, setCurrentPrompt] = useState('')
    const [screenWidth, setScreenWidth] = useState(0)
    const [resetCursorPos, setResetCursorPos] = useState(-1)

    useEffect(() => {
        if (currentPrompt === '') {
            setCurrentPrompt(inputHints[Math.floor(Math.random() * inputHints.length)])

            // set the screen width
            setScreenWidth(window.innerWidth)
            // add event listener to update the screen width
            window.addEventListener('resize', () => {
                setScreenWidth(window.innerWidth)
            })
        }

        try {
            // focus input
            document.getElementById('input').focus()
        } catch (error) {
            // ignore
        }
    }, [currentPrompt]);

    useEffect(() => {
        if (resetCursorPos !== -1) {
            document.getElementById('input').setSelectionRange(resetCursorPos, resetCursorPos)
            setResetCursorPos(-1)
        }
    }, [resetCursorPos])

    const onChangedTextField = (newValue) => {
        let cursorPosition = document.getElementById('input').selectionStart
        if (newValue.length === input.length + 1) {
            let inputChar = newValue.charAt(cursorPosition - 1)
            if (inputChar === '(') {
                // insert a closing bracket
                newValue = newValue.substring(0, cursorPosition) + ')' + newValue.substring(cursorPosition)
                setResetCursorPos(cursorPosition)
            } else if (inputChar === ')') {
                // Check if the next character is also a closing bracket, if yes, remove it
                if (newValue.charAt(cursorPosition) === ')') {
                    newValue = newValue.substring(0, cursorPosition) + newValue.substring(cursorPosition + 1)
                    setResetCursorPos(cursorPosition)
                }
            }
        } else if (newValue.length === input.length - 1) {
            let removedChar = input.charAt(cursorPosition)
            if (removedChar === '(') {
                let nextChar = newValue.charAt(cursorPosition)
                if (nextChar === ')') {
                    newValue = newValue.substring(0, cursorPosition) + newValue.substring(cursorPosition + 1)
                    setResetCursorPos(cursorPosition)
                }
            }
        }

        setInput(newValue)

        try {
            let data = parseWithParentheses(newValue, true)
            setValidity(true)
            setOutput(data.toLocaleString(navigator.language, {useGrouping: false}))
        } catch (error) {
            setValidity(false)
            setOutput(error.message)
            if (error.type !== ParserError) {
                console.log(error)
            }
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">

            <div className="flex flex-col items-center justify-center">
                <input
                    id="input"
                    autoFocus={false}
                    // no outline, no box shape etc., only shows the text
                    className="bg-transparent text-white text-6xl p-4 m-4 text-center outline-none caret-red-500"
                    type="text"
                    style={{width: screenWidth * 0.8}}
                    value={input}
                    placeholder={currentPrompt}
                    onChange={(e) => {
                        onChangedTextField(e.target.value)
                    }}
                    onAbort={(_) => {
                        setTooltip('')
                        setToolTipX(0)
                        setToolTipY(0)
                    }}
                    onInput={(_) => {
                        setTooltip('')
                        setToolTipX(0)
                        setToolTipY(0)
                    }}
                    onBlur={(_) => {
                        setTooltip('')
                        setToolTipX(0)
                        setToolTipY(0)
                        document.getElementById('input').focus()
                    }}
                    onSelect={(e) => {
                        // get the selected text
                        let start = e.nativeEvent.target.selectionStart
                        let end = e.nativeEvent.target.selectionEnd
                        if (start === undefined || end === undefined || start === end) {
                            setTooltip('')
                            setToolTipX(0)
                            setToolTipY(0)
                            return
                        }
                        let text = e.nativeEvent.target.value.substring(start, end)
                        let result = parseWithParentheses(text, true)

                        let posX = e.nativeEvent.target.x
                        let posY = e.nativeEvent.target.y

                        // show the tooltip
                        setTooltip(result.toLocaleString(navigator.language, {useGrouping: false}))
                        setToolTipX(posX)
                        setToolTipY(posY)
                    }}
                />
            </div>
            {/*    the tooltip that moves with the mouse, if tooltip is empty, don't show it*/}
            {tooltip === '' ? '' :
                <div className="absolute bg-gray-900 text-white p-2 rounded-md"
                     style={{left: toolTipX, top: toolTipY}}>
                    {tooltip}
                </div>
            }
            {/*    Button showing the result, click to copy if valid*/}
            <button
                className={valid ? "bg-gray-900 text-white p-2 rounded-md" : "bg-red-900 text-white p-2 rounded-md"}
                onClick={() => {
                    if (valid) {
                        navigator.clipboard.writeText(output).then(_ => {
                        })
                    }
                }}
            >
                {output}
            </button>
        </main>
    )
}

const inputHints = [
    "Fang an zu rechnen...",
    "Berechne das Ergebnis...",
    "Gib ein paar Formeln ein...",
    "Mathematik macht Spaß - Los geht's!",
    "Was ist nur die Lösung?",
    "Schreibe deine Berechnung...",
    "Stelle deine Kenntnisse auf die Probe!",
    "Denken, Rechnen, Überprüfen...",
    "Mathematik!!!",
    "Du fragst, ich antworte!",
    "Mathe war noch nie so einfach!",
    "Berechne das Resultat... Bitte?",
    "Chat-GPT kann auch kein Mathe",
    "Was war nochmal 7 mal 8?",
    "Nicht schon wieder KEMDAS...",
    "Immer so große Zahlen...",
    "Mathe war auch nie mein Lieblingsfach.",
    "Ich könnte es auch nicht besser...",
];
