# 收藏按钮国际化修复报告

## 问题描述
在应用的英文界面模式下，收藏按钮仍然显示为中文文本，而不是英文。

## 修复内容

### 1. 添加缺失的翻译键

#### 在 `src/locales/zh/common.json` 中添加：
```json
{
  "actions": {
    // ... 其他翻译
    "showAll": "显示全部",
    "favoritesOnly": "仅收藏"
  },
  "messages": {
    "favoriteSuccess": "收藏成功",
    "unfavoriteSuccess": "取消收藏成功",
    "operationFailed": "操作失败，请稍后重试"
  }
}
```

#### 在 `src/locales/en/common.json` 中添加：
```json
{
  "actions": {
    // ... 其他翻译
    "showAll": "Show All",
    "favoritesOnly": "Favorites Only"
  },
  "messages": {
    "favoriteSuccess": "Added to favorites",
    "unfavoriteSuccess": "Removed from favorites",
    "operationFailed": "Operation failed, please try again"
  }
}
```

### 2. 修复硬编码的中文文本

#### 修复 `src/pages/ProductList/ProductListWithQuery.tsx`
- 将硬编码的 `'显示全部'` 和 `'仅收藏'` 替换为 `t('common:actions.showAll')` 和 `t('common:actions.favoritesOnly')`

#### 修复 `src/hooks/useFavorites.ts`
- 将硬编码的toast消息替换为国际化翻译键
- 添加了 `useTranslation('common')` hook

### 3. 为FavoriteButton组件添加国际化支持

#### 修改 `src/components/product/FavoriteButton.tsx`
- 添加了 `showTooltip?: boolean` 属性
- 添加了 `useTranslation('product')` hook
- 为按钮添加了国际化的tooltip：
  ```tsx
  title={showTooltip ? (isFavorited ? t('actions.favorited') : t('actions.favorite')) : undefined}
  ```
- 将中文注释改为英文注释

## 修复后的效果

### 中文界面
- 收藏按钮tooltip显示："收藏" / "已收藏"
- 筛选按钮显示："仅收藏" / "显示全部"
- Toast消息显示："收藏成功" / "取消收藏成功"

### 英文界面
- 收藏按钮tooltip显示："Add to Favorites" / "Favorited"
- 筛选按钮显示："Favorites Only" / "Show All"
- Toast消息显示："Added to favorites" / "Removed from favorites"

## 测试验证

1. 在浏览器中访问应用
2. 切换语言到英文
3. 验证收藏按钮的tooltip是否显示英文
4. 验证筛选按钮的文本是否显示英文
5. 点击收藏按钮验证toast消息是否显示英文

## 相关文件

- `src/locales/zh/common.json` - 中文翻译
- `src/locales/en/common.json` - 英文翻译
- `src/pages/ProductList/ProductListWithQuery.tsx` - 产品列表页面
- `src/hooks/useFavorites.ts` - 收藏功能hook
- `src/components/product/FavoriteButton.tsx` - 收藏按钮组件

## 注意事项

- 所有修改都保持了向后兼容性
- 新增的 `showTooltip` 属性默认为 `true`，不会影响现有功能
- 翻译键遵循了项目现有的命名规范
