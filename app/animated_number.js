// components/AnimatedNumber.js
import {useEffect, useState} from 'react'
import styles from './AnimatedNumber.module.css'

const steps = 50
const duration = 100

// TODO this is broken
const AnimatedNumber = ({value}) => {

    const [currentValue, setCurrentValue] = useState(0)
    const [targetValue, setTargetValue] = useState(0)

    useEffect(() => {
        if (value === currentValue || isNaN(value) || value === "") {
            return
        }

        setTargetValue(value)
        const difference = parseFloat(value) - currentValue
        const step = difference / steps

        const interval = setInterval(() => {
            setCurrentValue((prevValue) => prevValue + step)
        }, duration / steps)

        // Cleanup interval on component unmount
        return () => clearInterval(interval)
    }, [value, currentValue])

    const digits = currentValue.toString().split('')

    return (
        <div className={styles.animatedNumber}>
            {digits.map((digit, index) => (
                <span key={index} className={styles.digit}>
          {digit}
        </span>
            ))}
        </div>
    );
};

export default AnimatedNumber
