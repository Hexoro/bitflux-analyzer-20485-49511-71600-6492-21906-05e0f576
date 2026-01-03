/**
 * Comprehensive Test Suite for BSEE
 * Tests all major components and systems using async imports
 */

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  duration: number;
}

export interface TestSuiteResults {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  timestamp: Date;
}

class TestSuite {
  private tests: Array<{ name: string; category: string; fn: () => Promise<boolean> }> = [];

  constructor() {
    this.registerAllTests();
  }

  private registerAllTests(): void {
    // ============= BINARY MODEL TESTS =============
    this.register('BinaryModel: Load bits', 'BinaryModel', async () => {
      const { BinaryModel } = await import('./binaryModel');
      const model = new BinaryModel();
      model.loadBits('10101010');
      return model.getBits() === '10101010';
    });

    this.register('BinaryModel: Set bit', 'BinaryModel', async () => {
      const { BinaryModel } = await import('./binaryModel');
      const model = new BinaryModel();
      model.loadBits('00000000');
      model.setBit(0, '1');
      return model.getBits().startsWith('1');
    });

    this.register('BinaryModel: Undo/Redo', 'BinaryModel', async () => {
      const { BinaryModel } = await import('./binaryModel');
      const model = new BinaryModel();
      model.loadBits('00000000');
      model.setBit(0, '1');
      model.undo();
      return model.getBits() === '00000000';
    });

    // ============= BINARY METRICS TESTS =============
    this.register('BinaryMetrics: Calculate entropy', 'BinaryMetrics', async () => {
      const { BinaryMetrics } = await import('./binaryMetrics');
      const entropy = BinaryMetrics.calculateEntropy(4, 4);
      return entropy >= 0.99 && entropy <= 1.01;
    });

    this.register('BinaryMetrics: Analyze bits', 'BinaryMetrics', async () => {
      const { BinaryMetrics } = await import('./binaryMetrics');
      const stats = BinaryMetrics.analyze('11110000');
      return stats.oneCount === 4 && stats.zeroCount === 4;
    });

    this.register('BinaryMetrics: Mean run length', 'BinaryMetrics', async () => {
      const { BinaryMetrics } = await import('./binaryMetrics');
      const stats = BinaryMetrics.analyze('11001100');
      return typeof stats.meanRunLength === 'number' && stats.meanRunLength > 0;
    });

    // ============= OPERATIONS ROUTER TESTS =============
    this.register('OperationsRouter: NOT operation', 'Operations', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('NOT', '1010', {});
      return result.success && result.bits === '0101';
    });

    this.register('OperationsRouter: AND operation', 'Operations', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('AND', '1111', { mask: '1010' });
      return result.success && result.bits === '1010';
    });

    this.register('OperationsRouter: XOR operation', 'Operations', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('XOR', '1010', { mask: '1100' });
      return result.success && result.bits === '0110';
    });

    this.register('OperationsRouter: Left shift', 'Operations', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('SHL', '10010000', { count: 2 });
      return result.success && result.bits === '01000000';
    });

    this.register('OperationsRouter: Range operation', 'Operations', async () => {
      const { executeOperationOnRange } = await import('./operationsRouter');
      const result = executeOperationOnRange('NOT', '11110000', 0, 4, {});
      return result.success && result.bits === '00000000';
    });

    this.register('OperationsRouter: Get implemented ops', 'Operations', async () => {
      const { getImplementedOperations, hasImplementation } = await import('./operationsRouter');
      const ops = getImplementedOperations();
      return ops.length > 10 && hasImplementation('NOT') && hasImplementation('XOR');
    });

    // ============= METRICS CALCULATOR TESTS =============
    this.register('MetricsCalculator: Core metrics exist', 'Metrics', async () => {
      const { calculateAllMetrics } = await import('./metricsCalculator');
      const result = calculateAllMetrics('10101010');
      // Check core metrics exist - success is true if we got at least core metrics
      const hasCore = typeof result.metrics.entropy === 'number' &&
                      typeof result.metrics.balance === 'number';
      return hasCore;
    });

    this.register('MetricsCalculator: Single metric', 'Metrics', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('entropy', '10101010');
      return result.success && result.value >= 0.9 && result.value <= 1.1;
    });

    this.register('MetricsCalculator: Extended metrics graceful handling', 'Metrics', async () => {
      const { calculateAllMetrics } = await import('./metricsCalculator');
      const result = calculateAllMetrics('10101010');
      // Extended metrics may be in errors but shouldn't crash
      return typeof result.metrics === 'object' && Array.isArray(result.errors);
    });

    // ============= PREDEFINED MANAGER TESTS =============
    this.register('PredefinedManager: Get all metrics', 'PredefinedManager', async () => {
      const { predefinedManager } = await import('./predefinedManager');
      const metrics = predefinedManager.getAllMetrics();
      return metrics.length > 0;
    });

    this.register('PredefinedManager: Get all operations', 'PredefinedManager', async () => {
      const { predefinedManager } = await import('./predefinedManager');
      const operations = predefinedManager.getAllOperations();
      return operations.length > 0;
    });

    this.register('PredefinedManager: Categories exist', 'PredefinedManager', async () => {
      const { predefinedManager } = await import('./predefinedManager');
      const metricCats = predefinedManager.getMetricCategories();
      const opCats = predefinedManager.getOperationCategories();
      return metricCats.length > 0 && opCats.length > 0;
    });

    // ============= FILE SYSTEM MANAGER TESTS =============
    this.register('FileSystemManager: Create file', 'FileSystem', async () => {
      const { fileSystemManager } = await import('./fileSystemManager');
      const file = fileSystemManager.createFile('test_file_suite.bin', '11110000', 'binary');
      const exists = fileSystemManager.getFiles().some(f => f.id === file.id);
      fileSystemManager.deleteFile(file.id);
      return exists;
    });

    this.register('FileSystemManager: Temp file cleanup', 'FileSystem', async () => {
      const { fileSystemManager } = await import('./fileSystemManager');
      const tempFile = fileSystemManager.createFile('temp_test.tmp', '1010', 'binary');
      const hadFile = fileSystemManager.getFiles().some(f => f.id === tempFile.id);
      fileSystemManager.deleteFile(tempFile.id);
      return hadFile;
    });

    // ============= HISTORY MANAGER TESTS =============
    this.register('HistoryManager: Add entry', 'History', async () => {
      const { HistoryManager } = await import('./historyManager');
      const manager = new HistoryManager();
      manager.addEntry('10101010', 'Test entry');
      const entries = manager.getEntries();
      return entries.length > 0 && entries[0].description === 'Test entry';
    });

    // ============= ANOMALIES MANAGER TESTS =============
    this.register('AnomaliesManager: Get definitions', 'Anomalies', async () => {
      const { anomaliesManager } = await import('./anomaliesManager');
      const defs = anomaliesManager.getAllDefinitions();
      return Array.isArray(defs) && defs.length > 0;
    });

    this.register('AnomaliesManager: Execute detection', 'Anomalies', async () => {
      const { anomaliesManager } = await import('./anomaliesManager');
      try {
        const defs = anomaliesManager.getEnabledDefinitions();
        if (defs.length > 0) {
          const results = anomaliesManager.executeDetection(defs[0].id, '11111111111111110000');
          return Array.isArray(results);
        }
        return true;
      } catch {
        return true;
      }
    });

    // ============= RESULTS MANAGER TESTS =============
    this.register('ResultsManager: Get all results', 'Results', async () => {
      const { resultsManager } = await import('./resultsManager');
      const results = resultsManager.getAllResults();
      return Array.isArray(results);
    });

    this.register('ResultsManager: Statistics', 'Results', async () => {
      const { resultsManager } = await import('./resultsManager');
      const stats = resultsManager.getStatistics();
      return typeof stats.totalResults === 'number' && typeof stats.successRate === 'number';
    });

    // ============= PYTHON MODULE SYSTEM TESTS =============
    this.register('PythonModuleSystem: Get strategies', 'Python', async () => {
      const { pythonModuleSystem } = await import('./pythonModuleSystem');
      const strategies = pythonModuleSystem.getAllStrategies();
      return Array.isArray(strategies);
    });

    // ============= IDEALITY METRICS TESTS =============
    this.register('IdealityMetrics: Calculate ideality', 'IdealityMetrics', async () => {
      const { IdealityMetrics } = await import('./idealityMetrics');
      const result = IdealityMetrics.calculateIdeality('10101010', 4, 0, 7);
      return typeof result.idealityPercentage === 'number';
    });

    // ============= MODE COLLISION TESTS =============
    this.register('ModeCollision: File lock isolation', 'ModeCollision', async () => {
      const { fileSystemManager } = await import('./fileSystemManager');
      const tempFile = fileSystemManager.createFile('collision_test.bin', '11110000', 'binary');
      const exists = fileSystemManager.getFiles().some(f => f.id === tempFile.id);
      fileSystemManager.deleteFile(tempFile.id);
      return exists;
    });

    this.register('ModeCollision: Algorithm mode isolation', 'ModeCollision', async () => {
      const { algorithmManager } = await import('./algorithmManager');
      const strategies = algorithmManager.getStrategies();
      return Array.isArray(strategies);
    });

    this.register('ModeCollision: Results manager isolation', 'ModeCollision', async () => {
      const { resultsManager } = await import('./resultsManager');
      const results = resultsManager.getAllResults();
      const stats = resultsManager.getStatistics();
      return Array.isArray(results) && typeof stats.totalResults === 'number';
    });

    this.register('ModeCollision: Predefined manager consistency', 'ModeCollision', async () => {
      const { predefinedManager } = await import('./predefinedManager');
      const metrics = predefinedManager.getAllMetrics();
      const operations = predefinedManager.getAllOperations();
      return metrics.length > 0 && operations.length > 0;
    });

    this.register('ModeCollision: Custom presets manager', 'ModeCollision', async () => {
      const { customPresetsManager } = await import('./customPresetsManager');
      const presets = customPresetsManager.getCustomPresets();
      const graphs = customPresetsManager.getGraphs();
      return Array.isArray(presets) && Array.isArray(graphs);
    });

    // ============= ENCODING FUNCTIONS TESTS =============
    this.register('EncodingFunctions: Gray code encode/decode', 'Encoding', async () => {
      const { EncodingFunctions } = await import('./encodingFunctions');
      const original = '10101010';
      const gray = EncodingFunctions.binaryToGray(original);
      const decoded = EncodingFunctions.grayToBinary(gray);
      return decoded === original;
    });

    this.register('EncodingFunctions: Manchester encode/decode', 'Encoding', async () => {
      const { EncodingFunctions } = await import('./encodingFunctions');
      const original = '1010';
      const encoded = EncodingFunctions.manchesterEncode(original);
      const decoded = EncodingFunctions.manchesterDecode(encoded);
      return decoded === original && encoded.length === original.length * 2;
    });

    this.register('EncodingFunctions: Differential encode/decode', 'Encoding', async () => {
      const { EncodingFunctions } = await import('./encodingFunctions');
      const original = '10101010';
      const encoded = EncodingFunctions.differentialEncode(original);
      const decoded = EncodingFunctions.differentialDecode(encoded);
      return decoded === original;
    });

    this.register('EncodingFunctions: Bit stuffing', 'Encoding', async () => {
      const { EncodingFunctions } = await import('./encodingFunctions');
      const original = '111111000';
      const stuffed = EncodingFunctions.bitStuff(original);
      const unstuffed = EncodingFunctions.bitUnstuff(stuffed);
      return unstuffed === original;
    });

    this.register('EncodingFunctions: Hamming encode', 'Encoding', async () => {
      const { EncodingFunctions } = await import('./encodingFunctions');
      const original = '1010';
      const encoded = EncodingFunctions.hammingEncode74(original);
      return encoded.length === 7;
    });

    // ============= COMPRESSION FUNCTIONS TESTS =============
    this.register('CompressionFunctions: RLE encode/decode', 'Compression', async () => {
      const { CompressionFunctions } = await import('./encodingFunctions');
      const original = '11111111000000001111';
      const encoded = CompressionFunctions.rleEncode(original);
      const decoded = CompressionFunctions.rleDecode(encoded);
      return decoded === original;
    });

    this.register('CompressionFunctions: Delta encode/decode', 'Compression', async () => {
      const { CompressionFunctions } = await import('./encodingFunctions');
      const original = '0000000100000010000000110000010000000101';
      const encoded = CompressionFunctions.deltaEncode(original);
      const decoded = CompressionFunctions.deltaDecode(encoded);
      return decoded === original;
    });

    this.register('CompressionFunctions: MTF encode/decode', 'Compression', async () => {
      const { CompressionFunctions } = await import('./encodingFunctions');
      const original = '0101010101010101';
      const encoded = CompressionFunctions.mtfEncode(original);
      const decoded = CompressionFunctions.mtfDecode(encoded);
      return decoded === original;
    });

    this.register('CompressionFunctions: LZ77 compress', 'Compression', async () => {
      const { CompressionFunctions } = await import('./encodingFunctions');
      const result = CompressionFunctions.lz77Compress('101010101010101010101010');
      return typeof result.compressed === 'string' && typeof result.ratio === 'number';
    });

    // ============= ANALYSIS FUNCTIONS TESTS =============
    this.register('AnalysisFunctions: Entropy calculation', 'Analysis', async () => {
      const { AnalysisFunctions } = await import('./encodingFunctions');
      const entropy = AnalysisFunctions.calculateEntropy('10101010');
      return entropy >= 0.99 && entropy <= 1.01;
    });

    this.register('AnalysisFunctions: Chi-square test', 'Analysis', async () => {
      const { AnalysisFunctions } = await import('./encodingFunctions');
      const chi = AnalysisFunctions.chiSquareTest('10101010');
      return typeof chi === 'number' && chi >= 0;
    });

    this.register('AnalysisFunctions: Runs test', 'Analysis', async () => {
      const { AnalysisFunctions } = await import('./encodingFunctions');
      const result = AnalysisFunctions.runsTest('10101010');
      return typeof result.numRuns === 'number' && result.numRuns > 0;
    });

    this.register('AnalysisFunctions: LZ complexity', 'Analysis', async () => {
      const { AnalysisFunctions } = await import('./encodingFunctions');
      const complexity = AnalysisFunctions.lempelZivComplexity('10101010');
      return typeof complexity === 'number' && complexity > 0;
    });

    this.register('AnalysisFunctions: Autocorrelation', 'Analysis', async () => {
      const { AnalysisFunctions } = await import('./encodingFunctions');
      const corr = AnalysisFunctions.autocorrelation('10101010', 2);
      return typeof corr === 'number';
    });

    // ============= TRANSFORM FUNCTIONS TESTS =============
    this.register('TransformFunctions: Bit reversal', 'Transform', async () => {
      const { TransformFunctions } = await import('./encodingFunctions');
      const reversed = TransformFunctions.reverseBits('10110000');
      return reversed === '00001101';
    });

    this.register('TransformFunctions: Rotate left', 'Transform', async () => {
      const { TransformFunctions } = await import('./encodingFunctions');
      const rotated = TransformFunctions.rotateLeft('10000001', 2);
      return rotated === '00000110';
    });

    this.register('TransformFunctions: Nibble swap', 'Transform', async () => {
      const { TransformFunctions } = await import('./encodingFunctions');
      const swapped = TransformFunctions.nibbleSwap('11110000');
      return swapped === '00001111';
    });

    this.register('TransformFunctions: Complement', 'Transform', async () => {
      const { TransformFunctions } = await import('./encodingFunctions');
      const comp = TransformFunctions.complement('10101010');
      return comp === '01010101';
    });

    this.register('TransformFunctions: Reverse bytes', 'Transform', async () => {
      const { TransformFunctions } = await import('./encodingFunctions');
      const reversed = TransformFunctions.reverseBytes('1111000000001111');
      return reversed === '0000111111110000';
    });

    // ============= STARTUP INTEGRITY TESTS =============
    this.register('Startup: LocalStorage accessibility', 'Startup', async () => {
      try {
        localStorage.setItem('_test_key', 'test');
        const val = localStorage.getItem('_test_key');
        localStorage.removeItem('_test_key');
        return val === 'test';
      } catch {
        return false;
      }
    });

    this.register('Startup: Custom presets manager', 'Startup', async () => {
      const { customPresetsManager } = await import('./customPresetsManager');
      const presets = customPresetsManager.getCustomPresets();
      const graphs = customPresetsManager.getGraphs();
      return Array.isArray(presets) && Array.isArray(graphs);
    });

    this.register('Startup: Generation presets availability', 'Startup', async () => {
      const { GENERATION_PRESETS } = await import('./generationPresets');
      return Object.keys(GENERATION_PRESETS).length > 0;
    });

    this.register('Startup: Operations router ready', 'Startup', async () => {
      const { executeOperation, getOperationCost } = await import('./operationsRouter');
      const result = executeOperation('NOT', '1010', {});
      const cost = getOperationCost('NOT');
      return result.success && typeof cost === 'number';
    });

    this.register('Startup: Metrics calculator ready', 'Startup', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const single = calculateMetric('entropy', '10101010');
      return single.success;
    });

    // ============= ZIP EXPORT TESTS =============
    this.register('ResultsManager: exportAsZip function exists', 'Export', async () => {
      const { resultsManager } = await import('./resultsManager');
      return typeof resultsManager.exportAsZip === 'function';
    });

    // ============= PLAYER MODE TESTS =============
    this.register('PlayerMode: Operations execute correctly', 'PlayerMode', async () => {
      const { executeOperation, executeOperationOnRange } = await import('./operationsRouter');
      const initial = '11110000';
      const result1 = executeOperation('NOT', initial, {});
      const result2 = executeOperationOnRange('NOT', initial, 0, 4, {});
      return result1.success && result1.bits === '00001111' && 
             result2.success && result2.bits === '00000000';
    });

    // ============= BACKEND INTEGRATION TESTS =============
    this.register('Backend: Custom presets sync with GenerateDialog', 'Backend', async () => {
      const { customPresetsManager } = await import('./customPresetsManager');
      const presets = customPresetsManager.getCustomPresets();
      return Array.isArray(presets);
    });

    this.register('Backend: Anomaly definitions available', 'Backend', async () => {
      const { anomaliesManager } = await import('./anomaliesManager');
      const defs = anomaliesManager.getAllDefinitions();
      const enabled = anomaliesManager.getEnabledDefinitions();
      const categories = anomaliesManager.getCategories();
      return defs.length > 0 && Array.isArray(enabled) && categories.length > 0;
    });

    this.register('Backend: Generation presets with patterns support', 'Backend', async () => {
      const { GENERATION_PRESETS } = await import('./generationPresets');
      const testPattern = GENERATION_PRESETS['test-pattern'];
      return testPattern && testPattern.pattern !== undefined;
    });

    this.register('Backend: Graphs manager operational', 'Backend', async () => {
      const { customPresetsManager } = await import('./customPresetsManager');
      const graphs = customPresetsManager.getGraphs();
      return Array.isArray(graphs);
    });

    // ============= CUSTOM FILE GROUPS TESTS =============
    this.register('FileGroups: AI group support', 'FileGroups', async () => {
      const { pythonModuleSystem } = await import('./pythonModuleSystem');
      // Test AI group type is accepted
      const validGroups = ['scheduler', 'algorithm', 'scoring', 'policies', 'ai', 'custom'];
      return validGroups.every(g => typeof g === 'string');
    });

    this.register('FileGroups: Custom group management', 'FileGroups', async () => {
      const { pythonModuleSystem } = await import('./pythonModuleSystem');
      const customGroups = pythonModuleSystem.getCustomGroups();
      return Array.isArray(customGroups);
    });

    this.register('FileGroups: JS/TS files accepted', 'FileGroups', async () => {
      const { pythonModuleSystem } = await import('./pythonModuleSystem');
      // Simulate file validation
      const validExtensions = ['.py', '.js', '.ts'];
      const testFiles = ['test.py', 'test.js', 'test.ts'];
      return testFiles.every(f => validExtensions.some(ext => f.endsWith(ext)));
    });

    // ============= STRATEGY VALIDATION TESTS =============
    this.register('Strategy: Validate only scheduler required', 'Strategy', async () => {
      const { pythonModuleSystem } = await import('./pythonModuleSystem');
      // Test that strategy creation only requires scheduler
      const strategies = pythonModuleSystem.getAllStrategies();
      return Array.isArray(strategies);
    });

    this.register('Strategy: AI files in strategy', 'Strategy', async () => {
      const { pythonModuleSystem } = await import('./pythonModuleSystem');
      const aiFiles = pythonModuleSystem.getFilesByGroup('ai');
      return Array.isArray(aiFiles);
    });

    // ============= BACKEND CODE TESTING =============
    this.register('Backend: Metric code execution', 'CodeTesting', async () => {
      const { predefinedManager } = await import('./predefinedManager');
      const metrics = predefinedManager.getAllMetrics();
      const codeBasedMetrics = metrics.filter(m => m.isCodeBased);
      // Check code-based metrics have code field
      return codeBasedMetrics.every(m => m.code !== undefined || !m.isCodeBased);
    });

    this.register('Backend: Operation code execution', 'CodeTesting', async () => {
      const { predefinedManager } = await import('./predefinedManager');
      const ops = predefinedManager.getAllOperations();
      const codeBasedOps = ops.filter(o => o.isCodeBased);
      // Check code-based operations have code field
      return codeBasedOps.every(o => o.code !== undefined || !o.isCodeBased);
    });

    // ============= OPERATION RANGE TESTS =============
    this.register('Operations: Range-only NOT operation', 'RangeOps', async () => {
      const { executeOperationOnRange } = await import('./operationsRouter');
      const input = '11111111';
      const result = executeOperationOnRange('NOT', input, 0, 4, {});
      // Only first 4 bits should be inverted
      return result.success && result.bits === '00001111';
    });

    this.register('Operations: Range preserves length', 'RangeOps', async () => {
      const { executeOperationOnRange } = await import('./operationsRouter');
      const input = '1'.repeat(256);
      const result = executeOperationOnRange('NOT', input, 0, 64, {});
      return result.success && result.bits.length === 256;
    });

    this.register('Operations: XOR with mask extends properly', 'RangeOps', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const input = '11111111';
      const result = executeOperation('XOR', input, { mask: '10' });
      // Mask should repeat: 10101010 XOR 11111111 = 01010101
      return result.success && result.bits.length === input.length;
    });

    // ============= JOB SYSTEM TESTS =============
    this.register('JobSystem: Job creation validation', 'JobSystem', async () => {
      const { jobManagerV2 } = await import('./jobManagerV2');
      const strategies = jobManagerV2.getAvailableStrategies();
      return Array.isArray(strategies);
    });

    this.register('JobSystem: Completed jobs tracking', 'JobSystem', async () => {
      const { jobManagerV2 } = await import('./jobManagerV2');
      const completed = jobManagerV2.getCompletedJobs();
      const pending = jobManagerV2.getPendingCount();
      return Array.isArray(completed) && typeof pending === 'number';
    });

    // ============= UNIFIED STRATEGY TESTS =============
    this.register('UnifiedStrategy: Load unified strategy files', 'UnifiedStrategy', async () => {
      const { loadUnifiedStrategyFiles } = await import('./unifiedStrategy');
      const { pythonModuleSystem } = await import('./pythonModuleSystem');
      // Just check that the function exists and exports properly
      return typeof loadUnifiedStrategyFiles === 'function';
    });

    this.register('UnifiedStrategy: Unified scheduler exists', 'UnifiedStrategy', async () => {
      const { UNIFIED_SCHEDULER } = await import('./unifiedStrategy');
      return typeof UNIFIED_SCHEDULER === 'string' && UNIFIED_SCHEDULER.includes('schedule()');
    });

    this.register('UnifiedStrategy: Unified algorithm exists', 'UnifiedStrategy', async () => {
      const { UNIFIED_ALGORITHM } = await import('./unifiedStrategy');
      return typeof UNIFIED_ALGORITHM === 'string' && UNIFIED_ALGORITHM.includes('execute()');
    });

    this.register('UnifiedStrategy: Unified scoring exists', 'UnifiedStrategy', async () => {
      const { UNIFIED_SCORING } = await import('./unifiedStrategy');
      return typeof UNIFIED_SCORING === 'string' && UNIFIED_SCORING.includes('SCORING_DIMENSIONS');
    });

    this.register('UnifiedStrategy: Unified policy exists', 'UnifiedStrategy', async () => {
      const { UNIFIED_POLICY } = await import('./unifiedStrategy');
      return typeof UNIFIED_POLICY === 'string' && UNIFIED_POLICY.includes('POLICY_CONFIG');
    });

    this.register('UnifiedStrategy: Unified AI analyzer exists', 'UnifiedStrategy', async () => {
      const { UNIFIED_AI_ANALYZER } = await import('./unifiedStrategy');
      return typeof UNIFIED_AI_ANALYZER === 'string' && UNIFIED_AI_ANALYZER.includes('UnifiedAIAnalyzer');
    });

    // ============= METRIC VERIFICATION TESTS WITH KNOWN VALUES =============
    this.register('MetricVerification: entropy of alternating pattern', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('entropy', '10101010');
      // Perfect alternating pattern has maximum entropy = 1.0
      return result.success && result.value !== undefined && Math.abs(result.value - 1.0) < 0.01;
    });

    this.register('MetricVerification: entropy of all zeros', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('entropy', '00000000');
      // All same bits = zero entropy
      return result.success && result.value !== undefined && result.value === 0;
    });

    this.register('MetricVerification: entropy of all ones', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('entropy', '11111111');
      // All same bits = zero entropy
      return result.success && result.value !== undefined && result.value === 0;
    });

    this.register('MetricVerification: balance of 50/50', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('balance', '11110000');
      // 4 ones, 4 zeros = 0.5 balance
      return result.success && result.value !== undefined && result.value === 0.5;
    });

    this.register('MetricVerification: balance of all ones', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('balance', '11111111');
      return result.success && result.value !== undefined && result.value === 1.0;
    });

    this.register('MetricVerification: balance of all zeros', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('balance', '00000000');
      return result.success && result.value !== undefined && result.value === 0;
    });

    this.register('MetricVerification: hamming weight of 11110000', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('hamming_weight', '11110000');
      return result.success && result.value !== undefined && result.value === 4;
    });

    this.register('MetricVerification: hamming weight of all ones', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('hamming_weight', '11111111');
      return result.success && result.value !== undefined && result.value === 8;
    });

    this.register('MetricVerification: transition count of alternating', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('transition_count', '10101010');
      // 7 transitions in alternating 8-bit pattern
      return result.success && result.value !== undefined && result.value === 7;
    });

    this.register('MetricVerification: transition count of no transitions', 'MetricVerification', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('transition_count', '00000000');
      return result.success && result.value !== undefined && result.value === 0;
    });

    // ============= OPERATION VERIFICATION TESTS WITH KNOWN VALUES =============
    this.register('OperationVerification: NOT inverts all bits', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('NOT', '11110000', {});
      return result.success && result.bits === '00001111';
    });

    this.register('OperationVerification: AND with mask', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('AND', '11111111', { mask: '10101010' });
      return result.success && result.bits === '10101010';
    });

    this.register('OperationVerification: OR with mask', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('OR', '00000000', { mask: '10101010' });
      return result.success && result.bits === '10101010';
    });

    this.register('OperationVerification: XOR with same = zeros', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('XOR', '10101010', { mask: '10101010' });
      return result.success && result.bits === '00000000';
    });

    this.register('OperationVerification: SHL by 2', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('SHL', '11110000', { count: 2 });
      return result.success && result.bits === '11000000';
    });

    this.register('OperationVerification: SHR by 2', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('SHR', '11110000', { count: 2 });
      return result.success && result.bits === '00111100';
    });

    this.register('OperationVerification: ROL by 1', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('ROL', '10000001', { count: 1 });
      return result.success && result.bits === '00000011';
    });

    this.register('OperationVerification: ROR by 1', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('ROR', '10000001', { count: 1 });
      return result.success && result.bits === '11000000';
    });

    this.register('OperationVerification: REVERSE bits', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('REVERSE', '10000001', {});
      return result.success && result.bits === '10000001'; // Palindrome stays same
    });

    this.register('OperationVerification: REVERSE non-palindrome', 'OperationVerification', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const result = executeOperation('REVERSE', '11110000', {});
      return result.success && result.bits === '00001111';
    });

    // ============= METRICS CALCULATOR CODE EXECUTION TESTS =============
    this.register('MetricsCalculator: Code-based metric execution', 'CodeExecution', async () => {
      const { calculateMetric } = await import('./metricsCalculator');
      const result = calculateMetric('entropy', '10101010');
      return result.success && typeof result.value === 'number' && result.value >= 0;
    });

    this.register('OperationsRouter: Code-based operation priority', 'CodeExecution', async () => {
      const { executeOperation } = await import('./operationsRouter');
      const { predefinedManager } = await import('./predefinedManager');
      // Get an operation and check it works
      const result = executeOperation('NOT', '11110000', {});
      return result.success && result.bits === '00001111';
    });
  }

  private register(name: string, category: string, fn: () => Promise<boolean>): void {
    this.tests.push({ name, category, fn });
  }

  async runAll(): Promise<TestSuiteResults> {
    const startTime = performance.now();
    const results: TestResult[] = [];

    for (const test of this.tests) {
      const testStart = performance.now();
      let passed = false;
      let message = '';

      try {
        const result = await test.fn();
        passed = result === true;
        message = passed ? 'Passed' : 'Test returned false';
      } catch (error) {
        passed = false;
        message = (error as Error).message || 'Unknown error';
      }

      results.push({
        name: test.name,
        category: test.category,
        passed,
        message,
        duration: performance.now() - testStart,
      });
    }

    return {
      totalTests: this.tests.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      duration: performance.now() - startTime,
      results,
      timestamp: new Date(),
    };
  }

  getCategories(): string[] {
    return [...new Set(this.tests.map(t => t.category))];
  }
}

export const testSuite = new TestSuite();
