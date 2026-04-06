import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from "@google/genai";
import { useClickOutside } from '@/hooks/useClickOutside';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  pageContext: string;
  dataSummary: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ pageContext, dataSummary, isOpen, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBranchAnalysis, setIsBranchAnalysis] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: `Olá! Sou seu assistente de IA do TrafficFlow. Como posso ajudar você hoje com a página de **${pageContext}**?`,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useClickOutside(widgetRef, () => {
    if (isOpen) onClose();
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
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
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `Você é o assistente de IA especializado do sistema TrafficFlow Ultimate. 
          Seu objetivo é ajudar o usuário com dúvidas sobre o sistema, análise de dados e estratégias de tráfego pago.
          
          CONTEXTO ATUAL DA PÁGINA: ${pageContext}
          RESUMO DOS DADOS DA PÁGINA: ${dataSummary}
          MODO DE ANÁLISE: ${isBranchAnalysis ? 'Filial por Filial' : 'Geral'}
          
          Instruções:
          1. Seja profissional, prestativo e estratégico.
          2. Use os dados fornecidos para dar respostas precisas sobre o que o usuário está vendo.
          3. Se o usuário perguntar algo fora do contexto, responda educadamente mas tente trazer de volta para o negócio se possível.
          4. Use Markdown para formatar suas respostas.
          5. Responda sempre em Português do Brasil.`
        }
      });

      const response = await chat.sendMessage({
        message: input
      });

      const modelMessage: Message = {
        role: 'model',
        content: response.text || "Desculpe, não consegui processar sua solicitação.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: `Erro: ${error.message || "Ocorreu um erro ao processar sua mensagem."}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={widgetRef}
          initial={{ opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom right' }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className={cn(
            "fixed bottom-24 right-8 bg-surface border border-border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-300 z-[9999]",
            isExpanded ? "w-[90vw] md:w-[500px] h-[80vh] md:h-[700px]" : "w-[85vw] md:w-[380px] h-[60vh] md:h-[500px]"
          )}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary/20 to-transparent border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Assistente IA</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Analysis Mode Switch */}
          <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Análise por Filial</span>
            <button
              onClick={() => setIsBranchAnalysis(!isBranchAnalysis)}
              className={cn(
                "w-10 h-5 rounded-full p-0.5 transition-colors duration-300",
                isBranchAnalysis ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full bg-white transition-transform duration-300",
                isBranchAnalysis ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-muted/10">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
                  msg.role === 'user' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={cn(
                  "p-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-primary text-primary-foreground font-medium rounded-tr-none" 
                    : "bg-surface border border-border text-foreground rounded-tl-none shadow-sm"
                )}>
                  <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  <div className={cn(
                    "text-[10px] mt-1 opacity-50",
                    msg.role === 'user' ? "text-right" : ""
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-surface border border-border p-3 rounded-2xl rounded-tl-none shadow-sm">
                  <Loader2 size={16} className="animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-surface">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte qualquer coisa..."
                className="w-full bg-muted border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <Sparkles size={10} className="text-primary" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">Powered by Gemini AI</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
