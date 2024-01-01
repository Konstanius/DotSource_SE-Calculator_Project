'use client'

import {useEffect, useState} from "react"
import {allowedInNumber, charFromMode, ParserError, parseWithParentheses} from "@/app/parser_rev2.mjs"
import {HistoryDisplay, HistoryEntry} from "@/app/history"

let selectionAreaData = [0, 0]
let toInput = []
let currentInput = ''
let controlPressed = false
export default function Home() {
    // States
    const [valid, setValidity] = useState(true)
    const [errorReport, setErrorReport] = useState('')
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('0')
    const [tooltip, setTooltip] = useState('')
    const [toolTipX, setToolTipX] = useState(0)
    const [toolTipY, setToolTipY] = useState(0)
    const [currentPrompt, setCurrentPrompt] = useState('')
    const [screenWidth, setScreenWidth] = useState(0)
    const [screenHeight, setScreenHeight] = useState(0)
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

    function setErrorReportHelper(newValue, index) {
        let error = "";
        if (index === -1) {
            setErrorReport("");
            return;
        }

        if (index === newValue.length) {
            index = newValue.length - 1;
        }

        for (let i = 0; i < newValue.length; i++) {
            if (i === index) {
                error += "_";
            } else {
                error += " ";
            }
        }

        setErrorReport(error);

        setTimeout(() => {
            // scroll it the same amount as the input
            let inputElement = document.getElementById('input')
            let errorOverlay = document.getElementById('error-overlay')
            errorOverlay.scrollLeft = inputElement.scrollLeft
        }, 20)
    }

    // Turn an AccNum into a properly formatted string, taking into account the roundResults variable
    function getResultWithProperDisplay(input) {
        let result;
        try {
            result = input.toNumber().toLocaleString(navigator.language, {
                useGrouping: false,
                maximumFractionDigits: 15
            });

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
        } catch (error) {
            if (!roundResults) {
                if (input.denominator === 1) {
                    result = input.numerator.toString()
                } else if (input.denominator === -1) {
                    result = -input.numerator.toString()
                } else {
                    result = input.numerator + "/" + input.denominator
                }
            } else {
                throw error
            }
        }
        return result
    }

    // Set the tooltip to the selected text
    async function setSelectionArea() {
        // Delay necessary, since on button press focus is lost, therefore deletion could not delete the selection
        await new Promise(r => setTimeout(r, 5))

        let start = document.getElementById('input').selectionStart
        let end = document.getElementById('input').selectionEnd
        if (start === selectionAreaData[0] && end === selectionAreaData[1]) return

        // In a timeout so that visual buttons remember the state of the selection, since unfocus triggers reset of selection
        selectionAreaData = [start, end]
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

        let scopedValid = true
        try {
            parseWithParentheses(input, true, 0, 0)
        } catch (error) {
            setValidity(false)
            scopedValid = false
            if (error.constructor !== ParserError) {
                setOutput(error.message)
                console.log(error)
            } else {
                setOutput(error.message)
                setErrorReportHelper(input, error.index)
            }
        }

        // If invalid, do shake animation
        if (!scopedValid) {
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

    function onKeyPressed(e) {
        // control
        if (e.key === "Control") {
            controlPressed = true
        }

        let id = buttonKeyIds[e.key]
        if (id === undefined) return

        let button = document.getElementById(id)
        if (button === null) return

        button.click()
    }

    useEffect(() => {
        if (window.pageSetUp !== undefined) return

        // Once, on clientside, set up the page
        window.pageSetUp = true
        randomizePrompt()

        document.addEventListener("keydown", onKeyPressed)

        document.addEventListener("keyup", (e) => {
            if (e.key === "Control") {
                console.log("control released")
                controlPressed = false
            }
        })

        function setDimensions() {
            setScreenWidth(document.documentElement.clientWidth)
            setScreenHeight(document.documentElement.clientHeight)
            setButtonsHeight(document.documentElement.clientHeight - document.getElementById('input').clientHeight - document.getElementById('result').clientHeight - 24 * 4)

            // Setting the dimensions after 10ms again will fix rendering issues after re-rendering with first dimensions, as some fields may change in size
            setTimeout(() => {
                setScreenWidth(document.documentElement.clientWidth)
                setScreenHeight(document.documentElement.clientHeight)
                setButtonsHeight(document.documentElement.clientHeight - document.getElementById('input').clientHeight - document.getElementById('result').clientHeight - 24 * 4)
            }, 50)
        }

        // set the screen width
        setDimensions()

        // add event listener to update the screen width
        window.addEventListener('resize', () => {
            setDimensions()
        })

        setHistory([...HistoryEntry.getAll()] || [])
        onChangedTextField(localStorage.getItem("input") || '')
        document.getElementById('input').focus()

        // add on click add "animate-click" class to the button for 100 ms
        setTimeout(() => {
            let buttonsList = document.getElementsByClassName("calc-clickable")
            for (let i = 0; i < buttonsList.length; i++) {
                let button = buttonsList[i]
                button.addEventListener("click", () => {
                    if (button.textContent === " ") return // Ignore unused buttons with only a space

                    // unFocus the element
                    document.getElementById('input').blur()

                    // Remove the animation class if it exists
                    if (button.classList.contains('animate-click')) {
                        button.classList.remove('animate-click');
                    }

                    // Force a reflow to restart the animation
                    void button.offsetWidth;

                    // Add the animation class
                    button.classList.add("animate-click")

                    // The animation is in forwards mode, so it does not need to be removed
                })
            }
        }, 50) // History is loaded in later, so wait a bit
    })

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

    // Animation management for the result button onClick
    useEffect(() => {
        if (copyClicked) {
            setTimeout(() => {
                setCopyClicked(false)
            }, 750)
        }
    }, [copyClicked])

    // Manages input in the text field
    const onChangedTextField = (newValue) => {
        if (newValue === input && input === '') return // Prevent spam of clearing to get random prompts

        let inputElement = document.getElementById('input')

        setInput(newValue)
        currentInput = newValue
        localStorage.setItem("input", newValue)
        setTimeout(() => {
            setSelectionArea().then(() => {
                inputElement.blur()
                inputElement.focus()
                inputElement.setSelectionRange(selectionAreaData[0], selectionAreaData[1])
            })
        }, 3) // Delay, since setInput is not immediate

        if (newValue === '') {
            randomizePrompt()
        }

        try {
            let data = parseWithParentheses(newValue, true, 0, 0)
            setValidity(true)
            setOutput(getResultWithProperDisplay(data[0]))
        } catch (error) {
            if (valid) {
                setOutput('0')
                setTimeout(() => {
                    // Only show the error after 500ms as to not annoy the user while they are entering their expression
                    if (currentInput !== newValue) return

                    setValidity(false)
                    if (error.constructor !== ParserError) {
                        setOutput(error.message)
                        console.log(error)
                    } else {
                        setOutput(error.message)
                        setErrorReportHelper(newValue, error.index)
                    }
                }, 500)
            } else {
                if (error.constructor !== ParserError) {
                    setOutput(error.message)
                    console.log(error)
                } else {
                    setOutput(error.message)
                    setErrorReportHelper(newValue, error.index)
                }
            }
        }
    }

    let rows = [[], [], [], [], [], []]
    let buttonKeyIds = {}

    // Method to populate button rows
    function addButton(row, title, isNumber, isSpecial, onClickAdd, onClick, triggerButton) {
        let style = "calc-button calc-clickable"
        if (isNumber) {
            style += " calc-number"
        }
        if (isSpecial) {
            style += " calc-special"
        }

        if (triggerButton !== undefined) {
            buttonKeyIds[triggerButton] = "button_" + row + "_" + rows[row].length
        }

        rows[row].push(
            <button
                id={"button_" + row + "_" + rows[row].length}
                key={"button_" + row + "_" + rows[row].length}
                className={style}
                style={{height: 'calc(' + buttonsHeight / 6 + 'px - 1rem)'}}
                onClick={async (_) => {
                    if (onClick !== undefined) {
                        onClick()
                        return
                    }

                    // Input queue
                    toInput.push(onClickAdd)
                    while (toInput[0] !== onClickAdd) {
                        await new Promise(r => setTimeout(r, 3))
                    }

                    // if the selection is not empty, replace range, otherwise append / insert
                    let start = selectionAreaData[0]
                    let end = selectionAreaData[1]
                    let newValue = input.substring(0, start) + onClickAdd + input.substring(end)
                    onChangedTextField(newValue)
                    setTimeout(() => {
                        document.getElementById('input').setSelectionRange(start + onClickAdd.length, start + onClickAdd.length)
                        selectionAreaData[0] += onClickAdd.length
                        selectionAreaData[1] += onClickAdd.length
                        toInput.shift()
                    }, 10)
                }}>{screenHeight !== 0 ? title : ""}</button>)
    }

    // The actual buttons
    addButton(0, <i className="fa-solid fa-percent"></i>, false, false, "%", undefined, "%")
    addButton(0, <i className="fa-solid fa-chevron-up"></i>, false, false, "^", undefined, "^")
    addButton(0, <i className="fa-solid fa-delete-left"></i>, false, true, "", async () => {
        if (input.length === 0) return
        let start = selectionAreaData[0]
        let end = selectionAreaData[1]
        if (start === 0 && end === 0) return

        let substring = input.substring(0, start)
        let removeAmount = 0
        if (controlPressed) {
            for (let i = substring.length - 1; i >= 0; i--) {
                let char = substring.charAt(i)
                if (allowedInNumber.includes(char)) {
                    removeAmount++
                } else {
                    break
                }
            }
        }

        if (removeAmount === 0) removeAmount = 1

        if (start === end) {
            start -= removeAmount
        }
        let newValue = input.substring(0, start) + input.substring(end)
        onChangedTextField(newValue)
        setTimeout(() => {
            document.getElementById('input').setSelectionRange(start, start)
        }, 5)
    }, "Backspace")
    addButton(0, <i className="fa-solid fa-c"></i>, false, true, "", () => onChangedTextField(""))
    addButton(1, "(", false, false, "(", undefined, "(")
    addButton(1, ")", false, false, ")", undefined, ")")
    addButton(1, <div><span>n </span><i className="fa-solid fa-exclamation"></i>
    </div>, false, false, "!", undefined, "!")
    addButton(1, <i className="fa-solid fa-divide"></i>, false, false, "/", undefined, "/")
    addButton(2, <i className="fa-solid fa-7"></i>, true, false, "7", undefined, "7")
    addButton(2, <i className="fa-solid fa-8"></i>, true, false, "8", undefined, "8")
    addButton(2, <i className="fa-solid fa-9"></i>, true, false, "9", undefined, "9")
    addButton(2, <i className="fa-solid fa-xmark"></i>, false, false, "*", undefined, "*")
    addButton(3, <i className="fa-solid fa-4"></i>, true, false, "4", undefined, "4")
    addButton(3, <i className="fa-solid fa-5"></i>, true, false, "5", undefined, "5")
    addButton(3, <i className="fa-solid fa-6"></i>, true, false, "6", undefined, "6")
    addButton(3, <i className="fa-solid fa-minus"></i>, false, false, "-", undefined, "-")
    addButton(4, <i className="fa-solid fa-1"></i>, true, false, "1", undefined, "1")
    addButton(4, <i className="fa-solid fa-2"></i>, true, false, "2", undefined, "2")
    addButton(4, <i className="fa-solid fa-3"></i>, true, false, "3", undefined, "3")
    addButton(4, <i className="fa-solid fa-plus"></i>, false, false, "+", undefined, "+")
    addButton(5, <i className="fa-solid fa-0"></i>, true, false, "0", undefined, "0")
    addButton(5, ".", true, false, ".", undefined, ".")

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
    }), "Enter")

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
                setSelectionArea().then(/*ignored*/)
            }}>

            {/**Input row*/}
            <div id="top-element" className="flex flex-col items-center justify-center">
                <div id="container">
                    {/**Input overlay to fade the output in, up and over the input field*/}
                    <div hidden={!valid}>
                        <input
                            id="input-overlay"
                            inputMode='none'
                            className={`
                                absolute
                                smooth-transition
                                content-center
                                bg-transparent
                                text-white text-center
                                ${(screenWidth >= 1024) ? "text-6xl p-4 m-4" : "text-3xl p-2 m-2"}
                                outline-none
                                caret-red-500
                                `}
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
                                text-white text-center
                                ${(screenWidth >= 1024) ? "text-6xl p-4 m-4" : "text-3xl p-2 m-2"}
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
                            onScroll={(_) => {
                                // scroll error overlay with input
                                let inputElement = document.getElementById('input')
                                let errorOverlay = document.getElementById('error-overlay')
                                errorOverlay.scrollLeft = inputElement.scrollLeft
                            }}
                            onSelect={(_) => setSelectionArea()}
                        >
                        </input>
                    </form>

                    <span
                        id="error-overlay"
                        hidden={valid}
                        autoFocus={false}
                        className={`
                                absolute
                                text-center text-red
                                ${(screenWidth >= 1024) ? "text-6xl p-4 m-4" : "text-3xl p-2 m-2"}
                                outline-none
                                hide-scrollbar
                                `}
                        unselectable={"on"}
                        style={{
                            width: screenWidth * 0.8,
                            fontFamily: "Space Mono",
                            zIndex: -5,
                            top: "1.3rem",
                            whiteSpace: "pre",
                            overflowX: "auto",
                            overflowY: "hidden",
                            color: "rgb(159, 52, 52)"
                        }}
                        onScroll={(_) => {
                            // scroll error overlay with input
                            let inputElement = document.getElementById('input')
                            let errorOverlay = document.getElementById('error-overlay')
                            inputElement.scrollLeft = errorOverlay.scrollLeft
                        }}
                    >
                        {errorReport}
                    </span>
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
                    opacity: screenHeight !== 0 ? 1 : 0,
                }} className="flex flex-col">
                    <button
                        id="result"
                        hidden={screenWidth === 0}
                        style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            width: 'calc(' + ((screenWidth < 1024) ? screenWidth * 0.95 : screenWidth * 0.55) + 'px - 0.5rem)',
                            fontSize: "2rem",
                        }}
                        disabled={!valid || copyClicked}
                        className={"result " + (!copyClicked ?
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
