import React, { useMemo } from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

function starPath(size: number) {
  const p = Skia.Path.Make();
  const c = size / 2, R = size / 2 - 1, r = R * 0.45;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    const x = c + rad * Math.cos(a), y = c + rad * Math.sin(a);
    if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
  }
  p.close();
  return p;
}

/** Row of three stars, `count` of them filled. */
export function StarRow({ count, size = 18 }: { count: number; size?: number }) {
  const path = useMemo(() => starPath(size), [size]);
  return (
    <Canvas style={{ width: size * 3 + 8, height: size }} accessible accessibilityLabel={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>
          <Path path={path} transform={[{ translateX: i * (size + 4) }]} color={i < count ? '#FFD84D' : 'rgba(255,255,255,0.12)'} />
          <Path path={path} transform={[{ translateX: i * (size + 4) }]} style="stroke" strokeWidth={1} color={i < count ? '#FFF1B8' : 'rgba(150,190,255,0.4)'} />
        </React.Fragment>
      ))}
    </Canvas>
  );
}
