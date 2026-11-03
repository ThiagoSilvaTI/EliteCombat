# Integração das fichas de inscrição

O perfil do aluno vincula a ficha e o contrato do site pelo nome, WhatsApp e número de cadastro. O número é informado pelo aluno no perfil; a ficha só é exibida se os três dados corresponderem.

## Variáveis no Render

Configure uma chave aleatória forte com o mesmo valor nos dois serviços:

- **Site de inscrições** (`ThiagoSilvaTI/Elite-Combat`): `REGISTRATION_API_TOKEN`
- **API do aplicativo** (`ThiagoSilvaTI/EliteCombat`): `REGISTRATION_API_TOKEN`

Na API do aplicativo, configure também:

- `REGISTRATION_API_URL=https://elite-combat.onrender.com`

Não coloque essa chave no código do navegador nem a compartilhe com os alunos. A ficha inclui dados de saúde e contatos pessoais.
