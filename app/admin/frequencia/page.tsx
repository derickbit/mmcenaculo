import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import PainelAbasFrequencia from "./PainelAbasFrequencia";
import { exigirSessao } from "@/lib/auth";

export const revalidate = 0;

export default async function FrequenciaPage() {
  const membros = await prisma.membro.findMany({
    orderBy: { nome: 'asc' },
    include: { 
      presencas: { include: { atividade: true } } 
    }
  });

  const atividades = await prisma.atividade.findMany({
    orderBy: { data: 'desc' }
  });

  const gruposDisponiveis = Array.from(new Set(membros.map(m => m.grupo).filter(Boolean)));

  // 🔴 AÇÃO ATUALIZADA: Bloqueio inteligente de nomes duplicados ou parecidos
async function cadastrarMembro(formData: FormData) {
    "use server";
    await exigirSessao();
    const nome = formData.get("nome") as string;
    // 🔴 AGORA PEGAMOS TODOS OS GRUPOS MARCADOS E JUNTAMOS COM VÍRGULA
    const gruposArray = formData.getAll("grupo") as string[]; 
    const grupo = gruposArray.join(", ");
    
    const cenaculoFeito = formData.get("cenaculoFeito") as string;

    if (!nome || !grupo) return { erro: "Dados incompletos. Marque pelo menos um grupo." };

    const nomeNormalizado = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const todosMembros = await prisma.membro.findMany({ select: { nome: true } });
    
    const jaExiste = todosMembros.some(m => 
      m.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === nomeNormalizado
    );

    if (jaExiste) {
      return { erro: `Atenção: Já existe alguém chamado "${nome}" (ou muito parecido) cadastrado!` };
    }

    await prisma.membro.create({
      data: { nome, grupo, cenaculoFeito }
    });
    
    revalidatePath("/admin/frequencia");
    return { sucesso: true };
  }

  async function cadastrarAtividade(formData: FormData) {
    "use server";
    await exigirSessao();
    const nome = formData.get("nome") as string;
    const data = new Date(formData.get("data") as string);
    if (!nome) return;
    await prisma.atividade.create({ data: { nome, data } });
    revalidatePath("/admin/frequencia");
  }

  // 🔴 AÇÃO ATUALIZADA: Proteção blindada contra presenças duplicadas
  async function salvarChamada(atividadeId: string, listaMembrosPresentes: string[], listaMembrosFiltrados: string[]) {
    "use server";
    await exigirSessao();
    if (!atividadeId) return;

    await prisma.presenca.deleteMany({
      where: { atividadeId, membroId: { in: listaMembrosFiltrados } }
    });

    if (listaMembrosPresentes.length > 0) {
      await prisma.presenca.createMany({
        data: listaMembrosPresentes.map(membroId => ({
          atividadeId,
          membroId
        })),
        skipDuplicates: true // Trava atômica do PostgreSQL: ignora se já tiver presença!
      });
    }
    revalidatePath("/admin/frequencia");
  }

  // 🔴 NOVA AÇÃO: Excluir Membro
  async function excluirMembro(formData: FormData) {
    "use server";
    await exigirSessao();
    const id = formData.get("id") as string;
    await prisma.membro.delete({ where: { id } });
    revalidatePath("/admin/frequencia");
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-cenaculo-blue">Frequência da Comunidade</h1>
        <p className="text-gray-600 mt-2">
          Gerencie o elenco de membros ativos, cadastre atividades menores e registre chamadas de presença.
        </p>
      </div>

      <PainelAbasFrequencia 
        membros={membros} 
        atividades={atividades} 
        grupos={gruposDisponiveis}
        cadastrarMembro={cadastrarMembro}
        cadastrarAtividade={cadastrarAtividade}
        salvarChamada={salvarChamada}
        excluirMembro={excluirMembro}
      />
    </div>
  );
}