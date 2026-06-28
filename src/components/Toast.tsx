import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface Toast {
    id: number
    mensagem: string
    tipo: 'sucesso' | 'erro' | 'info'
}

interface ToastContextType {
    mostrarToast: (mensagem: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({ mostrarToast: () => { } })

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const mostrarToast = useCallback((mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, mensagem, tipo }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3500)
    }, [])

    const icone = (tipo: string) => {
        if (tipo === 'sucesso') return '✓'
        if (tipo === 'erro') return '✕'
        return 'ℹ'
    }

    const cores = (tipo: string) => {
        if (tipo === 'sucesso') return 'bg-green-600 text-white'
        if (tipo === 'erro') return 'bg-red-600 text-white'
        return 'bg-stone-800 text-white'
    }

    return (
        <ToastContext.Provider value={{ mostrarToast }}>
            {children}

            {/* Toast container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-semibold pointer-events-auto animate-fade-in-up ${cores(toast.tipo)}`}
                        style={{ animation: 'slideUp 0.25s ease-out' }}
                    >
                        <span className="text-base">{icone(toast.tipo)}</span>
                        <span>{toast.mensagem}</span>
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </ToastContext.Provider>
    )
}