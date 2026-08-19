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
    assert.equal(validatePassword('12345678'), null)
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
