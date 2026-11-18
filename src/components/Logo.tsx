import React from 'react';

/**
 * ==========================================================================
 * COMPONENTE: LOGO OFICIAL MATÉRIA REATIVA
 * ==========================================================================
 * Renderiza a identidade visual oficial do sistema com béquer químico estilizado
 * como a letra 'A' e tipografia geométrica moderna com lambda (Λ).
 *
 * Variantes:
 * - 'dark': Texto preto (#111111) com béquer azul para fundos claros (Sidebar, Dashboard).
 * - 'light': Texto branco (#FFFFFF) com béquer azul para fundos escuros (Login, Cadastro, Index).
 */

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  width = 240,
  height = 'auto',
  variant = 'dark'
}) => {
  const isLight = variant === 'light';
  const textColor = isLight ? '#FFFFFF' : '#111111';
  const gradId = isLight ? 'liquidGradLight' : 'liquidGradDark';

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width, height }}
    >
      <svg
        viewBox="0 0 320 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block"
      >
        <defs>
          {/* Gradiente azul do reagente químico líquido */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>

        {/* ------------------------------------------------------------------
            GRUPO 1: BÉQUER + M A T E R I A (CENTRALIZADO EM X = 160)
            ------------------------------------------------------------------ */}
        <g transform="translate(-114.5, -4)">
          {/* Bolhas ascendentes da reação química */}
          <circle cx="206" cy="18" r="4.2" fill={textColor} />
          <circle cx="198" cy="27" r="3.2" fill={textColor} />

          {/* Borda e contorno triangular do balão */}
          <path d="M190 38 H214" stroke={textColor} strokeWidth="4.2" strokeLinecap="round" />
          <path
            d="M194 38 V48 L176 81 C174 84.5 176.5 89 180.5 89 H223.5 C227.5 89 230 84.5 228 81 L210 48 V38"
            stroke={textColor}
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Reagente líquido com superfície curva */}
          <path
            d="M182.5 70 C189 67.5 204 67.5 221.5 70 L225.5 80 C226.5 82.5 224.5 85.5 221.5 85.5 H182.5 C179.5 85.5 177.5 82.5 178.5 80 Z"
            fill={`url(#${gradId})`}
          />

          {/* Bolhas no interior do líquido */}
          <circle cx="201" cy="74" r="2.8" fill="#FFFFFF" opacity="0.95" />
          <circle cx="210" cy="77" r="2.2" fill="#FFFFFF" opacity="0.95" />

          {/* PALAVRA 'M A T E R I A' */}
          {/* M */}
          <path d="M125 89 V43 L142 66 L159 43 V89" stroke={textColor} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />

          {/* T */}
          <path d="M246 44 H272 M259 44 V89" stroke={textColor} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />

          {/* E */}
          <path d="M288 44 H310 M288 66.5 H304 M288 89 H310 M288 44 V89" stroke={textColor} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />

          {/* R */}
          <path d="M326 89 V44 H344 C353 44 358 49 358 56.5 C358 64 353 69 344 69 H326 M342 69 L358 89" stroke={textColor} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />

          {/* I */}
          <path d="M374 44 V89" stroke={textColor} strokeWidth="4.6" strokeLinecap="round" />

          {/* Letra A estilizada como Λ (sem barra horizontal) */}
          <path d="M390 89 L407 44 L424 89" stroke={textColor} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* ------------------------------------------------------------------
            GRUPO 2: SUBTÍTULO 'R E Λ T I V Λ' (CENTRALIZADO EM X = 160)
            ------------------------------------------------------------------ */}
        <g transform="translate(-89.5, -4)">
          {/* R */}
          <path d="M142 124 V107 H151 C156 107 159 109.5 159 113.5 C159 117.5 156 120 151 120 H142 M150 120 L159 124" stroke={textColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* E */}
          <path d="M177 107 H191 M177 115.5 H187 M177 124 H191 M177 107 V124" stroke={textColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Λ (A sem barra) */}
          <path d="M209 124 L219 107 L229 124" stroke={textColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* T */}
          <path d="M247 107 H263 M255 107 V124" stroke={textColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* I */}
          <path d="M281 107 V124" stroke={textColor} strokeWidth="3" strokeLinecap="round" />

          {/* V */}
          <path d="M299 107 L309 124 L319 107" stroke={textColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Λ (A sem barra) */}
          <path d="M337 124 L347 107 L357 124" stroke={textColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
};
