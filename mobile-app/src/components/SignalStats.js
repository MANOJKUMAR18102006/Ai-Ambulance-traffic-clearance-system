import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SignalStats({ signals }) {
  if (!signals || signals.length === 0) return null;
  const green  = signals.filter(s => s.status === 'green').length;
  const yellow = signals.filter(s => s.status === 'yellow').length;
  const red    = signals.filter(s => s.status === 'red').length;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🚦 Signal Status</Text>
      <View style={styles.row}>
        <View style={[styles.card, styles.green]}>
          <Text style={styles.num}>{green}</Text>
          <Text style={styles.label}>🟢 Green</Text>
        </View>
        <View style={[styles.card, styles.yellow]}>
          <Text style={styles.num}>{yellow}</Text>
          <Text style={styles.label}>🟡 Yellow</Text>
        </View>
        <View style={[styles.card, styles.red]}>
          <Text style={styles.num}>{red}</Text>
          <Text style={styles.label}>🔴 Red</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 4 },
  heading: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center',
  },
  green:  { backgroundColor: 'rgba(16,185,129,0.1)',  borderColor: 'rgba(16,185,129,0.3)' },
  yellow: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  red:    { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  num: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 2 },
  label: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
});
