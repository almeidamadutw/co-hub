export type UserRole =
  | "mentor"
  | "mentorado"
  | "modulos"
  | "financeiro"
  | "progresso";

export type User = {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
};

export const fakeUsers: User[] = [
  {
    nome: "Luciana Paula Santos Rocha",
    email: "luadmin@ceoclub.com",
    senha: "123456",
    role: "mentor",
  },
  {
    nome: "Aluno Teste",
    email: "mentorado@ceoclub.com",
    senha: "123456",
    role: "mentorado",
  },
];