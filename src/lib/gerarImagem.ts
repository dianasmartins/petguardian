// Gera uma imagem 1080x1080 para partilhar no Instagram/redes sociais
// Usa a Canvas API do browser — sem dependências externas

interface DadosAnimal {
    nome: string
    especie: string
    raca?: string | null
    cor: string
    foto_url?: string | null
    data_desaparecimento: string
    total_avistamentos: number
}

export async function gerarImagemPartilha(dados: DadosAnimal): Promise<string> {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1080
    const ctx = canvas.getContext('2d')!

    // Fundo gradiente laranja
    const grad = ctx.createLinearGradient(0, 0, 0, 1080)
    grad.addColorStop(0, '#FFF7ED')
    grad.addColorStop(1, '#FFEDD5')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1080, 1080)

    // Borda laranja no topo
    ctx.fillStyle = '#F97316'
    ctx.fillRect(0, 0, 1080, 12)

    // Foto do animal (se existir)
    if (dados.foto_url) {
        try {
            const img = await carregarImagem(dados.foto_url)
            // Círculo de foto
            ctx.save()
            ctx.beginPath()
            ctx.arc(540, 340, 260, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(img, 280, 80, 520, 520)
            ctx.restore()
            // Borda do círculo
            ctx.beginPath()
            ctx.arc(540, 340, 260, 0, Math.PI * 2)
            ctx.strokeStyle = '#F97316'
            ctx.lineWidth = 10
            ctx.stroke()
        } catch {
            // Se a foto falhar, usa emoji
            ctx.font = '200px serif'
            ctx.textAlign = 'center'
            ctx.fillText(dados.especie === 'gato' ? '🐈' : '🐕', 540, 480)
        }
    } else {
        // Sem foto — círculo com emoji
        ctx.beginPath()
        ctx.arc(540, 340, 260, 0, Math.PI * 2)
        ctx.fillStyle = '#FED7AA'
        ctx.fill()
        ctx.strokeStyle = '#F97316'
        ctx.lineWidth = 10
        ctx.stroke()
        ctx.font = '200px serif'
        ctx.textAlign = 'center'
        ctx.fillText(dados.especie === 'gato' ? '🐈' : '🐕', 540, 440)
    }

    // Badge DESAPARECIDO
    const badgeW = 380
    const badgeX = (1080 - badgeW) / 2
    ctx.fillStyle = '#DC2626'
    roundRect(ctx, badgeX, 640, badgeW, 64, 32)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚠ DESAPARECIDO', 540, 681)

    // Nome do animal
    ctx.fillStyle = '#1C1917'
    ctx.font = `bold 80px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.fillText(dados.nome.toUpperCase(), 540, 770)

    // Linha laranja separadora
    ctx.fillStyle = '#F97316'
    ctx.fillRect(200, 790, 680, 4)

    // Detalhes
    ctx.fillStyle = '#57534E'
    ctx.font = '36px Arial, sans-serif'
    const especie = dados.especie === 'cao' ? 'Cão' : dados.especie === 'gato' ? 'Gato' : 'Animal'
    const detalhe = `${especie}${dados.raca ? ` · ${dados.raca}` : ''} · ${dados.cor}`
    ctx.fillText(detalhe, 540, 850)

    // Data
    ctx.font = '32px Arial, sans-serif'
    ctx.fillStyle = '#78716C'
    ctx.fillText(`Desaparecido desde ${dados.data_desaparecimento}`, 540, 900)

    // Avistamentos
    if (dados.total_avistamentos > 0) {
        ctx.fillStyle = '#F97316'
        ctx.font = 'bold 30px Arial, sans-serif'
        ctx.fillText(`👁 ${dados.total_avistamentos} avistamento${dados.total_avistamentos > 1 ? 's' : ''} reportado${dados.total_avistamentos > 1 ? 's' : ''}`, 540, 950)
    }

    // Logo PetGuardian em baixo
    ctx.fillStyle = '#F97316'
    ctx.font = 'bold 28px Georgia, serif'
    ctx.fillText('🐾 PetGuardian', 540, 1020)
    ctx.fillStyle = '#A8A29E'
    ctx.font = '22px Arial, sans-serif'
    ctx.fillText('#AnimalDesaparecido #Portugal #PetGuardian', 540, 1056)

    return canvas.toDataURL('image/png')
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = url
    })
}