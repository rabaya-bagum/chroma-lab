import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../config/theme';

/** Coin balance with a small drawn coin. */
export function CoinDisplay({ coins }: { coins: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${coins} coins`}>
      <Svg width={18} height={18}>
        <Circle cx={9} cy={9} r={8} fill="#FFC83D" />
        <Circle cx={9} cy={9} r={5.5} fill="none" stroke="#B5851A" strokeWidth={1.4} />
      </Svg>
      <Text maxFontSizeMultiplier={1.3} style={styles.text}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28 },
  text: { color: theme.text, fontWeight: '700', fontSize: 16 },
});
