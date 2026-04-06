import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Bot, User, Loader2, Image as ImageIcon, Sparkles, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { GoogleGenAI, Type } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

export const AssistantView = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: `Olá! Sou seu assistente de IA do TrafficFlow. Posso ajudar com análises, dúvidas sobre o sistema, ou até mesmo **gerar imagens** para o seu perfil, empresas ou filiais. Como posso ajudar hoje?`,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateImage = async (prompt: string): Promise<string | null> => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Error generating image:", error);
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave da API não configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const generateImageTool = {
        name: "generateImage",
        description: "Gera uma imagem baseada em um prompt de texto. Use isso APENAS quando o usuário pedir explicitamente para criar, desenhar ou gerar uma imagem, foto de perfil, logo de empresa, etc. Traduza o prompt para inglês antes de enviar.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: "A descrição detalhada da imagem a ser gerada, em inglês."
            }
          },
          required: ["prompt"]
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input,
        config: {
          systemInstruction: `Você é o assistente de IA especializado do sistema TrafficFlow Ultimate. 
          Você pode ajudar com dúvidas, análises e também tem a capacidade de gerar imagens usando a ferramenta generateImage.
          Se o usuário pedir uma imagem, use a ferramenta generateImage com um prompt detalhado em inglês.
          Responda sempre em Português do Brasil de forma amigável e profissional.`,
          tools: [{ functionDeclarations: [generateImageTool] }]
        }
      });

      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'generateImage') {
          const args = call.args as any;
          const prompt = args.prompt;
          
          setMessages(prev => [...prev, {
            id: Date.now().toString() + '-generating',
            role: 'model',
            content: `Gerando imagem para: "${prompt}"... Aguarde um momento.`,
            timestamp: new Date()
          }]);

          const imageUrl = await generateImage(prompt);
          
          if (imageUrl) {
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1] = {
                id: Date.now().toString(),
                role: 'model',
                content: "Aqui está a imagem gerada! Você pode salvá-la para usar no seu perfil ou nas empresas.",
                imageUrl: imageUrl,
                timestamp: new Date()
              };
              return newMsgs;
            });
          } else {
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1] = {
                id: Date.now().toString(),
                role: 'model',
                content: "Desculpe, ocorreu um erro ao gerar a imagem. Tente novamente com outra descrição.",
                timestamp: new Date()
              };
              return newMsgs;
            });
          }
        }
      } else {
        const modelMessage: Message = {
          id: Date.now().toString(),
          role: 'model',
          content: response.text || "Desculpe, não consegui processar sua solicitação.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, modelMessage]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: `Erro: ${error.message || "Ocorreu um erro ao processar sua mensagem."}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `trafficflow-image-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] max-w-4xl mx-auto bg-white dark:bg-[var(--bg)] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Assistente IA</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Análises e Geração de Imagens</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
              msg.role === 'user' 
                ? "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400" 
                : "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
            )}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={cn(
              "p-3 rounded-2xl",
              msg.role === 'user'
                ? "bg-sky-500 text-white rounded-tr-none"
                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
            )}>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              
              {msg.imageUrl && (
                <div className="mt-3 relative group">
                  <img 
                    src={msg.imageUrl} 
                    alt="Generated" 
                    className="rounded-xl w-full max-w-sm object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={() => handleDownloadImage(msg.imageUrl!)}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Baixar Imagem"
                  >
                    <Download size={16} />
                  </button>
                </div>
              )}
              
              <span className={cn(
                "text-[10px] mt-2 block opacity-60",
                msg.role === 'user' ? "text-sky-100 text-right" : "text-slate-500"
              )}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 max-w-[85%]"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 rounded-tl-none flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span className="text-sm text-slate-500 dark:text-slate-400">Processando...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--bg)]">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo ou peça para gerar uma imagem..."
            className="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-sky-500 dark:text-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:hover:bg-sky-500 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
