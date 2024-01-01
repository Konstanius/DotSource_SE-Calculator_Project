import {ParserError, parseWithParentheses} from "./parser_rev2.mjs";
import prompt from "prompt-sync";

console.log("Taschenrechner v2.0")
console.log("Simpler KEMDAS Taschenrechner für den DotSource SE Bewerbungsprozess\n")

while (true) {
    console.log("Bitte gib eine Rechnung ein. (Beenden mit 'exit')")
    let input = prompt({sigint: true})("> ")

    if (input.toLowerCase() === "exit") {
        break
    }

    try {
        let output = parseWithParentheses(input, false, 0, 0)
        console.log("Ergebnis:", output[0].toNumber().toLocaleString("de-DE"), "\n")
    } catch (e) {
        if (e.constructor === ParserError && e.index !== -1) {
            let prefix = " ".repeat(e.index + 2)
            console.log(prefix + "^ Fehler:", e.message, "\n")
        } else {
            console.log("Fehler:", e.message, "\n")
        }
    }
}
