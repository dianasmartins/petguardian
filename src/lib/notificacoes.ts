// Regista o service worker e pede permissão para notificações
export async function registarNotificacoesPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.log('Notificações push não suportadas neste browser')
        return false
    }

    try {
        // Regista o service worker
        await navigator.serviceWorker.register('/sw.js')

        // Pede permissão
        const permissao = await Notification.requestPermission()
        if (permissao !== 'granted') return false

        return true
    } catch (err) {
        console.error('Erro ao registar notificações:', err)
        return false
    }
}

// Envia notificação local (sem servidor push — funciona com browser aberto)
export function enviarNotificacaoLocal(titulo: string, corpo: string, url: string = '/ocorrencias') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const notif = new Notification(titulo, {
        body: corpo,
        icon: '/favicon.ico',
        tag: 'petguardian-avistamento',
    })

    notif.onclick = () => {
        window.focus()
        window.location.href = url
        notif.close()
    }

    // Fecha automaticamente após 6 segundos
    setTimeout(() => notif.close(), 6000)
}