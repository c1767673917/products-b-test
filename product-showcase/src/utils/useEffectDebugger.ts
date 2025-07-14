import { useEffect, useRef } from 'react';

/**
 * 调试useEffect依赖变化的工具函数
 * 帮助识别导致无限重渲染的依赖项
 */
export const useEffectDebugger = (
  effectHook: () => void | (() => void),
  dependencies: any[],
  dependencyNames: string[] = []
) => {
  const previousDeps = useRef<any[]>(dependencies);
  const changedDeps = useRef<string[]>([]);

  useEffect(() => {
    const changes: string[] = [];
    
    if (previousDeps.current) {
      dependencies.forEach((dep, index) => {
        if (previousDeps.current[index] !== dep) {
          const depName = dependencyNames[index] || `dependency[${index}]`;
          changes.push(depName);
          console.warn(`🔄 useEffect依赖变化: ${depName}`, {
            previous: previousDeps.current[index],
            current: dep
          });
        }
      });
    }

    if (changes.length > 0) {
      changedDeps.current = changes;
      console.warn('🚨 useEffect重新执行，变化的依赖:', changes);
    }

    previousDeps.current = dependencies;
    
    return effectHook();
  }, dependencies);

  return changedDeps.current;
};

/**
 * 检查对象是否每次都重新创建
 */
export const useObjectStabilityChecker = (obj: any, name: string) => {
  const previousRef = useRef(obj);
  
  useEffect(() => {
    if (previousRef.current !== obj) {
      console.warn(`🔄 对象重新创建: ${name}`, {
        previous: previousRef.current,
        current: obj,
        isEqual: JSON.stringify(previousRef.current) === JSON.stringify(obj)
      });
      previousRef.current = obj;
    }
  });
};

/**
 * 检查函数是否每次都重新创建
 */
export const useFunctionStabilityChecker = (fn: Function, name: string) => {
  const previousRef = useRef(fn);
  
  useEffect(() => {
    if (previousRef.current !== fn) {
      console.warn(`🔄 函数重新创建: ${name}`);
      previousRef.current = fn;
    }
  });
};

/**
 * 性能监控Hook - 检测组件重渲染频率
 */
export const useRenderCounter = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  renderCount.current += 1;
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTime.current;
  
  if (renderCount.current > 1 && timeSinceLastRender < 100) {
    console.warn(`⚡ 快速重渲染警告: ${componentName}`, {
      renderCount: renderCount.current,
      timeSinceLastRender: `${timeSinceLastRender}ms`
    });
  }
  
  if (renderCount.current > 50) {
    console.error(`🚨 过度重渲染警告: ${componentName} 已渲染 ${renderCount.current} 次`);
  }
  
  lastRenderTime.current = currentTime;
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎨 ${componentName} 渲染次数: ${renderCount.current}`);
    }
  });
  
  return renderCount.current;
};
