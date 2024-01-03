import {useEffect, useState} from "react"

export class HistoryEntry {
    id
    time
    input
    output

    constructor(id, time, input, output) {
        this.id = id
        this.time = time
        this.input = input
        this.output = output
    }

    static load(id) {
        if (typeof window === 'undefined') return null

        let item = localStorage.getItem("history_" + id)
        if (item) {
            return JSON.parse(item)
        } else {
            return null
        }
    }

    static getLast() {
        if (typeof window === 'undefined') return null

        let keys = Object.keys(localStorage)
        let max = -1
        for (let key of keys) {
            if (key.startsWith("history_")) {
                let id = parseInt(key.substring(8))
                if (id > max) {
                    max = id
                }
            }
        }

        if (max === -1) {
            return null
        }

        return HistoryEntry.load(max)
    }

    static getAll() {
        if (typeof window === 'undefined') return null

        let keys = Object.keys(localStorage)
        let history = []
        for (let key of keys) {
            if (key.startsWith("history_")) {
                history.push(JSON.parse(localStorage.getItem(key)))
            }
        }

        history.sort((a, b) => {
            return b.time - a.time
        })

        return history
    }

    static getNextId() {
        if (typeof window === 'undefined') return null

        let keys = Object.keys(localStorage)
        let max = 0
        for (let key of keys) {
            if (key.startsWith("history_")) {
                let id = parseInt(key.substring(8))
                if (id > max) {
                    max = id
                }
            }
        }

        return max + 1
    }

    static delete(id) {
        if (typeof window === 'undefined') return

        localStorage.removeItem("history_" + id)
    }

    save() {
        if (typeof window === 'undefined') return

        localStorage.setItem("history_" + this.id, JSON.stringify(this))
    }
}

export function HistoryDisplay({setInput, history, setHistory, useMobileLayout}) {
    const [widgetList, setWidgets] = useState([])
    const [height, setHeight] = useState(100)

    useEffect(() => {
        let topElementHeight = document.getElementById("top-element")?.clientHeight || 0
        setHeight(document.documentElement.clientHeight - topElementHeight - 24 * 4)

        let widgets = []

        let lastDate = new Date()
        lastDate.setDate(lastDate.getDate() + 1)

        for (let i = 0; i < history.length; i++) {
            let entry = history[i]
            let differentDay = false
            let date = new Date(entry.time)
            if (date.getDay() !== lastDate.getDay() || date.getMonth() !== lastDate.getMonth() || date.getFullYear() !== lastDate.getFullYear()) {
                differentDay = true
            }
            lastDate = date

            if (differentDay) {
                widgets.push(
                    <div className="history-" key={"date_" + entry.id}>
                        <div
                            className="text-center"
                            aria-label="Datum"
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                color: "var(--color-text)",
                                padding: "0.5rem",
                            }}>
                            {date.toLocaleDateString(undefined, {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                    </div>
                )
            }

            widgets.push(
                <button
                    className="history-entry-button calc-clickable"
                    aria-label={entry.input + " = " + entry.output}
                    onClick={() => setInput(entry.input)}
                    key={"entry_" + entry.id}>
                    <div className="history-entry-time">{
                        date.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                        })
                    }</div>
                    <div className="history-entry-input smallScroll" onScroll={(e) => {
                        e.stopPropagation()
                    }}>{entry.input}</div>
                    <div className="history-entry-equals"><i className="fa-solid fa-equals"></i></div>
                    <div className="history-entry-output smallScroll" onScroll={(e) => {
                        e.stopPropagation()
                    }}>{entry.output}</div>
                    <div className="history-entry-delete"
                         aria-label="Verlaufseintrag löschen"
                         style={{
                             width: "2rem",
                             height: "2rem",
                             display: "flex",
                             justifyContent: "center",
                             alignItems: "center",
                         }}
                         onClick={(e) => {
                             e.stopPropagation()
                             HistoryEntry.delete(entry.id)
                             setHistory(HistoryEntry.getAll())
                         }}><i className="fa-solid fa-trash"></i>
                    </div>
                </button>
            )
        }

        if (widgets.length === 0) {
            widgets.push(
                <div className="history-entry" key={"date_empty"}>
                    <div
                        className="history-entry-time text-center"
                        aria-label="Kein Verlauf vorhanden"
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                            color: "var(--color-text)",
                            padding: "0.5rem",
                            width: "100%",
                        }}>
                        Kein Verlauf vorhanden
                    </div>
                </div>
            )
        }

        setWidgets(widgets)
    }, [history, setHistory, setInput])

    return (
        <div className="history"
             aria-label="Verlauf"
             style={{
                 display: "flex",
                 flexDirection: "column",
                 overflowY: useMobileLayout ? null : "auto",
                 maxHeight: useMobileLayout ? null : 'calc(' + height + 'px - 1rem)',
                 width: "100%",
             }}>
            {widgetList}
        </div>
    )
}
