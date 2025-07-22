import { DataTransformService, ChangeDetectionResult } from '../services/dataTransformService';

describe('DataTransformService - Change Detection', () => {
  let dataTransformService: DataTransformService;

  // Helper function to create base product data
  const createBaseProduct = (overrides: any = {}) => {
    return {
      productId: 'rec12345abcd',
      name: '测试产品',
      internalId: '98765',
      sequence: 'SEQ001',
      category: {
        primary: '食品饮料',
        secondary: '休闲零食'
      },
      price: {
        normal: 29.99,
        discount: 25.99
      },
      origin: {
        country: '中国',
        province: '广东省'
      },
      platform: '天猫',
      specification: '500g/包',
      flavor: '原味',
      manufacturer: '测试厂商',
      collectTime: new Date('2025-01-15T10:30:00Z'),
      images: {
        front: ['front_token_1'],
        back: ['back_token_1'],
        label: ['label_token_1'],
        package: ['package_token_1'],
        gift: ['gift_token_1']
      },
      ...overrides
    };
  };

  beforeEach(() => {
    dataTransformService = new DataTransformService();
  });

  describe('Basic Change Detection', () => {
    it('should detect no changes for identical data', () => {
      const product1 = createBaseProduct();
      const product2 = createBaseProduct();

      const result = dataTransformService.detectChanges(product2, product1);

      expect(result.hasChanges).toBe(false);
      expect(result.changedFields).toHaveLength(0);
      expect(result.changeDetails).toHaveLength(0);
    });

    it('should detect changes in product name', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        name: '修改后的产品名称'
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('name');
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          oldValue: '测试产品',
          newValue: '修改后的产品名称',
          changeType: 'modified'
        })
      ]));
    });

    it('should detect changes in category fields', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        category: {
          primary: '个护美妆',
          secondary: '护肤品类'
        }
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('category.primary');
      expect(result.changedFields).toContain('category.secondary');
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'category.primary',
          oldValue: '食品饮料',
          newValue: '个护美妆',
          changeType: 'modified'
        }),
        expect.objectContaining({
          field: 'category.secondary',
          oldValue: '休闲零食',
          newValue: '护肤品类',
          changeType: 'modified'
        })
      ]));
    });

    it('should detect changes in price fields', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        price: {
          normal: 35.99,
          discount: 29.99
        }
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('price.normal');
      expect(result.changedFields).toContain('price.discount');
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'price.normal',
          oldValue: 29.99,
          newValue: 35.99,
          changeType: 'modified'
        }),
        expect.objectContaining({
          field: 'price.discount',
          oldValue: 25.99,
          newValue: 29.99,
          changeType: 'modified'
        })
      ]));
    });

    it('should detect changes in platform field', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        platform: '京东'
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('platform');
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'platform',
          oldValue: '天猫',
          newValue: '京东',
          changeType: 'modified'
        })
      ]));
    });

    it('should detect changes in specification, flavor, and manufacturer', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        specification: '1000g/包',
        flavor: '辣味',
        manufacturer: '新厂商'
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('specification');
      expect(result.changedFields).toContain('flavor');
      expect(result.changedFields).toContain('manufacturer');
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'specification',
          oldValue: '500g/包',
          newValue: '1000g/包',
          changeType: 'modified'
        }),
        expect.objectContaining({
          field: 'flavor',
          oldValue: '原味',
          newValue: '辣味',
          changeType: 'modified'
        }),
        expect.objectContaining({
          field: 'manufacturer',
          oldValue: '测试厂商',
          newValue: '新厂商',
          changeType: 'modified'
        })
      ]));
    });
  });

  describe('Image Changes Detection', () => {
    it('should detect changes in front image', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        images: {
          ...oldProduct.images,
          front: ['new_front_token_1']
        }
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('images.front');
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'images.front',
          oldValue: ['front_token_1'],
          newValue: ['new_front_token_1'],
          changeType: 'modified'
        })
      ]));
    });

    it('should detect changes in multiple image fields', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        images: {
          front: ['new_front_token_1'],
          back: ['new_back_token_1'],
          label: ['label_token_1'], // unchanged
          package: ['new_package_token_1'],
          gift: ['gift_token_1'] // unchanged
        }
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('images.front');
      expect(result.changedFields).toContain('images.back');
      expect(result.changedFields).toContain('images.package');
      expect(result.changedFields).not.toContain('images.label');
      expect(result.changedFields).not.toContain('images.gift');
    });

    it('should handle missing image arrays', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        images: {
          front: ['front_token_1'],
          back: ['back_token_1'],
          // label removed
          package: ['package_token_1'],
          gift: ['gift_token_1']
        }
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('images.label');
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'images.label',
          oldValue: ['label_token_1'],
          newValue: undefined,
          changeType: 'removed'
        })
      ]));
    });
  });

  describe('Change Type Detection', () => {
    it('should detect "added" change type for new fields', () => {
      const oldProduct = createBaseProduct({
        specification: undefined // field not present
      });
      const newProduct = createBaseProduct({
        specification: '500g/包' // field added
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'specification',
          oldValue: undefined,
          newValue: '500g/包',
          changeType: 'added'
        })
      ]));
    });

    it('should detect "removed" change type for deleted fields', () => {
      const oldProduct = createBaseProduct({
        specification: '500g/包'
      });
      const newProduct = createBaseProduct({
        specification: null // field removed
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'specification',
          oldValue: '500g/包',
          newValue: null,
          changeType: 'removed'
        })
      ]));
    });

    it('should detect "modified" change type for changed fields', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        flavor: '辣味' // field modified
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'flavor',
          oldValue: '原味',
          newValue: '辣味',
          changeType: 'modified'
        })
      ]));
    });
  });

  describe('Collection Time Change Detection', () => {
    it('should detect changes based on collection time even without field changes', () => {
      const oldProduct = createBaseProduct({
        collectTime: new Date('2025-01-15T10:30:00Z')
      });
      const newProduct = createBaseProduct({
        collectTime: new Date('2025-01-15T12:00:00Z') // newer time
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
    });

    it('should not detect changes for older collection time', () => {
      const oldProduct = createBaseProduct({
        collectTime: new Date('2025-01-15T12:00:00Z')
      });
      const newProduct = createBaseProduct({
        collectTime: new Date('2025-01-15T10:30:00Z') // older time
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(false);
    });

    it('should not detect changes for same collection time', () => {
      const oldProduct = createBaseProduct({
        collectTime: new Date('2025-01-15T10:30:00Z')
      });
      const newProduct = createBaseProduct({
        collectTime: new Date('2025-01-15T10:30:00Z') // same time
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(false);
    });
  });

  describe('Complex Change Scenarios', () => {
    it('should handle multiple simultaneous changes', () => {
      const oldProduct = createBaseProduct();
      const newProduct = createBaseProduct({
        name: '新产品名称',
        category: {
          primary: '个护美妆',
          secondary: '护肤品类'
        },
        price: {
          normal: 39.99,
          discount: 34.99
        },
        platform: '京东',
        specification: '1000g/包',
        manufacturer: '新厂商',
        images: {
          front: ['new_front_1', 'new_front_2'],
          back: ['new_back_1'],
          label: ['label_token_1'], // unchanged
          package: ['new_package_1'],
          gift: ['gift_token_1'] // unchanged
        }
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields.length).toBeGreaterThan(5);
      expect(result.changeDetails.length).toBeGreaterThan(5);
      
      // Verify some key changes
      expect(result.changedFields).toContain('name');
      expect(result.changedFields).toContain('category.primary');
      expect(result.changedFields).toContain('price.normal');
      expect(result.changedFields).toContain('platform');
      expect(result.changedFields).toContain('images.front');
    });

    it('should handle null and undefined values correctly', () => {
      const oldProduct = createBaseProduct({
        specification: null,
        flavor: undefined
      });
      const newProduct = createBaseProduct({
        specification: '500g/包',
        flavor: '原味'
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changeDetails).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'specification',
          oldValue: null,
          newValue: '500g/包',
          changeType: 'added'
        }),
        expect.objectContaining({
          field: 'flavor',
          oldValue: undefined,
          newValue: '原味',
          changeType: 'added'
        })
      ]));
    });

    it('should handle array changes correctly', () => {
      const oldProduct = createBaseProduct({
        images: {
          front: ['token1', 'token2'],
          back: ['token3'],
          label: [],
          package: ['token4', 'token5', 'token6'],
          gift: ['token7']
        }
      });
      const newProduct = createBaseProduct({
        images: {
          front: ['token1', 'token8'], // one changed
          back: ['token3'], // no change
          label: ['token9'], // added items
          package: ['token4'], // removed items
          gift: [] // all removed
        }
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('images.front');
      expect(result.changedFields).not.toContain('images.back');
      expect(result.changedFields).toContain('images.label');
      expect(result.changedFields).toContain('images.package');
      expect(result.changedFields).toContain('images.gift');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', () => {
      const baseProduct = createBaseProduct();
      const modifiedProduct = createBaseProduct({
        name: '修改后的产品'
      });

      const startTime = Date.now();
      
      // Run change detection multiple times
      for (let i = 0; i < 100; i++) {
        dataTransformService.detectChanges(modifiedProduct, baseProduct);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 comparisons within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle missing nested properties gracefully', () => {
      const oldProduct = {
        productId: 'rec12345',
        name: '测试产品'
        // Missing category, price, images objects
      };
      const newProduct = createBaseProduct();

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields.length).toBeGreaterThan(0);
    });

    it('should handle deeply nested missing values', () => {
      const oldProduct = createBaseProduct({
        category: {} // Missing primary and secondary
      });
      const newProduct = createBaseProduct();

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('category.primary');
      expect(result.changedFields).toContain('category.secondary');
    });

    it('should handle string vs number comparisons', () => {
      const oldProduct = createBaseProduct({
        price: {
          normal: '29.99', // string
          discount: '25.99' // string
        }
      });
      const newProduct = createBaseProduct({
        price: {
          normal: 29.99, // number
          discount: 25.99 // number
        }
      });

      const result = dataTransformService.detectChanges(newProduct, oldProduct);

      // Should detect changes due to type difference
      expect(result.hasChanges).toBe(true);
      expect(result.changedFields).toContain('price.normal');
      expect(result.changedFields).toContain('price.discount');
    });
  });
});