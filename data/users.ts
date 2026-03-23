export type UserRole =
  | "admin"
  | "recepcao"
  | "dentista"
  | "financeiro"
  | "crc";

export type FakeUser = {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
};

export const fakeUsers: FakeUser[] = [
  {
    nome: "Luciana Paula Santos Rocha",
    email: "luadmin@cohub.com",
    senha: "123456",
    role: "admin",
  },
  {
    nome: "Recepção",
    email: "recepcao@cohub.com",
    senha: "123456",
    role: "recepcao",
  },
  {
    nome: "Ana Lucia Dentista",
    email: "analucia@cohub.com",
    senha: "123456",
    role: "dentista",
  },
  {
    nome: "Financeiro",
    email: "financeiro@cohub.com", // 🔧 arrumei aqui
    senha: "123456",
    role: "financeiro",
  },
  {
    nome: "Roberta CRC",
    email: "crcroberta@cohub.com",
    senha: "123456",
    role: "crc",
  },
];