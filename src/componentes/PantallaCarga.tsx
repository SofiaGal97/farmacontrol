export default function PantallaCarga({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      <p className="text-sm font-medium">{mensaje}</p>
    </div>
  );
}
