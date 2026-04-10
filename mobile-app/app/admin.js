import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  FlatList, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import {
  getAllAmbulances, getSignals,
  createAccident, getAccidents, resolveAccident,
  fetchRoute, fetchHospitals, nominatimSearch,
  updateSignals,
} from '../src/services/api';
import ToastAlert from '../src/components/ToastAlert';
import SignalStats from '../src/components/SignalStats';
import RouteInfo from '../src/components/RouteInfo';
import HospitalList from '../src/components/HospitalList';
import * as Location from 'expo-location';

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  IDLE:      { color: '#94a3b8', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', dot: '#94a3b8' },
  ON_DUTY:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  dot: '#10b981' },
  EMERGENCY: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)',   dot: '#ef4444' },
};

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];
const SEV_COLOR = { LOW: '#f59e0b', MEDIUM: '#f97316', HIGH: '#ef4444' };

function AmbulanceCard({ a, selected, onSelect }) {
  const st = STATUS_STYLE[a.status] || STATUS_STYLE.IDLE;
  return (
    <TouchableOpacity
      onPress={() => onSelect(a.ambulanceId)}
      style={[
        styles.ambCard,
        { backgroundColor: st.bg, borderColor: st.border },
        selected && styles.ambCardSelected,
      ]}
    >
      <View style={styles.ambCardRow}>
        <View style={styles.ambCardLeft}>
          <View style={[styles.ambDot, { backgroundColor: st.dot }]} />
          <Text style={styles.ambId}>{a.ambulanceId}</Text>
          {selected && <Text style={styles.trackingBadge}>● tracking</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
          <Text style={[styles.statusBadgeText, { color: st.color }]}>{a.status}</Text>
        </View>
      </View>
      <Text style={styles.ambDriver}>👤 {a.driverName || 'Unassigned'}</Text>
      {a.location?.lat
        ? <Text style={styles.ambCoords}>{a.location.lat.toFixed(4)}, {a.location.lng.toFixed(4)}</Text>
        : <Text style={styles.ambNoLoc}>No location</Text>}
      {a.eta > 0 && <Text style={styles.ambEta}>⏱ ETA: {a.eta} min</Text>}
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('fleet');        // 'fleet' | 'simulate' | 'map'
  const [ambulances, setAmbulances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [signals, setSignals] = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [severity, setSeverity] = useState('MEDIUM');
  const [toast, setToast] = useState(null);
  const mapRef = useRef(null);
  const prevRouteIdRef = useRef(null);

  // Simulate tab state
  const [startInput, setStartInput] = useState('');
  const [start, setStart] = useState(null);
  const [destInput, setDestInput] = useState('');
  const [destination, setDestination] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [ambulancePos, setAmbulancePos] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const simTimer = useRef(null);
  const startTimer = useRef(null);
  const destTimer = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // ── Fleet polling ─────────────────────────────────────────────────────────
  const fetchFleet = useCallback(async () => {
    try {
      const data = await getAllAmbulances();
      setAmbulances(data);
      setLastUpdate(new Date());
      if (!selected && data.length) setSelected(data[0].ambulanceId);
    } catch (_) {}
    setLoadingFleet(false);
  }, [selected]);

  useEffect(() => {
    fetchFleet();
    const t = setInterval(fetchFleet, 3000);
    return () => clearInterval(t);
  }, [fetchFleet]);

  // ── Signal polling for selected ambulance ─────────────────────────────────
  const active = ambulances.find(a => a.ambulanceId === selected);
  const activeRouteId = active?.routeId ? String(active.routeId) : null;

  const fetchSignalsForActive = useCallback(async (rid) => {
    if (!rid) { setSignals([]); return; }
    try {
      const data = await getSignals(rid);
      setSignals(data.map(s => ({ ...s, id: s.signalId || s.id })));
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (activeRouteId === prevRouteIdRef.current) return;
    prevRouteIdRef.current = activeRouteId;
    fetchSignalsForActive(activeRouteId);
  }, [activeRouteId, fetchSignalsForActive]);

  useEffect(() => {
    if (!activeRouteId) return;
    const t = setInterval(() => fetchSignalsForActive(activeRouteId), 2500);
    return () => clearInterval(t);
  }, [activeRouteId, fetchSignalsForActive]);

  // Center map on selected
  useEffect(() => {
    if (!active?.location?.lat || tab !== 'map') return;
    mapRef.current?.animateToRegion({
      latitude: active.location.lat,
      longitude: active.location.lng,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    }, 600);
  }, [active?.location, tab]);

  // ── Fleet stats ───────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total',     value: ambulances.length,                                         color: '#60a5fa', icon: '🚑', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
    { label: 'Emergency', value: ambulances.filter(a => a.status === 'EMERGENCY').length,    color: '#f87171', icon: '🆘', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
    { label: 'On Duty',   value: ambulances.filter(a => a.status === 'ON_DUTY').length,      color: '#34d399', icon: '✅', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
    { label: 'Idle',      value: ambulances.filter(a => a.status === 'IDLE').length,         color: '#94a3b8', icon: '⏸', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.25)' },
  ];

  // ── Simulate tab helpers ──────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(startTimer.current);
    if (startInput.length < 3) return;
    // (no autocomplete shown in admin simulate for simplicity — just use coords)
  }, [startInput]);

  const handleCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { showToast('Location permission denied.', 'error'); return; }
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude: lat, longitude: lng } = loc.coords;
    setStart([lat, lng]);
    setStartInput(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    loadHospitals(lat, lng);
    showToast('📍 Location set!', 'success');
  };

  const loadHospitals = async (lat, lng) => {
    try { setHospitals(await fetchHospitals(lat, lng)); } catch (_) {}
  };

  const handleGetRoute = async () => {
    if (!start || !destination) { showToast('Set both points.', 'error'); return; }
    setRouteLoading(true); setRouteData(null); setSignals([]);
    try {
      const data = await fetchRoute({ lat: start[0], lng: start[1] }, { lat: destination[0], lng: destination[1] });
      setRouteData(data); setSignals(data.signals || []); setRouteId(data.routeId || null);
      showToast(`Route: ${data.distance} km · ${data.duration} min`, 'success');
      loadAccidents(data.routeId);
    } catch (err) { showToast('Failed to get route.', 'error'); }
    setRouteLoading(false);
  };

  const loadAccidents = async (rid) => {
    if (!rid) return;
    try { setAccidents(await getAccidents(rid)); } catch (_) {}
  };

  const simulateAccident = async () => {
    if (!routeData?.coords?.length) { showToast('Generate a route first.', 'error'); return; }
    const mid = Math.floor(routeData.coords.length / 2);
    const [lat, lng] = routeData.coords[mid];
    try {
      const acc = await createAccident(lat, lng, severity, routeId);
      setAccidents(prev => [...prev, acc]);
      showToast(`⚠️ ${severity} accident simulated!`, 'warning');
    } catch (_) { showToast('Failed to simulate accident.', 'error'); }
  };

  const removeAccident = async (id) => {
    try {
      await resolveAccident(id);
      setAccidents(prev => prev.filter(a => a._id !== id));
      showToast('Accident resolved.', 'success');
    } catch (_) {}
  };

  // Simulation
  const startSim = useCallback(() => {
    if (!routeData?.coords?.length) return;
    setIsRunning(true); setStepIndex(0); setAmbulancePos(routeData.coords[0]);
    showToast('🚑 Admin simulation started!', 'success');
  }, [routeData]);

  const stopSim = useCallback(() => {
    clearInterval(simTimer.current);
    setIsRunning(false); setCurrentInstruction('');
  }, []);

  useEffect(() => {
    if (!isRunning || !routeData?.coords?.length) return;
    clearInterval(simTimer.current);
    simTimer.current = setInterval(() => {
      setStepIndex(prev => {
        const next = prev + 1;
        if (next >= routeData.coords.length) {
          clearInterval(simTimer.current);
          setIsRunning(false);
          showToast('✅ Simulation complete!', 'success');
          return prev;
        }
        const pos = routeData.coords[next];
        setAmbulancePos(pos);
        if (routeData.instructions?.[next]) setCurrentInstruction(routeData.instructions[next]);
        if (routeId) {
          updateSignals(signals, pos[0], pos[1], routeId)
            .then(u => setSignals(u || signals)).catch(() => {});
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(simTimer.current);
  }, [isRunning, routeData, routeId]);

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  const mapCenter = active?.location?.lat
    ? { latitude: active.location.lat, longitude: active.location.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }
    : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };

  const TABS = [
    { key: 'fleet',    label: '🚨 Fleet' },
    { key: 'map',      label: '📍 Map' },
    { key: 'simulate', label: '⚠️ Simulate' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerBadge}><Text style={{ fontSize: 16 }}>🛡️</Text></View>
          <View>
            <Text style={styles.headerTitle}>Command Center</Text>
            <Text style={styles.headerSub}>Traffic Control Authority</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {lastUpdate && <Text style={styles.updateTime}>{lastUpdate.toLocaleTimeString()}</Text>}
          <View style={styles.userPill}>
            <View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── FLEET TAB ── */}
      {tab === 'fleet' && (
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {stats.map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg, borderColor: s.border }]}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Active ambulance detail */}
          {active && (() => {
            const st = STATUS_STYLE[active.status] || STATUS_STYLE.IDLE;
            return (
              <View style={[styles.activeCard, { borderColor: st.border }]}>
                <View style={styles.activeCardHeader}>
                  <View style={styles.activeCardLeft}>
                    <View style={[styles.activeDot, { backgroundColor: st.dot }]} />
                    <Text style={styles.activeId}>{active.ambulanceId}</Text>
                  </View>
                  <View style={[styles.activeBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={[styles.activeBadgeText, { color: st.color }]}>{active.status}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}><Text style={styles.detailKey}>Driver</Text><Text style={styles.detailVal}>{active.driverName || '—'}</Text></View>
                {active.location?.lat
                  ? <View style={styles.detailRow}><Text style={styles.detailKey}>Location</Text><Text style={styles.detailMono}>{active.location.lat.toFixed(4)}, {active.location.lng.toFixed(4)}</Text></View>
                  : <View style={styles.detailRow}><Text style={styles.detailKey}>Location</Text><Text style={styles.detailNone}>No GPS data</Text></View>}
                {active.eta > 0 && <View style={styles.detailRow}><Text style={styles.detailKey}>ETA</Text><Text style={styles.detailEta}>⏱ {active.eta} min</Text></View>}
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Updated</Text>
                  <Text style={styles.detailVal}>{active.updatedAt ? new Date(active.updatedAt).toLocaleTimeString() : '—'}</Text>
                </View>

                {active.status === 'EMERGENCY' && (
                  <View style={styles.emergAlert}>
                    <Text style={styles.emergAlertText}>🚨 EMERGENCY IN PROGRESS</Text>
                  </View>
                )}

                {/* Signals for this ambulance */}
                {signals.length > 0 && <SignalStats signals={signals} />}
              </View>
            );
          })()}

          {/* Fleet list */}
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fleet Units</Text>
              <Text style={styles.sectionSub}>{ambulances.length} units</Text>
            </View>
            {loadingFleet && <ActivityIndicator color="#ef4444" style={{ marginVertical: 20 }} />}
            {ambulances.map(a => (
              <AmbulanceCard key={a.ambulanceId} a={a} selected={selected === a.ambulanceId} onSelect={setSelected} />
            ))}
            {!loadingFleet && ambulances.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🚑</Text>
                <Text style={styles.emptyText}>No ambulances registered</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── MAP TAB ── */}
      {tab === 'map' && (
        <View style={{ flex: 1, position: 'relative' }}>
          <MapView ref={mapRef} style={styles.map} initialRegion={mapCenter} userInterfaceStyle="dark" showsUserLocation>
            {/* Active route */}
            {active?.route?.coords?.length > 1 && (
              <>
                <Polyline
                  coordinates={active.route.coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                  strokeColor={active.status === 'EMERGENCY' ? '#ef4444' : '#3b82f6'}
                  strokeWidth={5}
                />
                {active.route.start?.lat && (
                  <Marker coordinate={{ latitude: active.route.start.lat, longitude: active.route.start.lng }}>
                    <Text style={{ fontSize: 24 }}>📍</Text>
                  </Marker>
                )}
                {active.route.end?.lat && (
                  <Marker coordinate={{ latitude: active.route.end.lat, longitude: active.route.end.lng }}>
                    <Text style={{ fontSize: 24 }}>🏥</Text>
                  </Marker>
                )}
              </>
            )}
            {/* Live signals */}
            {signals.map(sig => (
              <Marker key={sig.id || sig.signalId} coordinate={{ latitude: sig.lat, longitude: sig.lng }}
                title={`Signal: ${sig.status?.toUpperCase()}`}>
                <Text style={{ fontSize: 18 }}>{sig.status === 'green' ? '🟢' : sig.status === 'yellow' ? '🟡' : '🔴'}</Text>
              </Marker>
            ))}
            {/* All ambulances */}
            {ambulances.filter(a => a.location?.lat).map(a => (
              <Marker key={a.ambulanceId}
                coordinate={{ latitude: a.location.lat, longitude: a.location.lng }}
                title={`${a.ambulanceId} — ${a.status}`}
                onPress={() => setSelected(a.ambulanceId)}
              >
                <Text style={{ fontSize: selected === a.ambulanceId ? 32 : 26 }}>🚑</Text>
              </Marker>
            ))}
          </MapView>
          {/* Map overlay */}
          <View style={styles.mapOverlayTop}>
            <View style={styles.mapPill}>
              <View style={styles.mapPillDot} />
              <Text style={styles.mapPillText}>Live Fleet Map</Text>
              <Text style={styles.mapPillSub}>· {ambulances.filter(a => a.location?.lat).length} tracked</Text>
            </View>
            {active?.status === 'EMERGENCY' && (
              <View style={styles.mapEmergPill}>
                <Text style={styles.mapEmergText}>🚨 {active.ambulanceId} — EMERGENCY</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── SIMULATE TAB ── */}
      {tab === 'simulate' && (
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sectionTitle}>🚑 Start Location</Text>
          <TouchableOpacity onPress={handleCurrentLocation} style={styles.locBtn}>
            <Text style={styles.locBtnText}>📍 Use Current Location</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle2}>Or enter coordinates (lat, lng):</Text>
          <View style={styles.coordInputRow}>
            <View style={styles.coordInputWrap}>
              <Text style={styles.label}>Latitude</Text>
              <View style={styles.input}>
                <Text style={styles.inputText} onPress={() => {}}>
                  {start ? start[0].toFixed(5) : ' — '}
                </Text>
              </View>
            </View>
            <View style={styles.coordInputWrap}>
              <Text style={styles.label}>Longitude</Text>
              <View style={styles.input}>
                <Text style={styles.inputText}>{start ? start[1].toFixed(5) : ' — '}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>🏥 Destination</Text>
          <HospitalList hospitals={hospitals} onSelect={(h) => { setDestination([h.lat, h.lng]); setDestInput(h.name); setSelectedHospitalId(h.id); }} selectedId={selectedHospitalId} />
          {hospitals.length === 0 && start && (
            <Text style={styles.noHospText}>No hospitals loaded. Use current location to find nearby hospitals.</Text>
          )}

          {/* Get route */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleGetRoute} disabled={!start || !destination || routeLoading}
              style={[styles.routeBtn, (!start || !destination) && styles.routeBtnDisabled]}>
              {routeLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.routeBtnText}>🗺️ Get Route</Text>}
            </TouchableOpacity>
          </View>

          {/* Route info */}
          {routeData && (
            <>
              <RouteInfo routeData={routeData} signals={signals} isRunning={isRunning}
                onStart={startSim} onStop={stopSim} loading={routeLoading} currentInstruction={currentInstruction} />
              {signals.length > 0 && <SignalStats signals={signals} />}
            </>
          )}

          {/* Accident simulation */}
          {routeData && (
            <View style={styles.accidentPanel}>
              <View style={styles.accidentHeader}>
                <Text style={styles.accidentTitle}>⚠️ Accident Zones</Text>
                {accidents.length > 0 && (
                  <View style={styles.accCount}><Text style={styles.accCountText}>{accidents.length} active</Text></View>
                )}
              </View>

              {/* Severity selector */}
              <View style={styles.sevRow}>
                {SEVERITIES.map(s => (
                  <TouchableOpacity key={s} onPress={() => setSeverity(s)}
                    style={[styles.sevBtn, severity === s && { backgroundColor: SEV_COLOR[s] + '33', borderColor: SEV_COLOR[s] }]}>
                    <Text style={[styles.sevText, severity === s && { color: SEV_COLOR[s] }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={simulateAccident} style={styles.simAccBtn}>
                <Text style={styles.simAccText}>⚠️ Simulate {severity} Accident</Text>
              </TouchableOpacity>

              {/* Active accidents */}
              {accidents.map(acc => (
                <View key={acc._id} style={styles.accItem}>
                  <View>
                    <Text style={styles.accSeverity}>⚠️ {acc.severity}</Text>
                    <Text style={styles.accCoords}>{acc.lat?.toFixed(4)}, {acc.lng?.toFixed(4)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeAccident(acc._id)} style={styles.accRemove}>
                    <Text style={styles.accRemoveText}>✕ Resolve</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Simulate map */}
          {routeData && (
            <View style={styles.simMapWrap}>
              <Text style={styles.sectionTitle}>📍 Simulation Map</Text>
              <MapView style={styles.simMap}
                initialRegion={start ? { latitude: start[0], longitude: start[1], latitudeDelta: 0.06, longitudeDelta: 0.06 } : { latitude: 20.59, longitude: 78.96, latitudeDelta: 8, longitudeDelta: 8 }}
                userInterfaceStyle="dark"
              >
                {start && <Marker coordinate={{ latitude: start[0], longitude: start[1] }}><Text style={{ fontSize: 24 }}>📍</Text></Marker>}
                {destination && <Marker coordinate={{ latitude: destination[0], longitude: destination[1] }}><Text style={{ fontSize: 24 }}>🏥</Text></Marker>}
                {routeData?.coords?.length > 1 && (
                  <Polyline coordinates={routeData.coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))} strokeColor="#3b82f6" strokeWidth={4} />
                )}
                {ambulancePos && (
                  <Marker coordinate={{ latitude: ambulancePos[0], longitude: ambulancePos[1] }}><Text style={{ fontSize: 28 }}>🚑</Text></Marker>
                )}
                {signals.map(sig => (
                  <Marker key={sig.id || sig.signalId} coordinate={{ latitude: sig.lat, longitude: sig.lng }}>
                    <Text style={{ fontSize: 18 }}>{sig.status === 'green' ? '🟢' : sig.status === 'yellow' ? '🟡' : '🔴'}</Text>
                  </Marker>
                ))}
                {accidents.map(acc => (
                  <Marker key={acc._id} coordinate={{ latitude: acc.lat, longitude: acc.lng }}>
                    <Text style={{ fontSize: 22 }}>⚠️</Text>
                  </Marker>
                ))}
              </MapView>
            </View>
          )}
        </ScrollView>
      )}

      {toast && <ToastAlert key={toast.key} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#0d1b2a',
    borderBottomWidth: 1, borderBottomColor: 'rgba(220,38,38,0.2)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBadge: { width: 34, height: 34, backgroundColor: '#dc2626', borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 10 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(220,38,38,0.15)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, backgroundColor: '#ef4444', borderRadius: 3 },
  liveText: { color: '#f87171', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  updateTime: { color: '#475569', fontSize: 10 },
  userPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  avatar: { width: 22, height: 22, backgroundColor: '#7c3aed', borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  userName: { color: '#cbd5e1', fontSize: 11, fontWeight: '600' },
  logoutBtn: { backgroundColor: 'rgba(220,38,38,0.2)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.4)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  logoutText: { color: '#f87171', fontSize: 11, fontWeight: '700' },

  tabBar: { flexDirection: 'row', backgroundColor: '#0d1b2a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#dc2626' },
  tabText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  sheet: { flex: 1 },
  sheetContent: { padding: 14, paddingBottom: 40 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  statCard: { width: '47%', borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: '#64748b', fontSize: 11 },

  activeCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  activeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  activeId: { color: '#fff', fontSize: 15, fontWeight: '800' },
  activeBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailKey: { color: '#64748b', fontSize: 12 },
  detailVal: { color: '#cbd5e1', fontSize: 12, fontWeight: '500' },
  detailMono: { color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' },
  detailNone: { color: '#475569', fontSize: 12 },
  detailEta: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },
  emergAlert: { backgroundColor: 'rgba(127,29,29,0.4)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.5)', borderRadius: 10, padding: 10, marginTop: 8, alignItems: 'center' },
  emergAlertText: { color: '#f87171', fontSize: 12, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { color: '#e2e8f0', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  sectionTitle2: { color: '#94a3b8', fontSize: 11, marginBottom: 8, marginTop: 6 },
  sectionSub: { color: '#475569', fontSize: 11 },

  ambCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  ambCardSelected: { borderColor: '#3b82f6', shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  ambCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ambCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ambDot: { width: 8, height: 8, borderRadius: 4 },
  ambId: { color: '#fff', fontSize: 13, fontWeight: '700' },
  trackingBadge: { color: '#60a5fa', fontSize: 10, marginLeft: 4 },
  statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  ambDriver: { color: '#94a3b8', fontSize: 11, marginBottom: 2 },
  ambCoords: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
  ambNoLoc: { color: '#475569', fontSize: 10 },
  ambEta: { color: '#60a5fa', fontSize: 11, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: '#475569', fontSize: 13 },

  map: { flex: 1, height: 600 },
  mapOverlayTop: { position: 'absolute', top: 12, left: 12, right: 12, gap: 8 },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(13,27,42,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  mapPillDot: { width: 6, height: 6, backgroundColor: '#10b981', borderRadius: 3 },
  mapPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  mapPillSub: { color: '#475569', fontSize: 11 },
  mapEmergPill: { backgroundColor: 'rgba(127,29,29,0.95)', borderWidth: 1, borderColor: '#dc2626', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  mapEmergText: { color: '#f87171', fontSize: 12, fontWeight: '800' },

  // simulate tab
  locBtn: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 10 },
  locBtnText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
  coordInputRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  coordInputWrap: { flex: 1 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10 },
  inputText: { color: '#64748b', fontSize: 12 },
  noHospText: { color: '#475569', fontSize: 12, textAlign: 'center', marginVertical: 10, lineHeight: 18 },

  actionRow: { marginBottom: 14 },
  routeBtn: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 13, alignItems: 'center', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
  routeBtnDisabled: { opacity: 0.35 },
  routeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  accidentPanel: { backgroundColor: 'rgba(127,29,29,0.15)', borderWidth: 1, borderColor: 'rgba(153,27,27,0.4)', borderRadius: 14, padding: 14, marginBottom: 14 },
  accidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  accidentTitle: { color: '#f87171', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  accCount: { backgroundColor: 'rgba(220,38,38,0.3)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  accCountText: { color: '#f87171', fontSize: 10, fontWeight: '700' },
  sevRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sevBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  sevText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  simAccBtn: { backgroundColor: 'rgba(127,29,29,0.4)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.5)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  simAccText: { color: '#f87171', fontSize: 13, fontWeight: '700' },
  accItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, marginBottom: 6 },
  accSeverity: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
  accCoords: { color: '#64748b', fontSize: 10, marginTop: 2 },
  accRemove: { backgroundColor: 'rgba(220,38,38,0.15)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  accRemoveText: { color: '#f87171', fontSize: 11, fontWeight: '600' },

  simMapWrap: { marginTop: 8 },
  simMap: { width: '100%', height: 300, borderRadius: 14, overflow: 'hidden', marginTop: 8 },
});
