import {getResultWithProperDisplay, globalImpreciseAnswer, ParserError, parseWithParentheses} from "./parser_rev2.mjs";
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
        let output = parseWithParentheses(input, 0, 0, true)
        console.log("Ergebnis:", (globalImpreciseAnswer ? "~ " : "") + getResultWithProperDisplay(output[0], roundResults), "\n")
    } catch (e) {
        if (e.constructor === ParserError && e.index !== -1) {
            let prefix = " ".repeat(e.index + 2)
            console.log(prefix + "^ Fehler:", e.message, "\n")
        } else {
            console.log("Fehler:", e.message, "\n")
        }
    }
}
