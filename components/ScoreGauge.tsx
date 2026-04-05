type ScoreGaugeProps = {
  score: number;
};

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const scoreLimitado = Math.max(0, Math.min(100, score));

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Score do paciente</span>
        <span className="text-sm font-bold text-[#1A1F4D]">{scoreLimitado}%</span>
      </div>

      <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#D4AF37] transition-all"
          style={{ width: `${scoreLimitado}%` }}
        />
      </div>
    </div>
  );
}