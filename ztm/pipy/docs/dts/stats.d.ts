/**
 * Metric base interface.
 */
interface Metric {

  /**
   * Retrieves a sub-metric by labels.
   *
   * @param labels Label values in the order as they are defined at construction.
   * @returns A sub-metric labeled with the specified values.
   */
  withLabels(...labels: string[]): Metric;
}

/**
 * Counter metric.
 */
interface Counter extends Metric {

  /**
   * Sets the current value to zero.
   */
  zero(): void;

  /**
   * Increases the current value by a number.
   *
   * @param n Value to increase the counter by.
   */
  increase(n?: number): void;

  /**
   * Decreases the current value by a number.
   *
   * @param n Value to decrease the counter by.
   */
  decrease(n?: number): void;
}

interface CounterConstructor {

  /**
   * Creates an instance of _Counter_.
   *
   * @param name Name of the counter metric.
   * @param labelNames An array of label names.
   * @returns A _Counter_ object with the specified name and labels.
   */
  new(name: string, labelNames?: string[]): Counter;
}

/**
 * Gauge metric.
 */
interface Gauge extends Metric {

  /**
   * Sets the current value to zero.
   */
  zero(): void;

  /**
   * Sets the current value.
   *
   * @param n Value to set the gauge to.
   */
  set(n: number): void;

  /**
   * Increases the current value by a number.
   *
   * @param n Value to increase the gauge by.
   */
  increase(n?: number): void;

  /**
   * Decreases the current value by a number.
   *
   * @param n Value to decrease the gauge by.
   */
  decrease(n?: number): void;
}

interface GaugeConstructor {

  /**
   * Creates an instance of _Gauge_.
   *
   * @param name Name of the gauge metric.
   * @param labelNames An array of label names.
   * @returns A _Gauge_ object with the specified name and labels.
   */
  new(name: string, labelNames?: string[]): Gauge;
}

/**
 * Histogram metric.
 */
interface Histogram extends Metric {

  /**
   * Clears all buckets.
   */
  zero(): void;

  /**
   * Increases the bucket where a sample falls in.
   *
   * @param n A sample to add to the histogram.
   */
  observe(n: number): void;
}

interface HistogramConstructor {

  /**
   * Creates an instance of _Histogram_.
   *
   * @param name Name of the histogram metric.
   * @param labelNames An array of label names.
   * @returns A _Histogram_ object with the specified name and labels.
   */
  new(name: string, buckets: number[], labelNames?: string[]): Histogram;
}

interface Stats {
  Counter: CounterConstructor,
  Gauge: GaugeConstructor,
  Histogram: HistogramConstructor,
}

declare var stats: Stats;
