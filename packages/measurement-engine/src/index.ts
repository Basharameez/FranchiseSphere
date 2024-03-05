export interface GradingRule {
  type: "fixed" | "perSize" | "manual";
  increment?: number; // for fixed
  increments?: number[]; // for perSize (deltas from base size, index-matched)
  manualValues?: Record<string, number>; // for manual size lookup
  baseSizeIndex: number; // index of base size in size scale
}

export interface GradedResult {
  value: number;
  trace: {
    formulaVersion: string;
    ruleType: string;
    baseValue: number;
    sizeIndex: number;
    offsetFromBase: number;
    calculationSteps: string;
  };
}

export interface ValidationResult {
  deviation: number;
  result: "Pass" | "Fail";
  deviationPercent: number;
}

export function calculateGradedValue(
  baseValue: number,
  rule: GradingRule,
  sizeIndex: number,
  sizeLabel: string
): GradedResult {
  const offset = sizeIndex - rule.baseSizeIndex;
  let value = baseValue;
  let steps = "";

  if (rule.type === "fixed") {
    const inc = rule.increment || 0;
    value = baseValue + inc * offset;
    steps = `baseValue (${baseValue}) + increment (${inc}) * offset (${offset}) = ${value}`;
  } else if (rule.type === "perSize") {
    const incs = rule.increments || [];
    // Sum deltas up to the selected offset
    if (offset > 0) {
      let sum = 0;
      for (let i = 0; i < offset; i++) {
        sum += incs[rule.baseSizeIndex + i] || 0;
      }
      value = baseValue + sum;
      steps = `baseValue (${baseValue}) + sum of positive increments (${sum}) = ${value}`;
    } else if (offset < 0) {
      let sum = 0;
      for (let i = -1; i >= offset; i--) {
        sum += incs[rule.baseSizeIndex + i + 1] || 0;
      }
      value = baseValue - sum;
      steps = `baseValue (${baseValue}) - sum of negative increments (${sum}) = ${value}`;
    } else {
      steps = `baseSize match: baseValue = ${baseValue}`;
    }
  } else if (rule.type === "manual") {
    if (rule.manualValues && sizeLabel in rule.manualValues) {
      value = rule.manualValues[sizeLabel]!;
      steps = `Manual value lookup: size ${sizeLabel} = ${value}`;
    } else {
      steps = `Manual lookup failed for ${sizeLabel}. Using baseValue = ${baseValue}`;
    }
  }

  // Round to 2 decimal places
  value = Math.round(value * 100) / 100;

  return {
    value,
    trace: {
      formulaVersion: "1.0.0",
      ruleType: rule.type,
      baseValue,
      sizeIndex,
      offsetFromBase: offset,
      calculationSteps: steps,
    },
  };
}

export function validateSampleMeasurement(expected: number, tolerance: number, actual: number): ValidationResult {
  const deviation = Math.round((actual - expected) * 100) / 100;
  const passed = Math.abs(deviation) <= tolerance;
  const deviationPercent = expected !== 0 ? Math.round((deviation / expected) * 10000) / 100 : 0;

  return {
    deviation,
    result: passed ? "Pass" : "Fail",
    deviationPercent,
  };
}

export function convertUnit(val: number, from: "in" | "cm", to: "in" | "cm"): number {
  if (from === to) return val;
  if (from === "in" && to === "cm") {
    return Math.round(val * 2.54 * 100) / 100;
  }
  if (from === "cm" && to === "in") {
    return Math.round((val / 2.54) * 100) / 100;
  }
  return val;
}
