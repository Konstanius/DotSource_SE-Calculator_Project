const MODE_NONE = 0
const MODE_ADDITION = 1
const MODE_SUBTRACTION = 2
const MODE_MULTIPLICATION = 3
const MODE_DIVISION = 4

const MAX_NUM = Math.pow(2, 256)

function modeFromChar(char) {
    if (char === "+") {
        return MODE_ADDITION
    } else if (char === "-") {
        return MODE_SUBTRACTION
    } else if (char === "*") {
        return MODE_MULTIPLICATION
    } else if (char === "/") {
        return MODE_DIVISION
    } else {
        return MODE_NONE
    }
}

function charFromMode(mode) {
    if (mode === MODE_ADDITION) {
        return "+"
    } else if (mode === MODE_SUBTRACTION) {
        return "-"
    } else if (mode === MODE_MULTIPLICATION) {
        return "*"
    } else if (mode === MODE_DIVISION) {
        return "/"
    } else {
        return ""
    }
}

const allowedInNumber = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ".", ","]
const allowedOperations = ["+", "-", "*", "/", "!", "%"]

export class ParserError {
    message
    position

    constructor(message, position) {
        this.message = message
        this.position = position
    }
}

// TODO allow for parentheses, use a function AROUND parse, which is recursive, and calls itself for each parentheses group
/**
 * Parses a string as a mathematical expression and returns the result as a string, formatted by locale as non-scientific notation
 *
 * Time efficiency: ~ O(3n) -> has to iterate over the string 3 times, shortens to ~ O(n) [excludes replaceAll operation for spaces]
 * Optimized to specifications:
 * - allow positive / negative number in beginning and as result
 * - allow decimal numbers
 * - allow ! and %
 * - allow default operations +, -, *, /
 * - allow spaces
 * - does take into account mathematical order of operations ([P]EMDAS) [parentheses are excluded, since out of spec]
 **/
export function parse(input, shouldLog) {
    input = input.replaceAll(" ", "")

    let rebuiltString = ""
    let currentNumber = ""

    // Step 1: Validate input, parse "!" and "%"
    for (let i = 0; i < input.length; i++) {
        const char = input[i]
        if (allowedInNumber.includes(char)) {
            currentNumber += char
        } else if (allowedOperations.includes(char)) {
            // Do not allow * or / at the beginning of the string
            if (rebuiltString === "" && currentNumber === "" && (char === "*" || char === "/" || char === "!" || char === "%")) {
                throw new ParserError("Es muss eine Zahl vor einem Operator am Anfang stehen", i)
            }

            // Do not allow two operations in a row
            if (rebuiltString !== "" && allowedOperations.includes(rebuiltString[rebuiltString.length - 1]) && currentNumber === "") {
                throw new ParserError("Zwei oder mehr Operatoren dürfen nicht direkt hintereinander stehen", i)
            }

            // Handle ! and %
            if (char === "!") {
                let number = parseFloat(currentNumber) // decimal symbol depends on locale, "." for en-US, "," for de-DE
                currentNumber = factorial(number).toLocaleString('fullwide', {useGrouping: false}) // prevent scientific notation of e.g. 1e+100
            } else if (char === "%") {
                let number = parseFloat(currentNumber)
                currentNumber = (number / 100).toLocaleString('fullwide', {useGrouping: false}) // prevent scientific notation of e.g. 1e+100
            } else if (currentNumber !== "") {
                rebuiltString += currentNumber
                currentNumber = ""
                rebuiltString += char
            } else {
                rebuiltString += char
            }
        } else {
            throw new ParserError("Ungültiges Zeichen", i)
        }
    }
    rebuiltString = "0+" + rebuiltString // to ensure that the first number is added to the result // TODO this is a hack, find a better solution
    rebuiltString += currentNumber + "+0" // to ensure that the last number is added to the result // TODO this is a hack, find a better solution

    // Step 2: Parse string for * and /, no need to check for errors, since they are already checked in step 1
    let rebuiltString2 = ""
    let currentNumberLeft = ""
    let currentNumberRight = ""
    let currentMode = MODE_NONE
    for (let i = 0; i < rebuiltString.length; i++) {
        const char = rebuiltString[i]
        if (allowedInNumber.includes(char)) {
            currentNumberRight += char
        } else {
            if (currentMode === MODE_NONE) {
                currentMode = modeFromChar(char)
                if (currentMode !== MODE_MULTIPLICATION && currentMode !== MODE_DIVISION) {
                    rebuiltString2 += currentNumberRight
                    currentNumberRight = ""
                }
            } else {
                if (currentMode === MODE_DIVISION || currentMode === MODE_MULTIPLICATION) {
                    let result = evaluate(parseFloat(currentNumberLeft), currentNumberRight, currentMode)
                    currentNumberLeft = result.toLocaleString('fullwide', {useGrouping: false}) // prevent scientific notation of e.g. 1e+100
                    currentNumberRight = ""
                    currentMode = modeFromChar(char)
                } else {
                    rebuiltString2 += currentNumberLeft
                    rebuiltString2 += charFromMode(currentMode)
                    currentNumberLeft = currentNumberRight
                    currentNumberRight = ""
                    currentMode = modeFromChar(char)
                }
            }
        }
    }
    rebuiltString2 += currentNumberLeft

    // Step 3: Parse string for + and -, no need to check for errors, since they are already checked in step 1
    let currentResult = 0
    currentNumber = ""
    currentMode = MODE_NONE
    for (let i = 0; i < rebuiltString2.length; i++) {
        const char = rebuiltString2[i]
        if (allowedInNumber.includes(char)) {
            currentNumber += char
        } else {
            if (currentMode === MODE_NONE) {
                currentResult = parseFloat(currentNumber)
                currentNumber = ""
                currentMode = modeFromChar(char)
            } else {
                currentResult = evaluate(currentResult, currentNumber, currentMode)
                currentNumber = ""
                currentMode = modeFromChar(char)
            }
        }
    }
    currentResult = evaluate(currentResult, currentNumber, currentMode)

    if (shouldLog)
        console.log(input + " -> " + rebuiltString + " -> " + rebuiltString2 + " -> " + currentResult)

    return currentResult.toLocaleString('fullwide', {useGrouping: false}) // prevent scientific notation of e.g. 1e+100
}

function evaluate(currentResult, currentNumberString, currentMode) {
    if (currentNumberString === "") {
        return currentResult
    }

    let number = parseFloat(currentNumberString)

    let result;
    if (currentMode === MODE_ADDITION) {
        result = currentResult + number
    } else if (currentMode === MODE_SUBTRACTION) {
        result = currentResult - number
    } else if (currentMode === MODE_MULTIPLICATION) {
        result = currentResult * number
    } else if (currentMode === MODE_DIVISION) {
        result = currentResult / number
    }

    outOfBoundsChecker(result)
    return result
}

function factorial(num) {
    // TODO this does not yet allow for decimal numbers
    let value = 1
    for (let i = 2; i <= num; i++) {
        value = value * i
        outOfBoundsChecker(value)
    }
    return value
}

function outOfBoundsChecker(num) {
    let invalid = (num < 0) ? num < -MAX_NUM : num > (MAX_NUM - 1)
    if (invalid && num > 0) {
        throw new ParserError("Zahl ist zu groß", -1)
    } else if (invalid && num < 0) {
        throw new ParserError("Zahl ist zu klein", -1)
    }
}
