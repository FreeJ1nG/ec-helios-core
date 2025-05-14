import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

export interface TimerProps {
  endTime: dayjs.Dayjs
}

export function Timer({ endTime }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = dayjs()
      const diff = endTime.diff(now, 'millisecond')

      if (diff <= 0) {
        // Election has ended
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      }

      // Calculate time components
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      )
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      return { days, hours, minutes, seconds }
    }

    // Initialize
    setTimeRemaining(calculateTimeRemaining())

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)

    // Cleanup on unmount
    return () => clearInterval(interval)
  }, [endTime])

  // Check if election has ended
  const isElectionEnded = endTime.isBefore(dayjs())

  return (
    <div className="rounded-md bg-gray-100 p-4 shadow-md">
      <h3 className="mb-1 text-lg font-semibold">
        {isElectionEnded ? 'Election has ended' : 'Time Remaining'}
      </h3>

      {!isElectionEnded && (
        <div className="flex gap-4 text-center">
          <div className="flex flex-col">
            <span className="text-3xl font-bold">{timeRemaining.days}</span>
            <span className="text-sm">Days</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold">{timeRemaining.hours}</span>
            <span className="text-sm">Hours</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold">{timeRemaining.minutes}</span>
            <span className="text-sm">Minutes</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold">{timeRemaining.seconds}</span>
            <span className="text-sm">Seconds</span>
          </div>
        </div>
      )}
    </div>
  )
}
