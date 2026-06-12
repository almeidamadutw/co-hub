export type UserRole =
  | "mentor"
  | "mentorado"
  | "financeiro"
  | "suporte";

export type User = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
};

export const users: User[] = [
  {
    id: "mentor-ceo-club",
    nome: "Mentor CEO Club",
    email: "mentor@ceoclubmentoria.com.br",
    role: "mentor",
  },
  {
    id: "mentorado-ceo-club",
    nome: "Mentorado CEO Club",
    email: "mentorado@ceoclubmentoria.com.br",
    role: "mentorado",
  },
  {
    id: "financeiro-ceo-club",
    nome: "Financeiro CEO Club",
    email: "financeiro@ceoclubmentoria.com.br",
    role: "financeiro",
  },
  {
    id: "suporte-ceo-club",
    nome: "Suporte CEO Club",
    email: "suporte@ceoclubmentoria.com.br",
    role: "suporte",
  },
];