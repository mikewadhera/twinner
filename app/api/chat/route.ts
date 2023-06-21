// ./app/api/chat/route.ts
import { Configuration, OpenAIApi, ResponseTypes } from 'openai-edge'
import { OpenAIStream, StreamingTextResponse } from 'ai'

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge'

function getBiomarkerData(options = {}) {
  return {
    "sleep_durations_data": {
      "other": {
        "duration_in_bed_seconds": 25200,
        "duration_unmeasurable_sleep_seconds": 1800
      },
      "sleep_efficiency": 90,
      "awake": {
        "duration_short_interruption_seconds": 600,
        "duration_awake_state_seconds": 1200,
        "duration_long_interruption_seconds": 300,
        "num_wakeup_events": 2,
        "wake_up_latency_seconds": 300,
        "num_out_of_bed_events": 1,
        "sleep_latency_seconds": 900
      },
      "asleep": {
        "duration_light_sleep_state_seconds": 12600,
        "duration_asleep_state_seconds": 23400,
        "num_REM_events": 4,
        "duration_REM_sleep_state_seconds": 5400,
        "duration_deep_sleep_state_seconds": 5400
      }
    },
    "device_data": {
      "name": "SleepTracker Pro",
      "hardware_version": "1.0.0",
      "manufacturer": "Acme Inc.",
      "software_version": "2.3.1",
      "activation_timestamp": "2023-06-20T08:00:00Z",
      "serial_number": "123456789"
    },
    "metadata": {
      "end_time": "2023-06-21T06:00:00Z",
      "start_time": "2023-06-20T22:00:00Z"
    },
    "heart_rate_data": {
      "summary": {
        "max_hr_bpm": 90,
        "avg_hrv_rmssd": 55,
        "min_hr_bpm": 50,
        "user_max_hr_bpm": 180,
        "avg_hr_bpm": 70,
        "avg_hrv_sdnn": 50,
        "resting_hr_bpm": 60
      }
    },
    "temperature_data": {
      "delta": 0.5
    },
    "readiness_data": {
      "readiness": 80
    },
    "respiration_data": {
      "breaths_data": {
        "min_breaths_per_min": 12,
        "avg_breaths_per_min": 18,
        "max_breaths_per_min": 24,
        "on_demand_reading": false,
        "end_time": "2023-06-21T06:00:00Z",
        "start_time": "2023-06-20T22:00:00Z"
      },
      "snoring_data": {
        "num_snoring_events": 5,
        "total_snoring_duration_seconds": 120,
        "end_time": "2023-06-21T06:00:00Z",
        "start_time": "2023-06-20T22:00:00Z"
      },
      "oxygen_saturation_data": {
        "start_time": "2023-06-20T22:00:00Z",
        "end_time": "2023-06-21T06:00:00Z",
        "avg_saturation_percentage": 96
      }
    }
  }
}

export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const { messages } = await req.json()

  const messagesWithSystem = [
    {
      content: "You are Mike's digital twin, that responds on behalf of Mike on questions about his health. You have access to his health data through functions. Respond as mike, using 'I'. If you don't know the answer say I don't have that information.",
      role: "system"
    },
    ...messages
  ]

  // Ask OpenAI to convert the conversation to function calls
  const functions_response = await openai.createChatCompletion({
    model: 'gpt-4-0613',
    stream: false,
    messages: messagesWithSystem.map((message: any) => ({
      content: message.content,
      role: message.role
    })),
    functions: [
      {
        name: getBiomarkerData.name,
        description: "Returns biomarker data on Mike's health",
        parameters: {
          type: "object",
          properties: {
            "start_date": {
              type: "string",
              description: "Beginning date of sleep activity"
            },
            "end_date": {
              type: "string",
              description: "End date of sleep activity"
            }
          }
        }
      }
    ]
  })

  const data = (await functions_response.json() as ResponseTypes["createChatCompletion"])

  const response_message = data.choices[0].message

  // If we get back a function_call, call it and then pass the response in context to chat completion
  if (response_message && response_message.function_call && response_message.function_call.arguments) {
    const function_name = response_message.function_call.name
    const function_args = JSON.parse(response_message.function_call.arguments)
    console.dir(function_name)
    console.dir(function_args)

    var function_result
    if (function_name === getBiomarkerData.name) {
      function_result = JSON.stringify(getBiomarkerData())
      console.dir(function_result)
    }

    const messagesWithSystemAndFunctionResult = [
      ...messagesWithSystem,
      { 
        role: "function",
        name: function_name,
        content: function_result
      }
    ]

    // Ask OpenAI for a streaming chat completion given the prompt
    const response = await openai.createChatCompletion({
      model: 'gpt-4-0613',
      stream: true,
      messages: messagesWithSystemAndFunctionResult
    })

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response)
    // Respond with the stream
    return new StreamingTextResponse(stream)

  } else {
    // Ask OpenAI for a streaming chat completion given the prompt
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: messagesWithSystem.map((message: any) => ({
        content: message.content,
        role: message.role
      }))
    })

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response)
    // Respond with the stream
    return new StreamingTextResponse(stream)
  }

}
