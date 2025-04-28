const { productApi } = require('../../utils/api');

Page({
  data: {
    products: [],
    total: 0,
    loading: true,
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    searchKeyword: '',
    categoryId: null,
    type: '', // 可选值: 'hot', 'new', 'recommend'
    sortBy: 'default', // 默认、价格升序、价格降序、销量
    sortOptions: [
      { id: 'default', name: '默认排序' },
      { id: 'price_asc', name: '价格升序' },
      { id: 'price_desc', name: '价格降序' },
      { id: 'sales_desc', name: '销量优先' }
    ],
    showFilter: false,
    emptyTips: '暂无相关商品',
    isSearching: false,
    history: []
  },

  onLoad: function(options) {
    // 从历史记录中读取搜索历史
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ 
      history: history 
    });

    let title = '商品列表';
    let emptyTips = '暂无相关商品';

    // 处理搜索参数
    if (options.keyword) {
      this.setData({
        searchKeyword: options.keyword,
        emptyTips: `没有找到与"${options.keyword}"相关的商品`
      });
      title = `搜索: ${options.keyword}`;
      // 保存搜索历史
      this.saveSearchHistory(options.keyword);
    }

    // 处理分类筛选
    if (options.categoryId) {
      this.setData({
        categoryId: options.categoryId
      });
      title = '分类商品';
    }

    // 处理特殊类型列表
    if (options.type) {
      this.setData({
        type: options.type
      });
      
      switch(options.type) {
        case 'hot':
          title = '热门商品';
          emptyTips = '暂无热门商品';
          break;
        case 'new':
          title = '新品上架';
          emptyTips = '暂无新品商品';
          break;
        case 'recommend':
          title = '推荐商品';
          emptyTips = '暂无推荐商品';
          break;
      }
      
      this.setData({ emptyTips });
    }

    wx.setNavigationBarTitle({
      title: title
    });

    // 加载商品列表
    this.loadProducts();
  },

  // 加载商品列表
  loadProducts: function(isLoadMore = false) {
    if (isLoadMore && !this.data.hasMore) {
      return;
    }

    const { pageNum, pageSize, searchKeyword, categoryId, type, sortBy } = this.data;

    this.setData({
      loading: true
    });

    // 构建查询参数
    const params = {
      page: isLoadMore ? pageNum + 1 : 1,
      limit: pageSize,
      sortBy: sortBy
    };
    
    // 添加搜索关键词
    if (searchKeyword) {
      params.keyword = searchKeyword;
    }
    
    // 添加分类ID
    if (categoryId) {
      params.categoryId = categoryId;
    }
    
    // 根据类型添加特殊筛选条件
    if (type) {
      switch(type) {
        case 'hot':
          params.isHot = 'true';
          break;
        case 'new':
          params.isNew = 'true';
          break;
        case 'recommend':
          params.isRecommend = 'true';
          break;
      }
    }

    // 调用商品列表API
    productApi.getProducts(params)
      .then(res => {
        if (res.success) {
          const newProducts = res.data.list || [];
          const total = res.data.total || 0;
          
          // 更新商品数组，如果是加载更多就追加，否则替换
          this.setData({
            products: isLoadMore ? [...this.data.products, ...newProducts] : newProducts,
            pageNum: isLoadMore ? pageNum + 1 : 1,
            hasMore: (isLoadMore ? this.data.products.length + newProducts.length : newProducts.length) < total,
            total: total,
            loading: false
          });
        } else {
          wx.showToast({
            title: res.message || '加载商品失败',
            icon: 'none'
          });
          this.setData({
            loading: false
          });
        }
      })
      .catch(err => {
        console.error('加载商品列表失败', err);
        wx.showToast({
          title: '加载商品失败',
          icon: 'none'
        });
        this.setData({
          loading: false
        });
      });
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.loadProducts();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadProducts(true);
    }
  },

  // 点击商品
  onProductTap: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${id}`
    });
  },

  // 显示筛选面板
  showFilter: function() {
    this.setData({
      showFilter: true
    });
  },

  // 隐藏筛选面板
  hideFilter: function() {
    this.setData({
      showFilter: false
    });
  },

  // 选择排序方式
  onSortChange: function(e) {
    const sortBy = e.currentTarget.dataset.sort;
    
    this.setData({
      sortBy: sortBy,
      type: '', // 清除类型筛选
      pageNum: 1,
      products: []
    });
    
    // 重新加载商品列表
    this.loadProducts();
    
    // 如果筛选面板打开，则关闭
    if (this.data.showFilter) {
      this.hideFilter();
    }
  },

  // 搜索输入框变化
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  // 执行搜索
  onSearch: function() {
    const keyword = this.data.searchKeyword.trim();
    if (keyword) {
      this.saveSearchHistory(keyword);
      this.setData({
        isSearching: false
      });
      this.loadProducts();
      wx.setNavigationBarTitle({
        title: `搜索: ${keyword}`
      });
    }
  },
  
  // 清空搜索
  clearSearch: function() {
    this.setData({
      searchKeyword: '',
      isSearching: false
    });
    this.loadProducts();
    wx.setNavigationBarTitle({
      title: '商品列表'
    });
  },

  // 显示搜索框
  showSearch: function() {
    this.setData({
      isSearching: true
    });
  },

  // 隐藏搜索框
  hideSearch: function() {
    this.setData({
      isSearching: false
    });
  },

  // 保存搜索历史
  saveSearchHistory: function(keyword) {
    let history = this.data.history;
    // 如果已存在则移除旧的
    const index = history.findIndex(item => item === keyword);
    if (index !== -1) {
      history.splice(index, 1);
    }
    // 添加到最前面
    history.unshift(keyword);
    // 限制最多保存10条
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    this.setData({ history });
    wx.setStorageSync('searchHistory', history);
  },

  // 使用历史记录进行搜索
  useHistory: function(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ 
      searchKeyword: keyword,
      isSearching: false
    });
    this.loadProducts();
    wx.setNavigationBarTitle({
      title: `搜索: ${keyword}`
    });
  },

  // 清空历史记录
  clearHistory: function() {
    this.setData({ history: [] });
    wx.removeStorageSync('searchHistory');
  },

  // 分享
  onShareAppMessage: function() {
    const { searchKeyword, categoryId, type } = this.data;
    let title = '商品列表';
    let path = '/pages/product-list/product-list';
    
    if (searchKeyword) {
      title = `搜索: ${searchKeyword}`;
      path += `?keyword=${searchKeyword}`;
    } else if (categoryId) {
      title = '分类商品';
      path += `?categoryId=${categoryId}`;
    } else if (type) {
      switch(type) {
        case 'hot':
          title = '热门商品';
          break;
        case 'new':
          title = '新品上架';
          break;
        case 'recommend':
          title = '推荐商品';
          break;
      }
      path += `?type=${type}`;
    }
    
    return {
      title: title,
      path: path
    };
  },

  // 商品类型变更
  onTypeChange: function(e) {
    const type = e.currentTarget.dataset.type;
    
    // 如果点击的是当前已选中的类型，则取消选择
    if (this.data.type === type) {
      this.setData({
        type: '',
        pageNum: 1,
        products: []
      });
    } else {
      this.setData({
        type: type,
        sortBy: 'default', // 重置为默认排序
        pageNum: 1,
        products: []
      });
    }
    
    // 重新加载商品
    this.loadProducts();
  }
}); 