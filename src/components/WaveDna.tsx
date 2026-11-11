import React from 'react';
import fundoImg from '../assets/fundo.png';

interface WaveDnaProps {
  dnaPosition?: 'left' | 'right';
}

export const WaveDna: React.FC<WaveDnaProps> = ({ dnaPosition = 'right' }) => {
  if (dnaPosition === 'right') {
    return (
      <div className="relative w-full h-full min-h-[440px] lg:min-h-full overflow-hidden bg-black flex items-center justify-center select-none transform-gpu">
        {/* Imagem de DNA luminoso no fundo */}
        <img
          src={fundoImg}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.triedPublic) {
              target.dataset.triedPublic = 'true';
              target.src = '/img/fundo.png';
            }
          }}
          alt="Estrutura de DNA molecular 3D"
          className="absolute inset-0 w-full h-full object-cover object-center z-0 block backface-hidden"
          loading="eager"
        />

        {/* Gradiente sutil para acentuar a profundidade escura do DNA */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20 pointer-events-none z-5" />

        {/* Curva orgânica divisora branca do Figma que recorta a área do formulário */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-y-0 left-0 h-full w-28 sm:w-36 lg:w-44 z-10 pointer-events-none"
        >
          {/* Forma branca com recorte em curva fluida idêntica ao Figma */}
          <path
            d="M 0 0 L 22 0 C 48 18, 48 32, 14 52 C -2 68, 8 85, 34 100 L 0 100 Z"
            fill="#FFFFFF"
          />
          {/* Linha azul sutil (#2F80ED) contornando a curva */}
          <path
            d="M 22 0 C 48 18, 48 32, 14 52 C -2 68, 8 85, 34 100"
            fill="none"
            stroke="#2F80ED"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>

        {/* Ponto circular azul (#2F80ED) característico do Figma */}
        <div className="absolute top-12 left-14 sm:left-18 lg:left-24 w-3.5 h-3.5 rounded-full bg-[#2F80ED] ring-4 ring-blue-500/20 shadow-[0_0_12px_#2F80ED] z-20 pointer-events-none" />
      </div>
    );
  }

  // Quando o DNA fica na esquerda
  return (
    <div className="relative w-full h-full min-h-[440px] lg:min-h-full overflow-hidden bg-black flex items-center justify-center select-none transform-gpu">
      {/* Imagem de DNA no fundo */}
      <img
        src={fundoImg}
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.dataset.triedPublic) {
            target.dataset.triedPublic = 'true';
            target.src = '/img/fundo.png';
          }
        }}
        alt="Estrutura de DNA molecular 3D"
        className="absolute inset-0 w-full h-full object-cover object-center z-0 block backface-hidden"
        loading="eager"
      />

      <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent to-black/20 pointer-events-none z-5" />

      {/* Curva orgânica divisora branca na borda direita do DNA */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-y-0 right-0 h-full w-28 sm:w-36 lg:w-44 z-10 pointer-events-none"
      >
        <path
          d="M 100 0 L 78 0 C 52 18, 52 32, 86 52 C 102 68, 92 85, 66 100 L 100 100 Z"
          fill="#FFFFFF"
        />
        {/* Linha azul sutil (#2F80ED) contornando a curva */}
        <path
          d="M 78 0 C 52 18, 52 32, 86 52 C 102 68, 92 85, 66 100"
          fill="none"
          stroke="#2F80ED"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>

      {/* Ponto circular azul (#2F80ED) na crista da onda */}
      <div className="absolute top-12 right-14 sm:right-18 lg:right-24 w-3.5 h-3.5 rounded-full bg-[#2F80ED] ring-4 ring-blue-500/20 shadow-[0_0_12px_#2F80ED] z-20 pointer-events-none" />
    </div>
  );
};
