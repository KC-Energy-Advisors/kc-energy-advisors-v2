'use client';
import { useState, useEffect, useRef } from 'react';
import { useIntersection } from '@/hooks/useIntersection';
import { CHAT_SCRIPT } from '@/lib/constants';
import RevealSection from '@/components/ui/RevealSection';
import { LinkButton } from '@/components/ui/Button';

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-slate-100 rounded-2xl rounded-tl-sm w-fit">
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
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export default function MeetMichael() {
  const { ref: sectionRef, visible } = useIntersection<HTMLDivElement>({ threshold: 0.3, once: true });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping]     = useState(false);
  const [done, setDone]         = useState(false);
  const chatEndRef               = useRef<HTMLDivElement>(null);
  const startedRef               = useRef(false);
const [isChatOpen, setIsChatOpen] = useState(false);

const openChat = () => {
  setIsChatOpen(true);
};
const sendMessage = async (message: string) => {
  if (!message.trim()) return;

  // show user message
  setMessages((prev) => [
    ...prev,
    { from: "user", text: message },
  ]);

  try {
    const res = await fetch("https://michael-agent-2uow.onrender.com/webhook/website-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        name: "Website Visitor",
        phone: "web-user",
      }),
    });

    const data = await res.json();

    // show AI reply
    setMessages((prev) => [
      ...prev,
      { from: "michael", text: data.reply },
    ]);

  } catch (err) {
    console.error("Send error:", err);
  }
};
  useEffect(() => {
    if (!visible || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    (async () => {
      for (let i = 0; i < CHAT_SCRIPT.length; i++) {
        const msg = CHAT_SCRIPT[i];
        if (cancelled) break;

        // Show typing indicator for Michael's messages
        if (msg.from === 'michael') {
          setTyping(true);
          await sleep(msg.delay);
          setTyping(false);
        } else {
          await sleep(msg.delay);
        }

        if (cancelled) break;
        setMessages(prev => [...prev, { from: msg.from, text: msg.text }]);
        await sleep(200);
      }
      if (!cancelled) setDone(true);
    })();

    return () => { cancelled = true; };
  }, [visible]);

  useEffect(() => {
    //chatEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest'// });
  }, [messages, typing]);

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
                { icon: '📅', label: 'Sends personalized booking link when you\'re ready' },
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
    <p className="text-sm font-semibold">
      Start chatting with Michael now
    </p>
    <p className="text-xs text-white/70 mt-1">
      Type your question in the phone on the right →
    </p>
  </div>
)}
          </div>

          {/* Right — animated phone */}
          <div ref={sectionRef} className="flex justify-center">
            <div className="relative">
              {/* Phone shell */}
              <div className="w-[300px] bg-slate-900 rounded-[48px] border-4 border-slate-700 shadow-2xl shadow-black/60 overflow-hidden">
                {/* Status bar */}
                <div className="bg-slate-900 px-6 pt-5 pb-3 flex items-center justify-between">
                  <span className="text-[11px] text-white/50 font-medium">9:41 AM</span>
                  <div className="w-[80px] h-[22px] bg-slate-800 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-5" />
                  <div className="flex gap-1">
                    {[3,3,3,4].map((w, i) => (
                      <div key={i} className="bg-white/50 rounded-sm" style={{ width: w, height: 10 }} />
                    ))}
                  </div>
                </div>

                {/* Chat header */}
                <div className="bg-slate-800 px-5 py-3 flex items-center gap-3 border-b border-white/[0.06]">
                  <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white font-black text-sm flex-shrink-0">M</div>
                  <div>
                    <div className="text-[13px] font-semibold text-white">Michael · KC Energy Advisors</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse-dot" />
                      <span className="text-[10px] text-white/45">AI Advisor · Typically replies instantly</span>
                    </div>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="bg-[#1a1f2e] px-4 py-4 min-h-[340px] max-h-[340px] overflow-y-auto flex flex-col gap-3">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'} animate-msg-pop`}
                    >
                      <div
                        className={`max-w-[78%] text-[12.5px] leading-relaxed rounded-2xl px-3.5 py-2.5 ${
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
                    <div className="flex justify-start animate-msg-pop">
                      <TypingDots />
                    </div>
                  )}

                  {done && (
                    <div className="text-center text-[10px] text-white/25 mt-2 animate-msg-pop">
                      🎉 Booked — see you Tuesday at 2pm!
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

               {/* Input bar */}
<div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-t border-white/10">
  <input
    type="text"
    placeholder="Type a message..."
    className="flex-1 bg-slate-700 rounded-full px-4 py-2 text-sm text-white outline-none"
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        sendMessage(e.currentTarget.value);
        e.currentTarget.value = "";
      }
    }}
  />

  <button
    type="button"
    onClick={(e) => {
      const input = e.currentTarget.parentElement?.querySelector("input");
      if (input && input.value) {
        sendMessage(input.value);
        input.value = "";
      }
    }}
    className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center text-white"
  >
    ➤
  </button>
</div>

</div> {/* closes phone shell */}

{/* Decorative glows */}
<div className="absolute -top-10 -left-10 w-48 h-48 bg-brand-blue/20 rounded-full blur-[60px] pointer-events-none"></div>
<div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-gold/15 rounded-full blur-[50px] pointer-events-none"></div>

</div> {/* closes relative phone wrapper */}
</div> {/* closes right column */}
</div> {/* closes grid */}

{isChatOpen && (
  <div className="mt-10 mx-auto max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl">
    Chat is open 🔥
  </div>
)}

</div> {/* closes max-w-site container */}
</section>
);
}
