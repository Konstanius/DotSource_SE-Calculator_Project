const MODE_NONE = 0
const MODE_ADDITION = 1
const MODE_SUBTRACTION = 2
const MODE_MULTIPLICATION = 3
const MODE_DIVISION = 4
const MODE_EXPONENT = 5

// Javascript limitation, exponents are used after 2^53, imprecision thus occurs
// Only applies to when "round results" is enabled, otherwise BigInt is used with fractions
const MAX_NUM_ROUND = Math.pow(2, 53)

function modeFromChar(char) {
    if (char === "+") {
        return MODE_ADDITION
    } else if (char === "-") {
        return MODE_SUBTRACTION
    } else if (char === "*") {
        return MODE_MULTIPLICATION
    } else if (char === "/") {
        return MODE_DIVISION
    } else if (char === "^") {
        return MODE_EXPONENT
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
    } else if (mode === MODE_EXPONENT) {
        return "^"
    } else {
        return ""
    }
}

export const allowedInNumber = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ".", ","]
export const allowedOperations = ["+", "-", "*", "/", "!", "%", "^"]

export class ParserError {
    message
    index

    constructor(message, index) {
        this.message = message
        this.index = index
    }
}

export class AccNum {
    numerator
    denominator
    trailingOperator

    constructor(number) {
        this.numerator = number
        this.denominator = BigInt(1)
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
        let num1 = Number(this.numerator)
        let num2 = Number(this.denominator)
        if (num1 >= MAX_NUM_ROUND || num2 >= MAX_NUM_ROUND || num1 < -MAX_NUM_ROUND || num2 < -MAX_NUM_ROUND) {
            throw new ParserError("Zahl überschreitet Präzisionslimit (± 2⁵³)", -1)
        }
        return Number(this.numerator) / Number(this.denominator)
    }

    add(otherNumber) {
        let commonLower = this.denominator * otherNumber.denominator
        this.numerator = this.numerator * otherNumber.denominator + this.denominator * otherNumber.numerator
        this.denominator = commonLower
    }

    subtract(otherNumber) {
        let commonLower = this.denominator * otherNumber.denominator
        this.numerator = this.numerator * otherNumber.denominator - this.denominator * otherNumber.numerator
        this.denominator = commonLower
    }

    multiply(otherNumber) {
        this.denominator *= otherNumber.denominator
        this.numerator *= otherNumber.numerator
    }

    divide(otherNumber) {
        if (otherNumber.numerator === BigInt(0)) throw new ParserError("Division durch 0", -1)
        let reciprocate = new AccNum(otherNumber.denominator)
        reciprocate.denominator = otherNumber.numerator
        this.multiply(reciprocate)
    }

    factorise() {
        // The error in the comparison can be ignored, it is an issue in JavaScript Intellisense
        if (this.numerator % this.denominator !== BigInt(0)) throw new ParserError("Fakultät von Kommazahlen ist nicht definiert", -1)
        let num = this.toNumber()
        this.denominator = BigInt(1)

        let startTime = new Date().getTime()

        let value = BigInt(1)
        for (let i = 2; i <= num; i++) {
            // crash if 500ms elapsed
            if (new Date().getTime() - startTime > 500) {
                throw new ParserError("Zeitüberschreitung bei der Berechnung", -1)
            }

            let multiplier = BigInt(i)
            value = value * multiplier
        }
        this.numerator = value
    }

    exponent(otherNumber) {
        let otherNumerator = otherNumber.numerator
        let otherDenominator = otherNumber.denominator
        if (otherNumerator % otherDenominator !== BigInt(0)) throw new ParserError("Exponente von Kommazahlen sind nicht eingebaut", -1)
        let absoluteOtherNumerator = otherNumerator
        if (otherNumerator < 0) {
            absoluteOtherNumerator *= BigInt(-1)
        }

        // Do not use Math.pow or **, since those can freeze the calculator
        let startTime = new Date().getTime()

        let newNumerator = BigInt(1)
        let newDenominator = BigInt(1)
        for (let i = 0; i < absoluteOtherNumerator; i++) {
            // crash if 500ms elapsed
            if (new Date().getTime() - startTime > 500) {
                throw new ParserError("Zeitüberschreitung bei der Berechnung", -1)
            }

            newNumerator *= this.numerator
            newDenominator *= this.denominator
        }

        this.numerator = newNumerator
        this.denominator = newDenominator
        if (otherNumerator < 0) {
            // 1 / (a^b)
            let accNum = new AccNum(BigInt(1))
            accNum.divide(this)
            this.numerator = accNum.numerator
            this.denominator = accNum.denominator
        }
    }
}

function gcd(a, b) {
    if (b > a) {
        const temp = a
        a = b
        b = temp
    }
    while (true) {
        if (b === BigInt(0)) return a
        a %= b
        if (a === BigInt(0)) return b
        b %= a
    }
}

/**
 * First recursively splits the string into parentheses groups, then calls solveParenthesesGroups() on the array entire array
 *
 * Optimized to specifications:
 * - allow positive / negative number in beginning and as result
 * - allow decimal numbers
 * - allow ! and %
 * - allow default operations +, -, *, /, ^, (, )
 * - allow spaces
 * - does take into account mathematical order of operations (PEMDAS)
 *
 * @param input
 * @param depth
 * @param indexOffset
 * @returns {[AccNum, number]}
 * @throws ParserError
 **/
export function parseWithParentheses(input, depth, indexOffset) {
    let currentNumber = new AccNum(BigInt(0))
    let negateCurrentNumber = false
    let negateNextNumber = false
    let numberWasAssigned = false
    let numberWasFinished = false
    let operatorWasAssigned = false
    let decimalPointWasAssigned = false

    // Example: 1+(2(-3+4))*-5
    // List will be: [AnyNum(1)..+, [AnyNum(2)..*, [AnyNum(-3)..+, AnyNum(4)]]..*, AnyNum(-5)]
    let parenthesesGroups = []

    let startTime = new Date().getTime()
    let index = 0
    for (; index < input.length; index++) {
        const char = input[index]

        // crash if 500ms elapsed
        if (new Date().getTime() - startTime > 500) {
            throw new ParserError("Zeitüberschreitung bei der Berechnung", -1)
        }

        // Function to re-use code for pushing the current number onto the list and resetting the state
        function pushNumber() {
            if (negateCurrentNumber) {
                // If the number is negative, negate it
                currentNumber.numerator *= BigInt(-1)
            }
            negateCurrentNumber = negateNextNumber
            negateNextNumber = false
            pushOntoGroupList(parenthesesGroups, currentNumber, depth)
            currentNumber = new AccNum(BigInt(0))
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
            let [group, finishedIndex] = parseWithParentheses(input.substring(index + 1), depth + 1, index + 1)
            // Continue after the closing parenthesis
            index += finishedIndex + 1
            // Set the current number to the value returned by the recursive call (the group)
            currentNumber = group
            numberWasAssigned = true
            numberWasFinished = true

            if (index > input.length - 1 && depth === 0) {
                // If the end of the string is surpassed and the depth is 0, throw an error, since the end was reached without closing all parentheses
                throw new ParserError("Es wurden nicht alle Klammern geschlossen", index + indexOffset)
            }
        } else if (char === ")") {
            // End of group
            if (currentNumber.trailingOperator !== MODE_NONE) {
                // If there is a trailing operator on the last number of the group, throw an error
                throw new ParserError("Unerwarteter Operator: " + charFromMode(currentNumber.trailingOperator), index + indexOffset)
            }
            numberWasFinished = true

            if (depth === 0) {
                // If the depth is 0, the closing parenthesis is unexpected and should throw an error
                throw new ParserError("Es wurden mehr Klammern geschlossen als geöffnet", index + indexOffset)
            }

            if (parenthesesGroups.length === 0 && !numberWasAssigned) {
                // If the parentheses group is empty and no number was assigned, throw an error
                throw new ParserError("Klammern können nicht leer sein", index + indexOffset)
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
                        throw new ParserError("Zahl hat zu viele Dezimaltrennzeichen", index + indexOffset)
                    }
                } else {
                    // The number is added by multiplying the numerator by 10 and adding the new digit
                    currentNumber.numerator = currentNumber.numerator * BigInt(10) + BigInt(char)
                    if (decimalPointWasAssigned) {
                        // If the decimal point was assigned, multiply the denominator by 10 as well
                        currentNumber.denominator *= BigInt(10)
                    }
                }
            } else {
                if (numberWasFinished) {
                    // Number was finished, push it onto the list
                    if (negateCurrentNumber) {
                        // Negate if necessary
                        currentNumber.numerator *= BigInt(-1)
                    }
                    negateCurrentNumber = negateNextNumber
                    negateNextNumber = false

                    if (currentNumber.trailingOperator === MODE_NONE) {
                        // If there is no trailing operator, assume multiplication
                        currentNumber.trailingOperator = MODE_MULTIPLICATION
                    }

                    pushOntoGroupList(parenthesesGroups, currentNumber, depth)
                }

                if (char === "," || char === ".") {
                    throw new ParserError("Zahl kann nicht mit Dezimaltrennzeichen beginnen", index + indexOffset)
                }

                // Reset the state and start a new number
                currentNumber = new AccNum(BigInt(char))
                decimalPointWasAssigned = false
                numberWasAssigned = true
                operatorWasAssigned = false
                numberWasFinished = false
            }
        } else if (allowedOperations.includes(char)) {
            if (!numberWasAssigned || operatorWasAssigned) {
                // If a number was not assigned or an operator was assigned for the next number, check for special cases before throwing an error
                if (char === "-") {
                    // If the operator is -, invert the current negative state of the next number or the current number, if that's the first number
                    if (numberWasAssigned) {
                        negateNextNumber = !negateNextNumber
                    } else {
                        negateCurrentNumber = !negateCurrentNumber
                    }
                } else if (char === "+") {
                    // do nothing
                }
                // If the operator is not - or +, throw an error
                else if (!numberWasAssigned) {
                    throw new ParserError("Unerwarteter Operator: " + char, index + indexOffset) // start of expression
                } else {
                    throw new ParserError("Unerwarteter Operator: " + char, index + indexOffset) // two operators in a row
                }
            } else {
                if (operatorWasAssigned) {
                    if (char === "!" || char === "%" || currentNumber.trailingOperator !== MODE_NONE) {
                        // If an operator was assigned and a new operator appears, throw an error
                        throw new ParserError("Unerwarteter Operator: " + char, index + indexOffset)
                    }

                    currentNumber.trailingOperator = modeFromChar(char)
                } else {
                    if (char === "!") {
                        // If the operator is !, factorise the number
                        currentNumber.factorise()
                        numberWasFinished = true
                    } else if (char === "%") {
                        // If the operator is %, multiply the number by 100
                        currentNumber.denominator *= BigInt(100)
                        numberWasFinished = true
                    } else {
                        // If the operator is not ! or %, assign it to the number
                        if (currentNumber.trailingOperator !== MODE_NONE) {
                            // If there is a trailing operator, throw an error
                            throw new ParserError("Unerwarteter Operator: ", index + indexOffset) // two operators in a row
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
            throw new ParserError("Unerwartetes Zeichen: " + char, index + indexOffset)
        }
    }

    if (numberWasAssigned) {
        // If a number was assigned, push it onto the list
        if (negateCurrentNumber) {
            // Negate if necessary
            currentNumber.numerator *= BigInt(-1)
        }
        negateCurrentNumber = negateNextNumber
        negateNextNumber = false
        pushOntoGroupList(parenthesesGroups, currentNumber, depth)
    }

    if (currentNumber.trailingOperator !== MODE_NONE) {
        // If there is a trailing operator, throw an error
        throw new ParserError("Unerwartetes Ende des Ausdrucks", index + indexOffset)
    }

    if (parenthesesGroups.length === 0) {
        // If the parentheses group is empty, simply return the current number
        return [currentNumber, index]
    }

    return [solveParenthesesGroups(parenthesesGroups), index]
}

/**
 * Recursively solves parentheses groups
 *
 * Iterates through the array, recurring on each array
 * Once the iteration is done, concatenates the array into a string and calls parseSingleGroupString() on it
 * @param parenthesesGroups
 * @returns {AccNum}
 */
function solveParenthesesGroups(parenthesesGroups) {
    // iterate and solve parentheses groups, if array
    for (let i = 0; i < parenthesesGroups.length; i++) {
        const group = parenthesesGroups[i]
        if (Array.isArray(group)) {
            parenthesesGroups[i] = solveParenthesesGroups(group)
        }
    }

    // This will calculate the result of the parentheses group
    // At this point, only multiplication and division, then addition and subtraction are left to do

    // calculate exponent
    for (let i = 0; i < parenthesesGroups.length - 1; i++) {
        const group = parenthesesGroups[i]
        if (group.trailingOperator === MODE_EXPONENT) {
            group.exponent(parenthesesGroups[i + 1])
            group.trailingOperator = parenthesesGroups[i + 1].trailingOperator
            parenthesesGroups.splice(i + 1, 1)
            i--
        }
    }

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
