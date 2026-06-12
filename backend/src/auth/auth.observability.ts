type AuthMetricName =
  | "login_success"
  | "login_failed"
  | "refresh_success"
  | "refresh_failed"
  | "banned_access_attempt"
  | "password_reset_request";

const authMetrics = new Map<AuthMetricName, number>();
let reporterStarted = false;

const metricNames: AuthMetricName[] = [
  "login_success",
  "login_failed",
  "refresh_success",
  "refresh_failed",
  "banned_access_attempt",
  "password_reset_request",
];

const incrementMetric = (name: AuthMetricName) => {
  authMetrics.set(name, (authMetrics.get(name) ?? 0) + 1);
};

export const recordAuthMetric = (
  name: AuthMetricName,
  metadata?: Record<string, unknown>,
) => {
  incrementMetric(name);

  if (name === "login_failed" || name === "refresh_failed" || name === "banned_access_attempt") {
    console.warn("[auth]", name, metadata ?? {});
    return;
  }

  if (name === "password_reset_request") {
    console.info("[auth]", name, metadata ?? {});
  }
};

export const startAuthMetricsReporter = () => {
  if (reporterStarted) {
    return;
  }

  reporterStarted = true;

  setInterval(() => {
    const snapshot = metricNames.reduce<Record<string, number>>((acc, key) => {
      acc[key] = authMetrics.get(key) ?? 0;
      return acc;
    }, {});

    console.info("[auth-metrics]", snapshot);
  }, 5 * 60 * 1000);
};

