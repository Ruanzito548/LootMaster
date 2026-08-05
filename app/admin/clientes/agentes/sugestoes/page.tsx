import Link from "next/link";

const overviewItems = [
  "Clientes vinculados: total, novos, ativos e inativos.",
  "Receita gerada pela carteira do agente no período.",
  "Comissão: pendente, liberada e paga.",
  "Ticket médio dos clientes.",
  "Retenção em 30 dias.",
  "Meta do mês com progresso.",
];

const carteiraItems = [
  "Tabela com nome, email, UID, status e último acesso.",
  "Valor gerado no período e total histórico por cliente.",
  "Data da última compra.",
  "Ações rápidas: histórico do cliente e copiar link/código de indicação.",
  "Filtros: período, status, valor gerado e última atividade.",
];

const comissaoItems = [
  "Timeline por pedido com orderId, cliente e valor da venda.",
  "Taxa da plataforma, percentual do agente e valor da comissão.",
  "Status da comissão: pendente, aprovado, pago e estornado.",
  "Resumo por período: total gerado, total comissão, total pago e saldo pendente.",
];

const crescimentoItems = [
  "Funil: visitas indicadas, cadastros, compradores e recorrentes.",
  "Conversão por origem.",
  "Tempo médio até primeira compra.",
  "Recompra em 30 dias e churn da base.",
  "Opcional: ranking de agentes.",
];

const navegacaoItems = [
  "Dashboard",
  "Clientes",
  "Comissões",
  "Repasses",
  "Materiais (link/código/banner)",
  "Configurações (perfil/agência)",
];

const regrasItems = [
  "Agente não altera vínculo de cliente.",
  "Cliente orgânico permanece sem agência.",
  "Mudança de vínculo apenas por exceção administrativa.",
  "Toda alteração deve gerar auditoria.",
];

const mvpItems = [
  "Dashboard com KPIs principais.",
  "Tabela de clientes vinculados com status e último acesso.",
  "Extrato de comissões por pedido.",
  "Resumo financeiro de pendente x pago.",
  "Filtro por período.",
];

const futureItems = [
  "Hierarquia de agência (agência > agente > subagente).",
  "Override de comissão por camada.",
  "Regras de contrato por perfil de parceiro.",
  "Bônus por meta e por retenção.",
];

function SuggestionCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: string[];
}) {
  return (
    <article className="rounded-2xl border border-green-900 bg-green-950/20 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">{subtitle}</p>
      <h2 className="mt-2 text-2xl font-black text-green-300">{title}</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-green-500">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export const dynamic = "force-dynamic";

export default function AdminPainelAgenteSugestoesPage() {
  return (
    <div className="min-h-screen bg-black text-green-400">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Admin / Clientes / Agentes</p>
            <h1 className="mt-1 text-3xl font-semibold text-green-300 sm:text-4xl">Sugestões de Painel de Agente</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-green-600">
              Página de referência com estrutura recomendada para o painel do parceiro comercial (agente), com foco em retenção,
              transparência de comissões e crescimento da carteira.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/clientes/agentes"
              className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
            >
              Voltar para agentes
            </Link>
            <Link
              href="/admin/clientes"
              className="inline-flex items-center rounded-md border border-green-800 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-950"
            >
              Voltar para clientes
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <SuggestionCard title="Visão Geral" subtitle="Bloco 1" items={overviewItems} />
          <SuggestionCard title="Carteira de Clientes" subtitle="Bloco 2" items={carteiraItems} />
          <SuggestionCard title="Comissões e Repasses" subtitle="Bloco 3" items={comissaoItems} />
          <SuggestionCard title="Crescimento e Performance" subtitle="Bloco 4" items={crescimentoItems} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <SuggestionCard title="Navegação Sugerida" subtitle="Estrutura" items={navegacaoItems} />
          <SuggestionCard title="Regras de Operação" subtitle="Governança" items={regrasItems} />
          <SuggestionCard title="MVP Recomendado" subtitle="Entrega inicial" items={mvpItems} />
        </section>

        <section className="mt-5">
          <SuggestionCard title="Evoluções Futuras" subtitle="Roadmap" items={futureItems} />
        </section>
      </main>
    </div>
  );
}
