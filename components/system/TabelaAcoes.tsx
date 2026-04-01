"use client";

type FormActionsProps = {
  submitLabel: string;
  clearLabel?: string;
  onClear?: () => void;
};

export default function FormActions({
  submitLabel,
  clearLabel = "Limpar",
  onClear,
}: FormActionsProps) {
  return (
    <div className="mt-4 flex gap-3 flex-wrap">
      <button
        type="submit"
        className="bg-[#1A1F4D] text-white px-5 py-3 rounded-xl font-bold hover:brightness-110"
      >
        {submitLabel}
      </button>

      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="bg-white border border-gray-300 text-[#1A1F4D] px-5 py-3 rounded-xl font-bold hover:bg-gray-50"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}