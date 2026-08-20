import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_LENGTHS,
  maskEmail,
  normalizeEmail,
  normalizeText,
  safeRedirectPath,
  tooLong,
  translateAuthError,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '@/lib/validation'

describe('destino do redirecionamento', () => {
  test('aceita caminho interno', () => {
    for (const caminho of ['/dashboard', '/dashboard/trips', '/', '/a?b=c&d=e', '/x#y']) {
      assert.equal(safeRedirectPath(caminho), caminho, `recusou ${caminho}`)
    }
  })

  test('bloqueia saída para outro site', () => {
    // '/\evil.com' é o caso traiçoeiro: parece caminho interno, mas navegador
    // e parser de URL tratam a contrabarra como barra, virando '//evil.com'.
    const ataques = [
      '//evil.com',
      '/\\evil.com',
      '/\\/evil.com',
      '\\\\evil.com',
      'https://evil.com',
      'http://evil.com',
      '//evil.com/dashboard',
      'javascript:alert(1)',
      'dashboard',
      '',
    ]

    for (const ataque of ataques) {
      assert.equal(safeRedirectPath(ataque), '/dashboard', `deixou passar ${ataque}`)
    }
  })

  test('nenhum destino aceito escapa da origem do app', () => {
    const origem = 'https://app.exemplo.com'
    const ataques = ['//evil.com', '/\\evil.com', 'https://evil.com', '/\\/evil.com']

    for (const ataque of ataques) {
      const destino = new URL(safeRedirectPath(ataque), origem)
      assert.equal(destino.origin, origem, `${ataque} escapou para ${destino.origin}`)
    }
  })

  test('bloqueia caractere de controle, que abriria injeção no cabeçalho', () => {
    for (const ataque of ['/dash\nLocation: https://evil.com', '/dash\r\nSet-Cookie: a=b', '/a\tb']) {
      assert.equal(safeRedirectPath(ataque), '/dashboard')
    }
  })

  test('nulo e indefinido caem no padrão', () => {
    assert.equal(safeRedirectPath(null), '/dashboard')
    assert.equal(safeRedirectPath(undefined), '/dashboard')
  })
})

describe('máscara de e-mail', () => {
  test('mostra só o começo e o domínio', () => {
    assert.equal(maskEmail('carlos@tecnoarte.com'), 'ca••••@tecnoarte.com')
    assert.equal(maskEmail('ab@x.com'), 'ab•@x.com')
  })

  test('o miolo do endereço não sobra em lugar nenhum', () => {
    const mascarado = maskEmail('carlos.eduardo@tecnoarte.com.br')
    assert.ok(!mascarado.includes('rlos.eduardo'))
    assert.ok(mascarado.endsWith('@tecnoarte.com.br'))
  })

  test('vazio não quebra a tela', () => {
    assert.equal(maskEmail(undefined), '')
    assert.equal(maskEmail(''), '')
  })
})

describe('validação de formulário', () => {
  test('e-mail obviamente inválido é recusado', () => {
    for (const email of ['', 'sem-arroba', 'a@b', 'a b@c.com', '@c.com']) {
      assert.notEqual(validateEmail(email), null, `aceitou ${email}`)
    }
    assert.equal(validateEmail('carlos@tecnoarte.com.br'), null)
  })

  test('senha curta é recusada', () => {
    assert.notEqual(validatePassword('1234567'), null)
    // '12345678' tinha oito caracteres e passava. Passar no tamanho não é
    // passar: hoje ela cai na regra de senha óbvia, logo abaixo.
    assert.equal(validatePassword('barca323jae'), null)
  })

  test('confirmação diferente é recusada', () => {
    assert.notEqual(validatePasswordConfirmation('abc12345', 'abc12346'), null)
    assert.equal(validatePasswordConfirmation('abc12345', 'abc12345'), null)
  })

  test('texto grande demais é barrado antes de chegar ao banco', () => {
    assert.equal(tooLong('Bananal', MAX_LENGTHS.bairro, 'O bairro'), null)
    assert.notEqual(tooLong('x'.repeat(200), MAX_LENGTHS.bairro, 'O bairro'), null)
  })

  test('e-mail é normalizado para caixa baixa e sem espaços', () => {
    assert.equal(normalizeEmail('  Carlos@Tecnoarte.COM  '), 'carlos@tecnoarte.com')
  })

  test('texto perde espaço das pontas', () => {
    assert.equal(normalizeText('  Praça XV  '), 'Praça XV')
    assert.equal(normalizeText(null), '')
  })
})

describe('tradução dos erros do Supabase', () => {
  test('credencial errada vira mensagem em português', () => {
    assert.equal(translateAuthError('Invalid login credentials'), 'E-mail ou senha incorretos.')
  })

  test('mensagem desconhecida não vaza detalhe interno', () => {
    const traduzido = translateAuthError('PGRST301: JWT expired at row 42 of table users')

    assert.ok(!traduzido.includes('PGRST'))
    assert.ok(!traduzido.includes('users'))
    assert.ok(traduzido.length > 0)
  })

  test('link expirado explica o que fazer', () => {
    assert.match(translateAuthError('Token has expired'), /novo/i)
  })
})

describe('qualidade da senha', () => {
  test('a data de nascimento em oito dígitos é recusada', () => {
    // Passa no mínimo de tamanho e mora no primeiro milhar de tentativas de
    // qualquer ataque. É o caso que motivou a regra.
    for (const senha of ['20042004', '01011990', '12345678']) {
      assert.notEqual(validatePassword(senha), null, `aceitou ${senha}`)
    }
  })

  test('as senhas do topo de todo vazamento são recusadas', () => {
    for (const senha of ['password', 'senha123', 'QWERTY123', 'iloveyou']) {
      assert.notEqual(validatePassword(senha), null, `aceitou ${senha}`)
    }
  })

  test('poucos caracteres distintos não viram senha longa', () => {
    assert.notEqual(validatePassword('aaaaaaaa'), null)
    assert.notEqual(validatePassword('abababababab'), null)
  })

  test('a senha não pode conter o próprio e-mail', () => {
    assert.notEqual(validatePassword('carlos.daniel-x9', 'carlos.daniel@tecnoarte.com.br'), null)
  })

  test('e-mail curto demais não vira regra que atrapalha', () => {
    // Um usuário 'ana' não pode fazer com que toda senha com 'ana' dentro seja
    // recusada — 'ana' aparece em 'planalto', 'banana', 'semana'.
    assert.equal(validatePassword('banana-tropical', 'ana@exemplo.com'), null)
  })

  test('senha comum de verdade continua passando', () => {
    for (const senha of ['barca323jae', 'trecho-quinzena', 'Cocota2026!']) {
      assert.equal(validatePassword(senha, 'pessoa@exemplo.com'), null, `recusou ${senha}`)
    }
  })

  test('curta demais continua recusada antes de tudo', () => {
    assert.match(validatePassword('ab1cd') ?? '', /pelo menos/)
  })
})
