export type ConsultaHistorico = {
  data: string;
  status: "compareceu" | "faltou" | "cancelou";
  observacao?: string;
};

export type EtapaCronograma = {
  id: number;
  titulo: string;
  concluido: boolean;
  previsao?: string;
};

export type ItemOrcamento = {
  id: number;
  descricao: string;
  valor: number;
};

export type OrcamentoPaciente = {
  id: number;
  titulo: string;
  status: "Aberto" | "Aprovado" | "Recusado";
  desconto: number;
  observacoes: string;
  itens: ItemOrcamento[];
};

export type Paciente = {
  id: number;
  foto?: string;
  nome: string;
  telefone: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  procedimento: string;
  status: "Lead" | "Aguardando" | "Em tratamento" | "Retorno pendente" | "Finalizado";
  observacoes: string;
  historicoConsultas: ConsultaHistorico[];
  cronograma: EtapaCronograma[];
  orcamentos: OrcamentoPaciente[];
};