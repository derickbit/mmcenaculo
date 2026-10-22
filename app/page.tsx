import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* 1. HERO SECTION (Com imagem de fundo) */}
      <section className="relative bg-cenaculo-blue text-white py-32 px-4 flex flex-col items-center text-center overflow-hidden min-h-[600px] justify-center">
        {/* Imagem de Fundo Dinâmica: public/images/hero_bg.jpg */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/images/hero_bg.png" 
            alt="Retiro Cenáculo" 
            fill
            priority
            className="object-cover opacity-25 object-center"
          />
          {/* Gradiente para garantir a leitura do texto branco por cima da foto */}
          <div className="absolute inset-0 bg-gradient-to-t from-cenaculo-blue via-transparent to-cenaculo-blue/50"></div>
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Espaço do Logotipo: public/images/logo.png */}
          <div className="mb-6 flex justify-center">
            <Image 
              src="/images/logo.png" 
              alt="Logo MMC" 
              width={120} 
              height={120} 
              className="object-contain drop-shadow-md"
              fallback-src="https://placehold.co/120" // Evita quebrar o layout se você ainda não tiver a imagem
            />
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Movimento Mariano <br/>
            <span className="text-cenaculo-gold">Cenáculo</span>
          </h1>
          <p className="text-lg md:text-xl font-light mb-10 text-gray-200 max-w-2xl mx-auto">
            Uma experiência profunda de fé, encontro pessoal com Cristo e devoção à Nossa Senhora.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/inscricao" 
              className="bg-cenaculo-gold text-cenaculo-blue font-extrabold text-lg py-4 px-10 rounded-full hover:bg-yellow-400 transition-all transform hover:scale-105 shadow-xl"
            >
              Fazer Inscrição
            </Link>
            <Link 
              href="sobre" 
              className="bg-transparent border-2 border-gray-300 text-white font-bold text-lg py-4 px-10 rounded-full hover:border-white hover:bg-white/10 transition-all"
            >
              Conheça o Movimento
            </Link>
          </div>
        </div>
      </section>

    {/* 2. SESSÃO SOBRE (Com imagens proporcionais e elegantes) */}
      <section id="sobre" className="py-24 px-4 sm:px-6 lg:px-10 xl:px-12 w-full text-center bg-white">
        <h2 className="text-3xl md:text-4xl font-extrabold text-cenaculo-blue mb-6">
          O que é o <span className="text-cenaculo-gold">Cenáculo?</span>
        </h2>
        <div className="w-24 h-1 bg-cenaculo-gold mx-auto mb-10 rounded"></div>
        
        <p className="text-lg text-gray-600 leading-relaxed mb-16 max-w-5xl mx-auto">
          O Movimento Mariano Cenáculo é um caminho de evangelização que convida os participantes a viverem um retiro de final de semana intenso. Inspirado na descida do Espírito Santo sobre os apóstolos e Maria, buscamos reacender a chama da fé, transformar vidas e fortalecer as famílias e paróquias.
        </p>

        {/* Cards Informativos - Agora com proporção 4:3 (aspect-[4/3]) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-7xl mx-auto">
          
          {/* Card 1: Cenáculo Tradicional */}
          <div className="bg-gray-50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group">
            {/* aspect-[4/3] deixa a imagem mais alta e proporcional */}
            <div className="relative aspect-[4/3] w-full bg-gray-200 overflow-hidden">
              <Image 
                src="/images/tipo_cenaculo.png" 
                alt="Cenáculo Tradicional" 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            </div>
            <div className="p-8 border-t-4 border-cenaculo-blue flex-1 flex flex-col justify-center bg-white">
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3 group-hover:text-cenaculo-blue transition-colors">Cenáculo Tradicional</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                O retiro tradicional focado na vivência comunitária, trazendo resgate de valores, cura interior e um encontro íntimo com Deus através da intercessão de Maria.
              </p>
            </div>
          </div>

          {/* Card 2: Cenáculo Kids (Ideal para Artes e Ilustrações) */}
          <div className="bg-gray-50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group transform md:-translate-y-4">
            {/* Se for usar um logotipo/banner que NÃO PODE cortar, você pode trocar o 'object-cover' por 'object-contain' e definir uma cor de fundo no bg-gray-100 */}
            <div className="relative aspect-[4/3] w-full bg-blue-50 overflow-hidden flex items-center justify-center">
              <Image 
                src="/images/tipo_kids.jpg" 
                alt="Cenáculo Kids" 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            </div>
            <div className="p-8 border-t-4 border-cenaculo-gold flex-1 flex flex-col justify-center bg-white">
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3 group-hover:text-cenaculo-gold transition-colors">Cenáculo Kids</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                A semente da fé plantada desde cedo. Um encontro adaptado para as crianças, com muita ludicidade, música, teatro e introdução ao amor de Deus.
              </p>
            </div>
          </div>

          {/* Card 3: Cenaculão */}
          <div className="bg-gray-50 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group">
            <div className="relative aspect-[4/3] w-full bg-gray-200 overflow-hidden">
              <Image 
                src="/images/tipo_cenaculao.jpg" 
                alt="Cenaculão" 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            </div>
            <div className="p-8 border-t-4 border-cenaculo-blue flex-1 flex flex-col justify-center bg-white">
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3 group-hover:text-cenaculo-blue transition-colors">Cenaculão</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Um momento forte de perseverança, formação e reencontro para aqueles que já viveram o retiro original, aprofundando ainda mais a caminhada na igreja.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. RODAPÉ */}
{/* 3. RODAPÉ */}
      <footer className="bg-gray-900 text-white py-12 text-center mt-auto">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10">
          <h3 className="text-2xl font-bold mb-4">Movimento Mariano Cenáculo</h3>
          <p className="text-gray-400 mb-6">Com Maria, sempre unidos a Jesus.</p>
          
          {/* Redes Sociais */}
          <div className="flex justify-center gap-6 mb-8">
            <a href="https://www.youtube.com/@MovimentoMarianoCenaculo" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FF0000] transition transform hover:scale-110">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://www.facebook.com/mmcenaculo" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1877F2] transition transform hover:scale-110">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://www.instagram.com/mmcenaculo?utm_source=qr&igshid=ZDc4ODBmNjlmNQ%3D%3D" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E1306C] transition transform hover:scale-110">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="text-center md:text-left">
              <p>&copy; 2025 - Equipe Cenáculo. Todos os direitos reservados.</p>
              <p className="mt-1">Contato: <a href="mailto:mmcenaculopel@gmail.com" className="hover:text-cenaculo-gold transition">mmcenaculopel@gmail.com</a></p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <Link href="/painelmmc/login" className="text-gray-800 hover:text-gray-600 transition" aria-label="Acesso Restrito">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}