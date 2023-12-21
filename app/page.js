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

    if (currentPrompt === '') {
        setCurrentPrompt(germanPrompts[Math.floor(Math.random() * germanPrompts.length)])
    }
    useEffect(() => {
        try {
            // focus input
            document.getElementById('input').focus()
        } catch (error) {
            // ignore
        }
    }, []);

    const onChangedTextField = (newValue) => {
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
            <TextField
                input={input}
                onChanged={onChangedTextField}
                onTooltipChanged={(tooltip, x, y) => {
                    setTooltip(tooltip)
                    setToolTipX(x)
                    setToolTipY(y)
                }}
                currentPrompt={currentPrompt}
            />
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

const germanPrompts = [
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

function TextField({input, onChanged, onTooltipChanged, currentPrompt}) {
    return (
        <div className="flex flex-col items-center justify-center">
            <input
                id="input"
                autoFocus={false}
                // no outline, no box shape etc., only shows the text
                className="bg-transparent text-white text-6xl p-4 m-4 text-center outline-none caret-red-500"
                type="text"
                style={{width: window.innerWidth * 0.8}}
                value={input}
                placeholder={currentPrompt}
                onChange={(e) => {
                    onChanged(e.target.value)
                }}
                onAbort={(_) => {
                    onTooltipChanged('', 0, 0)
                }}
                onInput={(_) => {
                    onTooltipChanged('', 0, 0)
                }}
                onBlur={(_) => {
                    onTooltipChanged('', 0, 0)
                    document.getElementById('input').focus()
                }}
                onSelect={(e) => {
                    // get the selected text
                    let start = e.nativeEvent.target.selectionStart
                    let end = e.nativeEvent.target.selectionEnd
                    if (start === undefined || end === undefined || start === end) {
                        onTooltipChanged('', 0, 0)
                        return
                    }
                    let text = e.nativeEvent.target.value.substring(start, end)
                    let result = parseWithParentheses(text, true)

                    let posX = e.nativeEvent.target.x
                    let posY = e.nativeEvent.target.y

                    // show the tooltip
                    onTooltipChanged(result.toLocaleString(navigator.language, {useGrouping: false}), posX, posY)
                }}
            />
        </div>
    )
}
