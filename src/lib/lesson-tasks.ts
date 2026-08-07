// Valor compartilhado entre a server action (lesson-tasks.ts, "use server" só
// pode exportar função async) e o componente cliente — mesmo padrão de
// COMMENT_MAX_LENGTH em src/lib/comments.ts.
// Chamado CLV-0044: aluno pode refazer a tarefa até esse número de vezes.
export const MAX_TASK_ATTEMPTS = 3
