import { useState, useEffect } from 'react';

export default function KernelPanicOverlay() {
  const [garbage, setGarbage] = useState([]);

  useEffect(() => {
    const chars = '0123456789ABCDEF!@#$%^&*()_+GARBAGE_FILE_SYS_ERR_0x00A';
    const interval = setInterval(() => {
      setGarbage(prev => {
        const newLine = Array.from({ length: 40 }).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
        const next = [...prev, newLine];
        if (next.length > 30) next.shift();
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-40 bg-red-950/90 flex flex-col justify-end overflow-hidden pointer-events-none mix-blend-overlay opacity-80">
      {garbage.map((line, i) => (
        <div key={i} className="font-mono text-xs text-red-500 leading-none break-all whitespace-nowrap opacity-50">
          {line}
        </div>
      ))}
    </div>
  );
}