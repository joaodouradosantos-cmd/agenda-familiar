import Link from "next/link";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/tarefas" className="font-semibold tracking-tight">
          Agenda Familiar
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/tarefas" className="rounded-full px-3 py-1 hover:bg-gray-100">
            Tarefas
          </Link>
          <Link href="/calendario" className="rounded-full px-3 py-1 hover:bg-gray-100">
            Calendário
          </Link>
          <Link href="/membros" className="rounded-full px-3 py-1 hover:bg-gray-100">
            Membros
          </Link>
        </nav>
      </div>
    </header>
  );
}
