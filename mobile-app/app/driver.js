import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  FlatList, ActivityIndicator, Modal,
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import {
  fetchRoute, fetchHospitals, nominatimSearch,
  updateMyAmbulance, getMyAmbulance,
  getAccidents, createAccident, resolveAccident,
  getSignals, updateSignals,
} from '../src/services/api';
import ToastAlert from '../src/components/ToastAlert';
import HospitalList from '../src/components/HospitalList';
import RouteInfo from '../src/components/RouteInfo';
import SignalStats from '../src/components/SignalStats';
import AccidentZone from '../src/components/AccidentZone';

const STATUS_OPTIONS = [
  { value: 'IDLE',      label: 'Idle',       icon: '⚪', color: '#94a3b8' },
  { value: 'ON_DUTY',   label: 'On Duty',    icon: '🟢', color: '#10b981' },
  { value: 'EMERGENCY', label: 'Emergency',  icon: '🔴', color: '#ef4444' },
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Sheet mode: 'route' | 'map'
  const [tab, setTab] = useState('route');
  const [ambulance, setAmbulance] = useState(null);
  const [ambulanceStatus, setAmbulanceStatus] = useState('IDLE');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Route
  const [startInput, setStartInput] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [start, setStart] = useState(null);
  const [destInput, setDestInput] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destination, setDestination] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);

  // Simulation
  const [signals, setSignals] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const simTimer = useRef(null);

  // Accidents
  const [accidents, setAccidents] = useState([]);
  const [accidentAlertStatus, setAccidentAlertStatus] = useState(null);
  const [routeId, setRouteId] = useState(null);

  // UI
  const [toast, setToast] = useState(null);
  const startTimer = useRef(null);
  const destTimer = useRef(null);
  const mapRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // Fetch ambulance info
  useEffect(() => {
    getMyAmbulance()
      .then(d => { setAmbulance(d); setAmbulanceStatus(d.status || 'IDLE'); })
      .catch(() => {});
  }, []);

  // Update status
  const updateStatus = async (status) => {
    if (updatingStatus || ambulanceStatus === status) return;
    setUpdatingStatus(true);
    setAmbulanceStatus(status);
    try {
      const d = await updateMyAmbulance({ status });
      setAmbulance(d);
    } catch (_) {}
    setUpdatingStatus(false);
  };

  // Autocomplete start
  useEffect(() => {
    clearTimeout(startTimer.current);
    if (startInput.length < 3) { setStartSuggestions([]); return; }
    startTimer.current = setTimeout(async () => {
      try { setStartSuggestions(await nominatimSearch(startInput)); } catch (_) {}
    }, 400);
  }, [startInput]);

  // Autocomplete destination
  useEffect(() => {
    clearTimeout(destTimer.current);
    if (!destInput.trim()) { setDestSuggestions([]); return; }
    const q = destInput.toLowerCase();
    const matched = hospitals.filter(h => h.name.toLowerCase().includes(q)).map(h => ({ type: 'hospital', ...h }));
    setDestSuggestions(matched);
    if (destInput.length >= 3) {
      destTimer.current = setTimeout(async () => {
        try {
          const res = await nominatimSearch(destInput + ' hospital');
          const items = res.map(r => ({
            type: 'nominatim', id: `nom_${r.place_id}`,
            name: r.display_name.split(',').slice(0, 2).join(','),
            lat: parseFloat(r.lat), lng: parseFloat(r.lon),
          }));
          setDestSuggestions(prev => {
            const ids = new Set(prev.map(x => x.id));
            return [...prev, ...items.filter(x => !ids.has(x.id))];
          });
        } catch (_) {}
      }, 500);
    }
  }, [destInput, hospitals]);

  const handleSelectStart = (item) => {
    const lat = parseFloat(item.lat), lng = parseFloat(item.lon);
    setStart([lat, lng]);
    setStartInput(item.display_name.split(',').slice(0, 2).join(','));
    setStartSuggestions([]);
    loadHospitals(lat, lng);
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800);
  };

  const handleCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { showToast('Location permission denied.', 'error'); return; }
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude: lat, longitude: lng } = loc.coords;
    setStart([lat, lng]);
    setStartInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setStartSuggestions([]);
    loadHospitals(lat, lng);
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 800);
    showToast('📍 Current location set!', 'success');
  };

  const loadHospitals = async (lat, lng) => {
    setHospitalsLoading(true);
    try {
      const h = await fetchHospitals(lat, lng);
      setHospitals(h);
    } catch (_) {}
    setHospitalsLoading(false);
  };

  const handleSelectDest = (item) => {
    setDestination([item.lat, item.lng]);
    setDestInput(item.name);
    setSelectedHospitalId(item.type === 'hospital' ? item.id : null);
    setDestSuggestions([]);
  };

  const handleHospitalSelect = (h) => {
    setDestination([h.lat, h.lng]);
    setDestInput(h.name);
    setSelectedHospitalId(h.id);
  };

  const handleGetRoute = async () => {
    if (!start || !destination) { showToast('Set both start and destination.', 'error'); return; }
    setRouteLoading(true);
    setRouteData(null); setSignals([]);
    try {
      const data = await fetchRoute({ lat: start[0], lng: start[1] }, { lat: destination[0], lng: destination[1] });
      setRouteData(data);
      setSignals(Array.isArray(data.signals) ? data.signals : []);
      setRouteId(data.routeId || null);
      showToast(`Route found! ${data.distance} km · ${data.duration} min`, 'success');
      setTab('map');
      // Fit map to route
      if (data.coords && data.coords.length > 0 && mapRef.current) {
        const coords = data.coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
        mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 60, right: 40, bottom: 60, left: 40 }, animated: true });
      }
    } catch (err) {
      showToast(err.message || 'Failed to get route.', 'error');
    }
    setRouteLoading(false);
  };

  // ── Simulation ─────────────────────────────────────────────────────────────
  const startSim = useCallback(() => {
    if (!routeData?.coords?.length) return;
    setIsRunning(true);
    setStepIndex(0);
    setAmbulancePos(routeData.coords[0]);
    updateStatus('EMERGENCY');
    showToast('🚑 Green corridor activated!', 'success');
  }, [routeData]);

  const stopSim = useCallback(() => {
    clearInterval(simTimer.current);
    setIsRunning(false);
    setCurrentInstruction('');
    updateStatus('ON_DUTY');
  }, []);

  // Step through route coords
  useEffect(() => {
    if (!isRunning || !routeData?.coords?.length) return;
    clearInterval(simTimer.current);
    simTimer.current = setInterval(async () => {
      setStepIndex(prev => {
        const next = prev + 1;
        if (next >= routeData.coords.length) {
          clearInterval(simTimer.current);
          setIsRunning(false);
          setCurrentInstruction('🏥 Arrived at destination!');
          updateStatus('ON_DUTY');
          showToast('🏥 Ambulance arrived!', 'success');
          return prev;
        }
        const pos = routeData.coords[next];
        setAmbulancePos(pos);
        // Pan map to ambulance
        mapRef.current?.animateToRegion({
          latitude: pos[0], longitude: pos[1],
          latitudeDelta: 0.01, longitudeDelta: 0.01,
        }, 500);
        // Update instruction
        if (routeData.instructions?.[next]) setCurrentInstruction(routeData.instructions[next]);
        // Check accidents
        checkAccidents(pos[0], pos[1]);
        // Update signals
        if (routeId) {
          updateSignals(signals, pos[0], pos[1], routeId)
            .then(updated => setSignals(Array.isArray(updated) ? updated : signals))
            .catch(() => {});
          updateMyAmbulance({ location: { lat: pos[0], lng: pos[1] } }).catch(() => {});
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(simTimer.current);
  }, [isRunning, routeData, routeId]);

  // Check accidents proximity
  const checkAccidents = async (lat, lng) => {
    if (!routeId) return;
    try {
      const list = await getAccidents(routeId);
      setAccidents(list);
      const near = list.find(a => haversineKm(lat, lng, a.lat, a.lng) < 0.5);
      const far  = list.find(a => haversineKm(lat, lng, a.lat, a.lng) < 1.5);
      if (near) setAccidentAlertStatus('near');
      else if (far) setAccidentAlertStatus('far');
      else setAccidentAlertStatus(null);
    } catch (_) {}
  };

  const handleReset = () => {
    stopSim();
    setStart(null); setDestination(null);
    setStartInput(''); setDestInput('');
    setRouteData(null); setSignals([]);
    setHospitals([]); setSelectedHospitalId(null);
    setAccidents([]); setAccidentAlertStatus(null);
  };

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  const isEmergency = ambulanceStatus === 'EMERGENCY';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, isEmergency && styles.headerEmergency]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerBadge, isEmergency && styles.headerBadgeEmergency]}>
            <Text style={styles.headerEmoji}>🚑</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{ambulance?.ambulanceId || 'AmbulanceAI'}</Text>
            <Text style={styles.headerSub}>👤 {user?.name}</Text>
          </View>
          {isEmergency && (
            <View style={styles.emergBadge}>
              <Text style={styles.emergBadgeText}>EMERGENCY</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Status buttons */}
      <View style={styles.statusBar}>
        {STATUS_OPTIONS.map(s => (
          <TouchableOpacity
            key={s.value}
            onPress={() => updateStatus(s.value)}
            disabled={updatingStatus}
            style={[styles.statusBtn, ambulanceStatus === s.value && { borderColor: s.color, backgroundColor: `${s.color}22` }]}
          >
            <Text style={styles.statusIcon}>{s.icon}</Text>
            <Text style={[styles.statusLabel, ambulanceStatus === s.value && { color: s.color }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {[{ key: 'route', label: '🗺️ Route' }, { key: 'map', label: '📍 Live Map' }].map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Live indicator */}
      {isRunning && (
        <View style={styles.liveBar}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE — {currentInstruction || 'Simulation running...'}</Text>
        </View>
      )}

      {/* ── Route Tab ── */}
      {tab === 'route' && (
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
          {/* Start */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚑 Start Location</Text>
            <TouchableOpacity onPress={handleCurrentLocation} style={styles.locBtn}>
              <Text style={styles.locBtnText}>📍 Use Current Location</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={startInput}
              onChangeText={v => { setStartInput(v); setStart(null); }}
              placeholder="Search start location..."
              placeholderTextColor="#475569"
            />
            {startSuggestions.length > 0 && (
              <View style={styles.dropdown}>
                {startSuggestions.map(s => (
                  <TouchableOpacity key={s.place_id} onPress={() => handleSelectStart(s)} style={styles.dropItem}>
                    <Text style={styles.dropText} numberOfLines={2}>{s.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {start && <Text style={styles.coordText}>📍 {start[0].toFixed(5)}, {start[1].toFixed(5)}</Text>}
          </View>

          {/* Destination */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Destination Hospital</Text>
            <TextInput
              style={[styles.input, !start && styles.inputDisabled]}
              value={destInput}
              onChangeText={v => { setDestInput(v); setDestination(null); }}
              placeholder={start ? 'Search hospital name...' : 'Set start location first'}
              placeholderTextColor="#475569"
              editable={!!start}
            />
            {destSuggestions.length > 0 && (
              <View style={styles.dropdown}>
                {destSuggestions.map(s => (
                  <TouchableOpacity key={s.id} onPress={() => handleSelectDest(s)} style={styles.dropItem}>
                    <View style={styles.dropRow}>
                      <Text style={styles.dropText} numberOfLines={1}>{s.name}</Text>
                      {s.distanceKm != null && <Text style={styles.dropKm}>{s.distanceKm} km</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {destination && <Text style={styles.coordText}>✓ {destination[0].toFixed(5)}, {destination[1].toFixed(5)}</Text>}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleGetRoute}
              disabled={!start || !destination || routeLoading}
              style={[styles.routeBtn, (!start || !destination) && styles.routeBtnDisabled]}
            >
              {routeLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.routeBtnText}>🗺️ Get Route</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetText}>↺</Text>
            </TouchableOpacity>
          </View>

          {/* Accident status */}
          {routeData && (
            <AccidentZone accidentAlertStatus={accidentAlertStatus} accidents={accidents} />
          )}

          {/* Signal stats */}
          {signals.length > 0 && <SignalStats signals={signals} />}

          {/* Route info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛣️ Route Details</Text>
            <RouteInfo
              routeData={routeData}
              signals={signals}
              isRunning={isRunning}
              onStart={startSim}
              onStop={stopSim}
              loading={routeLoading}
              currentInstruction={currentInstruction}
            />
          </View>

          {/* Hospitals */}
          {hospitalsLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.loadingText}>Searching hospitals within 50 km...</Text>
            </View>
          )}
          {!hospitalsLoading && hospitals.length > 0 && (
            <HospitalList hospitals={hospitals} onSelect={handleHospitalSelect} selectedId={selectedHospitalId} />
          )}

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>MAP LEGEND</Text>
            <View style={styles.legendGrid}>
              {['🚑 Ambulance', '🏥 Hospital', '🚗 Vehicle', '🚦 Signal', '🟢 Green (priority)', '🟡 Yellow (pre-clear)', '🔴 Red (stop)', '⚠️ Accident'].map(item => (
                <Text key={item} style={styles.legendItem}>{item}</Text>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Map Tab ── */}
      {tab === 'map' && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={
              start
                ? { latitude: start[0], longitude: start[1], latitudeDelta: 0.08, longitudeDelta: 0.08 }
                : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 }
            }
            showsUserLocation
            userInterfaceStyle="dark"
          >
            {/* Start marker */}
            {start && (
              <Marker coordinate={{ latitude: start[0], longitude: start[1] }} title="Start">
                <Text style={{ fontSize: 28 }}>📍</Text>
              </Marker>
            )}
            {/* Destination marker */}
            {destination && (
              <Marker coordinate={{ latitude: destination[0], longitude: destination[1] }} title="Hospital">
                <Text style={{ fontSize: 28 }}>🏥</Text>
              </Marker>
            )}
            {/* Route polyline */}
            {routeData?.coords?.length > 1 && (
              <Polyline
                coordinates={routeData.coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                strokeColor="#3b82f6"
                strokeWidth={5}
              />
            )}
            {/* Ambulance position */}
            {ambulancePos && (
              <Marker coordinate={{ latitude: ambulancePos[0], longitude: ambulancePos[1] }} title="Ambulance">
                <Text style={{ fontSize: 30 }}>🚑</Text>
              </Marker>
            )}
            {/* Hospitals */}
            {hospitals.map(h => (
              <Marker key={h.id} coordinate={{ latitude: h.lat, longitude: h.lng }} title={h.name}>
                <Text style={{ fontSize: 22 }}>🏥</Text>
              </Marker>
            ))}
            {/* Signals */}
            {(signals || []).map(sig => (
              <Marker
                key={sig.id || sig.signalId}
                coordinate={{ latitude: sig.lat, longitude: sig.lng }}
                title={`Signal: ${sig.status?.toUpperCase()}`}
              >
                <Text style={{ fontSize: 20 }}>
                  {sig.status === 'green' ? '🟢' : sig.status === 'yellow' ? '🟡' : '🔴'}
                </Text>
              </Marker>
            ))}
            {/* Accidents */}
            {accidents.map(acc => (
              <Marker key={acc._id} coordinate={{ latitude: acc.lat, longitude: acc.lng }} title={`Accident: ${acc.severity}`}>
                <Text style={{ fontSize: 24 }}>⚠️</Text>
              </Marker>
            ))}
          </MapView>

          {/* Map overlay buttons */}
          <View style={styles.mapOverlay}>
            {routeData && !isRunning && (
              <TouchableOpacity onPress={startSim} style={styles.mapStartBtn}>
                <Text style={styles.mapStartText}>🚑 Activate Corridor</Text>
              </TouchableOpacity>
            )}
            {isRunning && (
              <TouchableOpacity onPress={stopSim} style={styles.mapStopBtn}>
                <Text style={styles.mapStopText}>⏹ Stop</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Toast */}
      {toast && (
        <ToastAlert
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#0d1b2a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerEmergency: { backgroundColor: 'rgba(127,29,29,0.9)', borderBottomColor: 'rgba(220,38,38,0.4)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBadge: { width: 36, height: 36, backgroundColor: '#1e3a5f', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerBadgeEmergency: { backgroundColor: '#dc2626' },
  headerEmoji: { fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 11 },
  emergBadge: { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  emergBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  logoutBtn: { backgroundColor: 'rgba(220,38,38,0.15)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: '#f87171', fontSize: 12, fontWeight: '600' },

  statusBar: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#0d1b2a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statusBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 7, borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statusIcon: { fontSize: 12 },
  statusLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#0d1b2a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#dc2626' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  liveBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(16,185,129,0.2)',
  },
  liveDot: { width: 8, height: 8, backgroundColor: '#10b981', borderRadius: 4 },
  liveText: { color: '#34d399', fontSize: 12, fontWeight: '600', flex: 1 },

  sheet: { flex: 1 },
  sheetContent: { padding: 14, paddingBottom: 40 },

  section: { marginBottom: 14 },
  sectionTitle: { color: '#e2e8f0', fontSize: 13, fontWeight: '700', marginBottom: 8 },

  locBtn: {
    backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 8,
  },
  locBtnText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },

  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: '#fff', fontSize: 13,
  },
  inputDisabled: { opacity: 0.3 },

  dropdown: {
    backgroundColor: '#0d1b2a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, marginTop: 4, maxHeight: 160, overflow: 'hidden',
  },
  dropItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dropText: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
  dropRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropKm: { color: '#64748b', fontSize: 11, marginLeft: 6 },
  coordText: { color: '#10b981', fontSize: 11, marginTop: 5 },

  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  routeBtn: {
    flex: 1, backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6,
  },
  routeBtnDisabled: { opacity: 0.35 },
  routeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  resetBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center',
  },
  resetText: { color: '#94a3b8', fontSize: 18, fontWeight: '700' },

  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 12 },
  loadingText: { color: '#64748b', fontSize: 12 },

  legend: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginTop: 8 },
  legendTitle: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendItem: { color: '#64748b', fontSize: 11, width: '47%' },

  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute', bottom: 20, left: 16, right: 16, alignItems: 'center',
  },
  mapStartBtn: {
    backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10,
  },
  mapStartText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  mapStopBtn: {
    backgroundColor: 'rgba(127,29,29,0.9)', borderWidth: 1, borderColor: '#dc2626',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
  },
  mapStopText: { color: '#f87171', fontSize: 15, fontWeight: '700' },
});
