import {parseWithParentheses} from './parser.mjs'

// TODO make this more precise, dont use ChatGPT generated tests
const testMap = {
    '1+2+3+4+5': '15',
    '1+2*3+4*5': '27',
    '1+2*3+4*5+6': '33',
    '2*3*4/2': '12',
    '5-3+8': '10',
    '7*2-5/2': '11.5',
    '9/3*2': '6',
    '3*5%': '0.15',
    '4+8%': '4.08',
    '6*2-1%': '11.99',
    '9+7-3*2%': '15.94',
    '5*3!': '30',
    '8-4!': '-16',
    '2*3*5!': '720',
    '6/2!': '3',
    '7+2%*4': '7.08',
    '9%*3*2': '0.54',
    '5/2%': '250',
    '6*3+8%*2': '18.16',
    '4*5-6*2%': '19.88',
    '7/2+9%': '3.59',
    '8*2-4%': '15.96',
    '1+2+3+4+5+6+7+8+9': '45',
    '9-8-7-6-5-4-3-2-1': '-27',
    '5*4/2*3/1': '30',
    '9+8*7/6-5*4': '-1.667',
    '3*5%+2*7-4/2': '12.15',
    '7-6/2+5%*4': '4.2',
}

let fails = 0
for (const [input, expected] of Object.entries(testMap)) {
    try {
        let result = parseWithParentheses(input, false)
        if (result !== expected) {
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
