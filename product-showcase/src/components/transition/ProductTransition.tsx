// 产品页面过渡动画组件
import React, { createContext, useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { Product } from '../../types/product';

interface TransitionContextType {
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
}

const TransitionContext = createContext<TransitionContextType | null>(null);

export const useProductTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useProductTransition must be used within ProductTransitionProvider');
  }
  return context;
};

interface ProductTransitionProviderProps {
  children: React.ReactNode;
}

export const ProductTransitionProvider: React.FC<ProductTransitionProviderProps> = ({ children }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  return (
    <TransitionContext.Provider
      value={{
        selectedProduct,
        setSelectedProduct,
        isTransitioning,
        setIsTransitioning,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
};

// 产品卡片过渡层组件
interface ProductTransitionLayerProps {
  product: Product;
  isActive: boolean;
  onComplete: () => void;
}

export const ProductTransitionLayer: React.FC<ProductTransitionLayerProps> = ({
  product,
  isActive,
  onComplete,
}) => {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
      onAnimationComplete={onComplete}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="bg-white rounded-lg shadow-2xl p-6 max-w-sm mx-4"
      >
        <div className="aspect-square w-full bg-gray-100 rounded-lg mb-4 overflow-hidden">
          {product.images.front && (
            <img
              src={product.images.front}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <h3 className="font-semibold text-gray-900 text-center">{product.name}</h3>
        <p className="text-center text-gray-500 text-sm mt-2">正在加载详情...</p>
      </motion.div>
    </motion.div>
  );
};