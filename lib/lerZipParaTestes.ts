import { inflateRawSync } from "node:zlib";

// Só para os testes.
// Lê os arquivos de dentro de um .xlsx (que é um zip), sem bibliotecas: só para o teste olhar o que foi gravado.
export function lerZip(buffer: Buffer): Record<string, string> {
  let fim = buffer.length - 22;
  while (fim >= 0 && buffer.readUInt32LE(fim) !== 0x06054b50) fim--;
  const total = buffer.readUInt16LE(fim + 10);
  let pos = buffer.readUInt32LE(fim + 16);

  const arquivos: Record<string, string> = {};
  for (let i = 0; i < total; i++) {
    const metodo = buffer.readUInt16LE(pos + 10);
    const tamanhoComprimido = buffer.readUInt32LE(pos + 20);
    const tamanhoNome = buffer.readUInt16LE(pos + 28);
    const tamanhoExtra = buffer.readUInt16LE(pos + 30);
    const tamanhoComentario = buffer.readUInt16LE(pos + 32);
    const deslocamentoLocal = buffer.readUInt32LE(pos + 42);
    const nome = buffer.toString("utf8", pos + 46, pos + 46 + tamanhoNome);

    const nomeLocal = buffer.readUInt16LE(deslocamentoLocal + 26);
    const extraLocal = buffer.readUInt16LE(deslocamentoLocal + 28);
    const inicio = deslocamentoLocal + 30 + nomeLocal + extraLocal;
    const dados = buffer.subarray(inicio, inicio + tamanhoComprimido);
    arquivos[nome] = (metodo === 8 ? inflateRawSync(dados) : dados).toString("utf8");

    pos += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }
  return arquivos;
}
