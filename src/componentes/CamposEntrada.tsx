import Campo from './Campo';
import { claseInput } from './estilos';
import type { Proveedor } from '../modelos/tipos';
import type { FormularioEntrada } from '../logica/validaciones';

interface Props {
  formulario: FormularioEntrada;
  onCambiar: (campo: keyof FormularioEntrada, valor: string) => void;
  proveedores: Proveedor[];
  mostrarCosto: boolean; // el costo solo lo ve el administrador
}

/** Campos de un lote que ingresa (se usan al crear producto y al registrar entradas) */
export default function CamposEntrada({ formulario, onCambiar, proveedores, mostrarCosto }: Props) {
  const activos = proveedores.filter((p) => p.activo);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Cantidad (unidades)" obligatorio>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            className={claseInput}
            placeholder="0"
            value={formulario.cantidad}
            onChange={(e) => onCambiar('cantidad', e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Número de lote" obligatorio>
          <input
            className={claseInput}
            placeholder="Impreso en la caja"
            value={formulario.numeroLote}
            onChange={(e) => onCambiar('numeroLote', e.target.value)}
          />
        </Campo>
      </div>

      <Campo etiqueta="Fecha de vencimiento del lote" obligatorio ayuda="Se avisará 3 meses antes de que venza">
        <input
          type="date"
          className={claseInput}
          value={formulario.vencimiento}
          onChange={(e) => onCambiar('vencimiento', e.target.value)}
        />
      </Campo>

      <div className={mostrarCosto ? 'grid grid-cols-2 gap-3' : ''}>
        <Campo etiqueta="Proveedor" ayuda={activos.length === 0 ? 'Agrega proveedores en la sección Más' : undefined}>
          <select
            className={claseInput}
            value={formulario.proveedorId}
            onChange={(e) => onCambiar('proveedorId', e.target.value)}
          >
            <option value="">Sin proveedor</option>
            {activos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        {mostrarCosto && (
          <Campo etiqueta="Costo por unidad (Q)">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className={claseInput}
              placeholder="0.00"
              value={formulario.costoUnitario}
              onChange={(e) => onCambiar('costoUnitario', e.target.value)}
            />
          </Campo>
        )}
      </div>
    </div>
  );
}
