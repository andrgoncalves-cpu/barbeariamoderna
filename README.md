# Barbearia Moderna de Tábua — Site de Agendamento + Backoffice

## O que mudou nesta reconstrução

- **Base de dados a sério (Supabase)** em vez de usar o Google Calendar como armazenamento. O Google Calendar passa a ser só um espelho (vês tudo no telemóvel), mas a fonte de verdade é o Supabase.
- **Backoffice completo em `/admin`** (mesmo domínio, protegido por password).
- **Grelha de disponibilidade de 15 em 15 minutos**, com a regra de "buracos órfãos" (esconde horários que deixariam um espaço de 15 min por preencher).
- **Pré-pagamento de 2€** via link Revolut fixo, com confirmação manual no backoffice, exceto para telefones isentos.
- **Fidelização automática**: 3 marcações cumpridas → isento. Falta sem aviso → paga para sempre (a menos que reponhas manualmente).
- **Relatórios** por período, profissional e serviço.
- **Sincronização com Google Calendar nos dois sentidos**: marcações do site criam eventos no calendário; eventos criados manualmente no Google Calendar bloqueiam esse horário no site.

## Passo a passo para pôr isto a funcionar

### 1. Instalar dependências

```bash
npm install
```

*(Não consegui correr isto no meu ambiente — a rede aqui está limitada de forma inconsistente ao registo do NPM. Corre isto tu, localmente ou deixa o Vercel fazê-lo automaticamente no deploy.)*

### 2. Criar a estrutura na base de dados

No Supabase → **SQL Editor** → cola o conteúdo completo de `supabase/schema.sql` → **Run**.

Isto cria todas as tabelas e já insere os teus barbeiros, horários e serviços com os valores corretos que me deste.

### 3. Configurar as variáveis de ambiente

Copia `.env.example` para `.env.local` e preenche:

| Variável | Onde encontrar |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API Keys → **Secret key** (nunca partilhes esta) |
| `CALENDAR_ID_ANDRE` / `CALENDAR_ID_RUI` | Já tinhas configurado — mantém os valores |
| `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` | Já tinhas configurado — mantém os valores |
| `EMAIL_USER` / `GMAIL_KEY` | Já tinhas configurado — mantém os valores |
| `ADMIN_PASSWORD` | Escolhe uma password forte para entrares no `/admin` |
| `ADMIN_SESSION_SECRET` | Uma string aleatória longa (ex: gera em https://generate-secret.vercel.app/32) |
| `NEXT_PUBLIC_SITE_URL` | O URL final do site (ex: `https://barbearia-moderna-tabua.vercel.app`) |

No **Vercel**, adiciona as mesmas variáveis em Project Settings → Environment Variables.

### 4. Testar localmente

```bash
npm run dev
```

Site público: `http://localhost:3000`
Backoffice: `http://localhost:3000/admin/login`

### 5. Publicar no Vercel

```bash
git add .
git commit -m "Reconstrução completa com backoffice"
git push
```

Se o repositório já está ligado ao Vercel, isto publica automaticamente.

## Estrutura do projeto

```
app/
  page.tsx                 → site público de agendamento
  cancelar/page.tsx        → cancelar/reagendar via link do email
  admin/                   → backoffice (protegido)
    login/
    dashboard/             → agenda do dia + ações rápidas
    marcacao-manual/       → criar marcação walk-in
    horarios/              → editar horários semanais e folgas
    servicos/              → editar serviços e preços
    isentos/                → gerir lista de isentos de pré-pagamento
    relatorios/            → estatísticas por período
  api/                     → todas as rotas de backend
lib/
  supabase.ts              → ligação à base de dados
  availability.ts          → motor de disponibilidade (grelha 15min + buracos órfãos)
  google-calendar.ts       → sincronização com Google Calendar
  customers.ts             → lógica de isenção/fidelização
  email.ts                 → templates e envio de emails
  auth.ts                  → autenticação do backoffice
supabase/
  schema.sql               → estrutura completa da base de dados
```

## Importação do histórico das planilhas

Ainda por fazer — quando enviares os ficheiros Excel/CSV, escrevo o script de importação que os lê e cria as marcações históricas diretamente no Supabase.

## Notas

- O ficheiro `app/config/barbearia.ts` antigo foi removido — os serviços e horários vivem agora na base de dados e editam-se em `/admin/servicos` e `/admin/horarios`.
- As durações dos serviços foram corrigidas para bater certo com o que combinámos (Barba = 15 min, não 30 min como estava antes).
