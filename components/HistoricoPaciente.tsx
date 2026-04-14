import type { ConsultaHistorico } from "@/components/system/pacienteTypes";

type HistoricoPacienteProps = {
  historico: ConsultaHistorico[];
};

function getStatusClasses(status: ConsultaHistorico["status"]) {
  switch (status) {
    case "compareceu":
      return "border-green-200 bg-green-50 text-green-700";
    case "faltou":
      return "border-red-200 bg-red-50 text-red-700";
    case "cancelou":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

export default function HistoricoPaciente({
  historico,
}: HistoricoPacienteProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-[#1A1F4D]">
          Histórico de consultas
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Registro de comparecimentos, faltas e cancelamentos.
        </p>
      </div>

      {historico.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          Nenhuma consulta registrada.
        </div>
      ) : (
        <div className="space-y-3">
          {historico.map((consulta, index) => (
            <div
              key={`${consulta.data}-${index}`}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Data
                  </p>
                  <p className="font-semibold text-[#1A1F4D]">{consulta.data}</p>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                    consulta.status
                  )}`}
                >
                  {consulta.status}
                </span>
              </div>

              {consulta.observacao && (
                <div className="mt-3 rounded-lg bg-white p-3 border border-gray-200">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Observação
                  </p>
                  <p className="mt-1 text-sm text-gray-700">{consulta.observacao}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}