/**
 * Performance monitoring component
 * Tracks app performance metrics and reports them
 */

import React, { useEffect, useState, memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/designSystem';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  bundleSize?: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  showMetrics?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = memo(({
  componentName,
  onMetricsUpdate,
  showMetrics = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Simulate performance measurement
    const measurePerformance = () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      const newMetrics: PerformanceMetrics = {
        renderTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        bundleSize: (performance as any).memory?.totalJSHeapSize
      };
      
      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    };

    // Measure after component mount
    const timeoutId = setTimeout(measurePerformance, 0);
    
    return () => clearTimeout(timeoutId);
  }, [componentName, onMetricsUpdate]);

  if (!showMetrics) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Metrics</Text>
      <Text style={styles.metric}>Component: {componentName}</Text>
      <Text style={styles.metric}>Render Time: {metrics.renderTime.toFixed(2)}ms</Text>
      {metrics.memoryUsage && (
        <Text style={styles.metric}>
          Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
        </Text>
      )}
    </View>
  );
});

/**
 * Hook for performance monitoring
 */
export const usePerformanceMonitor = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);

  const addMetric = (metric: PerformanceMetrics) => {
    setMetrics(prev => [...prev.slice(-9), metric]); // Keep last 10 metrics
  };

  const getAverageRenderTime = () => {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, metric) => sum + metric.renderTime, 0);
    return total / metrics.length;
  };

  const getPerformanceReport = () => {
    const avgRenderTime = getAverageRenderTime();
    const maxRenderTime = Math.max(...metrics.map(m => m.renderTime));
    const minRenderTime = Math.min(...metrics.map(m => m.renderTime));

    return {
      componentName,
      averageRenderTime: avgRenderTime,
      maxRenderTime,
      minRenderTime,
      totalRenders: metrics.length,
      performance: avgRenderTime < 16 ? 'Excellent' : avgRenderTime < 33 ? 'Good' : 'Needs Optimization'
    };
  };

  return {
    addMetric,
    getAverageRenderTime,
    getPerformanceReport,
    metrics
  };
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 200,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metric: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
});
