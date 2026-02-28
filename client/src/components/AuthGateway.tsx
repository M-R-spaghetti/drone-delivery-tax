import { useState, useEffect } from 'react';

interface AuthGatewayProps {
    children: React.ReactNode;
}

export function AuthGateway({ children }: AuthGatewayProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [input, setInput] = useState('');
    const [lines, setLines] = useState<string[]>([]);
    const [showInput, setShowInput] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [isGranted, setIsGranted] = useState(false);

    useEffect(() => {
        const auth = localStorage.getItem('CORPO_AUTH');
        if (auth === 'VALID') {
            setIsAuthenticated(true);
            return;
        }

        const bootSequence = [
            '> INITIATING_HANDSHAKE...',
            '> ENCRYPTION: SHA-256',
            '> SECURITY_LEVEL: OMEGA',
            '> AWAITING_AUTHORIZATION:'
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < bootSequence.length) {
                setLines(prev => [...prev, bootSequence[i]]);
                i++;
                if (i === bootSequence.length) {
                    setTimeout(() => setShowInput(true), 500);
                }
            } else {
                clearInterval(interval);
            }
        }, 800);

        return () => clearInterval(interval);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (input === 'CORP_SYS_ADMIN') {
            setIsGranted(true);
            setTimeout(() => {
                localStorage.setItem('CORPO_AUTH', 'VALID');
                setIsAuthenticated(true);
            }, 1500);
        } else {
            setIsShaking(true);
            setLines(prev => [...prev, '> [ ACCESS_VIOLATION // IP_LOGGED ]']);
            setInput('');
            setTimeout(() => setIsShaking(false), 500);
        }
    };

    if (isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className={`fixed inset-0 z-[1000] bg-[#000000] flex flex-col items-center justify-center font-mono p-8 ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>

            <div className="w-full max-w-2xl bg-[#000000] h-[400px] border border-zinc-800 p-8 flex flex-col justify-end shadow-[inset_0_0_50px_rgba(0,0,0,1)] relative overflow-hidden">
                {/* Scanline */}
                <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '100% 4px'
                }}></div>

                <div className="relative z-10 flex flex-col gap-3">
                    {lines.map((line, i) => (
                        <div key={i} className={`text-[14px] uppercase tracking-widest ${line?.includes('VIOLATION') ? 'text-[#71717A]' : 'text-zinc-500'}`}>
                            {line}
                        </div>
                    ))}

                    {showInput && !isGranted && (
                        <form onSubmit={handleSubmit} className="flex items-center gap-3 mt-4">
                            <span className="text-[#FFD700] text-[14px] font-bold tracking-widest leading-none drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]">
                                {'>'} ENTER_ACCESS_TOKEN:
                            </span>
                            <input
                                autoFocus
                                type="password"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                className="bg-transparent border-none outline-none text-white font-mono text-[14px] tracking-[0.3em] flex-1 caret-transparent"
                            />
                            {/* Custom blinking cursor */}
                            <span className="w-2.5 h-4 bg-[#FFD700] inline-block animate-[blink_1s_infinite] shadow-[0_0_5px_rgba(255,215,0,0.8)] -ml-4"></span>
                        </form>
                    )}

                    {isGranted && (
                        <div className="mt-8 text-center animate-pulse">
                            <span className="text-[#FFD700] text-xl font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]">
                                [ ACCESS_GRANTED // WELCOME_COMMANDER ]
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
