'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { PetPose } from '@/lib/pet';

/**
 * Atlas — pitbull ilustrado em vetor (desenho original), monocromático,
 * com 4 estados animados: alerta, brincando, dormindo e feliz.
 */
export function Pitbull({ pose, size = 220 }: { pose: PetPose; size?: number }) {
  const sleeping = pose === 'sleeping';
  const playing = pose === 'playing';
  const happy = pose === 'happy';
  const coat = '#8d929b';
  const coatDark = '#5f646d';
  const chest = '#e9eaee';

  return (
    <div className="relative" style={{ width: size, height: size * 0.9 }}>
      {/* sombra no chão */}
      <motion.div
        className="absolute bottom-[6%] left-1/2 h-[7%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-[6px] dark:bg-black/60"
        animate={{ width: sleeping ? '78%' : playing ? ['52%', '62%', '52%'] : '56%' }}
        transition={{ duration: 0.6, repeat: playing ? Infinity : 0 }}
      />
      <motion.svg
        viewBox="0 0 240 216"
        width={size}
        height={size * 0.9}
        className="absolute inset-0"
        animate={
          sleeping ? { y: 26, rotate: 0, scaleY: 0.96 } :
          playing ? { y: [0, -8, 0], rotate: [-4, 4, -4] } :
          happy ? { y: [0, -3, 0] } :
          { y: 0, rotate: 0, scaleY: [1, 1.012, 1] }
        }
        transition={{ duration: playing ? 0.55 : happy ? 0.9 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '50%', originY: '90%' }}
      >
        {/* cauda */}
        <motion.path
          d="M176 150 C 196 140, 206 120, 204 104"
          stroke={coatDark}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          style={{ originX: '176px', originY: '150px' }}
          animate={sleeping ? { rotate: 60 } : { rotate: happy || playing ? [-18, 22, -18] : [-4, 6, -4] }}
          transition={{ duration: happy || playing ? 0.32 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* corpo */}
        <path d="M70 178 C 58 140, 78 104, 120 100 C 162 104, 186 132, 178 178 Z" fill={coat} />
        {/* peito branco */}
        <path d="M100 178 C 96 150, 106 128, 120 124 C 134 128, 144 150, 140 178 Z" fill={chest} />
        {/* patas dianteiras */}
        {!sleeping && (
          <>
            <rect x="92" y="160" width="20" height="36" rx="9" fill={coat} />
            <rect x="128" y="160" width="20" height="36" rx="9" fill={coat} />
            <rect x="90" y="186" width="24" height="12" rx="6" fill={chest} />
            <rect x="126" y="186" width="24" height="12" rx="6" fill={chest} />
          </>
        )}
        {sleeping && <path d="M66 182 C 90 176, 150 176, 182 182 L 182 196 L 66 196 Z" fill={coat} />}
        {/* coleira */}
        <path d="M86 118 C 104 130, 136 130, 154 118" stroke="#111" strokeWidth="7" strokeLinecap="round" fill="none" className="dark:[stroke:#f5f5f5]" />
        <circle cx="120" cy="131" r="6" fill="#f5c542" />

        {/* cabeça */}
        <motion.g
          style={{ originX: '120px', originY: '110px' }}
          animate={sleeping ? { rotate: 0, y: 14 } : playing ? { rotate: [-8, 8, -8] } : happy ? { rotate: [-2, 3, -2] } : { rotate: 0 }}
          transition={{ duration: playing ? 0.55 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* orelhas (rosa/dobradas) */}
          <motion.path
            d="M70 52 C 58 38, 66 24, 82 30 C 88 40, 86 52, 80 60 Z"
            fill={coatDark}
            style={{ originX: '80px', originY: '58px' }}
            animate={{ rotate: pose === 'alert' ? -6 : sleeping ? 18 : [0, -8, 0] }}
            transition={{ duration: 1.2, repeat: pose === 'alert' || sleeping ? 0 : Infinity }}
          />
          <motion.path
            d="M170 52 C 182 38, 174 24, 158 30 C 152 40, 154 52, 160 60 Z"
            fill={coatDark}
            style={{ originX: '160px', originY: '58px' }}
            animate={{ rotate: pose === 'alert' ? 6 : sleeping ? -18 : [0, 8, 0] }}
            transition={{ duration: 1.2, repeat: pose === 'alert' || sleeping ? 0 : Infinity }}
          />
          {/* crânio largo + bochechas musculosas */}
          <path d="M72 70 C 72 42, 96 30, 120 30 C 144 30, 168 42, 168 70 C 174 90, 162 112, 140 116 L 100 116 C 78 112, 66 90, 72 70 Z" fill={coat} />
          {/* listra branca da testa */}
          <path d="M114 34 C 116 52, 116 62, 112 74 L 128 74 C 124 62, 124 52, 126 34 Z" fill={chest} opacity="0.9" />
          {/* focinho */}
          <ellipse cx="120" cy="92" rx="30" ry="22" fill={chest} />
          <path d="M108 82 C 112 76, 128 76, 132 82 C 130 90, 110 90, 108 82 Z" fill="#1d1e22" />
          <path d="M120 89 L 120 98" stroke="#1d1e22" strokeWidth="2.5" strokeLinecap="round" />
          {/* boca */}
          <path d={happy || playing ? 'M104 98 C 112 110, 128 110, 136 98' : 'M108 100 C 114 104, 126 104, 132 100'} stroke="#1d1e22" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* língua */}
          <AnimatePresence>
            {(happy || pose === 'alert') && !sleeping && happy && (
              <motion.path
                d="M114 104 C 114 116, 126 116, 126 104 Z"
                fill="#ef7b8f"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: [1, 1.15, 1] }}
                exit={{ scaleY: 0 }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ originX: '120px', originY: '104px' }}
              />
            )}
          </AnimatePresence>
          {/* olhos */}
          {sleeping ? (
            <>
              <path d="M90 66 C 94 70, 102 70, 106 66" stroke="#1d1e22" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M134 66 C 138 70, 146 70, 150 66" stroke="#1d1e22" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <motion.g animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 1] }} style={{ originY: '64px' }}>
              <ellipse cx="98" cy="64" rx="7" ry={happy ? 6 : 7.5} fill="#1d1e22" />
              <ellipse cx="142" cy="64" rx="7" ry={happy ? 6 : 7.5} fill="#1d1e22" />
              <circle cx="100" cy="61" r="2" fill="#fff" />
              <circle cx="144" cy="61" r="2" fill="#fff" />
            </motion.g>
          )}
          {/* sobrancelhas de alerta */}
          {pose === 'alert' && (
            <>
              <path d="M88 52 L 106 56" stroke={coatDark} strokeWidth="4" strokeLinecap="round" />
              <path d="M152 52 L 134 56" stroke={coatDark} strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          {/* corda do cabo de guerra */}
          {playing && (
            <motion.g animate={{ x: [-6, 6, -6] }} transition={{ duration: 0.55, repeat: Infinity }}>
              <path d="M60 104 C 84 100, 100 102, 112 104 M128 104 C 150 102, 170 98, 196 106" stroke="#d6b27a" strokeWidth="7" strokeLinecap="round" fill="none" />
              <circle cx="58" cy="104" r="7" fill="#c49a5c" />
              <circle cx="198" cy="106" r="7" fill="#c49a5c" />
            </motion.g>
          )}
        </motion.g>
      </motion.svg>

      {/* Zzz */}
      <AnimatePresence>
        {sleeping &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute right-[18%] top-[22%] text-[15px] font-bold muted"
              initial={{ opacity: 0, y: 0, x: 0 }}
              animate={{ opacity: [0, 1, 0], y: -40, x: 18 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }}
            >
              z
            </motion.span>
          ))}
      </AnimatePresence>
      {/* corações quando feliz */}
      <AnimatePresence>
        {happy &&
          [0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute left-[24%] top-[12%] text-[14px]"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], y: -30, x: i ? 24 : -10 }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 1 }}
            >
              🤍
            </motion.span>
          ))}
      </AnimatePresence>
    </div>
  );
}
