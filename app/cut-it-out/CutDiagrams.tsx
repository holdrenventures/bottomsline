// Static SVG diagrams that sit next to each lesson in the DIY guide. They use
// the same 300×340 tee outline the modeler is built on so the schematics
// visually match the interactive preview above.

const NECK = 'M118,28 Q150,50 182,28';
const TEE_OUTLINE = `${NECK} L230,48 L274,122 L248,142 L218,130 L216,320 L84,320 L82,130 L52,142 L26,122 L70,48 Z`;

function Scissors({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotate})`} className="cd-scissors">
      <circle cx={-10} cy={-5} r={4} />
      <circle cx={-10} cy={5} r={4} />
      <path d="M-6,-3 L10,4 M-6,3 L10,-4" />
    </g>
  );
}

function DimensionRight({ y1, y2, label }: { y1: number; y2: number; label: string }) {
  return (
    <g className="cd-dim">
      <path d={`M245,${y1} H255 M250,${y1} V${y2} M245,${y2} H255`} />
      <text x={260} y={(y1 + y2) / 2 + 4} className="cd-dim-text">
        {label}
      </text>
    </g>
  );
}

// -- Muscle tee ----------------------------------------------------------
// Cut along the sleeve seam: `M70,48 Q76,98 82,130` and its mirror.

export function MuscleDiagram() {
  const MUSCLE_BODY = `${NECK} L230,48 Q224,98 218,130 L216,320 L84,320 L82,130 Q76,98 70,48 Z`;
  return (
    <svg viewBox="0 0 320 340" className="cut-diagram" role="img" aria-labelledby="cd-muscle-title cd-muscle-desc">
      <title id="cd-muscle-title">Muscle tee cut diagram</title>
      <desc id="cd-muscle-desc">
        Original t-shirt outline in ghost dashes, resulting muscle tee outline in solid stroke.
        Dashed accent lines mark where the scissors follow the sleeve seams from shoulder to armpit.
      </desc>
      <path className="cd-ghost" d={TEE_OUTLINE} />
      <path className="cd-body" d={MUSCLE_BODY} />
      <path className="cd-cut" d="M70,48 Q76,98 82,130" />
      <path className="cd-cut" d="M230,48 Q224,98 218,130" />
      <Scissors x={66} y={40} rotate={60} />
      <Scissors x={234} y={40} rotate={120} />
    </svg>
  );
}

// -- Drop-arm tank -------------------------------------------------------
// J-curve cut: `M92,38.8 C98,78 97,${dropY-6} 83,${dropY}` at depth 4 in
// (default illustrative value).

export function DropArmDiagram({ depth = 4 }: { depth?: number }) {
  const dropY = 130 + depth * 10;
  const DROP_BODY =
    `${NECK} L208,38.8 C202,78 203,${dropY - 6} 217,${dropY} L216,320 L84,320 L83,${dropY}` +
    ` C97,${dropY - 6} 98,78 92,38.8 Z`;
  return (
    <svg viewBox="0 0 320 340" className="cut-diagram" role="img" aria-labelledby="cd-drop-title cd-drop-desc">
      <title id="cd-drop-title">Drop-arm tank cut diagram</title>
      <desc id="cd-drop-desc">
        Original t-shirt in ghost dashes, drop-arm tank silhouette in solid stroke. A dashed accent
        J-curve shows the scissors path from the shoulder strap down to the depth mark on the side
        seam at {depth} inches below the armpit.
      </desc>
      <path className="cd-ghost" d={TEE_OUTLINE} />
      <path className="cd-body" d={DROP_BODY} />
      <path className="cd-cut" d={`M92,38.8 C98,78 97,${dropY - 6} 83,${dropY}`} />
      <path className="cd-cut" d={`M208,38.8 C202,78 203,${dropY - 6} 217,${dropY}`} />
      <Scissors x={90} y={30} rotate={70} />
      <path className="cd-dim-guide" d="M226,130 H244" />
      <DimensionRight y1={130} y2={dropY} label={`${depth} in`} />
    </svg>
  );
}

// -- Crop top ------------------------------------------------------------

export function CropDiagram({ hem = 8 }: { hem?: number }) {
  const cropY = 130 + hem * 10;
  const CROP_BODY =
    `${NECK} L230,48 L274,122 L248,142 L218,130 L217,${cropY} L83,${cropY} L82,130 L52,142 L26,122 L70,48 Z`;
  return (
    <svg viewBox="0 0 320 340" className="cut-diagram" role="img" aria-labelledby="cd-crop-title cd-crop-desc">
      <title id="cd-crop-title">Crop top cut diagram</title>
      <desc id="cd-crop-desc">
        Original t-shirt in ghost dashes, cropped tee silhouette in solid stroke. A dashed accent
        horizontal line shows the straight scissors path across the front at {hem} inches below the
        armpit.
      </desc>
      <path className="cd-ghost" d={TEE_OUTLINE} />
      <path className="cd-body" d={CROP_BODY} />
      <path className="cd-cut" d={`M56,${cropY} L244,${cropY}`} />
      <Scissors x={48} y={cropY} rotate={0} />
      <path className="cd-dim-guide" d="M226,130 H244" />
      <DimensionRight y1={130} y2={cropY} label={`${hem} in`} />
    </svg>
  );
}
