import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemsPerPageOptions?: number[];
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  showItemsPerPageSelector?: boolean;
  showPageInfo?: boolean;
  showQuickJumper?: boolean;
  className?: string;
  disabled?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  itemsPerPageOptions = [20, 50, 100, 200, 1000], // 默认分页选项
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPageSelector = true,
  showPageInfo = true,
  showQuickJumper = false,
  className,
  disabled = false
}) => {
  // 计算显示范围
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // 检测是否为移动端
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 生成页码数组
  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = isMobile ? 5 : 7;

    if (totalPages <= maxVisiblePages) {
      // 如果总页数不多，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 复杂的页码显示逻辑
      const leftSiblingIndex = Math.max(currentPage - 1, 1);
      const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

      const shouldShowLeftDots = leftSiblingIndex > 2;
      const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

      const firstPageIndex = 1;
      const lastPageIndex = totalPages;

      if (!shouldShowLeftDots && shouldShowRightDots) {
        // 左侧不需要省略号，右侧需要
        const leftItemCount = 3 + 2;
        const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
        pages.push(...leftRange, 'ellipsis', totalPages);
      } else if (shouldShowLeftDots && !shouldShowRightDots) {
        // 左侧需要省略号，右侧不需要
        const rightItemCount = 3 + 2;
        const rightRange = Array.from(
          { length: rightItemCount },
          (_, i) => totalPages - rightItemCount + i + 1
        );
        pages.push(firstPageIndex, 'ellipsis', ...rightRange);
      } else if (shouldShowLeftDots && shouldShowRightDots) {
        // 两侧都需要省略号
        const middleRange = Array.from(
          { length: 3 },
          (_, i) => leftSiblingIndex + i
        );
        pages.push(firstPageIndex, 'ellipsis', ...middleRange, 'ellipsis', lastPageIndex);
      }
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  // 处理页码点击
  const handlePageClick = (page: number) => {
    if (page !== currentPage && !disabled) {
      onPageChange(page);
    }
  };

  // 处理每页显示数量变化
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    if (newItemsPerPage !== itemsPerPage && !disabled) {
      onItemsPerPageChange(newItemsPerPage);
      // 重置到第一页
      if (currentPage !== 1) {
        onPageChange(1);
      }
    }
  };

  // 只有在不显示选择器且没有分页需求时才隐藏组件
  if (!showItemsPerPageSelector && totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4", className)}>
      {/* 左侧：显示范围信息 */}
      {showPageInfo && (
        <div className="text-sm text-gray-600 order-2 sm:order-1">
          显示第 <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> 项，
          共 <span className="font-medium">{totalItems}</span> 项
        </div>
      )}

      {/* 中间：页码导航 - 只在有多页时显示 */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-1 order-1 sm:order-2">
          {/* 首页按钮 */}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1 || disabled}
            onClick={() => handlePageClick(1)}
            className="hidden sm:inline-flex"
            leftIcon={<ChevronDoubleLeftIcon className="w-4 h-4" />}
          >
            首页
          </Button>

          {/* 上一页按钮 */}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1 || disabled}
            onClick={() => handlePageClick(currentPage - 1)}
            leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">上一页</span>
          </Button>

          {/* 页码按钮 */}
          <div className="flex items-center space-x-1">
            <AnimatePresence>
              {pageNumbers.map((page, index) => (
                <motion.div
                  key={`${page}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  {page === 'ellipsis' ? (
                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10">
                      <EllipsisHorizontalIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  ) : (
                    <Button
                      variant={currentPage === page ? "primary" : "outline"}
                      size="sm"
                      disabled={disabled}
                      onClick={() => handlePageClick(page)}
                      className="w-8 h-8 sm:w-10 sm:h-10 p-0 text-xs sm:text-sm"
                    >
                      {page}
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 下一页按钮 */}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages || disabled}
            onClick={() => handlePageClick(currentPage + 1)}
            rightIcon={<ChevronRightIcon className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">下一页</span>
          </Button>

          {/* 末页按钮 */}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages || disabled}
            onClick={() => handlePageClick(totalPages)}
            className="hidden sm:inline-flex"
            rightIcon={<ChevronDoubleRightIcon className="w-4 h-4" />}
          >
            末页
          </Button>
        </div>
      )}

      {/* 右侧：每页显示数量选择器 */}
      {showItemsPerPageSelector && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 order-3">
          <span className="hidden sm:inline">每页显示</span>
          <span className="sm:hidden">每页</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            disabled={disabled}
            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option === 1000 ? '全部' : option}
              </option>
            ))}
          </select>
          <span>条</span>
        </div>
      )}
    </div>
  );
};

export default Pagination;
