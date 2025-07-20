import { useState, useEffect, useMemo } from 'react';

interface ResponsiveGridOptions {
  minCardWidth?: number;
  gap?: number;
  containerPadding?: number;
}

const DEFAULT_OPTIONS: Required<ResponsiveGridOptions> = {
  minCardWidth: 180,
  gap: 16,
  containerPadding: 0, // Padding is handled by the parent component now
};

/**
 * A simplified and robust hook for calculating responsive grid properties.
 * It determines the number of columns based on the container's width.
 *
 * @param containerWidth The current width of the grid container.
 * @param options Configuration for minCardWidth and gap.
 * @returns The calculated number of columns.
 */
export const useRealTimeResponsiveGrid = (
  containerWidth: number,
  options: ResponsiveGridOptions = {}
) => {
  const [columns, setColumns] = useState(1);

  const config = useMemo(() => {
    return { ...DEFAULT_OPTIONS, ...options };
  }, [options.minCardWidth, options.gap, options.containerPadding]);

  useEffect(() => {
    if (containerWidth <= 0) {
      setColumns(1);
      return;
    }

    const availableWidth = containerWidth - config.containerPadding;
    const newColumns = Math.floor(
      (availableWidth + config.gap) / (config.minCardWidth + config.gap)
    );

    // Ensure at least one column
    const calculatedColumns = Math.max(1, newColumns);
    
    setColumns(calculatedColumns);

  }, [containerWidth, config]);

  return { columns };
};

export default useRealTimeResponsiveGrid;
