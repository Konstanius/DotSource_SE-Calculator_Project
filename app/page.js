'use client'

import {useState} from "react"
import {ParserError, parseWithParentheses} from "@/app/parser.mjs"

export default function Home() {
    const [valid, setValidity] = useState(true)
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('0')

    const onChangedTextField = (input) => {
        setInput(input)

        try {
            let data = parseWithParentheses(input, true)
            setValidity(true)
            setOutput(data)
        } catch (error) {
            setValidity(false)
            setOutput(error.message)
            if (error.type !== ParserError) {
                console.log(error)
            }
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <TextField
                valid={valid}
                input={input}
                onChanged={onChangedTextField}
            />
            <div className="h-24"></div>
            {/*show AnimatedNumber if valid, else show output raw*/}
            {valid ? (
                <div className="flex flex-row items-center justify-center">
                    <p className="text-2xl">{output}</p>
                </div>
            ) : (
                <p className="text-2xl">{output}</p>
            )}
        </main>
    )
}

function TextField({valid, input, onChanged}) {
    return (
        <div className="flex flex-col items-center justify-center">
            <input
                className="border-2 border-gray-300 rounded-md p-2"
                type="text"
                value={input}
                onChange={(e) => {
                    onChanged(e.target.value)
                }}
            />
            <p className="text-red-500">{valid ? '' : 'Invalid input'}</p>
        </div>
    )
}


