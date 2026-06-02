import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../store/ThemeContext';
import { useApp } from '../store/AppContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ASSISTANT_SIZE = 52;
const EDGE_PADDING = 8;

interface FloatingAssistantProps {
  onScreenshotRecognize?: () => void;
  onQuickBook?: () => void;
  onTextBookkeeping?: () => void;
  hasNotification?: boolean;
}

export default function FloatingAssistant({ onScreenshotRecognize, onQuickBook, onTextBookkeeping, hasNotification }: FloatingAssistantProps) {
  const { colors } = useTheme();
  const { state } = useApp();

  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - ASSISTANT_SIZE - EDGE_PADDING, y: Dimensions.get('window').height * 0.5 })).current;
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasMoved = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        hasMoved.current = false;
        pan.setOffset({
          x: (pan.x as any).__getValue?.() ?? 0,
          y: (pan.y as any).__getValue?.() ?? 0,
        });
        pan.setValue({ x: 0, y: 0 });
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          hasMoved.current = true;
        }
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setIsDragging(false);

        if (!hasMoved.current) {
          setIsExpanded(prev => !prev);
          return;
        }

        const currentX = (pan.x as any).__getValue?.() ?? 0;
        const snapX = currentX > SCREEN_WIDTH / 2
          ? SCREEN_WIDTH - ASSISTANT_SIZE - EDGE_PADDING
          : EDGE_PADDING;
        Animated.spring(pan, {
          toValue: { x: snapX, y: (pan.y as any).__getValue?.() ?? 0 },
          useNativeDriver: false,
          tension: 80,
          friction: 12,
        }).start();
      },
    })
  ).current;

  const handleMenuAction = (action: () => void) => {
    setIsExpanded(false);
    setTimeout(action, 200);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {isExpanded && (
        <TouchableOpacity
          style={styles.expandOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={[styles.menuPanel, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>记账助手</Text>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleMenuAction(() => onScreenshotRecognize?.())}
              activeOpacity={0.6}
            >
              <View style={[styles.menuItemIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.menuItemEmoji}>📸</Text>
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>截屏识别</Text>
                <Text style={[styles.menuItemHint, { color: colors.textTertiary }]}>从相册选择截图自动识别</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleMenuAction(() => onQuickBook?.())}
              activeOpacity={0.6}
            >
              <View style={[styles.menuItemIconWrap, { backgroundColor: colors.successLight }]}>
                <Text style={styles.menuItemEmoji}>✏️</Text>
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>快速记账</Text>
                <Text style={[styles.menuItemHint, { color: colors.textTertiary }]}>直接打开记账页面</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
              onPress={() => handleMenuAction(() => onTextBookkeeping?.())}
              activeOpacity={0.6}
            >
              <View style={[styles.menuItemIconWrap, { backgroundColor: colors.warningLight }]}>
                <Text style={styles.menuItemEmoji}>💬</Text>
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>文字记账</Text>
                <Text style={[styles.menuItemHint, { color: colors.textTertiary }]}>用自然语言描述快速记账</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleClose}
              activeOpacity={0.6}
            >
              <View style={[styles.menuItemIconWrap, { backgroundColor: colors.inputBackground }]}>
                <Text style={styles.menuItemEmoji}>✕</Text>
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={[styles.menuItemLabel, { color: colors.textSecondary }]}>收起</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <Animated.View
        style={[
          styles.assistant,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
            shadowColor: '#FF6B6B',
          },
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={isDragging ? ['#EE5A5A', '#F07B3F'] : ['#FF6B6B', '#FF8E53']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.assistantGradient}
        >
          <View style={styles.iconInner}>
            <MaterialCommunityIcons name="wallet-outline" size={26} color="#FFFFFF" />
          </View>
          {hasNotification && (
            <View style={styles.badge}>
              <View style={[styles.badgeDot, { backgroundColor: '#FF3B30' }]} />
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  assistant: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ASSISTANT_SIZE,
    height: ASSISTANT_SIZE,
    borderRadius: ASSISTANT_SIZE / 2,
    elevation: 10,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    overflow: 'hidden',
  },
  assistantGradient: {
    width: '100%',
    height: '100%',
    borderRadius: ASSISTANT_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  badgeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  expandOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuPanel: {
    width: '80%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuItemEmoji: {
    fontSize: 20,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemHint: {
    fontSize: 12,
    marginTop: 2,
  },
});
