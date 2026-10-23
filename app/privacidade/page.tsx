import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_PRIVACIDADE, PRAZO_GUARDA_TEXTO, PRAZO_RESPOSTA_DIAS } from "@/lib/privacidade";

export const metadata: Metadata = {
  title: "Privacidade | Movimento Mariano Cenáculo",
  description: "Como o Movimento Mariano Cenáculo cuida dos dados de quem se inscreve nos retiros.",
};

const titulo = "text-xl font-extrabold text-cenaculo-blue mt-10 mb-3";
const lista = "list-disc pl-6 space-y-1 text-gray-700";

export default function PrivacidadePage() {
  return (
    <main className="flex-1 w-full bg-gray-50 py-12 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-10 text-gray-700 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-cenaculo-blue">Privacidade e proteção de dados</h1>
        <p className="mt-3">
          Este texto explica, de forma simples, quais dados o Movimento Mariano Cenáculo (MMC) pede nas inscrições, para que usa, por quanto tempo guarda
          e como você pode pedir a correção ou a exclusão deles.
        </p>

        <h2 className={titulo}>Quem cuida dos seus dados</h2>
        <p>
          O MMC, de Pelotas/RS, é quem decide como os dados são usados. Para qualquer assunto sobre seus dados, escreva para{" "}
          <a href={`mailto:${EMAIL_PRIVACIDADE}`} className="text-cenaculo-blue font-bold underline">{EMAIL_PRIVACIDADE}</a>.
        </p>

        <h2 className={titulo}>Quais dados pedimos</h2>
        <p className="font-bold text-gray-800">Inscrição de adultos (Cenáculo e Cenaculão)</p>
        <ul className={lista}>
          <li>Nome completo, e-mail, telefone, cidade e data de nascimento;</li>
          <li>Instagram (opcional), paróquia onde atua, se já fez o Cenáculo e como conheceu o movimento;</li>
          <li>
            Informações de saúde e cuidado, <strong>todas opcionais</strong>: problema de saúde, medicação controlada, restrição alimentar e
            necessidade de atendimento especial.
          </li>
        </ul>
        <p className="font-bold text-gray-800 mt-4">Inscrição de crianças (Cenáculo Kids)</p>
        <ul className={lista}>
          <li>Da criança: apenas o <strong>primeiro nome</strong>, a data de nascimento e, se o responsável quiser, uma observação de saúde (como alergia);</li>
          <li>Do responsável: nome, telefone, e-mail e grau de parentesco;</li>
          <li>O momento em que o responsável aceitou o termo de consentimento.</li>
        </ul>
        <p className="font-bold text-gray-800 mt-4">Lista de espera</p>
        <ul className={lista}>
          <li>Nome, e-mail, telefone e o tipo de retiro de interesse.</li>
        </ul>

        <h2 className={titulo}>Para que usamos</h2>
        <ul className={lista}>
          <li>Organizar o evento e a sua participação (vagas, grupos, alimentação);</li>
          <li>Entrar em contato com você sobre o evento ou, na lista de espera, quando abrirem vagas;</li>
          <li>Cuidar de quem participa: as informações de saúde só servem para a equipe saber como cuidar da pessoa durante o evento.</li>
        </ul>
        <p className="mt-3">
          <strong>Não vendemos nem compartilhamos seus dados</strong> com empresas para propaganda. Não usamos os dados de saúde para nenhum outro fim.
        </p>

        <h2 className={titulo}>Quem pode ver</h2>
        <ul className={lista}>
          <li>A coordenação do MMC, por meio de contas pessoais protegidas por senha.</li>
          <li>
            Os serviços que fazem o site funcionar: hospedagem (Vercel), banco de dados (Supabase, em servidor em São Paulo) e armazenamento das
            fotos da galeria (Cloudinary). Eles só guardam os dados para nós e não os usam para outros fins.
          </li>
        </ul>

        <h2 className={titulo}>Por quanto tempo guardamos</h2>
        <p>
          As inscrições ficam guardadas por até <strong>{PRAZO_GUARDA_TEXTO} depois do evento</strong>, e os cadastros da lista de espera por até{" "}
          <strong>{PRAZO_GUARDA_TEXTO} depois de feitos</strong>. Esse prazo existe porque o movimento faz dois Cenáculos por ano e o Cenaculão, no fim do ano, é só para
          quem já fez o curso. Depois do prazo, os dados são apagados do site. As cópias de segurança são guardadas por, no máximo, o mesmo prazo e depois descartadas.
        </p>

        <h2 className={titulo}>Seus direitos</h2>
        <p>Você pode pedir, a qualquer momento e sem custo:</p>
        <ul className={lista}>
          <li>saber quais dados nossos temos sobre você e receber uma cópia;</li>
          <li>corrigir dados errados ou desatualizados;</li>
          <li>apagar seus dados (ou os da criança pela qual você é responsável);</li>
          <li>retirar o seu consentimento.</li>
        </ul>
        <p className="mt-3">
          É só escrever para{" "}
          <a href={`mailto:${EMAIL_PRIVACIDADE}`} className="text-cenaculo-blue font-bold underline">{EMAIL_PRIVACIDADE}</a>, dizendo o nome usado na inscrição e o evento. Respondemos em
          até {PRAZO_RESPOSTA_DIAS} dias. Quando o pedido é de exclusão, apagamos os dados do site e as cópias de segurança são descartadas dentro do prazo acima. Para sua segurança, podemos pedir uma confirmação de que o pedido é realmente seu.
        </p>

        <h2 className={titulo}>Crianças</h2>
        <p>
          A inscrição de crianças só pode ser feita pelo responsável, que concorda com o termo de consentimento no formulário. Pedimos o mínimo possível sobre a
          criança, e o responsável pode pedir a exclusão dos dados dela quando quiser.
        </p>

        <h2 className={titulo}>Cookies</h2>
        <p>
          O site não usa cookies de propaganda nem de rastreamento de visitantes. O único cookie do site é o de entrada da coordenação no painel.
        </p>

        <p className="mt-10 text-sm text-gray-500">Última atualização: outubro de 2026.</p>

        <div className="mt-6">
          <Link href="/" className="text-cenaculo-blue font-bold underline">&larr; Voltar para o início</Link>
        </div>
      </article>
    </main>
  );
}
