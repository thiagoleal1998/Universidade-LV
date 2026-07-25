// Constante fora de comments.ts porque um arquivo 'use server' só pode
// exportar funções async — exportar um valor de lá quebra o build (o
// typecheck passa, o erro só aparece no `npm run build`).
export const COMMENT_MAX_LENGTH = 1000
