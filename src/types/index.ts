export interface Profile {
    id: string
    nome: string
    telemovel: string
    created_at: string
}

export interface Animal {
    id: string
    dono_id: string
    nome: string
    especie: string
    raca: string
    cor: string
    descricao: string
    estado: string
    latitude: number
    longitude: number
    foto_url: string
    created_at: string
}

export interface Avistamento {
    id: string
    animal_id: string
    reporter_id: string
    descricao: string
    latitude: number
    longitude: number
    foto_url: string
    created_at: string
}