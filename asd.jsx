"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Paperclip, X, Brain } from "lucide-react"
import Image from "next/image"
import Mermaid from "mermaid-react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism"
import type React from "react"
import { useSearchParams } from "next/navigation"

type FileInfo = {
  type: string
  transfer_method: "remote_url" | "local_file"
  url: string
}

type Message = {
  id: string
  content: string
  role: "user" | "assistant"
  mermaid?: string
  files?: FileInfo[]
  timestamp: Date
  reasoning?: string
}

const languages = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "zh-CN", name: "中文", flag: "🇨🇳" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "gl", name: "Galego", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { code: "ca", name: "Català", flag: "🏴󠁥󠁳󠁣󠁴󠁿" },
  { code: "eu", name: "Euskara", flag: "🏴󠁥󠁳󠁰󠁶󠁿" },
]

const defaultLanguage = "es"

const changeConversationId = (id: string, setConversationId: React.Dispatch<React.SetStateAction<string>>) => {
  setConversationId(id)
  window.parent.postMessage(
    {
      type: "conversationIdChanged",
      conversationId: id,
    },
    "*",
  )
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("default", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isReasoningMode, setIsReasoningMode] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const [language, setLanguage] = useState(searchParams.get("lang") || defaultLanguage)
  const showLangSelector = searchParams.get("langSelector") !== null
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchMessages = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tokenFromQuery = urlParams.get("token")
      const urlFromQuery = urlParams.get("url")
      const analysis = urlParams.get("analysis")
      const conversationIdFromUrl =
        urlParams.get("conversationId") === "null" ? "" : urlParams.get("conversationId") || ""

      console.log("conversationId", conversationIdFromUrl)
      console.log("analysis", analysis)
      console.log("urlParams", urlParams.toString())

      if (conversationIdFromUrl === "" || !conversationIdFromUrl || conversationIdFromUrl === "null") {
        setMessagesLoaded(true)
        setMessages([])
        return
      }

      const tokenToUse = tokenFromQuery

      try {
        const response = await fetch(
          `https://messages.mediscribe.io/v1/messages?conversation_id=${conversationIdFromUrl}&user=default-user`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${tokenToUse}`,
            },
          },
        )

        if (!response.ok) {
          throw new Error("Error al obtener los mensajes")
        }

        const data = await response.json()
        console.log("Mensajes obtenidos:", data)

        const transformedMessages = data.data.reduce(
          (acc: Message[], message: { id: string; answer?: string; query?: string; timestamp?: string }) => {
            if (message.query) {
              acc.push({
                id: message.id || `user-${acc.length}`,
                content: message.query,
                role: "user",
                timestamp: new Date(message.timestamp || Date.now()),
              })
            }
            if (message.answer) {
              acc.push({
                id: message.id || `assistant-${acc.length}`,
                content: message.answer,
                role: "assistant",
                timestamp: new Date(message.timestamp || Date.now()),
              })
            }
            return acc
          },
          [],
        )
        console.log("transformedMessages", transformedMessages)
        setMessages(transformedMessages)
        if (conversationIdFromUrl && conversationIdFromUrl !== "null") {
          changeConversationId(conversationIdFromUrl, setConversationId)
        }
        setMessagesLoaded(true)
      } catch (error) {
        console.error("Error al realizar la solicitud:", error)
        setMessagesLoaded(true)
      }
    }

    fetchMessages()
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages]) // Updated dependency to scroll when messages change

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [])

  const getRandomImageUrl = () => {
    return `https://easydmarc.com/blog/wp-content/uploads/2022/06/What-is-URL-Manipulation-or-URL-Rewriting_-1.jpg`
  }

  const getLocalizedText = (key: string) => {
    const translations: { [key: string]: { [key: string]: string } } = {
      placeholder: {
        es: "Haz una pregunta sobre la consulta.",
        en: "Ask a question about the consultation.",
        "zh-CN": "询问有关咨询的问题。",
        fr: "Posez une question sur la consultation.",
        de: "Stellen Sie eine Frage zur Beratung.",
        it: "Fai una domanda sulla consultazione.",
        pt: "Faça uma pergunta sobre a consulta.",
        gl: "Fai unha pregunta sobre a consulta.",
        ca: "Fes una pregunta sobre la consulta.",
        eu: "Egin galdera bat kontsultari buruz.",
      },
      thinking: {
        es: "Pensando...",
        en: "Thinking...",
        "zh-CN": "思考中...",
        fr: "Réflexion...",
        de: "Denken...",
        it: "Pensando...",
        pt: "Pensando...",
        gl: "Pensando...",
        ca: "Pensant...",
        eu: "Pentsatzen...",
      },
      title: {
        es: "Consulta a la IA",
        en: "AI Consultation",
        "zh-CN": "AI 咨询",
        fr: "Consultation IA",
        de: "KI-Beratung",
        it: "Consulenza AI",
        pt: "Consulta de IA",
        gl: "Consulta de IA",
        ca: "Consulta d'IA",
        eu: "AI Kontsulta",
      },
      subtitle: {
        es: "Hazle preguntas a la IA sobre esta consulta.",
        en: "Ask the AI questions about this consultation.",
        "zh-CN": "向 AI 询问有关此咨询的问题。",
        fr: "Posez des questions à l'IA sur cette consultation.",
        de: "Stellen Sie der KI Fragen zu dieser Beratung.",
        it: "Fai domande all'IA su questa consultazione.",
        pt: "Faça perguntas à IA sobre esta consulta.",
        gl: "Fai preguntas á IA sobre esta consulta.",
        ca: "Fes preguntes a la IA sobre aquesta consulta.",
        eu: "Egin galdeak AIari kontsulta honi buruz.",
      },
      reasoning: {
        es: "Modo de razonamiento",
        en: "Reasoning mode",
        "zh-CN": "推理模式",
        fr: "Mode raisonnement",
        de: "Argumentationsmodus",
        it: "Modalità ragionamento",
        pt: "Modo raciocínio",
        gl: "Modo razoamento",
        ca: "Mode raonament",
        eu: "Arrazoiketa modua",
      },
    }
    return translations[key][language] || translations[key][defaultLanguage]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !selectedFile) || isLoading) return

    const files: FileInfo[] = []
    if (selectedFile) {
      files.push({
        type: "image",
        transfer_method: "remote_url",
        url: getRandomImageUrl(),
      })
    }

    const newUserMessage: Message = {
      id: "user-" + Date.now(),
      content: input,
      role: "user",
      files: files,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newUserMessage])
    setInput("")
    setIsLoading(true)

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const tokenFromQuery = 'app-TbyIqRlOAtEDs2Vfa22wuagd'
      const urlFromQuery = urlParams.get("url")
      const analysis = urlParams.get("analysis")

      const tokenToUse = tokenFromQuery
      const urlToUse = urlFromQuery || "https://api.dify.ai/v1/chat-messages"

      const inputs: any = {
        lang: 'es',
        isReasoningMode: "",
      }
      if (analysis) {
        inputs.analysisId = analysis
      }
      if (files.length > 0) {
        inputs.files = files
      }

      const requestBody: any = {
        inputs,
        query: input,
        response_mode: "streaming",
        conversation_id: conversationId,
        user: "default-user",
      }

      if (files.length > 0) {
        requestBody.files = files
      }

      const response = await fetch(urlToUse, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Failed to read data from response")
      }

      const newAssistantMessage: Message = {
        id: "assistant-" + Date.now(),
        content: "",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newAssistantMessage])

      let fullContent = ""
      let mermaidContent = ""
      let isMermaid = false
      let reasoning = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine === "data: [DONE]") continue

          try {
            if (trimmedLine.startsWith("data: ")) {
              const jsonStr = trimmedLine.slice(6)
              if (jsonStr) {
                const data = JSON.parse(jsonStr)
                if (data.conversation_id) {
                  changeConversationId(data.conversation_id, setConversationId)
                }
                if (data.answer) {
                  if (data.answer.includes("```mermaid")) {
                    isMermaid = true
                    mermaidContent = ""
                  } else if (data.answer.includes("```") && isMermaid) {
                    isMermaid = false
                    fullContent += `\n\n${mermaidContent}\n\n`
                  }

                  if (isMermaid) {
                    mermaidContent += data.answer
                  } else {
                    fullContent += data.answer
                  }
                }
                if (data.reasoning) {
                  reasoning = data.reasoning
                }
              }
            }
          } catch (e) {
            console.error("Error parsing JSON:", e, "Raw data:", trimmedLine)
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newAssistantMessage.id
              ? {
                  ...msg,
                  content: fullContent,
                  mermaid: isMermaid ? mermaidContent : undefined,
                  reasoning: reasoning || undefined,
                }
              : msg,
          ),
        )
      }

      setSelectedFile(null)
    } catch (error) {
      console.error("Error in chat:", error)
      let errorMessage = "Sorry, an error occurred. Please try again."
      if (error instanceof Error) {
        console.error("Error details:", error.message)
        errorMessage = `Error: ${error.message}`
      }
      setMessages((prev) => [
        ...prev,
        {
          id: "error-" + Date.now(),
          content: errorMessage,
          role: "assistant",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleReasoningToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setIsReasoningMode(!isReasoningMode)
  }

  const renderMessage = useCallback((message: Message) => {
    return (
      <div className="space-y-2 mx-4">
        {message.files &&
          message.files.map((file, index) => (
            <div key={index} className="mb-2">
              <Image
                src={file.url || "/placeholder.svg"}
                alt="Uploaded file"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
          ))}
        {message.mermaid ? (
          <div className="my-2">
            <Mermaid chart={message.mermaid} />
          </div>
        ) : (
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "")
                return !inline && match ? (
                  <SyntaxHighlighter {...props} style={tomorrow} language={match[1]} PreTag="div">
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code {...props} className={className}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {message.reasoning && (
          <div className="mt-2 text-sm text-muted-foreground border-t pt-2">
            <strong>Razonamiento:</strong> {message.reasoning}
          </div>
        )}
        <div className={`text-xs mt-1 ${message.role === "user" ? "text-blue-100" : "text-muted-foreground"}`}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    )
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {showLangSelector && (
        <div className="p-2 bg-gray-100 flex justify-end">
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value)
              const url = new URL(window.location.href)
              url.searchParams.set("lang", e.target.value)
              window.history.pushState({}, "", url)
            }}
            className="p-1 rounded border border-gray-300"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <Card className="w-full h-full flex flex-col shadow-none rounded-none">
        <CardContent className="p-0 flex-grow overflow-hidden flex flex-col">
          <ScrollArea className="flex-grow px-2 h-full">
            {!messagesLoaded ? (
              <div className="text-center p-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center p-4 flex flex-col items-center justify-center h-full absolute inset-0">
                <Image
                  src="https://chat.mediscribe.io/_next/image?url=%2Flogo.png&w=64&q=75"
                  alt="AI Chat Logo"
                  width={48}
                  height={48}
                  className="mb-2"
                />
                <h2 className="text-lg font-semibold mb-1">{getLocalizedText("title")}</h2>
                <p className="text-sm text-gray-600">{getLocalizedText("subtitle")}</p>
              </div>
            ) : (
              <>
                {messages.map((m, index) => (
                  <div
                    key={m.id}
                    className={`mt-4 mr-2 ${m.role === "user" ? "flex justify-end" : "flex justify-start"} ${
                      index === messages.length - 1 ? "mb-4" : ""
                    }`}
                    ref={index === messages.length - 1 ? messagesEndRef : null}
                  >
                    <div
                      className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
                        m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {renderMessage(m)}
                      {m.role === "assistant" && isLoading && m.content === "" && getLocalizedText("thinking")}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-2 border-t mt-auto">
          <form onSubmit={handleSubmit} className="flex flex-col w-full">
            {selectedFile && (
              <div className="flex items-center mb-2 bg-gray-100 p-2 rounded-md">
                <Image
                  src={URL.createObjectURL(selectedFile) || "/placeholder.svg"}
                  alt="Selected file preview"
                  width={40}
                  height={40}
                  className="rounded-md mr-2"
                />
                <span className="text-sm text-gray-600 flex-grow">{selectedFile.name}</span>
                <Button
                  type="button"
                  onClick={removeSelectedFile}
                  className="bg-transparent hover:bg-transparent focus:outline-none p-1"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <Button variant="outline" size="sm" className="flex items-center gap-2" type="button" disabled>
                <Brain className="w-4 h-4" />
                {getLocalizedText("reasoning")}
                <span className="text-xs bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded">Coming Soon</span>
              </Button>
            </div>
            <div className="flex w-full space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getLocalizedText("placeholder")}
                className="flex-grow bg-transparent focus:outline-none focus:ring-0 border-none focus:border-none"
                disabled={isLoading}
              />
              <Input type="file" onChange={handleFileChange} className="hidden" id="file-upload" />
              <Button
                type="button"
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={true}
                className="bg-transparent hover:bg-transparent focus:outline-none p-2"
              >
                <Paperclip className="w-4 h-4 text-gray-300" />
              </Button>
              <Button
                type="submit"
                disabled={isLoading || (!input.trim() && !selectedFile)}
                className="bg-transparent hover:bg-transparent focus:outline-none p-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                ) : (
                  <Send className="w-4 h-4 text-gray-500" />
                )}
              </Button>
            </div>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Chat />
    </Suspense>
  )
}

