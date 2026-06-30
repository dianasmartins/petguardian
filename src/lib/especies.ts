export function iconeEspecie(especie: string): string {
  switch (especie) {
    case 'gato': return '🐈'
    case 'ave': return '🦜'
    case 'coelho': return '🐰'
    case 'roedor': return '🐹'
    case 'reptil': return '🦎'
    case 'cao': return '🐕'
    default: return '🐾'
  }
}

export function nomeEspecie(especie: string): string {
  switch (especie) {
    case 'cao': return 'Cão'
    case 'gato': return 'Gato'
    case 'ave': return 'Ave'
    case 'coelho': return 'Coelho'
    case 'roedor': return 'Roedor'
    case 'reptil': return 'Réptil'
    default: return 'Outro'
  }
}

export const OPCOES_ESPECIE: [string, string][] = [
  ['cao', '🐕 Cão'],
  ['gato', '🐈 Gato'],
  ['ave', '🦜 Ave'],
  ['coelho', '🐰 Coelho'],
  ['roedor', '🐹 Roedor'],
  ['outro', '🐾 Outro'],
]
