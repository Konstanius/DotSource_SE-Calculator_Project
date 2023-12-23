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

export function charFromMode(mode) {
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

export const allowedInNumber = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ".", ","]
export const allowedOperations = ["+", "-", "*", "/", "!", "%"]

export class ParserError {
    message

    constructor(message) {
        this.message = message
    }
}

/**
 * Parses a string as a mathematical expression and returns the result as a string, formatted by locale as non-scientific notation
 *
 * First recursively splits the string into parentheses groups, then calls solveParenthesesGroups() on the array entire array
 *
 * Optimized to specifications:
 * - allow positive / negative number in beginning and as result
 * - allow decimal numbers
 * - allow ! and %
 * - allow default operations +, -, *, /, (, )
 * - allow spaces
 * - does take into account mathematical order of operations (PEMDAS)
 *
 * @param input
 * @param shouldLog
 * @returns {number}
 * @throws ParserError
 **/
export function parseWithParentheses(input, shouldLog) {
    // Split into parentheses groups, and use parse() on each group
    let currentParenthesesLevel = 0
    let currentParenthesesString = ""

    // Example: 1+(2+(3+4))+5
    // List will be: ["1+", ["2+", ["3+4"]], "+5"]
    let parenthesesGroups = []

    for (let i = 0; i < input.length; i++) {
        const char = input[i]

        if (char === "(") {
            if (currentParenthesesString !== "") {
                pushOntoGroupList(parenthesesGroups, currentParenthesesString, currentParenthesesLevel)
            }

            currentParenthesesLevel++
            currentParenthesesString = ""
        } else if (char === ")") {
            if (currentParenthesesString !== "") {
                pushOntoGroupList(parenthesesGroups, currentParenthesesString, currentParenthesesLevel)
            }

            currentParenthesesLevel--
            if (currentParenthesesLevel < 0) {
                throw new ParserError("Mehr Klammern geschlossen als geöffnet")
            }
            currentParenthesesString = ""
        } else {
            currentParenthesesString += char
        }
    }
    if (currentParenthesesString !== "") {
        pushOntoGroupList(parenthesesGroups, currentParenthesesString, currentParenthesesLevel)
    }

    if (currentParenthesesLevel !== 0) {
        throw new ParserError("Mehr Klammern geöffnet als geschlossen")
    }

    return solveParenthesesGroups(parenthesesGroups, shouldLog)
}

/**
 * Recursively solves parentheses groups
 *
 * Iterates through the array, recursing on each array
 * Once the iteration is done, concatenates the array into a string and calls parseSingleGroupString() on it
 * @param parenthesesGroups
 * @param shouldLog
 * @returns {number}
 */
function solveParenthesesGroups(parenthesesGroups, shouldLog) {
    // iterate and solve parentheses groups, if array
    for (let i = 0; i < parenthesesGroups.length; i++) {
        const group = parenthesesGroups[i]
        if (Array.isArray(group)) {
            parenthesesGroups[i] = solveParenthesesGroups(group, shouldLog)
        }
    }

    let string = "";
    for (let i = 0; i < parenthesesGroups.length; i++) {
        const group = parenthesesGroups[i]
        string += group

        // if it is not the last element, and it does not end with any operator, add a *
        // This will ensure that e.g. 1+2(3+4) will be parsed as 1+2*(3+4)
        if (i !== parenthesesGroups.length - 1 && !allowedOperations.includes(group[group.length - 1])) {
            string += "*"
        }
    }

    return parseSingleGroupString(string, shouldLog)
}

/**
 * Utility method used by parseWithParentheses()
 *
 * Pushes a value onto a list, which is an array of strings or arrays, at a certain depth, recursively
 * @param list
 * @param value
 * @param depth
 */
function pushOntoGroupList(list, value, depth) {
    // it is an array of strings or arrays (recursive)

    // if it is empty and depth is 0, push the value
    if (list.length === 0 && depth === 0) {
        list.push(value)
        return
    }

    // if it is empty and depth is not 0, push an empty array and call this function again
    if (list.length === 0 && depth !== 0) {
        list.push([])
        pushOntoGroupList(list[0], value, depth - 1)
        return
    }

    let last = list[list.length - 1]
    if (depth === 0) {
        // if the last element is a string, turn it into an array and call this function again
        list.push(value)
    } else if (typeof last === "string" && depth > 0) {
        // if the last element is a string, turn it into an array and call this function again
        list.push([])
        pushOntoGroupList(list[list.length - 1], value, depth - 1)
    } else if (depth > 0) {
        // if the last element is an array, call this function again
        pushOntoGroupList(last, value, depth - 1)
    } else {
        // if the depth is 0, push the value
        list.push(value)
    }
}

/**
 * Parses a string as a mathematical expression and returns the result as a string, formatted by locale as non-scientific notation
 *
 * Optimized to specifications:
 * - include positive / negative number in beginning and as result
 * - use decimal numbers
 * - allow default operations +, -, *, /, additionally ! and %
 * - ignore spaces
 * - does take into account mathematical order of operations ([P]EMDAS) [Parentheses are handled by parseWithParentheses()]
 * @param input
 * @param shouldLog
 * @returns {number}
 */
export function parseSingleGroupString(input, shouldLog) {
    let rebuiltString = ""
    let currentNumber = ""

    // Step 1: Validate input, parse "!" and "%"
    for (let i = 0; i < input.length; i++) {
        let char = input[i]

        // skip whitespace
        if (char === " ") continue

        // replace comma with dot
        if (char === ",") {
            char = "."
        }


        if (allowedInNumber.includes(char)) {
            currentNumber += char
        } else if (allowedOperations.includes(char)) {
            // Do not allow * or / at the beginning of the string
            if (rebuiltString === "" && currentNumber === "" && (char === "*" || char === "/" || char === "!" || char === "%")) {
                throw new ParserError("Es muss eine Zahl vor einem Operator am Anfang stehen")
            }

            // Do not allow two operations in a row
            if (rebuiltString !== "" && allowedOperations.includes(rebuiltString[rebuiltString.length - 1]) && currentNumber === "") {
                if (char === "+" || char === "-") {
                    // This allows for prefixes of numbers (+ or -)
                    currentNumber += char
                    continue
                }

                throw new ParserError("Zwei oder mehr Operatoren dürfen nicht direkt hintereinander stehen")
            }

            // Handle ! and %
            if (char === "!") {
                let number = parseFloat(removeLeadingMinus(currentNumber)) // decimal symbol depends on locale, "." for en-US, "," for de-DE
                currentNumber = factorial(number).toLocaleString('fullwide', {useGrouping: false}) // prevent scientific notation of e.g. 1e+100
            } else if (char === "%") {
                let number = parseFloat(removeLeadingMinus(currentNumber))
                currentNumber = (number / 100).toLocaleString('fullwide', {useGrouping: false}) // prevent scientific notation of e.g. 1e+100
            } else if (currentNumber !== "") {
                rebuiltString += currentNumber
                currentNumber = ""
                rebuiltString += char
            } else {
                rebuiltString += char
            }
        } else {
            throw new ParserError("Ungültiges Zeichen")
        }
    }
    rebuiltString += currentNumber

    // Step 2: Parse string for * and /, no need to check for errors, since they are already checked in step 1
    let rebuiltString2 = ""
    let currentNumberLeft = ""
    let inNumberRight = false
    let currentNumberRight = ""
    let currentMode = MODE_NONE
    for (let i = 0; i < rebuiltString.length; i++) {
        const char = rebuiltString[i]
        if (allowedInNumber.includes(char)) {
            inNumberRight = true
            currentNumberRight += char
        } else {
            if (!inNumberRight && (char === "+" || char === "-")) {
                // This allows for prefixes of numbers (+ or -)
                currentNumberRight += char
                continue
            }

            inNumberRight = false

            if (currentMode === MODE_DIVISION || currentMode === MODE_MULTIPLICATION) {
                let result = evaluate(parseFloat(removeLeadingMinus(currentNumberLeft)), currentNumberRight, currentMode)
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
    if (currentMode === MODE_DIVISION || currentMode === MODE_MULTIPLICATION) {
        let result = evaluate(parseFloat(removeLeadingMinus(currentNumberLeft)), currentNumberRight, currentMode)
        currentNumberLeft = result.toLocaleString('fullwide', {useGrouping: false}) // prevent scientific notation of e.g. 1e+100
    } else {
        rebuiltString2 += currentNumberLeft
        rebuiltString2 += charFromMode(currentMode)
        currentNumberLeft = currentNumberRight
    }
    rebuiltString2 += currentNumberLeft


    // Step 3: Parse string for + and -, no need to check for errors, since they are already checked in step 1
    let currentResult = 0
    currentNumber = ""
    currentMode = MODE_NONE
    let inNumber = false
    for (let i = 0; i < rebuiltString2.length; i++) {
        const char = rebuiltString2[i]
        if (allowedInNumber.includes(char)) {
            inNumber = true
            currentNumber += char
        } else {
            if (!inNumber && (char === "+" || char === "-")) {
                // This allows for prefixes of numbers (+ or -)
                currentNumber += char
                continue
            }

            inNumber = false

            if (currentMode === MODE_NONE) {
                currentResult = parseFloat(removeLeadingMinus(currentNumber))
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

    if (shouldLog) console.log(input + " -> " + rebuiltString + " -> " + rebuiltString2 + " -> " + currentResult)

    return currentResult
}

/**
 * Shortens out any multiple leading minuses
 * @param string
 * @returns string
 */
function removeLeadingMinus(string) {
    // Remove any 2x or more leading minuses
    while (string[0] === "-" && string[1] === "-") {
        string = string.substring(2)
    }

    return string
}

/**
 * Evaluates a number string with a given mode and current result
 * @param currentResult
 * @param currentNumberString
 * @param currentMode
 * @returns number
 */

function evaluate(currentResult, currentNumberString, currentMode) {
    if (currentNumberString === "") {
        return currentResult
    }

    currentNumberString = removeLeadingMinus(currentNumberString)
    let number = parseFloat(currentNumberString)

    let result
    if (currentMode === MODE_ADDITION) {
        result = currentResult + number
    } else if (currentMode === MODE_SUBTRACTION) {
        result = currentResult - number
    } else if (currentMode === MODE_MULTIPLICATION) {
        result = currentResult * number
    } else if (currentMode === MODE_DIVISION) {
        result = currentResult / number
    } else {
        result = number // If currentMode is MODE_NONE, just return the number
    }

    outOfBoundsChecker(result)
    return result
}

function factorial(num) {
    // TODO this does not yet allow for fractions
    if (num % 1 !== 0) {
        throw new ParserError("Fakultät von Kommazahlen ist (noch) nicht definiert")
    }

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
        throw new ParserError("Zahl ist zu groß")
    } else if (invalid && num < 0) {
        throw new ParserError("Zahl ist zu klein")
    }
}
