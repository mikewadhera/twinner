'use client'

import { useChat } from 'ai/react'

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <h1 className="text-3xl text-center mb-8">Mike's Twin</h1>

      {messages.length > 0
        ? messages.map(m => (
            <div key={m.id} className="whitespace-pre-wrap">
              <b>{m.role === 'user' ? 'User: ' : 'Twin: '}</b>
              {m.content}
            </div>
          ))
        : (
            <div className="flex flex-col items-center text-center">
              <p className="text-gray-600 mb-4">Sample questions:</p>
              <p className="text-gray-600">How is your sleep?</p>
              <p className="text-gray-600">What's your resting heart rate?</p>
            </div>
        )}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Ask something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  )
}
