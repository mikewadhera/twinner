// ./app/api/chat/route.ts
import { Configuration, OpenAIApi, ResponseTypes } from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

async function getSleep(options = {}) {
  return callTerra("sleep", options);
}

async function getActivity(options = {}) {
  return callTerra("daily", options);
}

async function callTerra(
  api: string,
  options: { start_date?: string; end_date?: string } = {
    start_date: "2021-06-01",
    end_date: "2021-06-01",
  }
) {
  const requestOptions = {
    method: "GET",
    url: "https://api.tryterra.co/v2/" + api,
    params: {
      user_id: "b2e773ed-c7b5-42b7-a8b8-762ece1878b3",
      start_date: options.start_date || "2021-06-01",
      end_date: options.end_date || "2021-06-07",
      to_webhook: "false",
      with_samples: "false",
    } as Record<string, string>,
    headers: {
      accept: "application/json",
      "dev-id": "twinner-dev-IZfHWUl31l",
      "x-api-key":
        "41af77e36dad1412a95f6d503929a48d9e20926c1d0773290f05f09f9c0cd31d",
    },
  };
  console.log(requestOptions);
  const urlWithParams = new URL(requestOptions.url);
  Object.keys(requestOptions.params).forEach((key) =>
    urlWithParams.searchParams.append(key, requestOptions.params[key])
  );

  try {
    const response = await fetch(urlWithParams.toString(), {
      method: requestOptions.method,
      headers: requestOptions.headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error: ", error);
  }
}

export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const { messages } = await req.json();

  const messagesWithSystem = [
    {
      content:
        "You are Mike's digital twin, that responds on behalf of Mike on questions about his health. You have access to his health data through functions. Respond as mike, using 'I'. If you don't know the answer say I don't have that information.",
      role: "system",
    },
    ...messages,
  ];

  // console.log(
  //   "LOGGING: here's what i passed in" +
  //     JSON.stringify(messagesWithSystem, null, 2)
  // );

  const currentDate = new Date();

  // 2. Convert the date to a readable string format (e.g., "September 6, 2023")
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 3. Insert the date string into the description

  // Ask OpenAI to convert the conversation to function calls
  const functions_response = await openai.createChatCompletion({
    model: "gpt-4-0613",
    stream: false,
    messages: messagesWithSystem.map((message: any) => ({
      content: message.content,
      role: message.role,
    })),
    functions: [
      {
        name: getSleep.name,
        description: `Returns Mike's biomarker data for sleep and resting heart rate. Today's date is ${formattedDate}.`,
        parameters: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Beginning date",
            },
            end_date: {
              type: "string",
              description: "End date",
            },
          },
        },
      },
      {
        name: getActivity.name,
        description:
          "Returns Mike's biomarker data for non-sleep activity such as steps and calories burned. Today's date is ${formattedDate}.",
        parameters: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Beginning date",
            },
            end_date: {
              type: "string",
              description: "End date",
            },
          },
        },
      },
    ],
  });

  const data =
    (await functions_response.json()) as ResponseTypes["createChatCompletion"];

  const response_message = data.choices[0].message;
  //console.dir(response_message);
  // If we get back a function_call, call it and then pass the response in context to chat completion
  if (
    response_message &&
    response_message.function_call &&
    response_message.function_call.arguments
  ) {
    const function_name = response_message.function_call.name;
    const function_args = JSON.parse(response_message.function_call.arguments);
    console.dir(function_name);
    console.dir(function_args);

    var function_result;
    if (function_name === getSleep.name) {
      function_result = await getSleep(function_args);
    } else if (function_name == getActivity.name) {
      function_result = await getActivity(function_args);
    }
    //console.log("hihi" + )
    //console.dir(function_result);

    const messagesWithSystemAndFunctionResult = [
      ...messagesWithSystem,
      {
        role: "function",
        name: function_name,
        content: JSON.stringify(function_result),
      },
    ];

    const newObject = {
      role: "function",
      name: function_name,
      content: JSON.stringify(function_result),
    };

    // console.dir(
    //   "HERE'S THE FUNCTION WE GOT BACK FORM TERRA that we're passing ot open AI:"
    // );
    // console.dir(newObject);

    // Ask OpenAI for a streaming chat completion given the prompt
    const response = await openai.createChatCompletion({
      model: "gpt-4-0613",
      stream: true,
      messages: messagesWithSystemAndFunctionResult,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);
    // Respond with the stream
    return new StreamingTextResponse(stream);
  } else {
    // Ask OpenAI for a streaming chat completion given the prompt
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      stream: true,
      messages: messagesWithSystem.map((message: any) => ({
        content: message.content,
        role: message.role,
      })),
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);
    // Respond with the stream
    return new StreamingTextResponse(stream);
  }
}
