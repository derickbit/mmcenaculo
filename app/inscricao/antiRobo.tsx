"use client";

import { useEffect, useRef } from "react";
import { CAMPO_ISCA } from "@/lib/honeypot";

// Peças do honeypot para os formulários públicos (a regra está em lib/honeypot.ts).

// Momento em que o formulário foi aberto (em milissegundos). Fica na memória do componente, e NÃO em um campo
// escondido do HTML: o React apaga o valor de campos escondidos toda vez que o formulário atualiza (a cada tecla
// digitada, por exemplo), e a pessoa seria tomada por robô. Quem envia o formulário junta este valor ao envio.
export function useAberturaDoFormulario() {
  const abertura = useRef(0);
  useEffect(() => {
    abertura.current = Date.now();
  }, []);
  return abertura;
}

// O campo isca. Fica fora da tela (e não com display:none, que robôs mais espertos reconhecem) e é ignorado
// por leitores de tela e pelo teclado, para uma pessoa de verdade nunca preencher por engano.
export function CampoIsca() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Não preencha este campo
        <input type="text" name={CAMPO_ISCA} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
