type Aba = {
  chave: string;
  label: string;
};

type AbasFichaProps = {
  abas: Aba[];
  abaAtiva: string;
  onTrocar: (aba: string) => void;
};

export default function AbasFicha({
  abas,
  abaAtiva,
  onTrocar,
}: AbasFichaProps) {
  return (
    <div className="flex gap-2 mb-6">
      {abas.map((aba) => (
        <button
          key={aba.chave}
          onClick={() => onTrocar(aba.chave)}
          className={`px-4 py-2 rounded-xl font-medium ${
            abaAtiva === aba.chave
              ? "bg-[#1A1F4D] text-white"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {aba.label}
        </button>
      ))}
    </div>
  );
}