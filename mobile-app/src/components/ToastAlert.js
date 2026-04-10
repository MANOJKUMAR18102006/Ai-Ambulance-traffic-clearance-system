import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function ToastAlert({ message, type = 'info', onClose }) {
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onClose && onClose());
  }, []);

  const colors = {
    success: { bg: '#064e3b', border: '#059669', text: '#34d399' },
    error:   { bg: '#450a0a', border: '#dc2626', text: '#f87171' },
    warning: { bg: '#451a03', border: '#d97706', text: '#fbbf24' },
    info:    { bg: '#0c1a3a', border: '#3b82f6', text: '#60a5fa' },
  };
  const c = colors[type] || colors.info;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  return (
    <Animated.View style={[styles.container, { backgroundColor: c.bg, borderColor: c.border, opacity }]}>
      <Text style={styles.icon}>{icons[type]}</Text>
      <Text style={[styles.text, { color: c.text }]} numberOfLines={3}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 90, left: 16, right: 16, zIndex: 9999,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
  icon: { fontSize: 16 },
  text: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
