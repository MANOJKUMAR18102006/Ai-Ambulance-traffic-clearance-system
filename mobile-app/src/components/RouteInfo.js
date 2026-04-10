import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export default function RouteInfo({ routeData, signals, isRunning, onStart, onStop, loading, currentInstruction }) {
  if (!routeData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>Set start & destination to calculate route</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{routeData.distance}</Text>
          <Text style={styles.summaryLabel}>km</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{routeData.duration}</Text>
          <Text style={styles.summaryLabel}>min</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{signals?.length || 0}</Text>
          <Text style={styles.summaryLabel}>signals</Text>
        </View>
      </View>

      {/* Current instruction */}
      {currentInstruction && isRunning && (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>🗣 {currentInstruction}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.btnRow}>
        {!isRunning ? (
          <TouchableOpacity onPress={onStart} style={styles.startBtn} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.startText}>🚑 Activate Green Corridor</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onStop} style={styles.stopBtn}>
            <Text style={styles.stopText}>⏹ Stop Simulation</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  empty: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: '#475569', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  summaryLabel: { color: '#64748b', fontSize: 10, marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },

  instructionBox: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 10, padding: 10, marginBottom: 12,
  },
  instructionText: { color: '#fbbf24', fontSize: 12, lineHeight: 18 },

  btnRow: {},
  startBtn: {
    backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  startText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  stopBtn: {
    backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: '#dc2626',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  stopText: { color: '#f87171', fontSize: 14, fontWeight: '700' },
});
