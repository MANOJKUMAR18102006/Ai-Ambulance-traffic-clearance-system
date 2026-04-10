import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function HospitalList({ hospitals, onSelect, selectedId }) {
  if (!hospitals || hospitals.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🏥 Nearby Hospitals</Text>
      <ScrollView>
        {hospitals.map(h => (
          <TouchableOpacity
            key={h.id}
            onPress={() => onSelect(h)}
            style={[styles.card, selectedId === h.id && styles.cardActive]}
          >
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{h.name}</Text>
                {h.address && <Text style={styles.addr} numberOfLines={1}>{h.address}</Text>}
              </View>
              <View style={styles.badges}>
                {h.distanceKm != null && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{h.distanceKm} km</Text>
                  </View>
                )}
                {h.emergency && (
                  <View style={styles.emergBadge}>
                    <Text style={styles.emergText}>🚨</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  heading: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, marginBottom: 6,
  },
  cardActive: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1, marginRight: 8 },
  name: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  addr: { color: '#64748b', fontSize: 11, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  badge: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#94a3b8', fontSize: 10 },
  emergBadge: { backgroundColor: 'rgba(220,38,38,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  emergText: { fontSize: 10 },
});
