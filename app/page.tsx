import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex-1 bg-gray-50 flex flex-col">
      
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
              href="/sobre"
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
    </main>
  );
}
