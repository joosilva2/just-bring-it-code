import { useState } from "react";
import flexV2pretos from "@/assets/flex-variant-2pretos.png";
import flexV2brancos from "@/assets/flex-variant-2brancos.png";
import flexV1cada from "@/assets/flex-variant-1cada.png";

const variants = [
  { label: "2 Pretos", value: "2pretos", image: flexV2pretos },
  { label: "2 Brancos", value: "2brancos", image: flexV2brancos },
  { label: "1 Preto e 1 Branco", value: "1cada", image: flexV1cada },
];

const SizeSelector = () => {
  const [selected, setSelected] = useState("2pretos");

  return (
    <div className="px-4 py-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Escolha a variante</span>
        <span className="text-xs text-gray-400">23 disponíveis</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <button
            key={v.value}
            onClick={() => setSelected(v.value)}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all ${
              selected === v.value
                ? "border-primary bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <img src={v.image} alt={v.label} className="h-14 w-14 object-contain" loading="lazy" decoding="async" />
            <span className="text-[11px] font-medium text-gray-700">{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SizeSelector;
