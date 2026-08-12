# 🔐 Guia: Fechar Período de Ensalamento

## O que foi implementado?

Um sistema completo para **fechar o período de ensalamento** com validação no login e painel de controle administrativo.

### 📦 Arquivos Criados/Modificados:

1. **`/app/api/period-status/route.js`** (novo)
   - API para gerenciar status do período
   - GET: retorna status atual
   - POST: atualiza status (apenas admin)

2. **`/app/admin/settings/page.js`** (novo)
   - Painel de configurações exclusivo para administradores
   - Permite abrir/fechar período
   - Adiciona mensagem customizada

3. **`/app/page.js`** (modificado)
   - Verifica status do período no login
   - Exibe modal quando período está fechado
   - Bloqueia tutores (permite apenas admins)

4. **`/app/dashboard/page.js`** (modificado)
   - Adiciona botão "⚙️ Configurações" no header (admin only)
   - Link direto para painel de configurações

---

## 🚀 Como Usar?

### 1️⃣ **Fechar o Período** (Administrador)

1. Acesse o dashboard: `/dashboard`
2. Clique no botão **"⚙️ Configurações"** (canto direito superior)
3. Você será redirecionado para `/admin/settings`
4. No painel:
   - **Status Card**: mostra se período está aberto (🟢) ou fechado (🔴)
   - **Toggle Button**: clique para **"🔒 Encerrar Período"**
   - **Mensagem (opcional)**: adicione uma mensagem customizada
     - Exemplo: "Período encerrado. Contacte estagioprobatorio@escola.pr.gov.br"
5. Clique em **"💾 Salvar Configurações"**
6. Feedback de sucesso aparecerá na tela

### 2️⃣ **O que acontece após fechar?**

**Tutores tentando fazer login:**
- ❌ Veem modal: "⏱️ Período Encerrado"
- ❌ Não conseguem acessar o portal
- ℹ️ Veem mensagem customizada (se houver)

**Administradores:**
- ✅ Podem fazer login normalmente
- ✅ Continuam tendo acesso total
- ✅ Podem reabrir o período quando quiser

### 3️⃣ **Reabrir o Período**

1. Retorne a `/admin/settings`
2. Clique em **"🔓 Reabrir Período"**
3. Clique em **"💾 Salvar Configurações"**
4. Período volta a estar aberto para tutores

---

## 💾 **Onde os dados são salvos?**

Os dados são persistidos no **Firestore (Firebase)**:
- Collection: `settings`
- Document: `period-status`
- Campos:
  - `isOpen`: boolean (aberto/fechado)
  - `message`: string (mensagem customizada)
  - `closedAt`: timestamp (quando foi fechado)
  - `updatedBy`: email do admin que fechou
  - `updatedAt`: timestamp da última atualização

---

## 🔒 **Segurança**

- Apenas admins podem alterar o status
- Admins são verificados por e-mail:
  - `jorge.dotti@escola.pr.gov.br`
  - `estagioprobatorio@escola.pr.gov.br`
- Validação acontece em:
  1. Painel de configurações (frontend)
  2. API (backend)
  3. Login (frontend)

---

## ✨ **Recursos**

| Recurso | Descrição |
|---------|-----------|
| 🟢 Status Visual | Card mostra se período está aberto ou fechado |
| 🔔 Modal Informativo | Tutores veem modal quando período fechado |
| 📝 Mensagem Customizada | Admin pode adicionar mensagem personalizada |
| 🔐 Acesso Admin | Admins podem acessar mesmo com período fechado |
| 💾 Persistência | Dados salvos no Firebase |
| ⚡ Tempo Real | Mudanças refletem imediatamente no login |

---

## 🧪 **Testes Recomendados**

1. **Fechar período com mensagem:**
   - [ ] Admin acessa `/admin/settings`
   - [ ] Clica "Encerrar Período"
   - [ ] Adiciona mensagem: "Portal em manutenção"
   - [ ] Salva

2. **Tutor tenta login com período fechado:**
   - [ ] Tutor (não-admin) tenta fazer login
   - [ ] Vê modal "Período Encerrado"
   - [ ] Vê a mensagem customizada

3. **Admin consegue entrar:**
   - [ ] Admin faz login normalmente
   - [ ] Acessa dashboard
   - [ ] Pode reabrir período

4. **Reabrir período:**
   - [ ] Admin volta a `/admin/settings`
   - [ ] Clica "Reabrir Período"
   - [ ] Salva
   - [ ] Tutor consegue fazer login novamente

---

## 🐛 **Troubleshooting**

**"Erro ao conectar com o servidor"**
- Verificar se Firebase está configurado (variáveis de ambiente)
- Verificar console do navegador para mais detalhes

**Admin não consegue acessar `/admin/settings`**
- Verificar se e-mail está na lista de admins
- Fazer logout e login novamente

**Período continua fechado mesmo após reabrir**
- Atualizar página (F5)
- Limpar cache do navegador (Ctrl+Shift+Del)

---

## 📊 **Exemplo de Fluxo Completo**

```
Admin                          Sistema                    Tutor
 |                               |                         |
 +------(1) login do admin------->|                         |
 |<-----acesso ao dashboard--------+                        |
 |                               |                         |
 +------(2) clica Config--------->|                         |
 |<-----abre /admin/settings------+                        |
 |                               |                         |
 +------(3) marca "Encerrar"---->|                         |
 |                               |                         |
 +------(4) Salva------------------>db: isOpen = false     |
 |<-----"✓ Período encerrado!"---+                         |
 |                               |                         |
 |                               |     (5) tenta login     |
 |                               |<------com period=false--+
 |                               |                         |
 |                               +---->"⏱️ Período Encerrado"->|
 |                               |                         |
```

---

## 📞 **Suporte**

Para dúvidas ou problemas:
- E-mail: estagioprobatorio@escola.pr.gov.br
- Sistema: Portal de Ensalamento SEED PR

---

Última atualização: 2026-08-12
