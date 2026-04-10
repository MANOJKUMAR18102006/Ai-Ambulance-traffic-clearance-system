import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AccidentZone({ accidentAlertStatus, accidents = [] }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>⚠️ Accident Zones</Text>
        {accidents.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{accidents.length} active</Text>
          </View>
        )}
      </View>

      {accidentAlertStatus === null && accidents.length === 0 && (
        <View style={styles.clearBox}>
          <View style={styles.dot} />
          <Text style={styles.clearText}>Route clear — no accidents detected</Text>
        </View>
      )}

      {accidentAlertStatus === 'far' && (
        <View style={styles.farBox}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View>
            <Text style={styles.farTitle}>Accident ahead – 1.5 km</Text>
            <Text style={styles.farSub}>Prepare to slow down</Text>
          </View>
        </View>
      )}

      {accidentAlertStatus === 'near' && (
        <View style={styles.nearBox}>
          <Text style={styles.alertIcon}>🚨</Text>
          <View>
            <Text style={styles.nearTitle}>Accident ahead – 500 m</Text>
            <Text style={styles.nearSub}>Clearing traffic now</Text>
          </View>
        </View>
      )}

      {accidentAlertStatus === 'cleared' && (
        <View style={styles.clearedBox}>
          <Text style={styles.alertIcon}>✅</Text>
          <Text style={styles.clearedText}>Accident cleared</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(127,29,29,0.2)', borderWidth: 1,
    borderColor: 'rgba(153,27,27,0.4)', borderRadius: 14, padding: 14, marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  heading: { color: '#f87171', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  countBadge: { backgroundColor: 'rgba(220,38,38,0.3)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  countText: { color: '#f87171', fontSize: 10, fontWeight: '700' },

  clearBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(5,150,105,0.1)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.3)', borderRadius: 10, padding: 10 },
  dot: { width: 8, height: 8, backgroundColor: '#10b981', borderRadius: 4 },
  clearText: { color: '#34d399', fontSize: 12, fontWeight: '600' },

  farBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(120,53,15,0.3)', borderWidth: 1, borderColor: 'rgba(217,119,6,0.5)', borderRadius: 10, padding: 10 },
  alertIcon: { fontSize: 20 },
  farTitle: { color: '#fcd34d', fontSize: 12, fontWeight: '700' },
  farSub: { color: '#f59e0b', fontSize: 11, marginTop: 2 },

  nearBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(127,29,29,0.4)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.6)', borderRadius: 10, padding: 10 },
  nearTitle: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  nearSub: { color: '#f87171', fontSize: 11, marginTop: 2 },

  clearedBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(5,150,105,0.15)', borderWidth: 1, borderColor: 'rgba(5,150,105,0.4)', borderRadius: 10, padding: 10 },
  clearedText: { color: '#6ee7b7', fontSize: 12, fontWeight: '700' },
});
