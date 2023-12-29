'use client'

import {useEffect, useState} from "react"
import {charFromMode, ParserError, parseWithParentheses} from "@/app/parser_rev2.mjs"
import {HistoryDisplay, HistoryEntry} from "@/app/history"

export default function Home() {
    // States
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
    const [buttonsHeight, setButtonsHeight] = useState(0)
    let [roundResults, setRoundResults] = useState(false) // Not const, since an immediate change of roundResults is needed sometimes

    // Animation "controller", controlling the animation of:
    // - the submit button
    // - the input field
    // - the history field
    // - the input overlay (to fade the new value into the input field)
    const [submitAnimation, setSubmitAnimation] = useState("")

    // Once, on client side, set the roundResults variable immediately, to not cause any state problems
    if (typeof window !== 'undefined' && currentPrompt === '') {
        roundResults = localStorage.getItem("roundResults") === "true"
    }

    // Turn an AccNum into a properly formatted string, taking into account the roundResults variable
    function getResultWithProperDisplay(input) {
        let result = input.toNumber().toLocaleString(navigator.language, {
            useGrouping: false,
            maximumFractionDigits: 15
        })

        let decimalCount = result.split(".")[1]?.length || 0

        if (!roundResults && decimalCount > 3) {
            input.shorten()
            if (input.denominator === 1) {
                result = input.numerator.toString()
            } else if (input.denominator === -1) {
                result = -input.numerator.toString()
            } else {
                result = input.numerator + "/" + input.denominator
            }
        }
        return result
    }

    // Set the tooltip to the selected text
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
            setTooltip(getResultWithProperDisplay(result[0]))
        } catch (error) {
            setTooltip("Ungültiger Ausdruck")
        }
    }

    // Submit the input
    const onSubmit = (e) => {
        e.preventDefault()

        // if input is same as output or input is empty or submit animation is running, do nothing
        if (output === input || submitAnimation !== "" || input.replaceAll(" ", "") === "") {
            return
        }

        // If invalid, do shake animation
        if (!valid) {
            setSubmitAnimation("shake-horizontal")
            setTimeout(() => {
                setSubmitAnimation("")
            }, 500)
            return
        }

        // Save to history, if the input is different from the last entry
        let lastEntry = HistoryEntry.getLast()
        if (lastEntry === null || lastEntry.input !== input) {
            let historyEntry = new HistoryEntry(HistoryEntry.getNextId(), Date.now(), input, output)
            historyEntry.save()
            setHistory([...HistoryEntry.getAll()])
            setSubmitAnimation("fade-out-right")
        } else {
            setSubmitAnimation("fade-out")
        }

        setTimeout(() => {
            onChangedTextField(output)
            setSubmitAnimation("")
            // set the cursor to the end of the new input
            document.getElementById('input').setSelectionRange(output.length, output.length)
        }, 500)
    }

    useEffect(() => {
        // Once, on clientside, set up the page
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
            // focus input  at all times
            const inputElement = document.getElementById('input')
            const cursorPosition = inputElement.selectionStart
            inputElement.focus()
            inputElement.setSelectionRange(cursorPosition, cursorPosition)
        } catch (error) {
            // ignore
        }
    }, [currentPrompt])

    // Generate a random prompt of the format: a (operator) b (operator) (c (operator) d) (operator) e
    function randomizePrompt() {
        // numbers are between 1 and 55 and have a chance to include a ! or % after them
        // operators are +, -, *, /
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

    // When resetCursorPos is called, we set the cursor position to the given value
    useEffect(() => {
        if (resetCursorPos === -1) return
        let inputElement = document.getElementById('input')
        inputElement.setSelectionRange(resetCursorPos, resetCursorPos)
        setResetCursorPos(-1)
    }, [resetCursorPos])

    // Animation management for the result button onClick
    useEffect(() => {
        if (copyClicked) {
            setTimeout(() => {
                setCopyClicked(false)
            }, 750)
        }
    }, [copyClicked])

    // Manages input in the text field
    const onChangedTextField = (newValue, cursorPosition) => {
        if (newValue === input && input === '') return // Prevent spam of clearing to get random prompts

        let inputElement = document.getElementById('input')
        if (cursorPosition === undefined && inputElement.selectionStart === 0) {
            cursorPosition = newValue.length
        } else if (cursorPosition === undefined) {
            cursorPosition = inputElement.selectionStart
        }
        if (newValue.length === input.length + 1) {
            let inputChar = newValue.charAt(cursorPosition - 1)
            if (inputChar === '(') {
                // insert a closing bracket after the opening bracket
                newValue = newValue.substring(0, cursorPosition) + ')' + newValue.substring(cursorPosition)
            } else if (inputChar === ')') {
                // Check if the next character is also a closing bracket, if yes, remove it
                if (newValue.charAt(cursorPosition) === ')') {
                    newValue = newValue.substring(0, cursorPosition) + newValue.substring(cursorPosition + 1)
                }
            }
        } else if (newValue.length === input.length - 1) {
            let removedChar = input.charAt(cursorPosition)
            if (removedChar === '(') {
                // Check if the next character is a closing bracket, if yes, remove it
                let nextChar = newValue.charAt(cursorPosition)
                if (nextChar === ')') {
                    newValue = newValue.substring(0, cursorPosition) + newValue.substring(cursorPosition + 1)
                }
            }
        }

        setInput(newValue)
        localStorage.setItem("input", newValue)
        setTimeout(() => {
            inputElement.blur()
            inputElement.focus()
        }, 3) // Delay, since setInput is not immediate

        if (newValue === '') {
            randomizePrompt()
        }

        try {
            let data = parseWithParentheses(newValue, true, 0, 0)
            setValidity(true)
            setOutput(getResultWithProperDisplay(data[0]))
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

    let rows = [[], [], [], [], [], []]

    // Method to populate button rows
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
                key={"button_" + row + "_" + rows[row].length}
                className={style}
                style={{height: 'calc(' + buttonsHeight / 6 + 'px - 1rem)'}}
                onClick={() => {
                    if (onClick !== undefined) {
                        onClick()
                        return
                    }

                    // if the selection is not empty, replace range, otherwise append / insert
                    // TODO this does not yet work
                    let inputElement = document.getElementById('input')
                    let start = inputElement.selectionStart
                    let end = inputElement.selectionEnd
                    let newValue = input.substring(0, start) + onClickAdd + input.substring(end)
                    onChangedTextField(newValue, start + onClickAdd.length)
                    setResetCursorPos(start + onClickAdd.length)
                }}>{screenHeight !== 0 ? title : ""}</button>)
    }

    // The actual buttons
    addButton(0, <i className="fa-solid fa-percent"></i>, false, false, "%")
    addButton(0, "", false, false, "")
    addButton(0, <i className="fa-solid fa-delete-left"></i>, false, true, "", () => {
        if (input.length === 0) return
        let inputElement = document.getElementById('input')
        let cursorPosition = inputElement.selectionStart
        let newValue = input.substring(0, cursorPosition - 1) + input.substring(cursorPosition)
        onChangedTextField(newValue)
        setResetCursorPos(cursorPosition - 1)
    })
    addButton(0, <i className="fa-solid fa-c"></i>, false, true, "", () => onChangedTextField(""))
    addButton(1, "(", false, false, "(")
    addButton(1, ")", false, false, ")")
    addButton(1, "n!", false, false, "!")
    addButton(1, <i className="fa-solid fa-divide"></i>, false, false, "/")
    addButton(2, "7", true, false, "7")
    addButton(2, "8", true, false, "8")
    addButton(2, "9", true, false, "9")
    addButton(2, <i className="fa-solid fa-xmark"></i>, false, false, "*")
    addButton(3, "4", true, false, "4")
    addButton(3, "5", true, false, "5")
    addButton(3, "6", true, false, "6")
    addButton(3, <i className="fa-solid fa-minus"></i>, false, false, "-")
    addButton(4, "1", true, false, "1")
    addButton(4, "2", true, false, "2")
    addButton(4, "3", true, false, "3")
    addButton(4, <i className="fa-solid fa-plus"></i>, false, false, "+")
    addButton(5, "0", true, false, "0")
    addButton(5, ".", true, false, ".")

    let content = <div className="flex flex-col items-center">
        <span
            className="ml-2"
            style={{fontSize: screenWidth < 1024 ? "0.8rem" : "1.4rem", fontWeight: "bold", color: "var(--color-text)"}}
        >Ergebnisse runden</span>
        {roundResults ? <i className="fa-solid fa-toggle-on"></i> : <i className="fa-solid fa-toggle-off"></i>}
    </div>
    addButton(5, content, false, false, "", () => {
        let newValue = !roundResults
        localStorage.setItem("roundResults", newValue.toString())
        roundResults = newValue
        setRoundResults(newValue)

        onChangedTextField(input)
    })

    addButton(5, <i className="fa-solid fa-equals"></i>, false, true, "", () => onSubmit({
        preventDefault: () => {
        }
    }))

    /**
     * TODO: UI Elements
     * - make the result look better
     * - when entering via keyboard, make buttons also act as if they were pressed
     * - input buttons get stuck on mobile sometimes
     * - optimize tooltip a bit
     * - make individual result digits increase / decrease when the result changes
     */

    return (
        <main
            id="main"
            style={{
                width: screenWidth,
                height: screenHeight,
                overflowX: "hidden",
                overflowY: (screenWidth < 1024) ? "auto" : "hidden"
            }}
            className="flex min-h-screen flex-col items-center p-24"
            onMouseMove={(_) => {
                if (!_.buttons) return // only if mouse is pressed, since only then the selection is possible
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
                            absolute
                            smooth-transition
                            content-center
                            bg-transparent
                            text-white text-6xl p-4 m-4 text-center
                            outline-none"
                            style={{
                                left: 0,
                                top: 0,
                                zIndex: -5,
                                opacity: submitAnimation === "fade-out-right" ? 1 : 0,
                                width: screenWidth * 0.8,
                                fontFamily: "Space Mono",
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
                            className={`
                                bg-transparent
                                text-white text-6xl p-4 m-4 text-center
                                outline-none
                                caret-red-500
                                ${submitAnimation}
                                `}
                            type="text"
                            style={{
                                width: screenWidth * 0.8,
                                fontFamily: "Space Mono",
                            }}
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

                                // pause for 10 ms and then clear the selection
                                setTimeout(() => {
                                    const inputElement = document.getElementById('input')
                                    const cursorPosition = inputElement.selectionStart

                                    // focus input
                                    inputElement.focus()

                                    // restore cursor position
                                    inputElement.setSelectionRange(cursorPosition, cursorPosition)
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
                        >
                        </input>
                    </form>
                </div>
            </div>

            {/**Selection Tooltip*/}
            {tooltip === '' ? '' :
                <div className="absolute bg-gray-900 text-white p-2 rounded-md smooth-transition"
                     style={{left: toolTipX, top: toolTipY}}>
                    {tooltip}
                </div>
            }

            {/**Result, buttons and history*/}
            <div className={(screenWidth < 1024) ? "flex flex-col" : "flex flex-row"}>
                <div style={{
                    width: (screenWidth < 1024) ? screenWidth * 0.95 : screenWidth * 0.55,
                    opacity: screenHeight !== 0 ? 1 : 0
                }}>
                    <button
                        id="result"
                        style={{whiteSpace: "nowrap"}}
                        disabled={!valid || copyClicked}
                        className={(!copyClicked ?
                                (valid ? "bg-gray-900" : "bg-red-900") : "bg-green-900") +
                            " text-white p-2 rounded-md smooth-transition nowrap"}
                        onClick={() => {
                            if (valid) {
                                navigator.clipboard.writeText(output).then(/*ignored*/)
                                setCopyClicked(true)
                            }
                        }}>
                        {copyClicked ? "Ergebnis kopiert!" : output}
                    </button>

                    {/*    Buttons*/}
                    <div className="flex flex-col"
                         style={{
                             height: 'calc(' + buttonsHeight + 'px - 1rem)',
                         }}>
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
                <div style={{width: (screenWidth < 1024) ? screenWidth * 0.95 : screenWidth * 0.35}}>
                    <HistoryDisplay setInput={onChangedTextField} history={history} setHistory={setHistory}
                                    useMobileLayout={(screenWidth < 1024)}/>
                </div>
            </div>
        </main>
    )
}
