'use client'

import {useEffect, useState} from "react"
import {charFromMode, ParserError, parseWithParentheses} from "@/app/parser.mjs"

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
    const [copyClicked, setCopyClicked] = useState(false)

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
        let text = document.getElementById('input').value.substring(start, end)
        let result = parseWithParentheses(text, false)

        let posX = document.getElementById('input').x
        let posY = document.getElementById('input').y

        // show the tooltip
        setToolTipX(posX)
        setToolTipY(posY)
        setTooltip(result.toLocaleString(navigator.language, {
            useGrouping: false,
            maximumFractionDigits: 10
        }))
    }

    const onSubmit = (e) => {
        e.preventDefault();

        // If the result is the same as the input, do nothing
        // Same thing if an animation is already playing
        if (output === input || submitAnimation !== "") {
            return
        }

        // If invalid, do shake animation
        if (!valid) {
            setSubmitAnimation("shake-horizontal");
            setTimeout(() => {
                setSubmitAnimation("");
            }, 700);
            return
        }

        setSubmitAnimation("fade-out-right");
        setTimeout(() => {
            setInput(output);
            setSubmitAnimation("");
            // set the cursor to the end of the new input
            document.getElementById('input').setSelectionRange(output.length, output.length)
        }, 700);
    }

    useEffect(() => {
        if (currentPrompt === '') {
            randomizePrompt()

            // set the screen width
            setScreenWidth(window.innerWidth)
            // add event listener to update the screen width
            window.addEventListener('resize', () => {
                setScreenWidth(window.innerWidth)
            })
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

        if (newValue === '') {
            randomizePrompt()
        }

        try {
            let data = parseWithParentheses(newValue, true)
            setValidity(true)
            setOutput(data.toLocaleString(navigator.language, {useGrouping: false, maximumFractionDigits: 10}))
        } catch (error) {
            setValidity(false)
            setOutput(error.message)
                if (error.type !== ParserError) {
                console.log(error)
            }
        }
    }

    /**
     * TODO: UI Elements
     * - history to right side
     * - input buttons (0-9, ., +, -, *, /, !, %, (, ), =, backspace, clear)
     * - somehow implement Pi, e, etc.
     * - slide input to right on enter, slide history down by one, fade output up into input field
     */

    return (
        <main
            className="flex min-h-screen flex-col items-center p-24"
            onMouseMove={(_) => setSelectionArea()}
        >

            {/**Input row*/}
            <div className="flex flex-col items-center justify-center">
                <div id="container">
                    {/**Input overlay to fade the output in, up and over the input field*/}
                    <input
                        id="input-overlay"
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
                    >
                    </input>

                    <form onSubmit={onSubmit}>
                        <input
                            id="input"
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
            {/*    Button showing the result, click to copy if valid*/}
            <button
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
        </main>
    )
}
