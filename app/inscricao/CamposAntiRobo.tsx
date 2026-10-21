"use client";

import { useEffect, useRef } from "react";
import { CAMPO_ABERTURA, CAMPO_ISCA } from "@/lib/honeypot";

// Campos escondidos que acompanham os formulários públicos (ver lib/honeypot.ts).
// Fica fora da tela (e não com display:none, que robôs mais espertos reconhecem) e é ignorado por
// leitores de tela e pelo teclado, para uma pessoa de verdade nunca preencher por engano.
export default function CamposAntiRobo() {
  const abertura = useRef<HTMLInputElement>(null);

  // Marca o momento em que o formulário foi aberto.
  useEffect(() => {
    if (abertura.current) abertura.current.value = String(Date.now());
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Não preencha este campo
        <input type="text" name={CAMPO_ISCA} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
      <input type="hidden" name={CAMPO_ABERTURA} ref={abertura} defaultValue="" />
    </div>
  );
}
