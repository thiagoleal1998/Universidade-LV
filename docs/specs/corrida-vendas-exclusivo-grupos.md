# Corrida de Vendas: exclusividade para grupos e vídeo de divulgação

Status: implementada

## Problema
Algumas campanhas da Corrida de Vendas são restritas a vendas de grupos (ex.: "Destino Campeão", que exige reservas a partir de 11 apartamentos), e isso não aparece para o aluno de forma visual. Além disso, a campanha às vezes tem um vídeo de divulgação que não tinha onde ser exibido. Afetados: admin (cadastra a campanha) e membro/colaborador (vê a campanha).

## Comportamento esperado
- O admin marca a campanha como "Exclusiva para vendas de grupos" com um botão liga/desliga.
- O aluno vê o selo "Exclusivo para Grupos" no detalhe da campanha e na sub-aba Vencedores, e a versão curta "Grupos" no card resumido.
- O admin cola um link de YouTube, Instagram (Reels/post) ou Vimeo; o aluno vê o vídeo embutido no detalhe da campanha.
- O detalhe da campanha fica mais largo, e o vídeo do Instagram cresce junto com ele.

## Fora de escopo
- Vídeo no card resumido do grid e no cabeçalho da sub-aba Vencedores.
- Selo de exclusividade no widget compacto da home.
- Mais de um vídeo por campanha.
- Upload de arquivo de vídeo (só link).

## Critérios de aceite
1. Admin liga o botão "Exclusiva para vendas de grupos" e salva; o valor `exclusivo_grupos` fica `true` no banco.
2. Com a campanha marcada, o card resumido do aluno mostra o selo "Grupos".
3. Ao abrir o card, o modal mostra o selo "Exclusivo para Grupos".
4. Na sub-aba Vencedores, a campanha marcada mostra o selo "Exclusivo para Grupos".
5. Admin cola um link de YouTube; o campo persiste em `video_url` no banco.
6. Ao abrir o card, o aluno vê um `<iframe>` apontando para o embed do YouTube.
7. O modal de detalhe tem largura de 672px (`sm:max-w-2xl`), e o embed do Instagram tem 560×896px.

## Decisões em aberto
Nenhuma.

## Como verificar
- Critérios 1 a 4: teste Playwright no admin (Comercial → Corrida de vendas) e no aluno (`/dashboard/comercial?tab=corrida_vendas`), com campanha real de produção. Estado original restaurado no `finally`.
- Critérios 5 e 6: mesmo teste, usando link real de YouTube; persistência confirmada no banco.
- Critério 7: medição de `boundingBox` do Dialog (672px) e do iframe do Instagram (558×894 após a margem), com screenshot.
