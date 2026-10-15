// scripts/generate-env.js
// Gera src/environments/environment.prod.ts a partir das variáveis de ambiente
// no momento do build (Vercel -> Project Settings -> Environment Variables).
// Este arquivo NUNCA é commitado — está no .gitignore (ver plan 01-03).
const fs = require('node:fs');
const path = require('node:path');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error(
    '[generate-env] SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY precisam estar definidas. ' +
      'Localmente: copie src/environments/environment.example.ts para environment.ts. ' +
      'Na Vercel: Project Settings -> Environment Variables.',
  );
  process.exit(1);
}

// Guarda de segurança (DB-11): a chave secreta jamais pode entrar no bundle do cliente.
if (/^sb_secret_/.test(key) || /service_role/i.test(key)) {
  console.error('[generate-env] ABORTADO: a chave fornecida é uma SECRET key. Use a chave publicável.');
  process.exit(1);
}

const content = `// GERADO AUTOMATICAMENTE por scripts/generate-env.js — não editar nem commitar.
export const environment = {
  production: true,
  supabaseUrl: '${url}',
  supabasePublishableKey: '${key}',
};
`;

const out = path.join('src', 'environments', 'environment.prod.ts');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, content);
console.log('[generate-env] escrito', out);
