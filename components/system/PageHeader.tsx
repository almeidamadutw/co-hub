"use client";

type PageHeaderProps = {
  titulo: string;
  descricao: string;
  actionLabel?: string;
  onAction?: () => void;
  extraActions?: React.ReactNode;
};

export default function PageHeader({
  titulo,
  descricao,
  actionLabel,
  onAction,
  extraActions,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl font-bold">{titulo}</h1>
        <p className="text-gray-600 mt-2">{descricao}</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {extraActions}

        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="bg-[#D4AF37] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}