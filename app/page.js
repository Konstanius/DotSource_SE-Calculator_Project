'use client'

import {useEffect, useState} from "react"
import {charFromMode, ParserError, parseWithParentheses} from "@/app/parser_rev2.mjs"
import {HistoryDisplay, HistoryEntry} from "@/app/history";

export default function Home() {
    const [valid, setValidity] = useState(true)
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('0')
    const [tooltip, setTooltip] = useState('')
    const [toolTipX, setToolTipX] = useState(0)
    const [toolTipY, setToolTipY] = useState(0)
    const [currentPrompt, setCurrentPrompt] = useState('')
    const [screenWidth, setScreenWidth] = useState(0)
    const [screenHeight, setScreenHeight] = useState(0)
    const [resetCursorPos, setResetCursorPos] = useState(-1)
    const [copyClicked, setCopyClicked] = useState(false)
    const [history, setHistory] = useState([])
    const [buttonsHeight, setButtonsHeight] = useState(640)

    // Animation "controller", controlling the animation of:
    // - the submit button
    // - the input field
    // - the history field
    // - the input overlay (to fade the new value into the input field)
    const [submitAnimation, setSubmitAnimation] = useState("")

    function setSelectionArea() {
        let start = document.getElementById('input').selectionStart
        let end = document.getElementById('input').selectionEnd
        if (start === undefined || end === undefined || start === end) {
            setTooltip('')
            setToolTipX(0)
            setToolTipY(0)
            return
        }

        let posX = document.getElementById('input').x
        let posY = document.getElementById('input').y
        setToolTipX(posX)
        setToolTipY(posY)

        try {
            let text = document.getElementById('input').value.substring(start, end)
            let result = parseWithParentheses(text, false, 0, 0)

            // show the tooltip
            setTooltip(result[0].toNumber().toLocaleString(navigator.language, {
                useGrouping: false,
                maximumFractionDigits: 10
            }))
        } catch (error) {
            setTooltip("Ungültiger Ausdruck")
        }
    }

    const onSubmit = (e) => {
        e.preventDefault();

        // If the result is the same as the input, do nothing
        // Same thing if an animation is already playing
        if (output === input || submitAnimation !== "" || input.replaceAll(" ", "") === "") {
            return
        }

        // If invalid, do shake animation
        if (!valid) {
            setSubmitAnimation("shake-horizontal");
            setTimeout(() => {
                setSubmitAnimation("");
            }, 500);
            return
        }

        // Save to history, if the input is different from the last entry
        let lastEntry = HistoryEntry.getLast()
        if (lastEntry === null || lastEntry.input !== input) {
            let historyEntry = new HistoryEntry(HistoryEntry.getNextId(), Date.now(), input, output)
            historyEntry.save()
            setHistory([...HistoryEntry.getAll()])
            setSubmitAnimation("fade-out-right");
        } else {
            setSubmitAnimation("fade-out");
        }

        setTimeout(() => {
            onChangedTextField(output)
            setSubmitAnimation("");
            // set the cursor to the end of the new input
            document.getElementById('input').setSelectionRange(output.length, output.length)
        }, 500);
    }

    useEffect(() => {
        if (currentPrompt === '') {
            randomizePrompt()

            // set the screen width
            setScreenWidth(window.innerWidth)
            setScreenHeight(window.innerHeight)
            setButtonsHeight(window.innerHeight - document.getElementById('input').clientHeight - document.getElementById('result').clientHeight - 24 * 4)

            // add event listener to update the screen width
            window.addEventListener('resize', () => {
                setScreenWidth(window.innerWidth)
                setScreenHeight(window.innerHeight)
                setButtonsHeight(window.innerHeight - document.getElementById('input').clientHeight - document.getElementById('result').clientHeight - 24 * 4)
            })

            setHistory([...HistoryEntry.getAll()] || [])
            onChangedTextField(localStorage.getItem("input") || '')
        }

        try {
            // focus input
            const inputElement = document.getElementById('input');
            const cursorPosition = inputElement.selectionStart;

            // focus input
            inputElement.focus();

            // restore cursor position
            inputElement.setSelectionRange(cursorPosition, cursorPosition);
        } catch (error) {
            // ignore
        }
    }, [currentPrompt])

    function randomizePrompt() {
        // Generate a random prompt of the format: a (operator) b (c (operator) d(% or !)) e(% or !)
        // Random numbers between 1 and 55
        function randomNum() {
            return Math.floor(Math.random() * 55) + 1
        }

        function randomOp() {
            return charFromMode(Math.floor(Math.random() * 4) + 1)
        }

        function randomOp2() {
            let random = Math.random()
            // either ! or % or nothing (~60 % chance for nothing)
            switch (Math.floor(random * 5)) {
                case 0:
                    return '!'
                case 1:
                    return '%'
                default:
                    return ''
            }
        }

        let prompt = randomNum() + randomOp2() + randomOp() + randomNum() + randomOp2() + randomOp() + "(" + randomNum() + randomOp2() + randomOp() + randomNum() + randomOp2() + ")" + randomOp2() + randomOp() + randomNum() + randomOp2()
        setCurrentPrompt(prompt)
    }

    useEffect(() => {
        if (resetCursorPos === -1) return
        document.getElementById('input').setSelectionRange(resetCursorPos, resetCursorPos)
        setResetCursorPos(-1)
    }, [resetCursorPos])

    useEffect(() => {
        if (copyClicked) {
            setTimeout(() => {
                setCopyClicked(false)
            }, 750)
        }
    }, [copyClicked]);

    const onChangedTextField = (newValue) => {
        if (newValue === input) return

        let cursorPosition = document.getElementById('input').selectionStart
        if (newValue.length === input.length + 1) {
            let inputChar = newValue.charAt(cursorPosition - 1)
            if (inputChar === '(') {
                // insert a closing bracket after the opening bracket
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
                // Check if the next character is a closing bracket, if yes, remove it
                let nextChar = newValue.charAt(cursorPosition)
                if (nextChar === ')') {
                    newValue = newValue.substring(0, cursorPosition) + newValue.substring(cursorPosition + 1)
                    setResetCursorPos(cursorPosition)
                }
            }
        }

        setInput(newValue)
        localStorage.setItem("input", newValue)

        if (newValue === '') {
            randomizePrompt()
        }

        try {
            let data = parseWithParentheses(newValue, true, 0, 0)
            setValidity(true)
            setOutput(data[0].toNumber().toLocaleString(navigator.language, {
                useGrouping: false,
                maximumFractionDigits: 10
            }))
        } catch (error) {
            setValidity(false)
            if (error.constructor !== ParserError) {
                setOutput(error.message)
                console.log(error)
            } else {
                setOutput(error.message + " " + error.index)
            }
        }
    }

    /**
     * TODO: UI Elements
     * - somehow implement Pi, e, etc.
     * - toggle between decimal and fraction representation of the result
     * - while the page is loading, buttons display weirdly
     * - make the result look better
     * - when entering via keyboard, make buttons also act as if they were pressed
     */

    let rows = [[], [], [], [], [], []]

    function addButton(row, title, isNumber, isSpecial, onClickAdd, onClick) {
        let style = "calc-button"
        if (isNumber) {
            style += " calc-number"
        }
        if (isSpecial) {
            style += " calc-special"
        }

        rows[row].push(
            <button
                key={"button_" + row + "_" + title}
                className={style}
                style={{height: 'calc(' + buttonsHeight / 6 + 'px - 1rem)'}}
                onClick={() => {
                    if (onClick !== undefined) {
                        onClick()
                        return
                    }

                    // if the selection is not empty, replace range, otherwise append / insert
                    let inputElement = document.getElementById('input')
                    let start = inputElement.selectionStart
                    let end = inputElement.selectionEnd
                    let newValue = input.substring(0, start) + onClickAdd + input.substring(end)
                    onChangedTextField(newValue)
                    setResetCursorPos(start + onClickAdd.length)
                }}>{title}</button>)
    }

    addButton(0, "%", false, false, "%")
    addButton(0, "", false, false, "")
    addButton(0, "<--", false, true, "", () => {
        if (input.length === 0) return
        let inputElement = document.getElementById('input')
        let cursorPosition = inputElement.selectionStart
        let newValue = input.substring(0, cursorPosition - 1) + input.substring(cursorPosition)
        onChangedTextField(newValue)
        setResetCursorPos(cursorPosition - 1)
    })
    addButton(0, "C", false, true, "", () => onChangedTextField(""))
    addButton(1, "(", false, false, "(")
    addButton(1, ")", false, false, ")")
    addButton(1, "n!", false, false, "!")
    addButton(1, "/", false, false, "/")
    addButton(2, "7", true, false, "7")
    addButton(2, "8", true, false, "8")
    addButton(2, "9", true, false, "9")
    addButton(2, "*", false, false, "*")
    addButton(3, "4", true, false, "4")
    addButton(3, "5", true, false, "5")
    addButton(3, "6", true, false, "6")
    addButton(3, "-", false, false, "-")
    addButton(4, "1", true, false, "1")
    addButton(4, "2", true, false, "2")
    addButton(4, "3", true, false, "3")
    addButton(4, "+", false, false, "+")
    addButton(5, "0", true, false, "0")
    addButton(5, ".", true, false, ".")
    addButton(5, "", false, false, "")
    addButton(5, "=", false, true, "", () => onSubmit({
        preventDefault: () => {
        }
    }))

    return (
        <main
            id="main"
            style={{width: screenWidth, height: screenHeight}}
            className="flex min-h-screen flex-col items-center p-24"
            onMouseMove={(_) => {
                if (!_.buttons) return // only if mouse is pressed, since only then selection is possible
                setSelectionArea()
            }}>

            {/**Input row*/}
            <div id="top-element" className="flex flex-col items-center justify-center">
                <div id="container">
                    {/**Input overlay to fade the output in, up and over the input field*/}
                    <div hidden={!valid}>
                        <input
                            id="input-overlay"
                            inputMode='none'
                            className="
                            absolute bg-gray-900 rounded-md
                            smooth-transition
                            content-center
                            bg-transparent
                            text-white text-6xl p-4 m-4 text-center
                            lcd-font
                            outline-none"
                            style={{
                                left: 0,
                                top: 0,
                                zIndex: -5,
                                opacity: submitAnimation === "fade-out-right" ? 1 : 0,
                                width: screenWidth * 0.8
                            }}
                            type="text"
                            value={output}
                            readOnly={true}
                        />
                    </div>

                    <form onSubmit={onSubmit}>
                        <input
                            id="input"
                            inputMode='none'
                            autoFocus={false}
                            // no outline, no box shape etc., only shows the text
                            className={`
                        bg-transparent
                        text-white text-6xl p-4 m-4 text-center
                        outline-none
                        caret-red-500
                        lcd-font
                        ${submitAnimation}
                        `}
                            type="text"
                            style={{width: screenWidth * 0.8}}
                            value={input}
                            readOnly={submitAnimation !== ""}
                            placeholder={currentPrompt}
                            onChange={(e) => onChangedTextField(e.target.value)}
                            onAbort={(_) => {
                                setToolTipX(0)
                                setToolTipY(0)
                                setTooltip('')
                            }}
                            onBlur={(_) => {
                                setToolTipX(0)
                                setToolTipY(0)
                                setTooltip('')

                                // TODO this is not perfect to keep the cursor in position, but it is the best for now
                                // pause for 10 ms and then clear the selection
                                setTimeout(() => {
                                    const inputElement = document.getElementById('input');
                                    const cursorPosition = inputElement.selectionStart;

                                    // focus input
                                    inputElement.focus();

                                    // restore cursor position
                                    inputElement.setSelectionRange(cursorPosition, cursorPosition);
                                }, 1)
                            }}
                            onInput={(_) => {
                                setToolTipX(0)
                                setToolTipY(0)
                                setTooltip('')
                            }}
                            onClick={async (_) => {
                                // pause for 10 ms
                                await new Promise(r => setTimeout(r, 10))

                                // get the selected text
                                let start = document.getElementById('input').selectionStart
                                let end = document.getElementById('input').selectionEnd
                                if (start === undefined || end === undefined || start === end) {
                                    setTooltip('')
                                    setToolTipX(0)
                                    setToolTipY(0)
                                }
                            }}
                            onSelect={(_) => setSelectionArea()}
                        />
                    </form>
                </div>
            </div>

            {/* TODO animate smooth transition */}
            {/**Selection Tooltip*/}
            {tooltip === '' ? '' :
                <div className="absolute bg-gray-900 text-white p-2 rounded-md smooth-transition"
                     style={{left: toolTipX, top: toolTipY}}>
                    {tooltip}
                </div>
            }

            {/*    empty row with 2 elements, equally sized left to right, max width 0.8 screen*/}
            <div className="flex flex-row justify-between">
                <div style={{width: screenWidth * 0.55}}>
                    {/*    Button showing the result, click to copy if valid and animation isn't playing currently*/}
                    <button
                        id="result"
                        disabled={!valid || copyClicked}
                        className={!copyClicked ?
                            (valid ? "bg-gray-900 text-white p-2 rounded-md smooth-transition" : "bg-red-900 text-white p-2 rounded-md smooth-transition")
                            : "bg-green-900 text-white p-2 rounded-md smooth-transition"}
                        onClick={() => {
                            if (valid) {
                                navigator.clipboard.writeText(output).then(/*ignored*/)
                                setCopyClicked(true)
                            }
                        }}
                    >
                        {copyClicked ? "Ergebnis kopiert!" : output}
                        {/* TODO animate smooth transition between valid / invalid and button clicked */}
                        {/* TODO animate the individual numbers to increase / decrease */}
                    </button>

                    {/*    Buttons*/}
                    <div className="flex flex-col" style={{height: 'calc(' + buttonsHeight + 'px - 1rem)',}}>
                        {rows.map((row, index) => {
                            return (
                                <div key={"row_" + index} className="flex flex-row">
                                    {row.map((button) => {
                                        return button
                                    })}
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div style={{width: screenWidth * 0.35}}>
                    <HistoryDisplay setInput={onChangedTextField} history={history} setHistory={setHistory}/>
                </div>
            </div>
        </main>
    )
}
