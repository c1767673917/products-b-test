import React, { useState, useEffect } from 'react';
import { useResponsiveGrid } from '../hooks/useResponsiveGrid';
import { useContainerDimensions } from '../hooks/useContainerDimensions';

const TestResponsiveGrid: React.FC = () => {
  const [panelWidth, setPanelWidth] = useState(400);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [renderCount, setRenderCount] = useState(0);

  const { containerRef, dimensions } = useContainerDimensions();

  // 计数器来监控重渲染
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  const gridOptions = React.useMemo(() => ({
    minCardWidth: viewMode === 'grid' ? 180 : 300,
    maxColumns: viewMode === 'grid' ? 6 : 1,
    gap: 16,
    padding: 64
  }), [viewMode]);

  const {
    columns,
    cardWidth,
    availableWidth,
    gridClass,
    gapClass,
    debug
  } = useResponsiveGrid(
    dimensions.width,
    panelWidth,
    isDetailPanelOpen,
    gridOptions
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">响应式网格测试页面</h1>
        
        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">控制面板</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                面板宽度: {panelWidth}px
              </label>
              <input
                type="range"
                min="300"
                max="800"
                value={panelWidth}
                onChange={(e) => setPanelWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                详情面板状态
              </label>
              <button
                onClick={() => setIsDetailPanelOpen(!isDetailPanelOpen)}
                className={`px-4 py-2 rounded-md ${
                  isDetailPanelOpen 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {isDetailPanelOpen ? '已打开' : '已关闭'}
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                视图模式
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'grid' | 'list')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="grid">网格</option>
                <option value="list">列表</option>
              </select>
            </div>
          </div>
        </div>

        {/* 调试信息 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">调试信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">渲染次数:</span>
              <span className={`ml-2 ${renderCount > 10 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                {renderCount}
              </span>
            </div>
            <div>
              <span className="font-medium">容器宽度:</span>
              <span className="ml-2">{dimensions.width}px</span>
            </div>
            <div>
              <span className="font-medium">可用宽度:</span>
              <span className="ml-2">{availableWidth}px</span>
            </div>
            <div>
              <span className="font-medium">列数:</span>
              <span className="ml-2">{columns}</span>
            </div>
            <div>
              <span className="font-medium">卡片宽度:</span>
              <span className="ml-2">{Math.round(cardWidth)}px</span>
            </div>
            <div>
              <span className="font-medium">网格类:</span>
              <span className="ml-2">{gridClass}</span>
            </div>
            <div>
              <span className="font-medium">间距类:</span>
              <span className="ml-2">{gapClass}</span>
            </div>
            <div>
              <span className="font-medium">面板状态:</span>
              <span className="ml-2">{isDetailPanelOpen ? '开' : '关'}</span>
            </div>
          </div>
          
          {renderCount > 20 && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
              <p className="text-red-800 font-medium">
                ⚠️ 警告：检测到过多重渲染 ({renderCount} 次)，可能存在无限循环！
              </p>
            </div>
          )}
        </div>

        {/* 测试网格 */}
        <div ref={containerRef} className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">测试网格</h3>
          
          <div className={`${gridClass} ${gapClass}`}>
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="bg-blue-100 border border-blue-200 rounded-lg p-4 text-center"
                style={{ minHeight: '120px' }}
              >
                <div className="text-blue-800 font-medium">卡片 {i + 1}</div>
                <div className="text-blue-600 text-sm mt-2">
                  {Math.round(cardWidth)}px 宽
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResponsiveGrid;
