# Integração das fichas de inscrição

O login valida o nome e o número de cadastro no site de inscrições. O primeiro login válido recebe o perfil de professor; os seguintes recebem perfil de aluno. A ficha e o contrato ficam disponíveis no perfil depois da validação.

O número de cadastro funciona como senha e é um dado que o aluno recebe ao concluir a inscrição; não o trate como segredo forte. A integração entre servidores usa a chave privada abaixo para que a consulta dos dados não dependa de uma chave no aplicativo.

## Variáveis no Render

Configure uma chave aleatória forte com o mesmo valor nos dois serviços:

- **Site de inscrições** (`ThiagoSilvaTI/Elite-Combat`): `REGISTRATION_API_TOKEN`
- **API do aplicativo** (`ThiagoSilvaTI/EliteCombat`): `REGISTRATION_API_TOKEN`

Na API do aplicativo, configure também:

- `REGISTRATION_API_URL=https://elite-combat.onrender.com`

Não coloque essa chave no código do navegador nem a compartilhe com os alunos. A ficha inclui dados de saúde e contatos pessoais.
