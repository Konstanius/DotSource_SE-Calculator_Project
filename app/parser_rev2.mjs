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

export class AccNum {
    upperNumber
    lowerNumber

    constructor(number) {
        // TODO make this algorithm better
        let lowerNum = 1
        while (number % 1 !== 0) {
            lowerNum *= 10
            number *= 10
        }
        this.upperNumber = number
        this.lowerNumber = lowerNum
    }

    /**
     * Gets the float value of this AccNum
     * @returns {number}
     */
    toNumber() {
        return this.upperNumber / this.lowerNumber
    }

    add(otherNumber) {
        this.lowerNumber = this.lowerNumber * otherNumber.lowerNumber
        this.upperNumber = this.upperNumber * otherNumber.lowerNumber + this.lowerNumber * otherNumber.upperNumber
        outOfBoundsChecker(this.toNumber())
    }

    subtract(otherNumber) {
        this.lowerNumber = this.lowerNumber * otherNumber.lowerNumber
        this.upperNumber = this.upperNumber * otherNumber.lowerNumber - this.lowerNumber * otherNumber.upperNumber
        outOfBoundsChecker(this.toNumber())
    }

    multiply(otherNumber) {
        this.lowerNumber *= otherNumber.lowerNumber
        this.upperNumber *= otherNumber.upperNumber
        outOfBoundsChecker(this.toNumber())
    }

    divide(otherNumber) {
        let reciprocate = new AccNum(otherNumber.lowerNumber)
        reciprocate.lowerNumber = otherNumber.upperNumber
        this.multiply(reciprocate)
        outOfBoundsChecker(this.toNumber())
    }

    factorise() {
        if (this.lowerNumber % this.upperNumber !== 0) throw new ParserError("Fakultät von Kommazahlen ist (noch) nicht definiert")
        let num = this.toNumber()
        this.lowerNumber = 1

        let value = 1
        for (let i = 2; i <= num; i++) {
            value = value * i
            outOfBoundsChecker(value)
        }
        this.upperNumber = value
    }
}

function outOfBoundsChecker(num) {
    let invalid = (num < 0) ? num < -MAX_NUM : num > (MAX_NUM - 1)
    if (invalid && num > 0) {
        throw new ParserError("Zahl ist zu groß")
    } else if (invalid && num < 0) {
        throw new ParserError("Zahl ist zu klein")
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
 * @returns {AccNum}
 * @throws ParserError
 **/
export function parseWithParentheses(input, shouldLog) {
    // Split into parentheses groups, and use parse() on each group
    let currentParenthesesLevel = 0
    let currentParenthesesString = ""

    // Example: 1+(2+(-3+4))+-5
    // List will be: [AnyNum(1), "+", [AnyNum(2), "+", [AnyNum(-3), "+", AnyNum(4)]], "+", AnyNum(-5)]
    let parenthesesGroups = []

    for (let i = 0; i < input.length; i++) {
        // TODO split into tokens here
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
 * @returns {AccNum}
 */
function solveParenthesesGroups(parenthesesGroups, shouldLog) {
    // iterate and solve parentheses groups, if array
    for (let i = 0; i < parenthesesGroups.length; i++) {
        const group = parenthesesGroups[i]
        if (Array.isArray(group)) {
            parenthesesGroups[i] = solveParenthesesGroups(group, shouldLog)
        }
    }

    // This will contain both the AccNums and the string operators
    let contents = []

    return parseSingleGroup(contents, shouldLog)
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
    // it is an array of AccNum or a string (operators only) or arrays (recursive)

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
    } else if ((typeof last === "string" || typeof last === "object") && depth > 0) {
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
