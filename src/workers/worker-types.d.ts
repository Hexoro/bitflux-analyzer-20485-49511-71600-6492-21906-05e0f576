// Type declarations for Vite worker imports
declare module '*?worker' {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}

declare module '@/workers/coreTests.worker?worker' {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}

declare module '@/workers/extendedTests.worker?worker' {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}
