import QRCode from 'qrcode'

export async function gerarCartazPDF(animal: {
    id: string
    nome: string
    especie: string
    raca?: string | null
    cor: string
    descricao?: string
    foto_url?: string | null
    created_at: string
}, baseUrl: string): Promise<void> {
    const url = baseUrl + '/animais/' + animal.id
    const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#15803d', light: '#ffffff' }
    })

    const especie = animal.especie === 'cao' ? 'Cão' : animal.especie === 'gato' ? 'Gato' : 'Animal'
    const data = new Date(animal.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Cartaz — ${animal.nome}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; background: white; }
  .page {
    width: 210mm; min-height: 297mm;
    padding: 20mm;
    display: flex; flex-direction: column; align-items: center;
  }
  .header {
    background: #15803d; color: white;
    width: 100%; padding: 12px 20px;
    border-radius: 12px; text-align: center;
    margin-bottom: 20px;
  }
  .header h1 { font-size: 28px; letter-spacing: 4px; }
  .header p { font-size: 13px; opacity: 0.85; margin-top: 2px; }
  .foto {
    width: 200px; height: 200px;
    border-radius: 16px; object-fit: cover;
    border: 4px solid #15803d;
    margin-bottom: 16px;
  }
  .foto-placeholder {
    width: 200px; height: 200px;
    border-radius: 16px;
    background: #f0fdf4;
    border: 4px solid #15803d;
    display: flex; align-items: center; justify-content: center;
    font-size: 80px; margin-bottom: 16px;
  }
  .nome { font-size: 42px; font-weight: bold; color: #14532d; margin-bottom: 8px; }
  .badges {
    display: flex; gap: 8px; flex-wrap: wrap;
    justify-content: center; margin-bottom: 16px;
  }
  .badge {
    background: #dcfce7; color: #15803d;
    font-size: 13px; padding: 4px 14px;
    border-radius: 20px; font-family: Arial, sans-serif;
    border: 1px solid #bbf7d0;
  }
  .descricao {
    background: #f0fdf4; border: 1px solid #bbf7d0;
    border-radius: 12px; padding: 14px 20px;
    font-family: Arial, sans-serif; font-size: 13px;
    color: #374151; line-height: 1.6;
    width: 100%; margin-bottom: 20px; text-align: center;
  }
  .divider { width: 100%; height: 2px; background: #dcfce7; margin: 16px 0; }
  .qr-section {
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; margin-bottom: 20px;
  }
  .qr-section img { width: 150px; height: 150px; }
  .qr-text { font-family: Arial, sans-serif; font-size: 12px; color: #6b7280; text-align: center; }
  .qr-url { font-family: Arial, sans-serif; font-size: 11px; color: #15803d; word-break: break-all; text-align: center; }
  .footer {
    margin-top: auto; width: 100%;
    border-top: 2px solid #dcfce7; padding-top: 16px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-logo { font-size: 18px; color: #15803d; font-weight: bold; }
  .footer-text { font-family: Arial, sans-serif; font-size: 11px; color: #9ca3af; }
  .data { font-family: Arial, sans-serif; font-size: 12px; color: #9ca3af; margin-top: 4px; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 15mm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>⚠ ANIMAL DESAPARECIDO</h1>
    <p>Se o viste, por favor lê o QR Code ou contacta-nos</p>
  </div>

  ${animal.foto_url
            ? `<img class="foto" src="${animal.foto_url}" alt="${animal.nome}" crossorigin="anonymous" />`
            : `<div class="foto-placeholder">${animal.especie === 'gato' ? '🐈' : '🐕'}</div>`
        }

  <div class="nome">${animal.nome}</div>

  <div class="badges">
    <span class="badge">${especie}${animal.raca ? ' · ' + animal.raca : ''}</span>
    <span class="badge">${animal.cor}</span>
    <span class="badge">Desaparecido desde ${data}</span>
  </div>

  ${animal.descricao ? `<div class="descricao">${animal.descricao}</div>` : ''}

  <div class="divider"></div>

  <div class="qr-section">
    <img src="${qrDataUrl}" alt="QR Code" />
    <div class="qr-text">📱 Lê o QR Code para ver avistamentos e contactar o dono</div>
    <div class="qr-url">${url}</div>
  </div>

  <div class="footer">
    <div class="footer-logo">🐾 PetGuardian</div>
    <div class="footer-text">Plataforma portuguesa de localização de animais</div>
    <div class="footer-text">petguardian.pt</div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 500);
  }
</script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const blobUrl = URL.createObjectURL(blob)
    const win = window.open(blobUrl, '_blank')
    if (win) {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    }
}