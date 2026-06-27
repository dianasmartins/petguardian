export interface Animal {
    id: string
    dono_id: string
    nome: string
    especie: string
    raca: string | null
    cor: string
    descricao: string
    estado: string
    latitude: number | null
    longitude: number | null
    foto_url: string | null
    created_at: string
}

export interface Avistamento {
    id: string
    animal_id: string
    reporter_id: string | null
    descricao: string
    latitude: number
    longitude: number
    foto_url: string | null
    created_at: string
}

export interface Ocorrencia {
    id: string
    animal_id: string
    estado: string
    total_avistamentos: number
    ultimo_avistamento_at: string | null
    resolvida_at: string | null
    created_at: string
    animais?: Animal
}

export interface Profile {
    id: string
    nome: string
    telemovel: string | null
    created_at: string
}
