/**
 * OpenTelemetry Instrumentation
 * MUST be imported before any other code
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.bingeo-obs.svc.cluster.local:4317';
const serviceName = process.env.OTEL_SERVICE_NAME || 'identity-service';

console.log(`[OTel] Initializing for ${serviceName} -> ${otlpEndpoint}`);

const sdk = new NodeSDK({
  serviceName,
  traceExporter: new OTLPTraceExporter({
    url: otlpEndpoint,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: otlpEndpoint,
    }),
    exportIntervalMillis: 10000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
console.log('[OTel] SDK started');

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});

export { sdk };
