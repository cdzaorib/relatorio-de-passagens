/*
 * Faz o Node entender os imports como o TypeScript os escreve:
 *  - o atalho '@/' aponta para src/, igual ao tsconfig do projeto;
 *  - a extensão fica implícita, então tentamos .ts e .tsx.
 * Com isso os testes rodam no Node puro, sem runner nem dependência extra.
 */
import { statSync } from 'node:fs'
import { resolve as resolvePath, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = process.cwd()
const SUFIXOS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

function ehArquivo(caminho) {
  try {
    return statSync(caminho).isFile()
  } catch {
    return false
  }
}

/** Primeiro caminho existente entre as extensões possíveis. */
function completar(base) {
  return SUFIXOS.map((sufixo) => base + sufixo).find(ehArquivo)
}

export function resolve(especificador, contexto, proximo) {
  if (especificador.startsWith('@/')) {
    const encontrado = completar(resolvePath(RAIZ, 'src', especificador.slice(2)))
    if (encontrado) return proximo(pathToFileURL(encontrado).href, contexto)
    throw new Error(`Import não resolvido nos testes: ${especificador}`)
  }

  // Import relativo sem extensão, a partir do arquivo que o pediu.
  if (especificador.startsWith('.') && contexto.parentURL?.startsWith('file:')) {
    const pasta = dirname(fileURLToPath(contexto.parentURL))
    const encontrado = completar(resolvePath(pasta, especificador))
    if (encontrado) return proximo(pathToFileURL(encontrado).href, contexto)
  }

  return proximo(especificador, contexto)
}
