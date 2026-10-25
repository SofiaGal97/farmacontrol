import type { ReactNode } from 'react';
import type { Lote, Producto } from '../modelos/tipos';
import { diasParaVencer, estadoStock, estadoVencimiento, proximoVencimiento } from '../logica/alertas';

/** Etiquetas de color de un producto: stock y vencimiento más próximo de sus lotes */
export default function InsigniasAlerta({ producto, lotesDelProducto }: { producto: Producto; lotesDelProducto: Lote[] }) {
  const stock = estadoStock(producto);
  const vencidos = lotesDelProducto.filter((l) => estadoVencimiento(l.vencimiento) === 'vencido');
  const vigentes = lotesDelProducto.filter((l) => estadoVencimiento(l.vencimiento) !== 'vencido');
  const proximo = proximoVencimiento(vigentes);

  return (
    <div className="flex flex-wrap gap-1">
      {stock === 'agotado' && <Insignia color="bg-red-600 text-white">Agotado</Insignia>}
      {stock === 'bajo' && <Insignia color="bg-red-100 text-red-700">Stock bajo</Insignia>}
      {vencidos.length > 0 && (
        <Insignia color="bg-red-600 text-white">
          {vencidos.reduce((s, l) => s + l.cantidad, 0)} u. vencidas
        </Insignia>
      )}
      {proximo && <InsigniaVencimiento vencimiento={proximo} soloAlerta />}
    </div>
  );
}

/** Etiqueta de vencimiento de una fecha (para lotes) */
export function InsigniaVencimiento({ vencimiento, soloAlerta = false }: { vencimiento: string; soloAlerta?: boolean }) {
  const estado = estadoVencimiento(vencimiento);
  const dias = diasParaVencer(vencimiento);

  if (estado === 'vencido') return <Insignia color="bg-red-600 text-white">Vencido</Insignia>;
  if (estado === 'por_vencer')
    return (
      <Insignia color="bg-amber-100 text-amber-800">
        {dias === 0 ? 'Vence hoy' : `Vence en ${dias} día${dias === 1 ? '' : 's'}`}
      </Insignia>
    );
  return soloAlerta ? null : <Insignia color="bg-green-100 text-green-700">Vigente</Insignia>;
}

function Insignia({ color, children }: { color: string; children: ReactNode }) {
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${color}`}>{children}</span>;
}
