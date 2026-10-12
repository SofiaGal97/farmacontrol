import type { ReactNode } from 'react';
import type { Producto } from '../modelos/tipos';
import { diasParaVencer, estadoStock, estadoVencimiento } from '../logica/alertas';

/** Etiquetas de color que indican si un producto tiene alguna alerta */
export default function InsigniasAlerta({ producto }: { producto: Producto }) {
  const stock = estadoStock(producto);
  const vencimiento = estadoVencimiento(producto);
  const dias = diasParaVencer(producto.vencimiento);

  return (
    <div className="flex flex-wrap gap-1">
      {stock === 'agotado' && <Insignia color="bg-red-600 text-white">Agotado</Insignia>}
      {stock === 'bajo' && <Insignia color="bg-red-100 text-red-700">Stock bajo</Insignia>}
      {vencimiento === 'vencido' && <Insignia color="bg-red-600 text-white">Vencido</Insignia>}
      {vencimiento === 'por_vencer' && (
        <Insignia color="bg-amber-100 text-amber-800">
          {dias === 0 ? 'Vence hoy' : `Vence en ${dias} día${dias === 1 ? '' : 's'}`}
        </Insignia>
      )}
    </div>
  );
}

function Insignia({ color, children }: { color: string; children: ReactNode }) {
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${color}`}>{children}</span>;
}
