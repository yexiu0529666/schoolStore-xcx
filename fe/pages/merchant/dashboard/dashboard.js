// pages/merchant/dashboard/dashboard.js
const app = getApp();
const { merchantApi } = require('../../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    merchantInfo: null,
    stats: null,
    loading: true,
    periodOptions: ['今日', '本周', '本月', '全部'],
    currentPeriod: 1, // 默认显示本周
    periodValues: ['day', 'week', 'month', 'all'],
    orderStatusCount: {
      pending_payment: 0,
      pending_shipment: 0,
      pending_receipt: 0,
      completed: 0
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.checkAdminAuth();
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
    if (this.data.merchantInfo) {
      this.loadDashboardData();
    }
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
   * 检查管理员权限
   */
  checkAdminAuth() {
    if (!app.globalData.isAdmin && !app.globalData.isMerchant) {
      wx.showModal({
        title: '提示',
        content: '您没有管理员权限，请先登录管理员账号',
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      });
      return;
    }
    
    this.loadMerchantInfo();
    this.loadDashboardData();
  },
  
  /**
   * 加载商家信息
   */
  loadMerchantInfo() {
    this.setData({ loading: true });
    
    merchantApi.getMerchantInfo()
      .then(res => {
        if (res.success) {
          this.setData({
            merchantInfo: res.data,
            loading: false
          });
        } else {
          wx.showToast({
            title: res.message || '获取商家信息失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('获取商家信息失败', err);
        wx.showToast({
          title: '获取商家信息失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },
  
  /**
   * 加载仪表板数据
   */
  loadDashboardData() {
    this.setData({ loading: true });
    
    const period = this.data.periodValues[this.data.currentPeriod];
    
    merchantApi.getMerchantStats(period)
      .then(res => {
        if (res.success) {
          const stats = res.data;
          
          // 处理订单状态数量
          const orderStatusCount = {
            pending_payment: stats.orders_by_status.pending_payment || 0,
            pending_shipment: stats.orders_by_status.pending_shipment || 0,
            pending_receipt: stats.orders_by_status.pending_receipt || 0,
            completed: stats.orders_by_status.completed || 0
          };
          
          this.setData({
            stats: stats,
            orderStatusCount: orderStatusCount,
            loading: false
          });
        } else {
          wx.showToast({
            title: res.message || '获取统计数据失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('获取统计数据失败', err);
        wx.showToast({
          title: '获取统计数据失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },
  
  /**
   * 切换统计周期
   */
  switchPeriod(e) {
    const period = e.currentTarget.dataset.index;
    if (period !== this.data.currentPeriod) {
      this.setData({ 
        currentPeriod: period
      });
      this.loadDashboardData();
    }
  },
  
  /**
   * 导航到订单列表
   */
  navigateToOrders(e) {
    const status = e.currentTarget.dataset.status || '';
    wx.navigateTo({
      url: `/pages/merchant/orders/orders?status=${status}`
    });
  },
  
  /**
   * 导航到商品管理
   */
  navigateToProducts() {
    wx.navigateTo({
      url: '/pages/merchant/products/products'
    });
  },
  
  /**
   * 导航到分类管理
   */
  navigateToCategories() {
    wx.navigateTo({
      url: '/pages/merchant/categories/categories'
    });
  },
  
  /**
   * 导航到优惠券管理
   */
  navigateToCoupons() {
    wx.navigateTo({
      url: '/pages/merchant/coupons/coupons'
    });
  },
  
  /**
   * 退出登录
   */
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          app.globalData.adminInfo = null;
          app.globalData.isAdmin = false;
          app.globalData.isMerchant = false;
          app.globalData.token = '';
          
          // 清除本地存储
          wx.removeStorageSync('adminInfo');
          wx.removeStorageSync('token');
          
          // 跳转到首页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },
  
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadMerchantInfo();
    this.loadDashboardData();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})