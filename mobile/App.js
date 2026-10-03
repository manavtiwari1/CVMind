import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, SafeAreaView, Text, Pressable, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';

// ⚠️ CHANGE THIS TO YOUR ACTUAL DEPLOYED WEBSITE URL
const WEB_URL = "https://cvmind-ai.vercel.app"; 
const API_URL = 'https://cvmindai-backend.onrender.com';
const APP_VERSION = require('./app.json').expo.version;

// Asks the API whether this app version is still allowed (set in Admin → App config → App versions).
// Returns null when there's nothing to show, or when the check fails: the app never blocks on a network error.
function useVersionGate() {
  const [gate, setGate] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/config/version?client=android&v=${encodeURIComponent(APP_VERSION)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((info) => {
        if (!cancelled && info && info.verdict !== 'ok') setGate(info);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return [gate, () => setGate(null)];
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [gate, dismissGate] = useVersionGate();

  if (gate?.verdict === 'required') {
    return (
      <SafeAreaView style={[styles.container, styles.gate]}>
        <StatusBar style="light" backgroundColor="#0a0e17" />
        <Text style={styles.gateTitle}>Update CV Mind</Text>
        <Text style={styles.gateText}>
          {gate.message || `Version ${APP_VERSION} is no longer supported. Please update to keep using CV Mind.`}
        </Text>
        {!!gate.updateUrl && (
          <Pressable style={styles.gateButton} onPress={() => Linking.openURL(gate.updateUrl)}>
            <Text style={styles.gateButtonText}>Update now</Text>
          </Pressable>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#0a0e17" />
      {gate?.verdict === 'recommended' && (
        <View style={styles.updateBar}>
          <Text style={styles.updateBarText} numberOfLines={2}>
            {gate.message || 'A new version of CV Mind is available.'}
          </Text>
          {!!gate.updateUrl && (
            <Pressable onPress={() => Linking.openURL(gate.updateUrl)}>
              <Text style={styles.updateBarLink}>Update</Text>
            </Pressable>
          )}
          <Pressable onPress={dismissGate} accessibilityLabel="Dismiss">
            <Text style={styles.updateBarLink}>✕</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.webViewContainer}>
        <WebView
          source={{ uri: WEB_URL }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          domStorageEnabled={true}
          javaScriptEnabled={true}
          allowsBackForwardNavigationGestures={true}
        />
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17', // Match the CV Mind Dark Theme
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e17',
  },
  gate: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  gateTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  gateText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  gateButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#2dc08d',
  },
  gateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  updateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fffbeb',
  },
  updateBarText: {
    flex: 1,
    color: '#78350f',
    fontSize: 13,
  },
  updateBarLink: {
    color: '#78350f',
    fontSize: 13,
    fontWeight: '700',
  },
});
