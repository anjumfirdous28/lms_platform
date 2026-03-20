import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

const botResponses = (query: string, courses: any[]) => {
  const q = query.toLowerCase();
  const matches = courses.filter(c =>
    c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
  );
  if (matches.length > 0) {
    return `I found ${matches.length} course(s) matching your query:\n${matches.map(c => `• **${c.title}** — $${c.price}`).join('\n')}`;
  }
  if (q.includes('hello') || q.includes('hi')) return "Hi there! 👋 I'm LearnBot. Ask me about courses, pricing, or enrollment!";
  if (q.includes('price') || q.includes('cost')) return "Course prices vary. Browse our catalog or ask about a specific topic!";
  if (q.includes('enroll')) return "Click on any course card to start the enrollment process!";
  if (q.includes('help')) return "I can help you find courses, check prices, and answer questions. Just type a topic!";
  return `I don't have specific info on "${query}". Try searching for a topic like "react", "python", etc.`;
};

export default function Chatbot({ courses }: { courses: any[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Hi! 👋 I'm LearnBot. How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setInput('');
    setTimeout(() => {
      setMessages(m => [...m, { role: 'bot', content: botResponses(userMsg, courses) }]);
    }, 500);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 glass-card flex flex-col max-h-[500px]"
          >
            <div className="p-4 gradient-primary rounded-t-xl flex items-center justify-between">
              <span className="font-display font-semibold text-primary-foreground">LearnBot</span>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-primary-foreground/80" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'gradient-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    {m.content.split('\n').map((line, j) => <p key={j}>{line}</p>)}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                placeholder="Ask about courses..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                className="text-sm"
              />
              <Button size="icon" onClick={send} className="gradient-primary text-primary-foreground shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 gradient-primary rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6 text-primary-foreground" /> : <MessageCircle className="w-6 h-6 text-primary-foreground" />}
      </button>
    </>
  );
}
