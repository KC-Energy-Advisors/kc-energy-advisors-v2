'use client';
import { useState, useEffect, useRef } from 'react';
import { CHAT_SCRIPT } from '@/lib/constants';
import RevealSection from '@/components/ui/RevealSection';

// All demo messages pre-computed at module level — never changes, zero cost.
const DEMO_MESSAGES: Msg[] = CHAT_SCRIPT.map(m => ({ from: m.from, text: m.text }));

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-slate-700 rounded-2xl rounded-tl-sm w-fit">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-typing-bounce"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </div>
  );
}

interface Msg { from: 'michael' | 'user'; text: string; }

export default function MeetMichael() {
  // Full message list from first render — no post-mount appends, no layout shift.
  const [messages, setMessages] = useState<Msg[]>(DEMO_MESSAGES);
  const [typing, setTyping]     = useState(false);
  const chatContainerRef         = useRef<HTMLDivElement>(null);
  const userInitiatedRef         = useRef(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // iMessage-style internal scroll — ONLY scrolls the phone container, NEVER the page.
  // Skipped for the initial pre-rendered demo messages (userInitiatedRef is false).
  useEffect(() => {
    if (!userInitiatedRef.current) return;
    const el = chatContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, [messages]);

  const openChat = () => {
    userInitiatedRef.current = true;
    setIsChatOpen(true);
  };

  const handleSend = async () => {
    const msg = inputValue.trim();
    if (!msg) return;
    userInitiatedRef.current = true;
    setInputValue('');
    await sendMessage(msg);
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const historySnapshot = messages.slice(-10).map(m => ({
      role:    m.from === 'michael' ? 'assistant' : 'user',
      content: m.text,
    }));

    setMessages(prev => [...prev, { from: 'user', text: message }]);
    setTyping(true);

    try {
      const res = await fetch('/api/website-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          name:    'Website Visitor',
          phone:   'web-user',
          source:  'website_chat',
          history: historySnapshot,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.reply) {
        setMessages(prev => [
          ...prev,
          { from: 'michael', text: "Sorry, having a tech issue on my end. You can grab a time here: https://kcenergyadvisors.com/get-solar-info" },
        ]);
        return;
      }

      setMessages(prev => [...prev, { from: 'michael', text: data.reply }]);

    } catch {
      setMessages(prev => [
        ...prev,
        { from: 'michael', text: "Something went wrong on my end. You can grab a time here: https://kcenergyadvisors.com/get-solar-info" },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <section id="meet-michael" className="bg-brand-navy py-24 overflow-hidden">
      <div className="max-w-site mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <RevealSection>
              <div className="inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-widest text-white/80 bg-white/10 border border-white/18 px-3.5 py-1.5 rounded-full mb-4">
                Meet Michael
              </div>
            </RevealSection>
            <RevealSection delay={1}>
              <h2 className="text-display-md font-black text-white mb-5">
                Your AI solar advisor.<br/>
                <span className="text-brand-gold">Available 24/7.</span>
              </h2>
            </RevealSection>
            <RevealSection delay={2}>
              <p className="text-lg text-white/65 leading-relaxed mb-8">
                Michael is a Claude-powered AI trained specifically on KC solar incentives, Evergy rates, and local installer pricing. He texts you within minutes — not hours — with honest, personalized answers.
              </p>
            </RevealSection>

            <div className="flex flex-col gap-4 mb-10">
              {([
                { icon: '⚡', label: 'Instant SMS response — usually under 2 minutes' },
                { icon: '🔒', label: 'No spam. Reply STOP anytime to opt out.' },
                { icon: '🤝', label: 'Qualifies your home before any human contact' },
                { icon: '📅', label: "Sends personalized booking link when you're ready" },
              ] as const).map((f, i) => (
                <RevealSection key={f.label} delay={(i as 0 | 1 | 2 | 3)}>
                  <div className="flex items-start gap-3">
                    <span className="text-[18px] flex-shrink-0 mt-0.5">{f.icon}</span>
                    <p className="text-[14.5px] text-white/70">{f.label}</p>
                  </div>
                </RevealSection>
              ))}
            </div>

            <RevealSection delay={3}>
              <button
                onClick={openChat}
                className="mt-6 inline-block bg-brand-gold text-black font-semibold px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition cursor-pointer"
              >
                Text with Michael Now →
              </button>
            </RevealSection>
            {isChatOpen && (
              <div className="mt-4 max-w-md rounded-xl border border-brand-blue/20 bg-slate-900 p-4 text-white shadow-xl">
                <p className="text-sm font-semibold">Start chatting with Michael now</p>
                <p className="text-xs text-white/70 mt-1">Type your question in the phone →</p>
              </div>
            )}
          </div>

          {/* Right — phone mockup */}
          <div className="flex items-center justify-center">
            <div className="relative">
              {/* Ambient glow behind phone */}
              <div
                className="absolute inset-0 rounded-[56px] pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, transparent 70%)',
                  transform: 'scale(1.25)',
                  filter: 'blur(24px)',
                }}
              />

              {/* Phone shell — fixed 540px, overflow-hidden, never grows */}
              <div
                className="relative w-[300px] bg-slate-900 rounded-[48px] border-[5px] border-slate-700 overflow-hidden flex flex-col"
                style={{
                  height: '540px',
                  boxShadow: '0 40px 90px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset',
                }}
              >
                {/* Status bar */}
                <div className="relative bg-slate-900 px-5 pt-5 pb-2 flex items-center justify-between shrink-0">
                  <span className="text-[11px] text-white/50 font-medium">9:41 AM</span>
                  <div className="absolute left-1/2 -translate-x-1/2 top-[14px] w-[88px] h-[26px] bg-black rounded-full z-10" />
                  <div className="flex gap-1 items-center">
                    {[5, 7, 9, 11].map((h, i) => (
                      <div key={i} className="bg-white/50 rounded-[1px] w-[3px]" style={{ height: h }} />
                    ))}
                    <div className="ml-1.5 w-[20px] h-[10px] rounded-[3px] border border-white/35 relative flex items-center pl-[2px]">
                      <div className="w-[13px] h-[6px] bg-white/55 rounded-[2px]" />
                      <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[3px] h-[5px] bg-white/30 rounded-r-[2px]" />
                    </div>
                  </div>
                </div>

                {/* Chat header */}
                <div className="bg-slate-800 px-5 py-3 flex items-center gap-3 border-b border-white/[0.06] shrink-0">
                  <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-lg">
                    M
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate">Michael · KC Energy Advisors</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse-dot" />
                      <span className="text-[10px] text-white/45">AI Advisor · Typically replies instantly</span>
                    </div>
                  </div>
                </div>

                {/* Chat messages — scrolls internally only, page never moves */}
                <div
                  ref={chatContainerRef}
                  className="bg-[#1a1f2e] px-4 py-4 flex-1 overflow-y-auto flex flex-col gap-2.5 min-h-0"
                >
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] text-[12.5px] leading-relaxed rounded-2xl px-3.5 py-2.5 ${
                          m.from === 'michael'
                            ? 'bg-slate-700 text-white rounded-tl-sm'
                            : 'bg-brand-blue text-white rounded-tr-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {typing && (
                    <div className="flex justify-start">
                      <TypingDots />
                    </div>
                  )}
                </div>

                {/* Input bar — always visible, pinned at bottom */}
                <div className="px-3 py-2.5 flex items-center gap-2 border-t border-white/[0.06] shrink-0"
                  style={{ background: 'rgba(30,35,50,0.98)' }}
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                    placeholder="Type a message…"
                    className="flex-1 bg-slate-700 text-white text-[12px] placeholder-white/30 rounded-full px-4 py-2 outline-none border border-transparent focus:border-brand-blue/50 transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    aria-label="Send message"
                    className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center flex-shrink-0 hover:bg-blue-500 transition-colors"
                    style={{ boxShadow: '0 2px 8px rgba(59,130,246,0.4)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                      <path d="M1 6.5h11M6.5 1l5.5 5.5-5.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

              </div>{/* /phone shell */}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
