// pages/merchant/products/products.js
const app = getApp();
const { merchantApi } = require('../../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    products: [],
    currentTab: 0,
    statusTabs: [
      { name: '全部', value: '' },
      { name: '在售', value: 'on_sale' },
      { name: '下架', value: 'off_sale' }
    ],
    currentStatus: '',
    keyword: '',
    page: 1,
    limit: 10,
    totalProducts: 0,
    hasMore: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否有商家权限
    this.checkMerchantAuth();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadProducts(true);
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 检查商家权限
   */
  checkMerchantAuth() {
    if (!app.globalData.isAdmin && !app.globalData.isMerchant) {
      wx.showModal({
        title: '提示',
        content: '您没有商家权限，请先登录商家账号',
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      });
    }
  },

  /**
   * 加载商品列表
   * @param {boolean} refresh 是否刷新列表
   */
  loadProducts(refresh = false) {
    this.setData({ loading: true });
    
    const { currentStatus, keyword, page, limit } = this.data;
    
    // 如果是刷新，重置页码
    if (refresh) {
      this.setData({ page: 1 });
    }
    
    const params = {
      status: currentStatus,
      keyword: keyword,
      page: refresh ? 1 : page,
      limit: limit
    };
    
    merchantApi.getMerchantProducts(params)
      .then(res => {
        if (res.success) {
          const newProducts = refresh ? res.data.list : [...this.data.products, ...res.data.list];
          
          this.setData({
            products: newProducts,
            totalProducts: res.data.total,
            hasMore: newProducts.length < res.data.total,
            loading: false
          });
        } else {
          wx.showToast({
            title: res.message || '获取商品列表失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('获取商品列表失败', err);
        wx.showToast({
          title: '获取商品列表失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  /**
   * 切换商品状态Tab
   */
  switchTab(e) {
    const tabIndex = e.currentTarget.dataset.index;
    const status = this.data.statusTabs[tabIndex].value;
    
    if (tabIndex !== this.data.currentTab) {
      this.setData({
        currentTab: tabIndex,
        currentStatus: status,
        page: 1,
        products: []
      });
      
      this.loadProducts(true);
    }
  },

  /**
   * 搜索商品
   */
  searchProducts(e) {
    const keyword = e.detail.value;
    this.setData({
      keyword: keyword,
      page: 1,
      products: []
    });
    this.loadProducts(true);
  },

  /**
   * 清除搜索关键词
   */
  clearKeyword() {
    if (this.data.keyword) {
      this.setData({
        keyword: '',
        page: 1,
        products: []
      });
      this.loadProducts(true);
    }
  },

  /**
   * 处理商品状态
   */
  toggleProductStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const newStatus = status === true ? false : true;
    const actionText = newStatus ? '上架' : '下架';
    
    wx.showModal({
      title: '提示',
      content: `确定${actionText}该商品吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateProductStatus(id, newStatus);
        }
      }
    });
  },

  /**
   * 更新商品状态
   */
  updateProductStatus(productId, isOnSale) {
    wx.showLoading({ title: '处理中...' });
    
    merchantApi.updateProduct(productId, { is_on_sale: isOnSale })
      .then(res => {
        wx.hideLoading();
        
        if (res.success) {
          wx.showToast({
            title: '操作成功',
            icon: 'success'
          });
          
          // 刷新商品列表
          this.loadProducts(true);
        } else {
          wx.showToast({
            title: res.message || '操作失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('处理商品失败', err);
        wx.showToast({
          title: '处理商品失败',
          icon: 'none'
        });
      });
  },

  /**
   * 删除商品
   */
  deleteProduct(e) {
    const productId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '提示',
      content: '确定删除该商品吗？删除后无法恢复！',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          merchantApi.removeProduct(productId)
            .then(res => {
              wx.hideLoading();
              
              if (res.success) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                
                // 刷新商品列表
                this.loadProducts(true);
              } else {
                wx.showToast({
                  title: res.message || '删除失败',
                  icon: 'none'
                });
              }
            })
            .catch(err => {
              wx.hideLoading();
              console.error('删除商品失败', err);
              wx.showToast({
                title: '删除商品失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },

  /**
   * 添加新商品
   */
  addProduct() {
    wx.navigateTo({
      url: '/pages/merchant/product-edit/product-edit'
    });
  },

  /**
   * 编辑商品
   */
  editProduct(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/merchant/product-edit/product-edit?id=${productId}`
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadProducts(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore) {
      this.setData({
        page: this.data.page + 1
      });
      this.loadProducts();
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})