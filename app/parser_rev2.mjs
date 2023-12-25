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
    trailingOperator

    constructor(number) {
        // TODO make this algorithm better
        let lowerNum = 1
        while (number % 1 !== 0) {
            lowerNum *= 10
            number *= 10
        }
        this.upperNumber = number
        this.lowerNumber = lowerNum
        this.trailingOperator = MODE_NONE
    }

    shorten() {
        let g = gcd(this.upperNumber, this.lowerNumber)
        this.upperNumber /= g
        this.lowerNumber /= g
    }

    /**
     * Gets the float value of this AccNum
     * @returns {number}
     */
    toNumber() {
        return this.upperNumber / this.lowerNumber
    }

    add(otherNumber) {
        let commonLower = this.lowerNumber * otherNumber.lowerNumber
        this.upperNumber = this.upperNumber * otherNumber.lowerNumber + this.lowerNumber * otherNumber.upperNumber
        this.lowerNumber = commonLower
        outOfBoundsChecker(this.toNumber())
    }

    subtract(otherNumber) {
        let commonLower = this.lowerNumber * otherNumber.lowerNumber
        this.upperNumber = this.upperNumber * otherNumber.lowerNumber - this.lowerNumber * otherNumber.upperNumber
        this.lowerNumber = commonLower
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
        if (this.upperNumber % this.lowerNumber !== 0) throw new ParserError("Fakultät von Kommazahlen ist (noch) nicht definiert")
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

function gcd(a, b) {
    if (b > a) {
        const temp = a
        a = b
        b = temp
    }
    while (true) {
        if (b === 0) return a
        a %= b
        if (a === 0) return b
        b %= a
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
 * @param depth
 * @returns {[AccNum, number]}
 * @throws ParserError
 **/
export function parseWithParentheses(input, shouldLog, depth) {
    // Split into parentheses groups, and use parse() on each group
    let currentNumber = new AccNum(0)
    let negateCurrentNumber = false
    let numberWasAssigned = false
    let numberWasFinished = false
    let operatorWasAssigned = false
    let decimalPointWasAssigned = false

    // Example: 1+(2(-3+4))*-5
    // List will be: [AnyNum(1)..+, [AnyNum(2)..*, [AnyNum(-3)..+, AnyNum(4)]]..*, AnyNum(-5)]
    let parenthesesGroups = []

    let index = 0
    for (; index < input.length; index++) {
        // TODO split into tokens here
        const char = input[index]

        if (char === "(") {
            if (numberWasAssigned) {
                if (currentNumber.trailingOperator === MODE_NONE) {
                    currentNumber.trailingOperator = MODE_MULTIPLICATION
                }

                if (negateCurrentNumber) {
                    currentNumber.upperNumber *= -1
                    negateCurrentNumber = false
                }
                pushOntoGroupList(parenthesesGroups, currentNumber, depth)
                currentNumber = new AccNum(0)
                decimalPointWasAssigned = false
                numberWasAssigned = false
            }

            let [group, finishedIndex] = parseWithParentheses(input.substring(index + 1), shouldLog, depth + 1)
            index += finishedIndex + 1
            currentNumber = group
            numberWasAssigned = true
            numberWasFinished = true
        } else if (char === ")") {
            if (currentNumber.trailingOperator !== MODE_NONE) {
                throw new ParserError("Unerwarteter Operator am Ende des Ausdrucks")
            }
            numberWasFinished = true

            if (depth === 0) {
                throw new ParserError("Zu viele schließende Klammern")
            }

            if (parenthesesGroups.length === 0 && !numberWasAssigned) {
                throw new ParserError("Leere Klammer")
            }

            break
        } else {
            // Rules:
            // number:
            // - !numberWasAssigned: set currentNumber to the number
            // - numberWasAssigned: multiply currentNumber by 10 and add the number
            // operator:
            // - !numberWasAssigned, op is -: set negateCurrentNumber to !negateCurrentNumber
            // - !numberWasAssigned, op is +: do nothing
            // - numberWasAssigned: push currentNumber onto the list, set operator to op, set currentNumber to 0

            if (allowedInNumber.includes(char)) {
                if (operatorWasAssigned && numberWasAssigned) {
                    if (negateCurrentNumber) {
                        currentNumber.upperNumber *= -1
                        negateCurrentNumber = false
                    }
                    pushOntoGroupList(parenthesesGroups, currentNumber, depth)
                    currentNumber = new AccNum(0)
                    decimalPointWasAssigned = false
                    numberWasAssigned = false
                    operatorWasAssigned = false
                    numberWasFinished = false
                }

                if (numberWasAssigned && !numberWasFinished) {
                    if (char === "." || char === ",") {
                        if (!decimalPointWasAssigned) {
                            decimalPointWasAssigned = true
                        } else {
                            throw new ParserError("Zahl hat zu viele Dezimaltrennzeichen")
                        }
                    } else {
                        currentNumber.upperNumber = currentNumber.upperNumber * 10 + parseInt(char)
                        if (decimalPointWasAssigned) {
                            currentNumber.lowerNumber *= 10
                        }
                    }
                } else {
                    if (numberWasFinished) {
                        if (negateCurrentNumber) {
                            currentNumber.upperNumber *= -1
                            negateCurrentNumber = false
                        }

                        if (currentNumber.trailingOperator === MODE_NONE) {
                            currentNumber.trailingOperator = MODE_MULTIPLICATION
                        }

                        pushOntoGroupList(parenthesesGroups, currentNumber, depth)
                    }

                    currentNumber = new AccNum(parseInt(char))
                    decimalPointWasAssigned = false
                    numberWasAssigned = true
                    operatorWasAssigned = false
                    numberWasFinished = false
                }
            } else if (allowedOperations.includes(char)) {
                if (!numberWasAssigned || operatorWasAssigned) {
                    if (char === "-") {
                        if (numberWasAssigned) {
                            if (negateCurrentNumber) {
                                currentNumber.upperNumber *= -1
                                negateCurrentNumber = false
                            }
                            pushOntoGroupList(parenthesesGroups, currentNumber, depth)
                            currentNumber = new AccNum(0)
                            decimalPointWasAssigned = false
                            numberWasAssigned = false
                            operatorWasAssigned = false
                        }

                        negateCurrentNumber = !negateCurrentNumber
                    } else if (char === "+") {
                        // do nothing
                    } else {
                        throw new ParserError("Unerwarteter Operator am Anfang des Ausdrucks")
                    }
                } else {
                    if (operatorWasAssigned) {
                        if (char === "!" || char === "%" || currentNumber.trailingOperator !== MODE_NONE) {
                            throw new ParserError("Unerwarteter Operator " + char + " nach " + charFromMode(currentNumber.trailingOperator))
                        }

                        currentNumber.trailingOperator = modeFromChar(char)
                    } else {
                        if (char === "!") {
                            currentNumber.factorise()
                            numberWasFinished = true
                        } else if (char === "%") {
                            currentNumber.lowerNumber *= 100
                            numberWasFinished = true
                        } else {
                            if (currentNumber.trailingOperator !== MODE_NONE) {
                                throw new ParserError("Unerwarteter Operator " + char + " nach " + charFromMode(currentNumber.trailingOperator))
                            }
                            currentNumber.trailingOperator = modeFromChar(char)
                            operatorWasAssigned = true
                            numberWasFinished = true
                        }
                    }
                }
            } else if (char === " ") {
                // do nothing
            } else {
                throw new ParserError("Unerwartetes Zeichen " + char)
            }
        }
    }
    if (numberWasAssigned) {
        if (negateCurrentNumber) {
            currentNumber.upperNumber *= -1
        }
        pushOntoGroupList(parenthesesGroups, currentNumber, depth)
    }

    if (currentNumber.trailingOperator !== MODE_NONE) {
        throw new ParserError("Unerwarteter Operator am Ende des Ausdrucks")
    }

    if (parenthesesGroups.length === 0) {
        return [currentNumber, index]
    }

    return [solveParenthesesGroups(parenthesesGroups, shouldLog), index]
}

// TODO empty num in parentheses ("3(-)")

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

    // This will calculate the result of the parentheses group
    // At this point, only multiplication and division, then addition and subtraction are left to do

    // calculate multiplication and division
    for (let i = 0; i < parenthesesGroups.length - 1; i++) {
        const group = parenthesesGroups[i]
        if (group.trailingOperator === MODE_MULTIPLICATION || group.trailingOperator === MODE_DIVISION) {
            if (group.trailingOperator === MODE_DIVISION) {
                group.divide(parenthesesGroups[i + 1])
            } else {
                group.multiply(parenthesesGroups[i + 1])
            }
            group.trailingOperator = parenthesesGroups[i + 1].trailingOperator
            parenthesesGroups.splice(i + 1, 1)
            i--
        }
    }

    // calculate addition and subtraction
    let result = parenthesesGroups[0]
    for (let i = 0; i < parenthesesGroups.length - 1; i++) {
        const group = parenthesesGroups[i]
        if (group.trailingOperator === MODE_SUBTRACTION) {
            group.subtract(parenthesesGroups[i + 1])
        } else {
            group.add(parenthesesGroups[i + 1])
        }
        group.trailingOperator = parenthesesGroups[i + 1].trailingOperator
        parenthesesGroups.splice(i + 1, 1)
        i--
    }

    return result
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
    // it is an array of AccNum or arrays (recursive)

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
        // if the last element is not an array, turn it into an array and call this function again
        list.push(value)
    } else if (!Array.isArray(last)) {
        // if the last element is not an array, turn it into an array and call this function again
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
