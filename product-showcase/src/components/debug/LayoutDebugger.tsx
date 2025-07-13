import React from 'react';
import { motion } from 'framer-motion';

interface LayoutDebuggerProps {
  containerWidth: number;
  panelWidth: number;
  isDetailPanelOpen: boolean;
  availableWidth: number;
  columns: number;
  cardWidth: number;
  gridClass: string;
  show?: boolean;
}

const LayoutDebugger: React.FC<LayoutDebuggerProps> = ({
  containerWidth,
  panelWidth,
  isDetailPanelOpen,
  availableWidth,
  columns,
  cardWidth,
  gridClass,
  show = false
}) => {
  if (!show) return null;

  const reductionAmount = isDetailPanelOpen ? panelWidth + 32 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-20 right-4 bg-black/90 text-white text-xs p-4 rounded-lg z-50 font-mono max-w-sm"
    >
      <h4 className="font-bold mb-3 text-yellow-400">布局调试信息</h4>
      <div className="space-y-2">
        <div className="text-gray-300">--- 尺寸信息 ---</div>
        <div>原始容器宽度: <span className="text-blue-300">{containerWidth.toFixed(0)}px</span></div>
        <div>详情面板宽度: <span className="text-green-300">{panelWidth}px</span></div>
        <div>面板状态: <span className="text-purple-300">{isDetailPanelOpen ? '打开' : '关闭'}</span></div>
        <div>减少空间: <span className="text-red-300">{reductionAmount}px</span></div>
        <div>有效容器宽度: <span className="text-orange-300">{availableWidth.toFixed(0)}px</span></div>
        
        <div className="text-gray-300 mt-3">--- 网格信息 ---</div>
        <div>网格列数: <span className="text-red-300">{columns}</span></div>
        <div>单卡片宽度: <span className="text-cyan-300">{cardWidth.toFixed(0)}px</span></div>
        <div>CSS类名: <span className="text-gray-300 break-all">{gridClass}</span></div>
        
        <div className="text-gray-300 mt-3">--- 计算公式 ---</div>
        <div className="text-xs text-gray-400">
          有效宽度 = {containerWidth.toFixed(0)} - {reductionAmount} = {availableWidth.toFixed(0)}px
        </div>
      </div>
    </motion.div>
  );
};

export default LayoutDebugger;