'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <h1 className="text-3xl text-center mb-8">Mike's Twin</h1>

      {messages.length > 0
        ? messages.map(m => (
          <div className="group relative mb-4 flex items-start md:-ml-12">
            <div className='flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow'>
              {m.role === 'user' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 256"
                fill="currentColor"
                className='h-4 w-4'>
                <path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8ZM72 96a56 56 0 1 1 56 56 56.06 56.06 0 0 1-56-56Z" />
              </svg>) 
              : (
                <img src="https://pbs.twimg.com/profile_images/1674205151983439873/8asqfJHx_400x400.jpg" />
              )}
            </div>
            <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
              {m.content}
            </div>
          </div>
          ))
        : (
            <div className="flex flex-col items-center text-center">
              <p className="text-gray-600">How is your sleep?</p>
              <p className="text-gray-600">What's your resting heart rate?</p>
            </div>
        )}
      <div ref={endOfMessagesRef} />
      
      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Ask something..."
          onChange={handleInputChange}
          autoFocus
        />
      </form>
    </div>
  )
}
