import {ParserError, parseWithParentheses, AccNum} from "./parser_rev2.mjs";
import prompt from "prompt-sync";

console.log("Taschenrechner v2.0")
console.log("Simpler KEMDAS Taschenrechner für den DotSource SE Bewerbungsprozess\n")

let roundResults = false

while (true) {
    console.log("Modus: " + (roundResults ? "Gerundetes" : "Akkurates") + " Ergebnis (Ändern mit 'round')")
    console.log("Bitte gib eine Rechnung ein. (Beenden mit 'exit')")
    let input = prompt({sigint: true})("> ")

    if (input.toLowerCase() === "exit") {
        break
    }

    if (input.toLowerCase() === "round") {
        roundResults = !roundResults
        console.log("")
        continue
    }

    try {
        let output = parseWithParentheses(input, 0, 0)
        console.log("Ergebnis:", getResultWithProperDisplay(output[0], roundResults), "\n")
    } catch (e) {
        if (e.constructor === ParserError && e.index !== -1) {
            let prefix = " ".repeat(e.index + 2)
            console.log(prefix + "^ Fehler:", e.message, "\n")
        } else {
            console.log("Fehler:", e.message, "\n")
        }
    }
}

function getResultWithProperDisplay(input, roundResults) {
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
