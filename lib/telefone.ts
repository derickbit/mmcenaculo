// Telefone brasileiro: DDD + número (10 ou 11 dígitos). Usado pela validação do servidor e pelos formulários,
// para a pessoa ver o aviso na hora, sem esperar o envio. Sem bibliotecas, para rodar também no navegador.

// Só os dígitos; aceita o código do país (55) na frente.
export function digitosDoTelefone(texto: string): string {
  const digitos = texto.replace(/\D/g, "");
  return digitos.length >= 12 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
}

export function telefoneValido(texto: string): boolean {
  return [10, 11].includes(digitosDoTelefone(texto).length);
}

// Formata enquanto a pessoa digita: (53) 3333-4444 (fixo, 10 dígitos) ou (53) 99999-9999 (celular, 11 dígitos)
export function mascararTelefone(texto: string): string {
  const d = digitosDoTelefone(texto).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
