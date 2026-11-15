import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, space } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  /** Pull-to-refresh */
  onRefresh?: () => void;
  refreshing?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
  header?: ReactNode;
};

export function Screen({ children, scroll = true, onRefresh, refreshing = false, edges = ['top'], contentStyle, background = colors.bg, header }: Props) {
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: background }]}>
      {header}
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} tintColor={colors.brand} /> : undefined}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: space.xl, paddingBottom: 120, gap: space.lg },
});
