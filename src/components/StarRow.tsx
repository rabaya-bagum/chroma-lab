import React from 'react';
import Svg, { Path } from 'react-native-svg';

function starD(size: number, x0: number): string {
  const c = size / 2, R = size / 2 - 1, r = R * 0.45;
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    d += `${i === 0 ? 'M' : 'L'}${(x0 + c + rad * Math.cos(a)).toFixed(2)} ${(c + rad * Math.sin(a)).toFixed(2)} `;
  }
  return d + 'Z';
}

/** Row of three stars, `count` of them filled. */
export function StarRow({ count, size = 18 }: { count: number; size?: number }) {
  const width = size * 3 + 8;
  return (
    <Svg width={width} height={size} accessible accessibilityLabel={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Path
          key={i}
          d={starD(size, i * (size + 4))}
          fill={i < count ? '#FFD84D' : 'rgba(255,255,255,0.12)'}
          stroke={i < count ? '#FFF1B8' : 'rgba(150,190,255,0.4)'}
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
}
