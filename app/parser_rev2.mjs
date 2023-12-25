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
    numerator
    denominator
    trailingOperator

    constructor(number) {
        // TODO make this algorithm better
        let lowerNum = 1
        while (number % 1 !== 0) {
            lowerNum *= 10
            number *= 10
        }
        this.numerator = number
        this.denominator = lowerNum
        this.trailingOperator = MODE_NONE
    }

    shorten() {
        let g = gcd(this.numerator, this.denominator)
        this.numerator /= g
        this.denominator /= g
    }

    /**
     * Gets the float value of this AccNum
     * @returns {number}
     */
    toNumber() {
        return this.numerator / this.denominator
    }

    add(otherNumber) {
        let commonLower = this.denominator * otherNumber.denominator
        this.numerator = this.numerator * otherNumber.denominator + this.denominator * otherNumber.numerator
        this.denominator = commonLower
        outOfBoundsChecker(this.toNumber())
    }

    subtract(otherNumber) {
        let commonLower = this.denominator * otherNumber.denominator
        this.numerator = this.numerator * otherNumber.denominator - this.denominator * otherNumber.numerator
        this.denominator = commonLower
        outOfBoundsChecker(this.toNumber())
    }

    multiply(otherNumber) {
        this.denominator *= otherNumber.denominator
        this.numerator *= otherNumber.numerator
        outOfBoundsChecker(this.toNumber())
    }

    divide(otherNumber) {
        let reciprocate = new AccNum(otherNumber.denominator)
        reciprocate.denominator = otherNumber.numerator
        this.multiply(reciprocate)
        outOfBoundsChecker(this.toNumber())
    }

    factorise() {
        if (this.numerator % this.denominator !== 0) throw new ParserError("Fakultät von Kommazahlen ist (noch) nicht definiert")
        let num = this.toNumber()
        this.denominator = 1

        let value = 1
        for (let i = 2; i <= num; i++) {
            value = value * i
            outOfBoundsChecker(value)
        }
        this.numerator = value
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
        const char = input[index]

        // Function to re-use code for pushing the current number onto the list and resetting the state
        function pushNumber() {
            if (negateCurrentNumber) {
                // If the number is negative, negate it
                currentNumber.numerator *= -1
                negateCurrentNumber = false
            }
            pushOntoGroupList(parenthesesGroups, currentNumber, depth)
            currentNumber = new AccNum(0)
            decimalPointWasAssigned = false
            numberWasAssigned = false
            operatorWasAssigned = false
            numberWasFinished = false
        }

        if (char === "(") {
            // New group
            if (numberWasAssigned) {
                // Has to save the number
                if (currentNumber.trailingOperator === MODE_NONE) {
                    // If there is no trailing operator, assume multiplication
                    currentNumber.trailingOperator = MODE_MULTIPLICATION
                }

                pushNumber()
            }

            // Recursively parse the group by calling the function again on the substring
            // This returns the group and the index of the closing parenthesis
            let [group, finishedIndex] = parseWithParentheses(input.substring(index + 1), shouldLog, depth + 1)
            // Continue after the closing parenthesis
            index += finishedIndex + 1
            // Set the current number to the value returned by the recursive call (the group)
            currentNumber = group
            numberWasAssigned = true
            numberWasFinished = true

            if (index > input.length - 1 && depth === 0) {
                // If the end of the string is surpassed and the depth is 0, throw an error, since the end was reached without closing all parentheses
                throw new ParserError("Es wurden nicht alle Klammern geschlossen")
            }
        } else if (char === ")") {
            // End of group
            if (currentNumber.trailingOperator !== MODE_NONE) {
                // If there is a trailing operator on the last number of the group, throw an error
                throw new ParserError("Unerwarteter Operator am Ende des Ausdrucks")
            }
            numberWasFinished = true

            if (depth === 0) {
                // If the depth is 0, the closing parenthesis is unexpected and should throw an error
                throw new ParserError("Es wurden mehr Klammern geschlossen als geöffnet")
            }

            if (parenthesesGroups.length === 0 && !numberWasAssigned) {
                // If the parentheses group is empty and no number was assigned, throw an error
                throw new ParserError("Klammern können nicht leer sein")
            }

            // We break out of the loop, because we are done with this group (it was closed)
            break
        } else if (allowedInNumber.includes(char)) {
            if (operatorWasAssigned && numberWasAssigned) {
                // A new number is going to be started, since the operator was assigned and a number was assigned previously
                pushNumber()
            }

            if (numberWasAssigned && !numberWasFinished) {
                // If a number was assigned and not finished, add the character to the number
                if (char === "." || char === ",") {
                    // Decimal marker is allowed only once, throw an error if it is already assigned
                    if (!decimalPointWasAssigned) {
                        decimalPointWasAssigned = true
                    } else {
                        throw new ParserError("Zahl hat zu viele Dezimaltrennzeichen")
                    }
                } else {
                    // The number is added by multiplying the numerator by 10 and adding the new digit
                    currentNumber.numerator = currentNumber.numerator * 10 + parseInt(char)
                    if (decimalPointWasAssigned) {
                        // If the decimal point was assigned, multiply the denominator by 10 as well
                        currentNumber.denominator *= 10
                    }
                }
            } else {
                if (numberWasFinished) {
                    // Number was finished, push it onto the list
                    if (negateCurrentNumber) {
                        // Negate if necessary
                        currentNumber.numerator *= -1
                        negateCurrentNumber = false
                    }

                    if (currentNumber.trailingOperator === MODE_NONE) {
                        // If there is no trailing operator, assume multiplication
                        currentNumber.trailingOperator = MODE_MULTIPLICATION
                    }

                    pushOntoGroupList(parenthesesGroups, currentNumber, depth)
                }

                // Reset the state and start a new number
                currentNumber = new AccNum(parseInt(char))
                decimalPointWasAssigned = false
                numberWasAssigned = true
                operatorWasAssigned = false
                numberWasFinished = false
            }
        } else if (allowedOperations.includes(char)) {
            if (!numberWasAssigned || operatorWasAssigned) {
                // If a number was not assigned or an operator was assigned for the next number, check for special cases before throwing an error
                if (char === "-") {
                    // If the operator is -, invert the current negative state
                    // if (numberWasAssigned) { // TODO check if this was necessary
                    //     pushNumber()
                    // }
                    negateCurrentNumber = !negateCurrentNumber
                } else if (char === "+") {
                    // do nothing
                } else {
                    // If the operator is not - or +, throw an error
                    throw new ParserError("Unerwarteter Operator " + char + " nach " + charFromMode(currentNumber.trailingOperator))
                }
            } else {
                if (operatorWasAssigned) {
                    if (char === "!" || char === "%" || currentNumber.trailingOperator !== MODE_NONE) {
                        // If an operator was assigned and a new operator appears, throw an error
                        throw new ParserError("Unerwarteter Operator " + char + " nach " + charFromMode(currentNumber.trailingOperator))
                    }

                    currentNumber.trailingOperator = modeFromChar(char)
                } else {
                    if (char === "!") {
                        // If the operator is !, factorise the number
                        currentNumber.factorise()
                        numberWasFinished = true
                    } else if (char === "%") {
                        // If the operator is %, multiply the number by 100
                        currentNumber.denominator *= 100
                        numberWasFinished = true
                    } else {
                        // If the operator is not ! or %, assign it to the number
                        if (currentNumber.trailingOperator !== MODE_NONE) {
                            // If there is a trailing operator, throw an error
                            throw new ParserError("Unerwarteter Operator " + char + " nach " + charFromMode(currentNumber.trailingOperator))
                        }

                        // Assign the operator to the number
                        currentNumber.trailingOperator = modeFromChar(char)
                        operatorWasAssigned = true
                        numberWasFinished = true
                    }
                }
            }
        } else if (char === " ") {
            // do nothing
        } else {
            // If the character is not recognized, throw an error
            throw new ParserError("Unerwartetes Zeichen " + char)
        }
    }

    if (numberWasAssigned) {
        // If a number was assigned, push it onto the list
        if (negateCurrentNumber) {
            // Negate if necessary
            currentNumber.numerator *= -1
        }
        pushOntoGroupList(parenthesesGroups, currentNumber, depth)
    }

    if (currentNumber.trailingOperator !== MODE_NONE) {
        // If there is a trailing operator, throw an error
        throw new ParserError("Unerwarteter Operator am Ende des Ausdrucks")
    }

    if (parenthesesGroups.length === 0) {
        // If the parentheses group is empty, simply return the current number
        return [currentNumber, index]
    }

    return [solveParenthesesGroups(parenthesesGroups, shouldLog), index]
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
