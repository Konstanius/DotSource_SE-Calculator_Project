import {useEffect, useState} from "react";

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

    // Load the history from local storage
    static load(id) {
        if (typeof window === 'undefined') return null

        let item = localStorage.getItem("history_" + id)
        if (item) {
            return JSON.parse(item)
        } else {
            return null
        }
    }

    // Get the last history entry
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

    // Get the history from local storage
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

    // Get the next id for a new history entry
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

    // Delete the history from local storage
    static delete(id) {
        if (typeof window === 'undefined') return

        localStorage.removeItem("history_" + id)
    }

    // Save the history to local storage
    save() {
        if (typeof window === 'undefined') return

        localStorage.setItem("history_" + this.id, JSON.stringify(this))
    }
}

export function HistoryDisplay({setInput, history, setHistory}) {
    const [widgetList, setWidgets] = useState([])
    const [height, setHeight] = useState(100)

    useEffect(() => {
        let topElementHeight = document.getElementById("top-element")?.clientHeight || 0
        setHeight(window.innerHeight - topElementHeight - 24 * 4) // Yes, this is precise

        let widgets = []

        // date 1 day in the future
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
                    <div className="history-entry" key={"date_" + entry.id}>
                        <div
                            className="text-center"
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
                    className="history-entry-button"
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
                    <div className="history-entry-equals">=</div>
                    <div className="history-entry-output smallScroll" onScroll={(e) => {
                        e.stopPropagation()
                    }}>{entry.output}</div>
                    <div className="history-entry-delete"
                         onClick={(e) => {
                             e.stopPropagation()
                             HistoryEntry.delete(entry.id)
                             setHistory(HistoryEntry.getAll())
                         }}>X
                    </div>
                </button>
            )
        }

        if (widgets.length === 0) {
            widgets.push(
                <div className="history-entry" key={"date_empty"}>
                    <div
                        className="history-entry-time text-center"
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
             style={{
                 display: "flex",
                 flexDirection: "column",
                 overflowY: "auto",
                 maxHeight: 'calc(' + height + 'px - 1rem)',
                 width: "100%",
             }}>
            {widgetList}
        </div>
    )
}
