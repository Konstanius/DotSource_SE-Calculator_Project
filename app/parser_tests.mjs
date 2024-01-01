import {parseWithParentheses} from './parser_rev2.mjs'

// Basic principles taken from https://mozilla.github.io/calculator/test/
const testMap = {
    // Addition
    "1500+2000": "3500",
    "-1+1,00": "0",
    "10,1+2": "12,1",
    "10 + 9,999": "19,999",
    "34,999 + 1,0": "35,999",
    "-5 + 0": "-5",
    "0 + 5": "5",
    "300000000 + 900000000": "1200000000",
    "-1987,50 + 1987": "-0,5",
    "-500 + 500": "0",
    "6 * 2 + 8": "20",
    "-500 + 0,25": "-499,75",
    "-500 + 1,23456789": "-498,765432",
    "-500 + 123456789": "123456289",

    // Subtraction
    "1500 - 2000": "-500",
    "-3 - 0": "-3",
    "3 - 0": "3",
    "-1 - 2,25": "-3,25",
    "-500 - 500": "-1000"
}

let fails = 0
for (const [input, expected] of Object.entries(testMap)) {
    try {
        let result = parseWithParentheses(input, 0, 0)[0].toNumber().toLocaleString('de-DE', {
            maximumFractionDigits: 6,
            minimumFractionDigits: 0,
            useGrouping: false
        })
        if (result !== expected) {
            let result2 = parseWithParentheses(input, 0, 0)[0].toNumber()
            console.log(`Test failed: ${input} should be ${expected} but was ${result}`)
            fails++
        } else {
            console.log(`Test passed: ${input} = ${result}`)
        }
    } catch (error) {
        console.log(`Test failed: ${input} should be ${expected} but threw ${error}`)
        fails++
    }
}

if (fails === 0) {
    console.log("All tests passed!")
} else {
    console.log(`${fails} tests failed!`)
}
